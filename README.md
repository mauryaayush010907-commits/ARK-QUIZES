# ARK-QUIZES — Live Quiz Command Center

ARK-QUIZES is a production-oriented **quiz management and live competition platform**. Hosts author scheduled exams, run real-time rooms, and crown fastest-answer winners. Participants join with a human-friendly quiz code. Scoring, timers, uniqueness and first-correct logic are always decided on the server — never by the browser.

This repository contains:

- A React (Vite) command-center UI
- A Node.js / Express / MongoDB / Socket.IO API
- A browser persistence engine so the UI is fully usable without a running database during local demos

When `VITE_API_URL` is not set, the client stores users, quizzes, questions, attempts, answers, teams and game winners in `localStorage` and synchronises live events across tabs with `BroadcastChannel` + the Web Locks API. That is **not mock data** — empty databases stay empty, and every chart is computed from records you actually create.

---

## Features

- JWT-style authentication with hashed passwords and role-based routes (`admin`, `student`)
- Three quiz modes: **Scheduled**, **Live**, **Fastest-answer game**
- Quiz lifecycle: `DRAFT → SCHEDULED → LIVE → COMPLETED` or `SCHEDULED → EXPIRED`
- Unique quiz codes (`QUIZ-7X29`)
- Multiple-choice question editor, reorder, duplicate, JSON/CSV import with validation
- Server-authoritative timers (page refresh, late answers and expired windows are rejected)
- Live lobby, simultaneous question broadcast, live answer statistics, leaderboard
- Atomic first-correct winner (`quizId + questionId` uniqueness)
- Individual and team play (one answer per team per question)
- Admin analytics from stored records (empty states when there is no data)
- Anti-cheat: identity, membership, duplicate answers, inactive questions, client timestamps ignored

---

## Technology stack

**Frontend:** React 19, Vite, Tailwind CSS 4, React Router, Axios, Recharts, Lucide  
**Backend:** Node.js, Express, MongoDB, Mongoose, Socket.IO, JWT, bcryptjs, Helmet, rate limiting  
**Realtime:** Socket.IO rooms `quiz:<quizId>` in production; `BroadcastChannel` in the local engine

---

## Architecture

```
Host / participant UI  ──REST──►  Express API  ──►  MongoDB
                       ──WS───►  Socket.IO     ──►  quiz:<id> rooms
```

MongoDB is the source of truth in production. Socket.IO never replaces persistence.

Important uniqueness constraints:

- `Quiz.quizCode` unique
- `Attempt (quizId, userId)` unique
- `Answer (quizId, questionId, participantId)` unique
- `GameWinner (quizId, questionId)` unique — this is what makes first-correct atomic

### Socket events

`quiz:join` · `quiz:participantJoined` · `quiz:participantLeft` · `quiz:start` · `quiz:question` · `quiz:questionUpdated` · `quiz:answer` · `quiz:answerStats` · `quiz:timer` · `quiz:questionEnded` · `quiz:nextQuestion` · `quiz:winner` · `quiz:end` · `quiz:leaderboard`

Correct answers are never broadcast to participants while a question is still open.

---

## Folder structure

```
├── src/                     React client (Vite)
│   ├── engine/              Authoritative client engine (local persistence)
│   ├── pages/admin|student|auth
│   ├── layouts/ components/ context/ hooks/
│   └── Application.jsx
├── server/                  Express + Socket.IO API
│   ├── models/ controllers/ middleware/ routes/ sockets/
│   └── server.js
├── public/ & src/assets/    Brand imagery
└── README.md
```

---

## Installation

```bash
# Client
npm install
npm run dev

# API
cd server
cp .env.example .env
npm install
npm run dev
```

Client default: `http://localhost:5173`  
API default: `http://localhost:5000`

The UI uses **HashRouter** (`#/admin`, `#/play`) so it also works when served as a single static file.

---

## Environment variables

### Backend (`server/.env`)

| Name | Purpose |
| --- | --- |
| `MONGO_URI` | MongoDB connection string (Atlas or local) |
| `JWT_SECRET` | Signing secret for access tokens |
| `PORT` | HTTP port (default `5000`) |
| `CLIENT_URL` | Allowed CORS / Socket.IO origin(s), comma-separated |
| `NODE_ENV` | `development` or `production` |

Never put `MONGO_URI` or `JWT_SECRET` in the frontend.

### Frontend

| Name | Purpose |
| --- | --- |
| `VITE_API_URL` | Public API origin, e.g. `https://ARK-QUIZES-api.onrender.com/api` |

The current React application uses the built-in local engine. `VITE_API_URL` is documented for a production API adapter but is not currently consumed by the frontend; the Express API can be run and called independently.

