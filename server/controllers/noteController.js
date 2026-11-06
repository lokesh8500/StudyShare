
const Note = require("../models/Note");
const fs = require("fs/promises");
const path = require("path");
const mongoose = require("mongoose");
const { uploadDir } = require("../middleware/uploadMiddleware");
const AIService = require("../services/aiService");

// UPLOAD NOTE
exports.uploadNote = async (req, res) => {
  try {
    const { title, subject, semester, description } = req.body;

    const cleanTitle = typeof title === "string"
      ? title.trim()
      : "";

    const cleanSubject = typeof subject === "string"
      ? subject.trim()
      : "";

    const cleanDescription = typeof description === "string"
      ? description.trim()
      : "";

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
      status: "pending"
    });

    res.status(201).json({
      message: "Note uploaded. Waiting for admin approval.",
      note
    });
  } catch (error) {
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    res.status(500).json({
      message: "Failed to upload note"
    });
  }
};

// GET CURRENT USER'S NOTES
exports.myNotes = async (req, res) => {
  try {
    const notes = await Note.find({
      uploadedBy: req.user._id
    })
      .select("-storedName")
      .sort({ createdAt: -1 });

    res.json(notes);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch notes"
    });
  }
};

// GET APPROVED NOTES
exports.getApprovedNotes = async (req, res) => {
  try {
    const notes = await Note.find({
      status: "approved"
    })
      .select("-storedName")
      .populate("uploadedBy", "name")
      .sort({ createdAt: -1 });

    res.json(notes);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch approved notes"
    });
  }
};

// GENERATE AI SUMMARY
exports.generateSummary = async (req, res) => {
  try {
    const noteId = req.params.id;

    if (!mongoose.isValidObjectId(noteId)) {
      return res.status(400).json({ message: "Invalid note ID" });
    }

    const note = await Note.findById(noteId);
    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    // Access control: All authenticated users can access AI summaries for all PDF notes
    // No restriction based on status or ownership
    // Only PDF files can be processed

    // Check if summary already exists
    if (note.aiSummary && note.aiSummary.content && note.aiSummary.content.overview) {
      return res.status(200).json({
        message: "Summary already exists",
        summary: note.aiSummary
      });
    }

    // Validate PDF file
    if (!note.fileType || !note.fileType.toLowerCase().includes('.pdf')) {
      return res.status(400).json({ message: "AI summarization is only available for PDF files" });
    }

    const safeStoredName = path.basename(note.storedName);
    const filePath = path.resolve(uploadDir, safeStoredName);

    // Path validation
    if (path.dirname(filePath) !== path.resolve(uploadDir)) {
      return res.status(403).json({ message: "Invalid file path" });
    }

    // Check file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ message: "PDF file not found" });
    }

    const aiService = new AIService();
    const summaryData = await aiService.summarizePDF(filePath, note.title);

    // Save summary to database
    note.aiSummary = {
      content: summaryData.content,
      generatedAt: summaryData.generatedAt,
      model: summaryData.model,
      version: 1
    };

    await note.save();

    res.status(201).json({
      message: "Summary generated successfully",
      summary: note.aiSummary
    });

  } catch (error) {
    console.error("AI Summary generation error:", error.message);

    if (error.message.includes("GEMINI_API_KEY")) {
      return res.status(500).json({ message: "AI service not configured" });
    }
    if (error.message.includes("empty or unreadable")) {
      return res.status(400).json({ message: "PDF is empty or unreadable" });
    }
    if (error.message.includes("Gemini API")) {
      return res.status(502).json({ message: "AI service temporarily unavailable" });
    }

    res.status(500).json({ message: "Failed to generate summary" });
  }
};

// GET AI SUMMARY
exports.getSummary = async (req, res) => {
  try {
    const noteId = req.params.id;

    if (!mongoose.isValidObjectId(noteId)) {
      return res.status(400).json({ message: "Invalid note ID" });
    }

    const note = await Note.findById(noteId);
    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    // Access control: All authenticated users can access AI summaries for all PDF notes
    // No restriction based on status or ownership

    if (!note.aiSummary || !note.aiSummary.content || !note.aiSummary.content.overview) {
      return res.status(404).json({ message: "Summary not found. Generate summary first." });
    }

    res.json({
      summary: note.aiSummary
    });

  } catch (error) {
    console.error("Get summary error:", error);
    res.status(500).json({ message: "Failed to retrieve summary" });
  }
};

// DELETE OWN NOTE
exports.deleteNote = async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      uploadedBy: req.user._id
    });

    if (!note) {
      return res.status(404).json({
        message: "Note not found"
      });
    }

    await note.deleteOne();

    const filePath = path.join(uploadDir, note.storedName);
    await fs.unlink(filePath).catch(() => {});

    res.json({
      message: "Note deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete note"
    });
  }
};
