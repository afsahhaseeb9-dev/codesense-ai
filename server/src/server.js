import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { lintCode } from './services/linterService.js';
import { reviewCodeWithGemini } from './services/geminiService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Global Middleware
app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'CodeSense AI backend is running',
    timestamp: new Date().toISOString()
  });
});

// Quick Linter Endpoint
app.post('/api/lint', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Please provide code in request body' });
    }
    const issues = await lintCode(code);
    res.status(200).json({ success: true, issueCount: issues.length, issues });
  } catch (error) {
    res.status(500).json({ error: 'Failed to lint code' });
  }
});

// Hybrid Review Endpoint (ESLint + Gemini AI)
app.post('/api/review', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Please provide code in request body' });
    }

    console.log(' Running ESLint static analysis...');
    const linterIssues = await lintCode(code);

    console.log(' Sending code and linter findings to Gemini AI...');
    const aiReview = await reviewCodeWithGemini(code, linterIssues);

    res.status(200).json({
      success: true,
      data: aiReview
    });
  } catch (error) {
    console.error('Review endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to complete review'
    });
  }
});

app.listen(PORT, () => {
  console.log(` CodeSense AI Server running on http://localhost:${PORT}`);
});