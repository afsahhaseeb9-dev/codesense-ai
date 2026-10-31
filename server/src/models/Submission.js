import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema(
  {
    studentName: { type: String, default: 'Alex Chen' },
    projectName: { type: String, default: 'Assignment 1 - Auth' },
    sourceType: { type: String, default: 'paste' },
    githubUrl: { type: String, default: '' },
    code: { type: String, required: true },
    score: { type: Number, required: true },
    grade: { type: String, required: true },
    label: { type: String, default: '' },
    summary: { type: String, default: '' },
    breakdown: { type: mongoose.Schema.Types.Mixed, default: {} },
    issues: { type: [mongoose.Schema.Types.Mixed], default: [] }
  },
  { 
    timestamps: true,
    strict: false 
  }
);

export const Submission = mongoose.model('Submission', submissionSchema);