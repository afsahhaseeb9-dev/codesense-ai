import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { lintCode } from './services/linterService.js';
import { reviewCodeWithGemini } from './services/geminiService.js';
import { calculateQualityScore } from './utils/scoringAlgorithm.js';
import { fetchGitHubFile } from './services/githubService.js';
import { Submission } from './models/Submission.js';

dotenv.config();

// Connect to MongoDB Atlas (non-blocking)
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Local in-memory store so history works even if Atlas is offline
let localSubmissions = [];

// Global Middleware
app.use(cors());
app.use(express.json());

// 1. Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'CodeSense AI backend is running',
    timestamp: new Date().toISOString()
  });
});

// 2. GitHub Fetch Route
app.post('/api/github/fetch', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, error: 'Please provide a GitHub URL' });
    const fileData = await fetchGitHubFile(url);
    res.status(200).json({ success: true, data: fileData });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 3. Quick Linter Route
app.post('/api/lint', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Please provide code in request body' });
    const issues = await lintCode(code);
    res.status(200).json({ success: true, issueCount: issues.length, issues });
  } catch (error) {
    res.status(500).json({ error: 'Failed to lint code' });
  }
});

// 4. Hybrid Review Route
app.post('/api/review', async (req, res) => {
  try {
    const { code, studentName, projectName, sourceType, githubUrl } = req.body;
    if (!code) return res.status(400).json({ error: 'Please provide code in request body' });

    console.log(' Running ESLint static analysis...');
    const linterIssues = await lintCode(code);

    console.log(' Sending code and linter findings to Gemini AI...');
    const aiReview = await reviewCodeWithGemini(code, linterIssues);

    console.log(' Calculating Quality Score...');
    const scoreData = calculateQualityScore(aiReview.issues || []);

    const submissionData = {
      studentName: studentName || 'Alex Chen',
      projectName: projectName || 'Assignment 1 - Auth',
      sourceType: sourceType || 'paste',
      githubUrl: githubUrl || '',
      code,
      score: scoreData.score,
      grade: scoreData.grade,
      label: scoreData.label,
      totalIssues: scoreData.totalIssues,
      severityCounts: scoreData.severityCounts,
      summary: aiReview.summary,
      breakdown: scoreData.breakdown,
      issues: aiReview.issues || [],
      improvedCode: aiReview.improvedCode || code, // <--- Passes the corrected code for Split Diff!
      createdAt: new Date().toISOString()
    };

    // Save to local cache first
    localSubmissions.unshift({ ...submissionData, _id: Date.now().toString() });

    // Save to MongoDB (let MongoDB generate its own clean _id)
    try {
      const savedDoc = await Submission.create(submissionData);
      console.log(` Saved submission to MongoDB! ID: ${savedDoc._id}`);
      submissionData._id = savedDoc._id;
    } catch (dbErr) {
      console.warn(' MongoDB Atlas offline; saved to local cache:', dbErr.message);
    }

    // Return submissionData directly so frontend can read result.score, result.issues, etc.
    res.status(200).json(submissionData);
  } catch (error) {
    console.error('Review endpoint error:', error);
    res.status(500).json({
      error: error.message || 'Failed to complete review'
    });
  }
});

// 5. Get Submissions History Route (MongoDB + Local Fallback)
app.get('/api/submissions', async (req, res) => {
  try {
    let dbSubmissions = [];
    try {
      dbSubmissions = await Submission.find().sort({ createdAt: -1 }).limit(50);
    } catch (e) {
      // If DB has an issue, fallback to local cache
    }

    const finalData = dbSubmissions.length > 0 ? dbSubmissions : localSubmissions;

    res.status(200).json({
      success: true,
      count: finalData.length,
      data: finalData
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch submissions' });
  }
});

app.listen(PORT, () => {
  console.log(`CodeSense AI Server running on http://localhost:${PORT}`);
});