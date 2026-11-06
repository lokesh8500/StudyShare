const mongoose = require("mongoose");
const Note = require("../models/Note");
const User = require("../models/User");
const fs = require("fs/promises");
const path = require("path");
const { uploadDir } = require("../middleware/uploadMiddleware");

// DASHBOARD STATISTICS
exports.getStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalNotes,
      pending,
      approved,
      rejected
    ] = await Promise.all([
      User.countDocuments(),
      Note.countDocuments(),
      Note.countDocuments({ status: "pending" }),
      Note.countDocuments({ status: "approved" }),
      Note.countDocuments({ status: "rejected" })
    ]);

    res.json({
      totalUsers,
      totalNotes,
      pending,
      approved,
      rejected
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load statistics"
    });
  }
};

// LIST ALL NOTES WITH USER AND SEARCH FILTERS
exports.getAllNotes = async (req, res) => {
  try {
    const allowed = ["all", "pending", "approved", "rejected"];
    const status = req.query.status || "pending";
    const { userId, search } = req.query;

    let query = {};

    if (allowed.includes(status) && status !== "all") {
      query.status = status;
    }

    if (userId && mongoose.isValidObjectId(userId)) {
      query.uploadedBy = userId;
    }

    let notes = await Note.find(query)
      .select("-storedName")
      .populate("uploadedBy", "name email role")
      .sort({ createdAt: -1 })
      .limit(200);

    if (search) {
      const lowerSearch = search.toLowerCase();
      notes = notes.filter((n) =>
        n.title.toLowerCase().includes(lowerSearch) ||
        n.subject.toLowerCase().includes(lowerSearch) ||
        (n.uploadedBy?.name && n.uploadedBy.name.toLowerCase().includes(lowerSearch)) ||
        (n.uploadedBy?.email && n.uploadedBy.email.toLowerCase().includes(lowerSearch))
      );
    }

    res.json(notes);
  } catch (error) {
    res.status(500).json({
      message: "Failed to load notes"
    });
  }
};

// LIST ALL USERS WITH THEIR NOTE COUNTS
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    const usersWithCounts = await Promise.all(
      users.map(async (userDoc) => {
        const noteCount = await Note.countDocuments({ uploadedBy: userDoc._id });
        return {
          ...userDoc.toObject(),
          noteCount
        };
      })
    );

    res.json(usersWithCounts);
  } catch (error) {
    res.status(500).json({
      message: "Failed to load users"
    });
  }
};

// APPROVE OR REJECT
exports.updateNoteStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status"
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid note ID"
      });
    }

    const note = await Note.findOneAndUpdate(
      {
        _id: req.params.id,
        status: "pending"
      },
      { $set: { status } },
      { new: true, runValidators: true }
    ).select("-storedName");

    if (!note) {
      return res.status(409).json({
        message: "Note not found or already reviewed"
      });
    }

    res.json({
      message: `Note ${status} successfully`,
      note
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update note status"
    });
  }
};

// ADMIN DIRECT NOTE UPLOAD (AUTO-APPROVED)
exports.adminUploadNote = async (req, res) => {
  try {
    const { title, subject, semester, description } = req.body;

    const cleanTitle = typeof title === "string" ? title.trim() : "";
    const cleanSubject = typeof subject === "string" ? subject.trim() : "";
    const cleanDescription = typeof description === "string" ? description.trim() : "";
    const sem = Number(semester);

    if (
      !req.file ||
      !cleanTitle ||
      cleanTitle.length > 150 ||
      !cleanSubject ||
      cleanSubject.length > 100 ||
      cleanDescription.length > 1000 ||
      !Number.isInteger(sem) ||
      sem < 1 ||
      sem > 8
    ) {
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }

      return res.status(400).json({
        message: "Please provide valid note details and a file"
      });
    }

    const note = await Note.create({
      title: cleanTitle,
      subject: cleanSubject,
      semester: sem,
      description: cleanDescription,
      fileName: req.file.originalname,
      storedName: req.file.filename,
      fileType: path.extname(req.file.originalname).toLowerCase(),
      fileSize: req.file.size,
      uploadedBy: req.user._id,
      status: "approved" // Admin uploads are automatically approved and featured!
    });

    res.status(201).json({
      message: "Note uploaded and published successfully as an Admin Note.",
      note
    });
  } catch (error) {
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    console.error("Admin upload error:", error);
    res.status(500).json({
      message: "Failed to upload note"
    });
  }
};

// DELETE ANY NOTE
exports.deleteAnyNote = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid note ID"
      });
    }

    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        message: "Note not found"
      });
    }

    await note.deleteOne();

    await fs.unlink(
      path.join(uploadDir, note.storedName)
    ).catch((error) => {
      console.error("File cleanup failed:", error.message);
    });

    res.json({
      message: "Note deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete note"
    });
  }
};

// DELETE USER ACCOUNT AND ALL THEIR UPLOADS
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        message: "Invalid user ID"
      });
    }

    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        message: "You cannot delete your own admin account"
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    const userNotes = await Note.find({ uploadedBy: userId });

    for (const note of userNotes) {
      if (note.storedName) {
        await fs.unlink(
          path.join(uploadDir, note.storedName)
        ).catch((err) => {
          console.error("File cleanup failed for note:", note._id, err.message);
        });
      }
    }

    await Note.deleteMany({ uploadedBy: userId });
    await user.deleteOne();

    res.json({
      message: `User '${user.name}' and all their uploaded notes were deleted successfully`
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      message: "Failed to delete user"
    });
  }
};
