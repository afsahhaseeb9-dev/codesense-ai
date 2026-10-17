import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Gemini client with your API key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Reviews student code using Gemini with grounding from ESLint findings
 * @param {string} codeString - The raw code written by the student
 * @param {Array} linterIssues - The deterministic issues found by ESLint
 * @returns {Promise<Object>} Structured review report
 */
export const reviewCodeWithGemini = async (codeString, linterIssues = []) => {
  try {
    const prompt = `
You are a senior full-stack developer, technical mentor, and code reviewer.
Review the following student code.

STUDENT CODE:
${codeString}

GROUNDED LINTER (ESLint) FINDINGS:
${JSON.stringify(linterIssues, null, 2)}

INSTRUCTIONS:
1. Review the linter findings above. Validate and explain them with clear, educational, beginner-friendly explanations.
2. Look deeper: identify any logic bugs, security vulnerabilities (like unvalidated input, hardcoded secrets), or performance issues that the static linter missed.
3. For each issue, provide the exact line number, type (bug, security, style, performance), severity (high, medium, low), a simple message, an educational explanation, and a suggested code fix.
4. Provide a friendly 1-2 sentence overall summary of the student's submission.
`;

    // Request structured JSON output from Gemini
    const response = await ai.models.generateContent({
model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: 'A 1-2 sentence overall summary of the code quality and findings.',
            },
            issues: {
              type: Type.ARRAY,
              description: 'List of specific issues found in the code.',
              items: {
                type: Type.OBJECT,
                properties: {
                  line: { type: Type.INTEGER, description: 'Line number where the issue occurs' },
                  type: { type: Type.STRING, description: 'Category: bug, security, style, or performance' },
                  severity: { type: Type.STRING, description: 'Severity level: high, medium, or low' },
                  message: { type: Type.STRING, description: 'Short summary of the mistake' },
                  explanation: { type: Type.STRING, description: 'Friendly educational explanation of why it is wrong and what happens' },
                  suggestedFix: { type: Type.STRING, description: 'Exact replacement code snippet to fix this issue' },
                },
                required: ['line', 'type', 'severity', 'message', 'explanation', 'suggestedFix'],
              },
            },
          },
          required: ['summary', 'issues'],
        },
      },
    });

    // Parse and return the strict JSON object
    const reviewData = JSON.parse(response.text);
    return reviewData;
  } catch (error) {
    console.error('Gemini review error:', error);
    throw error;
  }
};