---

## Quiz integrity monitoring

The client records browser-level signals during active scheduled attempts and live/game sessions: a hidden document, sustained window blur, fullscreen exit when fullscreen was already active, and in-app navigation away from an active quiz. The first confirmed event is deduplicated, stored as `CHEATING`, and terminates the attempt. Selecting/changing/submitting answers and ordinary quiz controls do not create events. A heartbeat only synchronizes the active session; network loss or a missed heartbeat is never a violation. A normal page refresh by itself is not classified as leaving the quiz.

The Mongo-backed API stores a session ID, immutable event history, termination reason/time, and `terminatedBy` on the existing `Attempt` (scheduled) and `Participant` (live/game) records. It exposes authenticated `POST /api/attempts/:attemptId/heartbeat`, `POST /api/attempts/:attemptId/integrity-events`, admin-only `GET /api/quizzes/:quizId/integrity`, and student-owned `GET /api/quizzes/:quizId/my-integrity`. Termination and event persistence are one database update; live/game alerts are emitted afterward to an owner-verified admin-only Socket.IO room. The first violation ends the attempt, and answer/save/submit/rejoin paths reject terminated records.

**Production limitation:** The SPA in this checkout still uses localStorage and BroadcastChannel; it does not call these REST routes or connect a Socket.IO client. Its local integrity records support the demo workflow but are not tamper-resistant, shared across devices, or production-authoritative. The MongoDB endpoints and admin-room event path are implemented, but full production behavior requires connecting the React auth/data layer to the server. Browser APIs cannot identify every mobile OS overlay, split-screen state, notification, call, or app switch unless they expose a hidden/inactive page state.

---

## MongoDB Atlas

1. Create a free cluster.
2. Add a database user and allow your backend IP (or `0.0.0.0/0` for a first deploy).
3. Copy the `mongodb+srv://…` URI into `MONGO_URI`.
4. Indexes in `server/models/index.js` are created automatically.

---

## Admin account

There is no seeded admin and no fake participants.

1. Open the app → **Create account**
2. Choose **Host / Admin**
3. Sign in and create a quiz

Register a second **Participant** account (or another browser profile / incognito) to join with the quiz code.

---

## Running a competition

### Scheduled

Create a quiz → add questions → set start/end/duration → publish. Participants can start only inside the window. When `endTime` passes, status becomes `EXPIRED`, in-progress attempts finalize, and new starts are blocked.

### Live

Create (mode Live) → questions → **Open lobby** → participants join with the code → **Start quiz** → **Start question**. Everyone receives the item at once. Watch live stats, then **Next** / **End quiz**.

### Fastest answer

Same as live, mode **Fastest answer**. The first *correct* payload accepted by the server writes `GameWinner`. A unique index on `(quizId, questionId)` makes a second correct answer unable to steal the win.

---

## API overview

```
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me

POST /api/quizzes
GET  /api/quizzes
GET  /api/quizzes/:id
PUT  /api/quizzes/:id
DELETE /api/quizzes/:id
POST /api/quizzes/:id/start
POST /api/quizzes/:id/end

POST /api/quizzes/:quizId/questions
PUT  /api/questions/:id
DELETE /api/questions/:id
PATCH /api/quizzes/:quizId/questions/reorder
POST /api/quizzes/:quizId/questions/import

POST /api/quizzes/join
GET  /api/quizzes/:quizId/participants
POST /api/quizzes/:quizId/start-attempt
POST /api/quizzes/:quizId/answer
POST /api/quizzes/:quizId/submit
GET  /api/quizzes/:quizId/results
GET  /api/quizzes/:quizId/leaderboard

GET  /api/admin/analytics
GET  /api/admin/quizzes/:quizId/analytics
GET  /api/health
```

---

## Deployment

### Frontend (Vercel)

- Root directory: repository root (Vite app)
- Build: `npm run build`
- Output: `dist`
- Set `VITE_API_URL` to the public API URL
- Hash routes do not need SPA rewrites; for Browser history you would add a rewrite to `index.html`

### Backend (Render)

- Root: `server/`
- Start: `npm start`
- Set `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL` (your Vercel origin), `NODE_ENV=production`
- Socket.IO will use the same origin/CORS config — do not hardcode `localhost`

### Database

MongoDB Atlas. Confirm the Render outbound IPs (or `0.0.0.0/0`) are allowed.

---

## Known limitations

- The demo UI engine persists in the browser. Clearing site data wipes that local database.
- Image questions currently accept a URL rather than a file upload pipeline.
- Question types are multiple-choice in this version.
- Production Socket.IO sticky sessions are recommended if you scale to multiple API instances.

---

## License

Private / unlicensed unless otherwise agreed.
