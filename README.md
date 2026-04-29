# 📚 StudyFlow — AI-Powered Study Planner

A production-ready full-stack study planner with JWT auth, smart plan generation, AI optimization, progress analytics, and rich PDF export.

---

## 🗂️ Project Structure

```
study-planner/
├── backend/                  # Node.js + Express + MongoDB
│   ├── server.js             # Entry point, Express app, DB connection
│   ├── .env.example          # Environment variable template
│   ├── models/
│   │   ├── User.js           # User schema (bcrypt password hashing)
│   │   ├── Subject.js        # Subject with exam date + color
│   │   ├── Topic.js          # Topics nested under subjects
│   │   └── StudyPlan.js      # Plan with days, tasks, completion tracking
│   ├── routes/
│   │   ├── auth.js           # POST /signup, /login, GET /me
│   │   ├── subjects.js       # CRUD for subjects + nested topics
│   │   ├── studyplan.js      # Generate, fetch, update tasks, regenerate
│   │   ├── pdf.js            # GET /pdf/download — PDF export route
│   │   └── ai.js             # POST /ai/optimize — AI plan optimization
│   ├── controllers/
│   │   ├── authController.js         # JWT sign/verify, signup/login logic
│   │   ├── subjectController.js      # Subject & topic CRUD handlers
│   │   ├── studyPlanController.js    # Plan generation algorithm + task toggle
│   │   └── pdfController.js          # Fetches active plan and triggers PDF generation
│   ├── services/
│   │   └── pdfService.js     # Enhanced PDF generation (PDFKit) with charts & analytics
│   └── middleware/
│       └── auth.js           # JWT protect middleware
│
└── frontend/                 # React + Vite + Tailwind CSS
    ├── index.html
    ├── vite.config.js        # Proxy /api → localhost:5000
    ├── tailwind.config.js    # Custom design tokens
    ├── src/
    │   ├── main.jsx          # React root
    │   ├── App.jsx           # Router setup
    │   ├── index.css         # Tailwind + component classes
    │   ├── api/
    │   │   └── axios.js      # Axios instance with JWT interceptors
    │   ├── context/
    │   │   └── AuthContext.jsx  # Auth state, login/signup/logout
    │   ├── components/
    │   │   ├── Navbar.jsx       # Sticky navigation bar
    │   │   ├── TaskCard.jsx     # Individual task with toggle
    │   │   ├── ProgressBar.jsx  # Reusable animated progress bar
    │   │   └── ProtectedRoute.jsx  # Route guard
    │   └── pages/
    │       ├── Login.jsx        # Email/password login
    │       ├── Signup.jsx       # Registration with daily hours
    │       ├── InputForm.jsx    # Add subjects, topics, generate plan
    │       ├── Dashboard.jsx    # Daily plan view, progress tracking, PDF export
    │       ├── Planner.jsx      # Full planner view
    │       └── Progress.jsx     # Progress & analytics page
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)

### 1. Backend Setup

```bash
cd backend
npm install

# Create env file
cp .env.example .env
# Edit .env — set MONGO_URI, JWT_SECRET, and optionally OPENAI_API_KEY

