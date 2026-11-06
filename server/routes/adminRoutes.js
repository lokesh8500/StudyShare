const express = require("express");
const router = express.Router();
const multer = require("multer");

const { protect, adminOnly } = require("../middleware/authMiddleware");
const { upload } = require("../middleware/uploadMiddleware");

const {
  getStats,
  getAllNotes,
  getAllUsers,
  updateNoteStatus,
  adminUploadNote,
  deleteAnyNote,
  deleteUser
} = require("../controllers/adminController");

// All routes require admin access
router.use(protect, adminOnly);

router.get("/stats", getStats);
router.get("/notes", getAllNotes);
router.get("/users", getAllUsers);

router.post("/notes/upload", (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        message: error.message
      });
    }
    next();
  });
}, adminUploadNote);

router.patch("/notes/:id/status", updateNoteStatus);
router.delete("/notes/:id", deleteAnyNote);
router.delete("/users/:id", deleteUser);

module.exports = router;