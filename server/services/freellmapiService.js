const fs = require('fs').promises;
const path = require('path');
const { PDFParse } = require('pdf-parse');

class FreeLLMAPIService {
  constructor() {
    const baseUrl = process.env.FREELLMAPI_BASE_URL || 'http://127.0.0.1:31415';
    const apiKey = process.env.FREELLMAPI_API_KEY;
    const modelName = process.env.FREELLMAPI_MODEL || 'claude-haiku-4-5';

    if (!apiKey || apiKey.trim() === '') {
      throw new Error('FREELLMAPI_API_KEY is not configured in environment');
    }

    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
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
      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 4000,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(`FreeLLMAPI error: ${errorData.error?.message || response.statusText}`);
        error.status = response.status;
        error.code = errorData.error?.type;
        throw error;
      }

      const data = await response.json();

      if (!data.content || !data.content[0] || !data.content[0].text) {
        throw new Error('Invalid response format from FreeLLMAPI');
      }

      const text = data.content[0].text;

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON response from FreeLLMAPI');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      // Log structured error for debugging without exposing secrets
      console.error('[FreeLLMAPIService] API error:', {
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
      const enhancedError = new Error(`FreeLLMAPI error: ${error.message}`);
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

module.exports = FreeLLMAPIService;