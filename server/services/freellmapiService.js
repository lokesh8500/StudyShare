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

  static extractTextFromProviderResponse(data) {
    if (!data || !data.content || !Array.isArray(data.content)) {
      return null;
    }

    // Find all text-type content blocks, ignore thinking blocks
    const textBlocks = data.content
      .filter(block => block && block.type === 'text' && typeof block.text === 'string')
      .map(block => block.text.trim())
      .filter(text => text.length > 0);

    if (textBlocks.length === 0) {
      return null;
    }

    // Concatenate all text blocks (some providers split output)
    return textBlocks.join('\n');
  }

  static extractJsonFromText(text) {
    if (!text || typeof text !== 'string') {
      return null;
    }

    // Try to find JSON object in the text (handles ```json wrapper and plain JSON)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      return null;
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

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
          temperature: 0.3,
          thinking: { type: 'disabled' }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(`FreeLLMAPI error: ${errorData.error?.message || response.statusText}`);
        error.status = response.status;
        error.code = errorData.error?.type;
        throw error;
      }

      const data = await response.json();

      // Extract text from response, ignoring thinking blocks
      const text = FreeLLMAPIService.extractTextFromProviderResponse(data);

      if (!text) {
        const err = new Error('No usable text content in provider response (only thinking blocks or empty)');
        err.status = 502;
        err.code = 'NO_TEXT_CONTENT';
        throw err;
      }

      // Extract JSON from text (handles ```json markdown wrapper)
      const parsed = FreeLLMAPIService.extractJsonFromText(text);

      if (!parsed) {
        const err = new Error('Failed to parse JSON from provider response');
        err.status = 502;
        err.code = 'INVALID_JSON';
        throw err;
      }

      return parsed;
    } catch (error) {
      // Handle fetch abort/timeout
      if (error.name === 'AbortError' || error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
        const timeoutErr = new Error('AI provider request timed out');
        timeoutErr.status = 504;
        timeoutErr.code = 'GATEWAY_TIMEOUT';
        throw timeoutErr;
      }

      // Log structured error for debugging without exposing secrets or thinking traces
      console.error('[FreeLLMAPIService] API error:', {
        status: error.status,
        name: error.name,
        code: error.code,
        model: this.modelName,
        message: error.message?.slice?.(0, 300) || 'unknown'
      });

      // Preserve HTTP status and error codes for controller
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