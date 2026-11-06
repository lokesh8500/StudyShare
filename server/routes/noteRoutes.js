const fs = require("fs");
const path = require("path");
const Note = require("../models/Note");
const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

const {
  upload,
  uploadDir
} = require("../middleware/uploadMiddleware");

const {
  uploadNote,
  myNotes,
  getApprovedNotes,
  deleteNote,
  generateSummary,
  getSummary
} = require("../controllers/noteController");

const multer = require("multer");

router.use(protect);

router.post("/upload", (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (error) {
      return res.status(
        error instanceof multer.MulterError ? 400 : 400
      ).json({
        message: error.message
      });
    }

    next();
  });
}, uploadNote);

router.get("/my-notes", myNotes);

router.get("/", getApprovedNotes);

router.post("/:id/ai/summary", generateSummary);
router.get("/:id/ai/summary", getSummary);
// Secure note download
router.get("/:id/download", async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        message: "Note not found"
      });
    }

    // Students can download approved notes only.
    // Admins can download notes to review them.
    if (
      note.status !== "approved" &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        message: "This note is not available for download"
      });
    }

    // Keep the file inside the configured upload directory.
    const safeStoredName = path.basename(note.storedName);
    const filePath = path.resolve(uploadDir, safeStoredName);

    if (
      path.dirname(filePath) !== path.resolve(uploadDir) ||
      !fs.existsSync(filePath)
    ) {
      return res.status(404).json({
        message: "File not found"
      });
    }

    res.download(filePath, path.basename(note.fileName), async (error) => {
      if (error) {
        if (!res.headersSent) {
          return res.status(500).json({
            message: "Unable to download file"
          });
        }
        return;
      }

      try {
        await Note.findByIdAndUpdate(note._id, {
          $inc: { downloads: 1 }
        });
      } catch (updateError) {
        console.error("Download count update failed:", updateError);
      }
    });
  } catch (error) {
    console.error("Download error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        message: "Server error while downloading note"
      });
    }
  }
});
router.delete("/:id", deleteNote);

module.exports = router;
