const fs = require('fs').promises;
const path = require('path');
const { PDFParse } = require('pdf-parse');
const { GoogleGenAI } = require('@google/genai');

class AIService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

    if (!apiKey || apiKey.trim() === '') {
      throw new Error('GEMINI_API_KEY is not configured in environment');
    }

    this.genAI = new GoogleGenAI({ apiKey });
    this.modelName = modelName;
  }

  async extractTextFromPDF(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const parser = new PDFParse({ data: dataBuffer });
      const textResult = await parser.getText();
      await parser.destroy();
      return textResult.text;
    } catch (error) {
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  async generateSummary(noteTitle, pdfText) {
    const prompt = `
You are an expert academic assistant. Create a student-friendly summary of the following document.

Document Title: ${noteTitle}

Content:
${pdfText}

Generate a structured summary in the following JSON format:
{
  "overview": "Brief 2-3 sentence overview",
  "mainSummary": "Detailed but understandable summary in paragraphs with clear headings",
  "importantConcepts": ["concept1", "concept2", ...],
  "keyDefinitions": [{"term": "term1", "definition": "definition1"}, ...],
  "importantPoints": ["point1", "point2", ...],
  "conclusion": "Brief conclusion"
}

Requirements:
- Use simple English
- Keep explanations student-friendly
- Preserve important technical terminology
- Do not invent information not in the PDF
- If sections are unreadable, mention it clearly
- Cover entire document, not just first few pages
- Return valid JSON only
`;

    try {
      const result = await this.genAI.models.generateContent({
        model: this.modelName,
        contents: prompt
      });

      const text = result.text;

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON response from Gemini');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      // Log structured error for debugging without exposing secrets
      console.error('[AIService] Gemini API error:', {
        status: error.status,
        name: error.name,
        code: error.code,
        model: this.modelName,
        message: error.message?.slice?.(0, 300) || 'unknown'
      });

      if (error.message?.includes('JSON')) {
        throw new Error(`Failed to parse AI response: ${error.message}`);
      }

      // Preserve HTTP status and quota details for controller to use
      const enhancedError = new Error(`Gemini API error: ${error.message}`);
      enhancedError.status = error.status;
      enhancedError.code = error.code;
      throw enhancedError;
    }
  }

  async summarizePDF(filePath, noteTitle) {
    const pdfText = await this.extractTextFromPDF(filePath);

    if (!pdfText || pdfText.trim().length < 50) {
      throw new Error('PDF appears to be empty or unreadable');
    }

    const summary = await this.generateSummary(noteTitle, pdfText);

    return {
      content: {
        overview: summary.overview || '',
        mainSummary: summary.mainSummary || '',
        importantConcepts: summary.importantConcepts || [],
        keyDefinitions: summary.keyDefinitions || [],
        importantPoints: summary.importantPoints || [],
        conclusion: summary.conclusion || ''
      },
      model: this.modelName,
      generatedAt: new Date()
    };
  }
}

module.exports = AIService;
