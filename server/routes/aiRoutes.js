const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/authMiddleware');
const { summarizePdf } = require('../controllers/aiController');

const router = express.Router();

const TEMP_UPLOAD_DIR = path.join(__dirname, '../temp_uploads');
if (!fs.existsSync(TEMP_UPLOAD_DIR)) {
  fs.mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TEMP_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype !== 'application/pdf' && !file.originalname.toLowerCase().endsWith('.pdf')) {
    return cb(new Error('Only PDF files are allowed'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/summarize-pdf', protect, (req, res, next) => {
  console.log('[AIRoutes] Multer middleware hit, headers:', req.headers['content-type']);
  upload.single('file')(req, res, (err) => {
    console.log('[AIRoutes] Multer done, file:', req.file ? {path: req.file.path, size: req.file.size, originalname: req.file.originalname} : 'NO FILE', 'err:', err?.message);
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: 'File size exceeds 10 MB limit' });
      }
      return res.status(400).json({ message: err.message });
    }
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, (req, res, next) => {
  console.log('[AIRoutes] Before summarizePdf, req.file:', req.file ? {path: req.file.path, size: req.file.size} : 'NO FILE');
  next();
}, summarizePdf);

module.exports = router;
