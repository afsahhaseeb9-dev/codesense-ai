CodeSense AI — Intelligent Automated Code Review Assistant

[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.x-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Gemini AI](https://img.shields.io/badge/Google%20Gemini-Flash%20Lite-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![Monaco Editor](https://img.shields.io/badge/Monaco_Editor-Light_Theme-1E1E1E?logo=visualstudiocode&logoColor=white)](https://microsoft.github.io/monaco-editor/)

> Automated, grounded code quality feedback for students and classrooms.**  
> Built as an advanced AI-powered pair programmer and learning companion. Eliminates code review bottlenecks by providing instant, line-by-line feedback, security vulnerability alerts, visual diff corrections, and classroom analytics.

---

 The Problem
Computer science students and junior engineers often wait days for code reviews on assignments. Without immediate feedback:
- Critical **security flaws** (e.g., hardcoded API keys, authentication bypasses) go unnoticed.
- **Code smells and anti-patterns** become habits.
- Instructors spend hours manually grading basic syntax and quality issues rather than mentoring logic.

The Solution: CodeSense AI
**CodeSense AI** acts as a 24/7 automated teaching assistant:
1. **Grounded AI Engine**: Combines deterministic static analysis (**ESLint**) with Google's **Gemini LLM** to prevent AI hallucinations and guarantee verified findings.
2. **Visual Diff Viewer**: Interactive side-by-side / inline diff viewer using Microsoft's **Monaco Editor** showing exact before-and-after code corrections.
3. **Deterministic Quality Scoring**: Mathematical scoring algorithm that grades code on an objective 0–100 scale.
4. **Export Engine**: 1-click export of structured review reports in **Markdown (`.md`)** and **Print-Ready PDF**.
5. **Classroom Insights**: Dedicated Teacher View comparing student submissions, pass rates, and class averages with a 1-click demo seeder.

---

 System Architecture
┌────────────────────────────────────────────────────────┐ │ React Client (Vite) │ │ • Monaco Code & Diff Editor • Recharts Trends │ │ • Circular Score Gauge • Markdown/PDF Export │ └───────────────────────────┬────────────────────────────┘ │ HTTP JSON / REST API ▼ ┌────────────────────────────────────────────────────────┐ │ Express & Node.js Backend │ │ │ │ 1. GitHub Service ─── Fetches raw source code │ │ 2. Linter Service ─── Programmatic in-memory ESLint │ │ 3. Gemini Service ─── Grounded prompt with JSON schema│ │ 4. Quality Engine ─── Weighted deduction algorithm │ └─────────────┬──────────────────────────┬───────────────┘ │ │ ▼ ▼ ┌────────────────────────┐ ┌───────────────────────────┐ │ Google Gemini API │ │ MongoDB Atlas │ │ (Flash Lite Model) │ │ (Persistent Submissions) │ └────────────────────────┘ └───────────────────────────┘

---
 Key Features
 1.  Interactive Code Studio & GitHub Import
- Monaco Editor: Industry-standard code editor with syntax highlighting and line numbers.
- GitHub REST Integration: Directly fetch any public JavaScript file from GitHub by pasting its file URL.
2. Grounded Static + AI Review
- Static ESLint analysis runs in-memory to catch syntax and standard rule violations.
- Findings are fed into Google Gemini with a **strict JSON response schema** to prevent hallucinated advice.
- Issues tagged by category: `Security`, `Bug`, `Style`, `Performance`.
- Severity ratings: ` High (-15 pts)`, ` Medium (-5 pts)`, ` Low (-2 pts)`.
 3.  Visual Before-and-After Diff Editor
- Toggle between normal code editing and Split Diff View.
- Renders green (`+`) additions and red (`-`) deletions to clearly show students how to fix their bugs.
 4.  Export & Reporting
- Export to Markdown (`.md`): Downloads a comprehensive GitHub-ready review report with suggested code blocks.
- Export to PDF: Print-optimized stylesheet (`@media print`) that creates clean grading documents.
 5. Score History & Progress Tracking
- Interactive Recharts line graph tracking quality score progression across assignment iterations.
- Historical submission log table with timestamps, grades, and issue counts.
 6.  Teacher View & Analytics Dashboard
- Class-wide metrics: Total Submissions, Class Average Score, and Most Common Issue.
- Searchable student directory to filter student submissions in real time.
-  1-Click Classroom Seeder: Instantly populates realistic demo submissions for live presentations.
---
 Technology Stack
| Layer | Technologies Used |
| :--- | :--- |
| Frontend | React 18, Vite, Tailwind CSS v3, Monaco Editor (`@monaco-editor/react`), Recharts, Lucide Icons |
| Backend | Node.js, Express.js (ES Modules), CORS, Dotenv |
| Code Analysis | Programmatic ESLint API (`eslint`) |
| AI / LLM | Google GenAI SDK (`@google/genai`), `gemini-flash-lite-latest` with fallback cascade |
| Database| MongoDB Atlas, Mongoose (with in-memory fallback cache) |
| External APIs | GitHub REST API v3 |
---
 Getting Started
 Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Git](https://git-scm.com/)
- A free [Google AI Studio API Key](https://aistudio.google.com/)
1. Clone Repository
git clone https://github.com/afsahhaseeb9-dev/codesense-ai.git
cd codesense-ai

2. Backend Setup
bash
cd server
npm install

Create a .env file in the server/ directory:

env
PORT=5000
GEMINI_API_KEY=your_gemini_api_key_here
MONGO_URI=your_mongodb_connection_string_here

Start the backend server:

bash
npm run dev

Backend runs on http://127.0.0.1:5000

3. Frontend Setup

In a new terminal window:

bash
cd client
npm install
npm run dev

Frontend runs on http://localhost:5173

 REST API Reference
Method	Endpoint	Description
GET	/api/health	Backend status and health check
POST	/api/github/fetch	Fetches and decodes source code from a GitHub URL
POST	/api/lint	Runs fast in-memory ESLint analysis
POST	/api/review	Full hybrid review (ESLint + Gemini LLM + Quality Score)
GET	/api/submissions	Retrieves historical submissions (MongoDB + in-memory cache)
POST	/api/submissions/seed	Populates demo classroom submissions for presentations

 Internship Project Requirements Coverage
 Code paste and GitHub repo import: Monaco Editor + GitHub REST API integration.
 Review report with severity and line references: Line numbers, categories, and High/Med/Low ratings.
 Suggested fixes with explanations: Detailed write-ups, 1-click copy buttons, and Monaco Diff View.
 Quality score history per project: Objective mathematical formula plotted on dynamic line charts.
 Teacher view to compare submissions: Class metrics, search directory, and student comparison table.
 Grounded AI Component: ESLint output combined with Gemini LLM with strict response schemas.

 Author

Afsah Haseeb
Full-Stack AI Developer & Engineering Intern
GitHub: @afsahhaseeb9-dev