npm run dev   # starts on http://localhost:5000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev   # starts on http://localhost:5173
```

The Vite dev server proxies `/api/*` requests to the backend automatically.

---

## 🔌 API Reference

### Auth
| Method | Endpoint                  | Description            |
|--------|--------------------------|------------------------|
| POST   | /api/auth/signup         | Register               |
| POST   | /api/auth/login          | Login, get JWT         |
| GET    | /api/auth/me             | Current user           |
| PATCH  | /api/auth/update-hours   | Update daily hours     |

### Subjects & Topics
| Method | Endpoint                                      | Description        |
|--------|----------------------------------------------|--------------------|
| GET    | /api/subjects                                 | List all subjects  |
| POST   | /api/subjects                                 | Create subject     |
| PUT    | /api/subjects/:id                             | Update subject     |
| DELETE | /api/subjects/:id                             | Delete + cascade   |
| POST   | /api/subjects/:subjectId/topics               | Add topic          |
| PUT    | /api/subjects/:subjectId/topics/:topicId      | Update topic       |
| DELETE | /api/subjects/:subjectId/topics/:topicId      | Delete topic       |

### Study Plan
| Method | Endpoint                                        | Description                        |
|--------|------------------------------------------------|------------------------------------|
| POST   | /api/studyplan/generate                         | Generate new plan                  |
| GET    | /api/studyplan                                  | Get active plan                    |
| GET    | /api/studyplan/today                            | Today's tasks only                 |
| GET    | /api/studyplan/insights                         | AI-generated insights              |
| PATCH  | /api/studyplan/task/:planId/:dayId/:taskId      | Toggle task complete               |
| POST   | /api/studyplan/regenerate                       | Regenerate plan (partial/full)     |
| DELETE | /api/studyplan                                  | Delete active plan                 |

### PDF Export *(New)*
| Method | Endpoint              | Description                                  |
|--------|-----------------------|----------------------------------------------|
| GET    | /api/pdf/download     | Download active plan as a multi-page PDF     |

### AI Optimization *(New)*
| Method | Endpoint              | Description                                  |
|--------|-----------------------|----------------------------------------------|
| POST   | /api/ai/optimize      | Optimize plan using AI + return suggestions  |

---

## 🧠 Plan Generation Algorithm

1. **Fetch** all topics across selected subjects
2. **Sort** by exam proximity (closest exam first) then difficulty (hard first)
3. **Distribute** topics across days filling up to `dailyHours`
4. **Split** topics that exceed remaining daily hours into parts
5. **Insert revision days** every 4th day — recaps the 3 prior study days
6. Store complete plan in MongoDB for persistent access

---

## 📄 PDF Export (Enhanced)

The PDF export generates a comprehensive, professionally styled multi-page document using [PDFKit](https://pdfkit.org/). It uses a clean light theme with subject color coding.

### What's included in the exported PDF:

| Page | Content |
|------|---------|
| **Page 1** | Cover page with student info, plan details, and 3 animated progress circles (Tasks, Days, Hours) |
| **Page 2** | Subject breakdown — per-subject progress bars, task counts, hours allocated vs completed |
| **Page 3** | Study time analytics — bar chart by subject, weekly breakdown table, and AI study insights |
| **Page 4+** | Full daily schedule — tasks grouped by subject with completion status, duration, and type badges |
| **All Pages** | Footer with student name, plan title, and page numbering |

**Backend files involved:**
- `backend/routes/pdf.js` — Route definition (`GET /api/pdf/download`)
- `backend/controllers/pdfController.js` — Fetches the user's active plan and streams the PDF
- `backend/services/pdfService.js` — Core PDF generation logic (charts, analytics, schedule layout)

**Frontend trigger:**
- `frontend/src/pages/Dashboard.jsx` — `handleDownloadPDF()` function calls the API and triggers a browser file download

---

## ✨ Features

- ✅ JWT-based authentication with auto token refresh
- ✅ Subject & topic management with custom colors and exam dates
- ✅ Smart study plan generation with difficulty sorting & revision days
- ✅ Daily task toggle with real-time progress tracking
- ✅ Plan regeneration (partial or full modes)
- ✅ AI plan optimization with actionable suggestions
- ✅ AI-generated study insights from completion patterns
- ✅ Rich multi-page PDF export with charts, analytics & daily schedule
- ✅ Progress visualization (progress bars, stat cards)
- ✅ Responsive SaaS-style UI with dark mode design system

---

## 🔐 Security Notes

- Passwords hashed with bcryptjs (12 salt rounds)
- JWT expiry configurable via `JWT_EXPIRES_IN` env variable
- All plan/subject routes verify ownership (`user: req.user._id`)
- Token auto-cleared on 401 with redirect to login

---

## 🚀 Deployment

### Backend (Railway / Render)
1. Set env vars: `MONGO_URI`, `JWT_SECRET`, `NODE_ENV=production`, `CLIENT_URL`
2. Optionally set `OPENAI_API_KEY` for AI features
3. `npm start`

### Frontend (Vercel / Netlify)
1. Set `VITE_API_URL` if not using proxy
2. Update `axios.js` baseURL to point to deployed backend
3. `npm run build` → deploy `dist/`

---

## 📋 Changelog

### Latest — April 2026
- **Enhanced PDF Export**: Completely redesigned from a simple dark-themed layout to a clean, light-themed professional document.
  - Added **progress circle indicators** (tasks, days, hours completed) on the cover page
  - Added **Subject Breakdown page** with per-subject progress bars and hours tracking
  - Added **Analytics page** with bar charts, weekly breakdown table, and auto-generated study insights
  - Tasks in the daily schedule are now **grouped by subject** with color-coded headers
  - Completed tasks show a **strikethrough** style; missed tasks show in red
  - PDF now includes proper document metadata (title, author, subject)
  - **Footer** updated to show student name + plan title on all pages
- **AI Optimize** endpoint added (`POST /api/ai/optimize`)
- **Plan Insights** endpoint added (`GET /api/studyplan/insights`)
- **Plan Regeneration** endpoint added (`POST /api/studyplan/regenerate`)
- Dashboard updated with AI Optimize button, Regenerate button, and Export PDF button
- Tailwind CSS SaaS-style design system applied across all pages

### Previous
- Initial MVP: Auth, subject/topic CRUD, plan generation, task toggle
- Basic PDF export (single dark-themed layout)
- Progress bar component
