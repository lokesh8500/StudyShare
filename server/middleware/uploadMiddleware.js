
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const uploadDir = path.join(__dirname, "../uploads");

fs.mkdirSync(uploadDir, { recursive: true });

const allowedExtensions = [
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx"
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(
      file.originalname
    ).toLowerCase();

    cb(null, crypto.randomUUID() + extension);
  }
});

const fileFilter = (req, file, cb) => {
  const extension = path.extname(
    file.originalname
  ).toLowerCase();

  if (!allowedExtensions.includes(extension)) {
    return cb(
      new Error("Only PDF, DOC, DOCX, PPT and PPTX files are allowed")
    );
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1
  }
});

module.exports = { upload, uploadDir };
