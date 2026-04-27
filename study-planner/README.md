# 📚 StudyFlow — AI-Powered Study Planner

A production-ready MVP of a full-stack study planner with JWT auth, smart plan generation, and progress tracking.

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
│   │   └── studyplan.js      # Generate, fetch, update tasks, delete
│   ├── controllers/
│   │   ├── authController.js       # JWT sign/verify, signup/login logic
│   │   ├── subjectController.js    # Subject & topic CRUD handlers
│   │   └── studyPlanController.js  # Plan generation algorithm + task toggle
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
    │       └── Dashboard.jsx    # Daily plan view + progress tracking
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
# Edit .env — set MONGO_URI and JWT_SECRET

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
| Method | Endpoint             | Description       |
|--------|---------------------|-------------------|
| POST   | /api/auth/signup    | Register          |
| POST   | /api/auth/login     | Login, get JWT    |
| GET    | /api/auth/me        | Current user      |
| PATCH  | /api/auth/update-hours | Update daily hours |

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
| Method | Endpoint                                        | Description           |
|--------|------------------------------------------------|-----------------------|
| POST   | /api/studyplan/generate                         | Generate new plan     |
| GET    | /api/studyplan                                  | Get active plan       |
| GET    | /api/studyplan/today                            | Today's tasks only    |
| PATCH  | /api/studyplan/task/:planId/:dayId/:taskId      | Toggle task complete  |
| DELETE | /api/studyplan                                  | Delete active plan    |

---

## 🧠 Plan Generation Algorithm

1. **Fetch** all topics across selected subjects
2. **Sort** by exam proximity (closest exam first) then difficulty (hard first)
3. **Distribute** topics across days filling up to `dailyHours`
4. **Split** topics that exceed remaining daily hours into parts
5. **Insert revision days** every 4th day — recaps the 3 prior study days
6. Store complete plan in MongoDB for persistent access

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
2. `npm start`

### Frontend (Vercel / Netlify)
1. Set `VITE_API_URL` if not using proxy
2. Update `axios.js` baseURL to point to deployed backend
3. `npm run build` → deploy `dist/`

---

## ✨ Bonus Features (Roadmap)

- [x] AI plan optimization via Claude API (or OpenAI with fallback)
- [x] Weak topic detection from completion patterns
- [x] Charts (recharts) for progress visualization
- [x] Email reminders (Nodemailer)
- [ ] Pomodoro timer integration
- [x] Export plan as PDF
