import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { lintCode } from './services/linterService.js';
import { reviewCodeWithGemini } from './services/geminiService.js';
import { calculateQualityScore } from './utils/scoringAlgorithm.js';
import { fetchGitHubFile } from './services/githubService.js';

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

// GitHub Fetch File Endpoint
app.post('/api/github/fetch', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'Please provide a GitHub URL' });
    }

    const fileData = await fetchGitHubFile(url);
    res.status(200).json({ success: true, data: fileData });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
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

// Hybrid Review Endpoint (ESLint + Gemini AI + Scoring Engine)
app.post('/api/review', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Please provide code in request body' });
    }

    console.log('🔍 Running ESLint static analysis...');
    const linterIssues = await lintCode(code);

    console.log('🤖 Sending code and linter findings to Gemini AI...');
    const aiReview = await reviewCodeWithGemini(code, linterIssues);

    console.log('📊 Calculating Quality Score...');
    const scoreData = calculateQualityScore(aiReview.issues);

    res.status(200).json({
      success: true,
      data: {
        summary: aiReview.summary,
        score: scoreData.score,
        grade: scoreData.grade,
        label: scoreData.label,
        breakdown: scoreData.breakdown,
        severityCounts: scoreData.severityCounts,
        issues: aiReview.issues
      }
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
  console.log(`🚀 CodeSense AI Server running on http://localhost:${PORT}`);
});