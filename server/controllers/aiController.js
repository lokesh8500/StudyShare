const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { PDFParse } = require('pdf-parse');
const FreeLLMAPIService = require('../services/freellmapiService');

const TEMP_DIR = path.join(os.tmpdir(), 'studyshare_ai');
const MAX_SIZE = 10 * 1024 * 1024;
const PDF_MAGIC = Buffer.from('%PDF-');

async function ensureTempDir() {
  await fs.mkdir(TEMP_DIR, { recursive: true });
}

async function validatePdfSignature(filePath) {
  const fd = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(5);
    const { bytesRead } = await fd.read(buffer, 0, 5, 0);
    if (bytesRead < 5) return false;
    return buffer.equals(PDF_MAGIC);
  } finally {
    await fd.close();
  }
}

async function extractTextFromPDF(filePath) {
  const dataBuffer = await fs.readFile(filePath);
  const parser = new PDFParse({ data: dataBuffer });
  const textResult = await parser.getText();
  await parser.destroy();
  return textResult.text;
}

exports.summarizePdf = async (req, res) => {
  let tempPath = null;
  try {
    if (!req.user || !['student', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const file = req.file;
    console.log('[AISummarizer] Uploaded file:', { path: file.path, size: file.size, originalname: file.originalname });
    if (file.size > MAX_SIZE) {
      await fs.unlink(file.path).catch(() => {});
      return res.status(413).json({ message: 'File size exceeds 10 MB limit' });
    }

    if (!file.originalname.toLowerCase().endsWith('.pdf')) {
      await fs.unlink(file.path).catch(() => {});
      return res.status(400).json({ message: 'Only PDF files are allowed' });
    }

    const isPdf = await validatePdfSignature(file.path);
    console.log('[AISummarizer] PDF signature valid:', isPdf);
    if (!isPdf) {
      await fs.unlink(file.path).catch(() => {});
      return res.status(400).json({ message: 'Invalid PDF file signature' });
    }

    await ensureTempDir();
    const tempName = crypto.randomUUID() + '.pdf';
    tempPath = path.join(TEMP_DIR, tempName);
    console.log('[AISummarizer] Moving file to:', tempPath);
    await fs.rename(file.path, tempPath);

    const pdfText = await extractTextFromPDF(tempPath);
    console.log('[AISummarizer] Extracted text length:', pdfText?.length);
    if (!pdfText || pdfText.trim().length < 50) {
      throw new Error('PDF appears to be empty or unreadable');
    }

    const aiService = new FreeLLMAPIService();
    const summaryData = await aiService.summarizePDF(tempPath, file.originalname || 'Untitled');

    res.json({
      summary: summaryData
    });

  } catch (error) {
    console.error('[AISummarizer] Error:', {
      status: error.status,
      name: error.name,
      code: error.code,
      message: error.message?.slice?.(0, 300) || 'unknown'
    });

    if (error.message?.includes('empty or unreadable')) {
      return res.status(400).json({ message: 'PDF is empty or unreadable' });
    }
    if (error.status === 429 || error.code === 429) {
      return res.status(429).json({ message: 'AI quota exceeded' });
    }
    if (error.status === 504 || error.code === 'GATEWAY_TIMEOUT') {
      return res.status(504).json({ message: 'AI provider request timed out' });
    }
    if (error.status === 502 || error.code === 'NO_TEXT_CONTENT' || error.code === 'INVALID_JSON') {
      return res.status(502).json({ message: 'AI service temporarily unavailable' });
    }
    if (error.message?.includes('AI service')) {
      return res.status(502).json({ message: 'AI service temporarily unavailable' });
    }

    res.status(500).json({ message: 'Failed to generate summary' });
  } finally {
    if (tempPath) {
      await fs.unlink(tempPath).catch(() => {});
    }
    if (req.file && req.file.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
  }
};
