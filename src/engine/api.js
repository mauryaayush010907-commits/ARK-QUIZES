import { getState, mutate, emit, oid, now, clone } from "./store.js";

const TOKEN_TTL = 1000 * 60 * 60 * 24 * 7;
const INTEGRITY_DEDUPE_MS = 3000;
const INTEGRITY_EVENT_LIMIT = 100;
const quizSessionIds = new Map();
const INTEGRITY_REASONS = {
  TAB_SWITCH: "Quiz page became hidden",
  PAGE_HIDDEN: "Quiz page became hidden",
  WINDOW_BLUR: "Quiz window lost focus",
  FULLSCREEN_EXIT: "Student exited fullscreen mode during the quiz",
  PAGE_LEFT: "Student left the active quiz page",
};

function createSessionId() {
  return globalThis.crypto?.randomUUID?.() || `quiz-session-${oid()}-${Math.random().toString(36).slice(2)}`;
}

export function getQuizSessionId(quizId) {
  if (quizSessionIds.has(quizId)) return quizSessionIds.get(quizId);
  const key = `ARK-QUIZES.integrity-session.${quizId}`;
  try {
    const existing = sessionStorage.getItem(key);
    const navigationType = performance.getEntriesByType("navigation")[0]?.type;
    const sessionId = existing && navigationType === "reload" ? existing : createSessionId();
    sessionStorage.setItem(key, sessionId);
    quizSessionIds.set(quizId, sessionId);
    return sessionId;
  } catch {
    if (!quizSessionIds.has(quizId)) quizSessionIds.set(quizId, createSessionId());
    return quizSessionIds.get(quizId);
  }
}

function apiError(message, status = 400, extra = {}) {
  const err = new Error(message);
  err.status = status;
  err.extra = extra;
  return err;
}

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function publicUser(u) {
  if (!u) return null;
  return {
    _id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    avatarColor: u.avatarColor,
    createdAt: u.createdAt,
  };
}

function signToken(user) {
  const payload = { id: user._id, role: user.role, exp: now() + TOKEN_TTL };
  return btoa(JSON.stringify(payload));
}

function readToken(token) {
  try {
    const payload = JSON.parse(atob(token));
    if (!payload?.id || payload.exp < now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getSessionUser(token) {
  const payload = readToken(token);
  if (!payload) return null;
  const user = getState().users.find((u) => u._id === payload.id);
  return publicUser(user);
}

export function requireUser(token) {
  const user = getSessionUser(token);
  if (!user) throw apiError("Authentication required", 401);
  const full = getState().users.find((u) => u._id === user._id);
  return full;
}

export function requireAdmin(token) {
  const user = requireUser(token);
  if (user.role !== "admin") throw apiError("Admin access required", 403);
  return user;
}

const COLORS = ["#7c6cff", "#2ee9d0", "#f5c542", "#ff5d7a", "#8bdc6a", "#4f7dff", "#ff8a4c"];
export async function register({ name, email, password, role }) {
  if (!name?.trim()) throw apiError("Name is required");
  if (!email?.trim()) throw apiError("Email is required");
  if (!password || password.length < 6) throw apiError("Password must be at least 6 characters");
  const cleanEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw apiError("Enter a valid email");
  const db = getState();
  if (db.users.some((u) => u.email === cleanEmail)) throw apiError("An account with this email already exists");
  const allowedRole = role === "admin" ? "admin" : "student";
  const salt = oid("s");
  const passwordHash = await sha256(password + salt);
  const user = {
    _id: oid("u"),
    name: name.trim(),
    email: cleanEmail,
    passwordHash,
    salt,
    role: allowedRole,
    avatarColor: COLORS[db.users.length % COLORS.length],
    createdAt: now(),
  };
  mutate((s) => s.users.push(user));
  const token = signToken(user);
  emit("auth:register", { userId: user._id, role: user.role });
  return { token, user: publicUser(user) };
}

export async function login({ email, password }) {
  const cleanEmail = (email || "").trim().toLowerCase();
  const user = getState().users.find((u) => u.email === cleanEmail);
  if (!user) throw apiError("Invalid email or password", 401);
  const hash = await sha256(password + user.salt);
  if (hash !== user.passwordHash) throw apiError("Invalid email or password", 401);
  const token = signToken(user);
  emit("auth:login", { userId: user._id });
  return { token, user: publicUser(user) };
}

export function generateQuizCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  const code = `QUIZ-${s}`;
  if (getState().quizzes.some((q) => q.quizCode === code)) return generateQuizCode();
  return code;
}

export function generateTeamCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `TEAM-${s}`;
}

export function computeQuizStatus(quiz, t = now()) {
  if (!quiz) return "DRAFT";
  if (["CANCELLED", "COMPLETED", "DRAFT"].includes(quiz.status)) return quiz.status;
  if (quiz.mode === "scheduled") {
    const start = quiz.startTime ? new Date(quiz.startTime).getTime() : 0;
    const end = quiz.endTime ? new Date(quiz.endTime).getTime() : 0;
    if (end && t > end) return "EXPIRED";
    if (start && t >= start && (!end || t <= end)) return "LIVE";
    return "SCHEDULED";
  }
  return quiz.status;
}

export function lifecycleTick() {
  const t = now();
  let changed = false;
  mutate((s) => {
    s.quizzes.forEach((q) => {
      const next = computeQuizStatus(q, t);
      if (next !== q.status && q.status !== "CANCELLED" && q.status !== "COMPLETED" && q.status !== "DRAFT") {
        q.status = next;
        q.updatedAt = t;
        changed = true;
      }
      if (q.mode === "scheduled" && q.status === "EXPIRED") {
        s.attempts.forEach((a) => {
          if (a.quizId === q._id && a.status === "in_progress") {
            finalizeAttempt(s, a, t, "expired");
            changed = true;
          }
        });
      }
      if ((q.mode === "live" || q.mode === "game") && q.status === "LIVE" && q.questionStartedAt && q.currentQuestionId && !q.questionPaused) {
        const question = s.questions.find((qs) => qs._id === q.currentQuestionId);
        const limit = (question?.timeLimit || q.questionTimeLimit || 30) * 1000;
        if (t >= q.questionStartedAt + limit) {
          endQuestionInternal(s, q, t);
          changed = true;
        }
      }
    });
    s.attempts.forEach((a) => {
      if (a.status === "in_progress" && a.expiresAt && t >= a.expiresAt) {
        finalizeAttempt(s, a, t, "expired");
        changed = true;
      }
    });
    // Only write when something actually changed — never overwrite other tabs' data needlessly.
    if (!changed) return false;
  });
  if (changed) emit("lifecycle:tick", {});
}

function appendIntegrityEvent(state, record, type, clientTimestamp, duration) {
  const quiz = state.quizzes.find((item) => item._id === record.quizId);
  const user = state.users.find((item) => item._id === record.userId);
  if (!quiz || !user) return null;
  const violationCount = (record.integrityViolationCount || 0) + 1;
  const reason = INTEGRITY_REASONS[type];
  const event = {
    _id: oid("ie"),
    quizId: quiz._id,
    attemptId: record._id,
    studentId: user._id,
    sessionId: record.sessionId,
    type,
    reason,
    timestamp: now(),
    clientTimestamp,
    ...(duration === undefined ? {} : { duration }),
    receivedAt: now(),
  };
  record.integrityViolationCount = violationCount;
  record.integrityStatus = "CHEATING";
  record.attemptStatus = "TERMINATED";
  record.terminationReason = type;
  record.terminatedAt = now();
  record.terminatedBy = "INTEGRITY_SYSTEM";
  record.integrityViolation = event;
  record.integrityEvents = [...(record.integrityEvents || []), event].slice(-INTEGRITY_EVENT_LIMIT);
  record.lastIntegrityEventAt = now();
  if (["in_progress", "submitted", "expired"].includes(record.status)) {
    record.status = "terminated";
    record.submittedAt = record.terminatedAt;
    record.timeTaken = Math.max(0, record.terminatedAt - record.startedAt);
  } else {
    record.status = "terminated";
  }
  return ["live", "game"].includes(quiz.mode) && quiz.status === "LIVE"
    ? {
        type: "CHEATING_ALERT",
        quizId: quiz._id,
        attemptId: record._id,
        studentId: user._id,
        studentName: user.name,
        eventType: type,
        reason,
        violationCount,
        integrityStatus: record.integrityStatus,
        attemptStatus: record.attemptStatus,
        terminationReason: type,
        timestamp: event.timestamp,
        eventId: event._id,
      }
    : null;
}

function activeIntegrityRecord(state, record, userId) {
  if (!record || record.userId !== userId) return false;
  const quiz = state.quizzes.find((item) => item._id === record.quizId);
  if (!quiz) return false;
  if (["in_progress", "submitted", "expired"].includes(record.status)) {
    return record.status === "in_progress" && record.attemptStatus !== "TERMINATED" && quiz.mode === "scheduled" &&
      computeQuizStatus(quiz) === "LIVE" && (!record.expiresAt || record.expiresAt > now());
  }
  return ["live", "game"].includes(quiz.mode) && quiz.status === "LIVE" && record.attemptStatus !== "TERMINATED";
}

function integrityRecordById(state, attemptId) {
  return state.attempts.find((item) => item._id === attemptId) ||
    state.participants.find((item) => item._id === attemptId);
}

export function recordIntegrityEvent(token, attemptId, payload = {}) {
  const user = requireUser(token);
  if (typeof payload.sessionId !== "string" || payload.sessionId.length < 16 || payload.sessionId.length > 128) {
    throw apiError("A valid quiz session ID is required");
  }
  const reason = INTEGRITY_REASONS[payload.type];
  if (!reason) throw apiError("Unsupported integrity event");
  const timestamp = new Date(payload.clientTimestamp || payload.timestamp).getTime();
  const currentTime = now();
  if (!Number.isFinite(timestamp) || timestamp < currentTime - 86400000 || timestamp > currentTime + 30000) {
    throw apiError("Event timestamp is outside the accepted window");
  }
  if (payload.duration !== undefined && (!Number.isFinite(payload.duration) || payload.duration < 0 || payload.duration > 3600)) {
    throw apiError("Event duration is invalid");
  }

  let result;
  mutate((s) => {
    const record = integrityRecordById(s, attemptId);
    if (record && (record.status === "terminated" || record.attemptStatus === "TERMINATED")) {
      throw apiError("This quiz attempt has already been terminated.", 409, { code: "ATTEMPT_TERMINATED" });
    }
    if (!activeIntegrityRecord(s, record, user._id)) throw apiError("Active quiz attempt not found", 404);
    if (record.sessionId !== payload.sessionId) {
      throw apiError("Another active quiz session owns this attempt.", 409, { code: "SESSION_MISMATCH" });
    }
    const activeSince = record.startedAt || record.joinedAt;
    if (activeSince && timestamp < activeSince) throw apiError("Event timestamp predates this attempt");
    if (record.lastIntegrityEventAt && currentTime - record.lastIntegrityEventAt < INTEGRITY_DEDUPE_MS) {
      result = { accepted: false, duplicate: true, integrityStatus: record.integrityStatus || "CLEAN", violationCount: record.integrityViolationCount || 0 };
      return;
    }
    const alert = appendIntegrityEvent(s, record, payload.type, timestamp, payload.duration);
    record.lastHeartbeatAt = currentTime;
    result = {
      success: true,
      accepted: true,
      integrityStatus: record.integrityStatus,
      attemptStatus: record.attemptStatus,
      terminationReason: record.terminationReason,
      violationCount: record.integrityViolationCount,
      lastViolation: record.integrityEvents.at(-1),
      alert,
    };
  });
  if (result?.alert) {
    emit("CHEATING_ALERT", result.alert);
    emit("quiz:integrityUpdated", result.alert);
  }
  return result;
}

export function heartbeatIntegrity(token, attemptId, sessionId) {
  const user = requireUser(token);
  if (typeof sessionId !== "string" || sessionId.length < 16 || sessionId.length > 128) {
    throw apiError("A valid quiz session ID is required");
  }
  let result;
  mutate((s) => {
    const record = integrityRecordById(s, attemptId);
    if (!activeIntegrityRecord(s, record, user._id)) {
      if (record && (record.status === "terminated" || record.attemptStatus === "TERMINATED")) {
        throw apiError("This quiz attempt has already been terminated.", 409, { code: "ATTEMPT_TERMINATED" });
      }
      throw apiError("Active quiz attempt not found", 404);
    }
    if (record.sessionId && record.sessionId !== sessionId) {
      throw apiError("Another active quiz session owns this attempt.", 409, { code: "SESSION_MISMATCH" });
    }
    record.sessionId = sessionId;
    record.lastHeartbeatAt = now();
    result = { ok: true, serverNow: now() };
  });
  return result;
}

export function getIntegritySnapshot(token, attemptId) {
  const user = requireUser(token);
  const record = integrityRecordById(getState(), attemptId);
  if (!record || record.userId !== user._id) throw apiError("Quiz attempt not found", 404);
  return {
    integrityStatus: record.integrityStatus || "CLEAN",
    violationCount: record.integrityViolationCount || 0,
    events: clone(record.integrityEvents || []),
    attemptStatus: record.attemptStatus || "ACTIVE",
    terminationReason: record.terminationReason || null,
    terminatedAt: record.terminatedAt || null,
  };
}

function scoreAttempt(s, attempt) {
  const quiz = s.quizzes.find((q) => q._id === attempt.quizId);
  const questions = s.questions.filter((q) => q.quizId === attempt.quizId);
  const answers = s.answers.filter((a) => a.attemptId === attempt._id);
  let score = 0;
  let correct = 0;
  let incorrect = 0;
  answers.forEach((ans) => {
    const q = questions.find((x) => x._id === ans.questionId);
    const pts = q?.points ?? quiz?.marksPerQuestion ?? 1;
    const neg = q?.negativePoints ?? quiz?.negativePoints ?? 0;
    if (ans.isCorrect) {
      score += pts;
      correct += 1;
    } else {
      incorrect += 1;
      if (quiz?.negativeMarking) score -= neg;
    }
  });
  attempt.score = score;
  attempt.correctCount = correct;
  attempt.incorrectCount = incorrect;
  attempt.attemptedCount = answers.length;
  const participant = s.participants.find((p) => p._id === attempt.participantId);
  if (participant) {
    participant.score = score;
    participant.correctCount = correct;
    participant.incorrectCount = incorrect;
  }
}

function finalizeAttempt(s, attempt, t, status) {
  attempt.status = status;
  attempt.attemptStatus = status === "expired" ? "EXPIRED" : "SUBMITTED";
  attempt.submittedAt = t;
  attempt.timeTaken = Math.max(0, t - attempt.startedAt);
  scoreAttempt(s, attempt);
}

function sanitizeQuiz(quiz, role) {
  if (!quiz) return null;
  const copy = clone(quiz);
  copy.computedStatus = computeQuizStatus(quiz);
  if (role !== "admin") {
    delete copy.internalNotes;
  }
  return copy;
}

function sanitizeQuestion(q, hideAnswer) {
  const copy = clone(q);
  if (hideAnswer) {
    delete copy.correctOptionId;
    delete copy.explanation;
  }
  return copy;
}

export function createQuiz(token, data) {
  const admin = requireAdmin(token);
  if (!data?.title?.trim()) throw apiError("Quiz title is required");
  const mode = ["scheduled", "live", "game"].includes(data.mode) ? data.mode : "scheduled";
  const quiz = {
    _id: oid("q"),
    title: data.title.trim(),
    description: (data.description || "").trim(),
    mode,
    status: data.publish ? (mode === "scheduled" ? "SCHEDULED" : "DRAFT") : "DRAFT",
    startTime: data.startTime || null,
    endTime: data.endTime || null,
    duration: Number(data.duration) || 30,
    marksPerQuestion: Number(data.marksPerQuestion) || 1,
    negativeMarking: Boolean(data.negativeMarking),
    negativePoints: Number(data.negativePoints) || 0,
    maxParticipants: data.maxParticipants ? Number(data.maxParticipants) : null,
    quizCode: (data.quizCode || generateQuizCode()).toUpperCase(),
    instructions: data.instructions || "",
    teamMode: Boolean(data.teamMode),
    showAnswersAfter: Boolean(data.showAnswersAfter),
    showLeaderboard: data.showLeaderboard !== false,
    createdBy: admin._id,
    createdAt: now(),
    updatedAt: now(),
    currentQuestionId: null,
    currentQuestionIndex: -1,
    questionStartedAt: null,
    questionTimeLimit: Number(data.questionTimeLimit) || 30,
    questionPaused: false,
    pausedRemaining: null,
    lobbyOpen: false,
    startedAt: null,
    endedAt: null,
  };
  if (getState().quizzes.some((q) => q.quizCode === quiz.quizCode)) {
    throw apiError("Quiz code already exists");
  }
  if (mode === "scheduled" && data.publish) {
    if (!quiz.startTime || !quiz.endTime) throw apiError("Scheduled quizzes need start and end times");
    if (new Date(quiz.endTime).getTime() <= new Date(quiz.startTime).getTime()) {
      throw apiError("End time must be after start time");
    }
    quiz.status = "SCHEDULED";
  }
  mutate((s) => s.quizzes.push(quiz));
  emit("quiz:created", { quizId: quiz._id });
  return clone(quiz);
}

export function updateQuiz(token, id, data) {
  requireAdmin(token);
  const quiz = getState().quizzes.find((q) => q._id === id);
  if (!quiz) throw apiError("Quiz not found", 404);
  if (["LIVE", "COMPLETED", "EXPIRED"].includes(quiz.status) && data.mode && data.mode !== quiz.mode) {
    throw apiError("Cannot change mode of an active or finished quiz");
  }
  const locked = ["LIVE", "COMPLETED", "EXPIRED", "CANCELLED"].includes(quiz.status);
  mutate((s) => {
    const q = s.quizzes.find((x) => x._id === id);
    const assignable = [
      "title",
      "description",
      "instructions",
      "showAnswersAfter",
      "showLeaderboard",
    ];
    if (!locked) {
      assignable.push(
        "mode",
        "startTime",
        "endTime",
        "duration",
        "marksPerQuestion",
        "negativeMarking",
        "negativePoints",
        "maxParticipants",
        "teamMode",
        "questionTimeLimit",
        "quizCode"
      );
    }
    assignable.forEach((k) => {
      if (data[k] !== undefined) q[k] = data[k];
    });
    if (data.status && ["DRAFT", "SCHEDULED", "CANCELLED"].includes(data.status) && !["LIVE", "COMPLETED"].includes(q.status)) {
      q.status = data.status;
    }
    if (data.publish && q.status === "DRAFT") {
      q.status = q.mode === "scheduled" ? "SCHEDULED" : "DRAFT";
    }
    q.updatedAt = now();
  });
  emit("quiz:updated", { quizId: id });
  return getQuiz(token, id);
}

export function deleteQuiz(token, id) {
  requireAdmin(token);
  const quiz = getState().quizzes.find((q) => q._id === id);
  if (!quiz) throw apiError("Quiz not found", 404);
  if (quiz.status === "LIVE") throw apiError("End the live quiz before deleting it");
  mutate((s) => {
    s.quizzes = s.quizzes.filter((q) => q._id !== id);
    s.questions = s.questions.filter((q) => q.quizId !== id);
    s.participants = s.participants.filter((p) => p.quizId !== id);
    s.teams = s.teams.filter((t) => t.quizId !== id);
    s.attempts = s.attempts.filter((a) => a.quizId !== id);
    s.answers = s.answers.filter((a) => a.quizId !== id);
    s.gameWinners = s.gameWinners.filter((g) => g.quizId !== id);
  });
  emit("quiz:deleted", { quizId: id });
  return { ok: true };
}

export function duplicateQuiz(token, id) {
  requireAdmin(token);
  const quiz = getState().quizzes.find((q) => q._id === id);
  if (!quiz) throw apiError("Quiz not found", 404);
  const copy = createQuiz(token, {
    ...quiz,
    title: `${quiz.title} (Copy)`,
    quizCode: generateQuizCode(),
    publish: false,
  });
  const questions = getState().questions.filter((q) => q.quizId === id).sort((a, b) => a.order - b.order);
  questions.forEach((q) => {
    addQuestion(token, copy._id, { ...q, quizId: copy._id });
  });
  return getQuiz(token, copy._id, { includeQuestions: true });
}

export function listQuizzes(token, query = {}) {
  const user = requireUser(token);
  lifecycleTick();
  const {
    search = "",
    mode,
    status,
    page = 1,
    limit = 10,
    sort = "createdAt",
    dir = "desc",
    mine,
  } = query;
  let rows = getState().quizzes.map((q) => ({
    ...q,
    computedStatus: computeQuizStatus(q),
    questionCount: getState().questions.filter((qs) => qs.quizId === q._id).length,
    participantCount: getState().participants.filter((p) => p.quizId === q._id).length,
    teamCount: getState().teams.filter((t) => t.quizId === q._id).length,
  }));
  if (user.role !== "admin" || mine) {
    const myIds = new Set(
      getState()
        .participants.filter((p) => p.userId === user._id)
        .map((p) => p.quizId)
    );
    rows = rows.filter((q) => myIds.has(q._id) || (user.role === "student" && ["SCHEDULED", "LIVE"].includes(q.computedStatus)));
  }
  const q = search.trim().toLowerCase();
  if (q) {
    rows = rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.quizCode.toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q)
    );
  }
  if (mode) rows = rows.filter((r) => r.mode === mode);
  if (status) rows = rows.filter((r) => r.computedStatus === status || r.status === status);
  rows.sort((a, b) => {
    const av = a[sort] ?? 0;
    const bv = b[sort] ?? 0;
    if (av < bv) return dir === "asc" ? -1 : 1;
    if (av > bv) return dir === "asc" ? 1 : -1;
    return 0;
  });
  const total = rows.length;
  const start = (Number(page) - 1) * Number(limit);
  const items = rows.slice(start, start + Number(limit));
  return { items, total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit) || 1) };
}

export function getQuiz(token, id, opts = {}) {
  const user = requireUser(token);
  lifecycleTick();
  const quiz = getState().quizzes.find((q) => q._id === id);
  if (!quiz) throw apiError("Quiz not found", 404);
  const questions = getState()
    .questions.filter((q) => q.quizId === id)
    .sort((a, b) => a.order - b.order)
    .map((q) => sanitizeQuestion(q, user.role !== "admin"));
  const result = {
    ...sanitizeQuiz(quiz, user.role),
    questionCount: questions.length,
    participantCount: getState().participants.filter((p) => p.quizId === id).length,
    teamCount: getState().teams.filter((t) => t.quizId === id).length,
  };
  if (opts.includeQuestions) result.questions = questions;
  return result;
}

export function lookupByCode(code) {
  lifecycleTick();
  const quiz = getState().quizzes.find((q) => q.quizCode === (code || "").trim().toUpperCase());
  if (!quiz) throw apiError("Invalid quiz code", 404);
  return {
    _id: quiz._id,
    title: quiz.title,
    mode: quiz.mode,
    status: computeQuizStatus(quiz),
    teamMode: quiz.teamMode,
    quizCode: quiz.quizCode,
    description: quiz.description,
    startTime: quiz.startTime,
    endTime: quiz.endTime,
    lobbyOpen: quiz.lobbyOpen,
  };
}

function assertQuestionPayload(data) {
  if (!data?.text?.trim()) throw apiError("Question text is required");
  const options = (data.options || []).filter((o) => (o.text || o).toString().trim());
  if (options.length < 2) throw apiError("Provide at least two options");
  const normalized = options.map((o, i) => ({
    id: o.id || String.fromCharCode(65 + i),
    text: (o.text || o).toString().trim(),
  }));
  const correct = data.correctOptionId || data.correct;
  if (!normalized.some((o) => o.id === correct)) throw apiError("Select a valid correct answer");
  return { normalized, correct };
}

export function addQuestion(token, quizId, data) {
  requireAdmin(token);
  const quiz = getState().quizzes.find((q) => q._id === quizId);
  if (!quiz) throw apiError("Quiz not found", 404);
  if (["COMPLETED", "EXPIRED", "CANCELLED"].includes(quiz.status)) {
    throw apiError("Cannot add questions to a finished quiz");
  }
  const { normalized, correct } = assertQuestionPayload(data);
  const order =
    data.order ??
    getState().questions.filter((q) => q.quizId === quizId).reduce((m, q) => Math.max(m, q.order), -1) + 1;
  const question = {
    _id: oid("qs"),
    quizId,
    text: data.text.trim(),
    image: data.image || "",
    options: normalized,
    correctOptionId: correct,
    points: Number(data.points) || quiz.marksPerQuestion || 1,
    negativePoints: Number(data.negativePoints) || quiz.negativePoints || 0,
    explanation: data.explanation || "",
    order,
    timeLimit: Number(data.timeLimit) || quiz.questionTimeLimit || 30,
    createdAt: now(),
    updatedAt: now(),
  };
  mutate((s) => s.questions.push(question));
  emit("question:created", { quizId, questionId: question._id });
  return clone(question);
}

export function updateQuestion(token, id, data) {
  requireAdmin(token);
  const question = getState().questions.find((q) => q._id === id);
  if (!question) throw apiError("Question not found", 404);
  const hasAnswers = getState().answers.some((a) => a.questionId === id);
  if (hasAnswers && (data.correctOptionId || data.options || data.text)) {
    const quiz = getState().quizzes.find((q) => q._id === question.quizId);
    if (quiz && ["LIVE", "COMPLETED", "EXPIRED"].includes(quiz.status) && quiz.currentQuestionIndex > question.order) {
      throw apiError("Completed questions are immutable");
    }
  }
  mutate((s) => {
    const q = s.questions.find((x) => x._id === id);
    if (data.text !== undefined) q.text = data.text;
    if (data.image !== undefined) q.image = data.image;
    if (data.explanation !== undefined) q.explanation = data.explanation;
    if (data.points !== undefined) q.points = Number(data.points);
    if (data.negativePoints !== undefined) q.negativePoints = Number(data.negativePoints);
    if (data.timeLimit !== undefined) q.timeLimit = Number(data.timeLimit);
    if (data.order !== undefined) q.order = Number(data.order);
    if (data.options) {
      const { normalized, correct } = assertQuestionPayload({ ...q, ...data, options: data.options, correctOptionId: data.correctOptionId || q.correctOptionId });
      q.options = normalized;
      q.correctOptionId = correct;
    } else if (data.correctOptionId) {
      q.correctOptionId = data.correctOptionId;
    }
    q.updatedAt = now();
  });
  const quiz = getState().quizzes.find((q) => q._id === question.quizId);
  if (quiz?.status === "LIVE" && quiz.currentQuestionId === id) {
    const updated = getState().questions.find((q) => q._id === id);
    emit("quiz:questionUpdated", {
      quizId: quiz._id,
      question: sanitizeQuestion(updated, true),
    });
  }
  emit("question:updated", { questionId: id, quizId: question.quizId });
  return clone(getState().questions.find((q) => q._id === id));
}

export function deleteQuestion(token, id) {
  requireAdmin(token);
  const question = getState().questions.find((q) => q._id === id);
  if (!question) throw apiError("Question not found", 404);
  if (getState().answers.some((a) => a.questionId === id)) {
    throw apiError("Cannot delete a question that already has answers");
  }
  mutate((s) => {
    s.questions = s.questions.filter((q) => q._id !== id);
    s.questions
      .filter((q) => q.quizId === question.quizId)
      .sort((a, b) => a.order - b.order)
      .forEach((q, i) => {
        q.order = i;
      });
  });
  emit("question:deleted", { questionId: id, quizId: question.quizId });
  return { ok: true };
}

export function duplicateQuestion(token, id) {
  requireAdmin(token);
  const q = getState().questions.find((x) => x._id === id);
  if (!q) throw apiError("Question not found", 404);
  return addQuestion(token, q.quizId, { ...q, text: `${q.text}` });
}

export function reorderQuestions(token, quizId, orderedIds) {
  requireAdmin(token);
  mutate((s) => {
    orderedIds.forEach((id, i) => {
      const q = s.questions.find((x) => x._id === id && x.quizId === quizId);
      if (q) q.order = i;
    });
  });
  emit("question:reordered", { quizId });
  return listQuestions(token, quizId);
}

export function listQuestions(token, quizId) {
  const user = requireUser(token);
  const hide = user.role !== "admin";
  return getState()
    .questions.filter((q) => q.quizId === quizId)
    .sort((a, b) => a.order - b.order)
    .map((q) => sanitizeQuestion(q, hide));
}

export function importQuestions(token, quizId, items) {
  requireAdmin(token);
  const valid = [];
  const invalid = [];
  (items || []).forEach((item, index) => {
    try {
      let payload = item;
      if (typeof item === "string") {
        const parts = item.split(",").map((p) => p.trim());
        payload = {
          text: parts[0],
          options: parts.slice(1, 5).map((t, i) => ({ id: String.fromCharCode(65 + i), text: t })),
          correctOptionId: parts[5] || "A",
          points: Number(parts[6]) || undefined,
          timeLimit: Number(parts[7]) || undefined,
        };
      }
      if (payload.options && payload.options.every((o) => typeof o === "string")) {
        payload.options = payload.options.map((t, i) => ({ id: String.fromCharCode(65 + i), text: t }));
      }
      if (payload.correctIndex !== undefined) {
        payload.correctOptionId = String.fromCharCode(65 + Number(payload.correctIndex));
      }
      if (payload.correct && payload.correct.length === 1) payload.correctOptionId = payload.correct.toUpperCase();
      assertQuestionPayload(payload);
      valid.push(payload);
    } catch (err) {
      invalid.push({ index, error: err.message, item });
    }
  });
  const created = valid.map((p) => addQuestion(token, quizId, p));
  return { created: created.length, invalid: invalid.length, errors: invalid, questions: created };
}

function ensureParticipant(s, quiz, user, teamId = null) {
  let p = s.participants.find((x) => x.quizId === quiz._id && x.userId === user._id);
  if (p) return p;
  if (quiz.maxParticipants && s.participants.filter((x) => x.quizId === quiz._id).length >= quiz.maxParticipants) {
    throw apiError("This quiz has reached its participant limit");
  }
  p = {
    _id: oid("p"),
    quizId: quiz._id,
    userId: user._id,
    name: user.name,
    teamId,
    joinedAt: now(),
    score: 0,
    correctCount: 0,
    incorrectCount: 0,
    status: "joined",
    attemptStatus: "ACTIVE",
    sessionId: null,
  };
  s.participants.push(p);
  return p;
}

export function joinQuiz(token, { quizCode, quizId, teamCode, teamName }) {
  const user = requireUser(token);
  lifecycleTick();
  const quiz = quizId
    ? getState().quizzes.find((q) => q._id === quizId)
    : getState().quizzes.find((q) => q.quizCode === (quizCode || "").trim().toUpperCase());
  if (!quiz) throw apiError("Invalid quiz code", 404);
  const status = computeQuizStatus(quiz);
  if (["COMPLETED", "EXPIRED", "CANCELLED"].includes(status)) {
    throw apiError(status === "EXPIRED" ? "This quiz has expired" : "This quiz is no longer accepting participants");
  }
  if (quiz.mode === "scheduled" && status === "SCHEDULED") {
    throw apiError("This quiz has not started yet");
  }
  if ((quiz.mode === "live" || quiz.mode === "game") && !quiz.lobbyOpen && status !== "LIVE") {
    throw apiError("The host has not opened the lobby yet");
  }
  const existing = getState().participants.find((p) => p.quizId === quiz._id && p.userId === user._id);
  if (existing) {
    if (existing.attemptStatus === "TERMINATED") {
      throw apiError("This quiz attempt has been terminated.", 409, { code: "ATTEMPT_TERMINATED" });
    }
    heartbeat(token, quiz._id);
    return {
      quiz: sanitizeQuiz(quiz, user.role),
      participant: existing,
      team: existing.teamId ? getState().teams.find((t) => t._id === existing.teamId) : null,
    };
  }
  let team = null;
  mutate((s) => {
    if (quiz.teamMode) {
      if (teamCode) {
        team = s.teams.find((t) => t.quizId === quiz._id && t.code === teamCode.trim().toUpperCase());
        if (!team) throw apiError("Invalid team code");
        if (!team.members.includes(user._id)) team.members.push(user._id);
      } else if (teamName) {
        team = s.teams.find((t) => t.quizId === quiz._id && t.name.toLowerCase() === teamName.trim().toLowerCase());
        if (!team) {
          team = {
            _id: oid("t"),
            quizId: quiz._id,
            name: teamName.trim(),
            code: generateTeamCode(),
            leaderId: user._id,
            members: [user._id],
            createdAt: now(),
          };
          s.teams.push(team);
        } else if (!team.members.includes(user._id)) {
          team.members.push(user._id);
        }
      } else {
        throw apiError("Join or create a team to continue");
      }
    }
    ensureParticipant(s, quiz, user, team?._id || null);
  });
  const participant = getState().participants.find((p) => p.quizId === quiz._id && p.userId === user._id);
  emit("quiz:participantJoined", {
    quizId: quiz._id,
    participant: { _id: participant._id, name: user.name, teamId: participant.teamId },
  });
  heartbeat(token, quiz._id);
  return {
    quiz: sanitizeQuiz(quiz, user.role),
    participant,
    team,
  };
}

export function heartbeat(token, quizId) {
  const user = requireUser(token);
  mutate((s) => {
    if (!s.presence[quizId]) s.presence[quizId] = {};
    s.presence[quizId][user._id] = now();
    if (user.role === "student") {
      const activeAttempt = s.attempts.find((item) => item.quizId === quizId && item.userId === user._id && item.status === "in_progress");
      const participant = s.participants.find((item) => item.quizId === quizId && item.userId === user._id);
      if (activeAttempt) {
        activeAttempt.lastHeartbeatAt = now();
      }
      if (participant) {
        participant.lastHeartbeatAt = now();
      }
    }
  });
  return { ok: true, serverNow: now() };
}

export function connectedParticipants(quizId) {
  const map = getState().presence[quizId] || {};
  const cutoff = now() - 12000;
  return Object.entries(map)
    .filter(([, ts]) => ts >= cutoff)
    .map(([userId]) => userId);
}

export function listParticipants(token, quizId, query = {}) {
  const user = requireUser(token);
  const search = (query.search || "").toLowerCase();
  const quiz = getState().quizzes.find((item) => item._id === quizId);
  const adminOwnsQuiz = user.role === "admin" && quiz?.createdBy === user._id;
  let rows = getState().participants.filter((p) => p.quizId === quizId);
  if (search) rows = rows.filter((p) => p.name.toLowerCase().includes(search));
  const connected = new Set(connectedParticipants(quizId));
  const teams = getState().teams.filter((t) => t.quizId === quizId);
  const users = getState().users;
  return rows.map((p) => {
    const participant = {
      ...p,
      connected: connected.has(p.userId),
      team: teams.find((t) => t._id === p.teamId) || null,
      email: users.find((u) => u._id === p.userId)?.email,
    };
    if (!adminOwnsQuiz && p.userId !== user._id) {
      delete participant.integrityStatus;
      delete participant.integrityViolationCount;
      delete participant.integrityEvents;
      delete participant.lastIntegrityEventAt;
      delete participant.lastHeartbeatAt;
    }
    return participant;
  });
}

export function getQuizIntegrity(token, quizId) {
  const admin = requireAdmin(token);
  const state = getState();
  const quiz = state.quizzes.find((item) => item._id === quizId && item.createdBy === admin._id);
  if (!quiz) throw apiError("Quiz not found", 404);
  const records = quiz.mode === "scheduled"
    ? state.attempts.filter((attempt) => attempt.quizId === quizId)
    : state.participants.filter((participant) => participant.quizId === quizId);
  return records.map((record) => ({
    attemptId: record._id,
    studentId: record.userId,
    studentName: state.users.find((user) => user._id === record.userId)?.name || record.name || "Student",
    integrityStatus: record.integrityStatus || "CLEAN",
    integrityViolationCount: record.integrityViolationCount || 0,
    integrityEvents: clone(record.integrityEvents || []),
    attemptStatus: record.attemptStatus || "ACTIVE",
    terminationReason: record.terminationReason || null,
    terminatedAt: record.terminatedAt || null,
  }));
}

export function getOwnIntegrity(token, quizId) {
  const user = requireUser(token);
  const state = getState();
  const quiz = state.quizzes.find((item) => item._id === quizId);
  if (!quiz) throw apiError("Quiz not found", 404);
  const record = quiz.mode === "scheduled"
    ? state.attempts.find((item) => item.quizId === quizId && item.userId === user._id)
    : state.participants.find((item) => item.quizId === quizId && item.userId === user._id);
  if (!record) throw apiError("No quiz attempt found", 404);
  return {
    integrityStatus: record.integrityStatus || "CLEAN",
    integrityViolationCount: record.integrityViolationCount || 0,
    integrityEvents: clone(record.integrityEvents || []),
    attemptStatus: record.attemptStatus || "ACTIVE",
    terminationReason: record.terminationReason || null,
    terminatedAt: record.terminatedAt || null,
  };
}

export function listTeams(token, quizId) {
  requireUser(token);
  const teams = getState().teams.filter((t) => t.quizId === quizId);
  const participants = getState().participants.filter((p) => p.quizId === quizId);
  return teams.map((t) => {
    const members = participants.filter((p) => p.teamId === t._id);
    const score = members.reduce((s, m) => s + (m.score || 0), 0);
    return {
      ...t,
      members,
      score,
      memberCount: members.length,
    };
  });
}

export function startAttempt(token, quizId, sessionId = getQuizSessionId(quizId)) {
  const user = requireUser(token);
  lifecycleTick();
  const quiz = getState().quizzes.find((q) => q._id === quizId);
  if (!quiz) throw apiError("Quiz not found", 404);
  const status = computeQuizStatus(quiz);
  if (quiz.mode !== "scheduled") throw apiError("This endpoint is for scheduled quizzes");
  if (status === "EXPIRED") throw apiError("Quiz Expired", 410, { expired: true });
  if (status !== "LIVE") throw apiError("Quiz is not available yet");
  let attempt;
  mutate((s) => {
    const participant = ensureParticipant(s, quiz, user, null);
    attempt = s.attempts.find((a) => a.quizId === quizId && a.userId === user._id);
    if (attempt?.status === "terminated" || attempt?.attemptStatus === "TERMINATED") {
      throw apiError("This quiz attempt has been terminated.", 409, { code: "ATTEMPT_TERMINATED" });
    }
    if (attempt && attempt.status !== "in_progress") {
      throw apiError("You have already submitted this quiz");
    }
    if (attempt?.sessionId && attempt.sessionId !== sessionId) {
      throw apiError("Another active quiz session owns this attempt.", 409, { code: "SESSION_MISMATCH" });
    }
    if (!attempt) {
      const durationMs = (quiz.duration || 30) * 60 * 1000;
      const end = quiz.endTime ? new Date(quiz.endTime).getTime() : now() + durationMs;
      const expiresAt = Math.min(now() + durationMs, end);
      attempt = {
        _id: oid("a"),
        quizId,
        participantId: participant._id,
        userId: user._id,
        startedAt: now(),
        submittedAt: null,
        expiresAt,
        status: "in_progress",
        attemptStatus: "ACTIVE",
        sessionId,
        lastHeartbeatAt: now(),
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        attemptedCount: 0,
        timeTaken: 0,
      };
      s.attempts.push(attempt);
    } else if (!attempt.sessionId) {
      attempt.sessionId = sessionId;
    }
  });
  const questions = listQuestions(token, quizId);
  const answers = getState().answers.filter((a) => a.attemptId === attempt._id);
  emit("attempt:started", { quizId, userId: user._id });
  return {
    attempt: clone(attempt),
    quiz: sanitizeQuiz(quiz, "student"),
    questions,
    answers: answers.map((a) => ({ questionId: a.questionId, selectedOptionId: a.selectedOptionId })),
    serverNow: now(),
  };
}

export function saveScheduledAnswer(token, quizId, questionId, selectedOptionId, sessionId) {
  const user = requireUser(token);
  lifecycleTick();
  const quiz = getState().quizzes.find((q) => q._id === quizId);
  if (!quiz) throw apiError("Quiz not found", 404);
  if (computeQuizStatus(quiz) === "EXPIRED") throw apiError("Quiz Expired", 410);
  const attempt = getState().attempts.find((a) => a.quizId === quizId && a.userId === user._id);
  if (attempt?.status === "terminated" || attempt?.attemptStatus === "TERMINATED") {
    throw apiError("This quiz attempt has been terminated.", 409, { code: "ATTEMPT_TERMINATED" });
  }
  if (attempt?.sessionId !== sessionId) throw apiError("Another active quiz session owns this attempt.", 409, { code: "SESSION_MISMATCH" });
  if (!attempt || attempt.status !== "in_progress") throw apiError("No active attempt");
  if (attempt.expiresAt && now() > attempt.expiresAt) throw apiError("Time is up");
  const question = getState().questions.find((q) => q._id === questionId && q.quizId === quizId);
  if (!question) throw apiError("Question does not belong to this quiz");
  if (!question.options.some((o) => o.id === selectedOptionId)) throw apiError("Invalid option");
  mutate((s) => {
    const existing = s.answers.find((a) => a.attemptId === attempt._id && a.questionId === questionId);
    const isCorrect = selectedOptionId === question.correctOptionId;
    if (existing) {
      existing.selectedOptionId = selectedOptionId;
      existing.isCorrect = isCorrect;
      existing.serverTimestamp = now();
    } else {
      s.answers.push({
        _id: oid("ans"),
        quizId,
        questionId,
        participantId: attempt.participantId,
        teamId: null,
        userId: user._id,
        attemptId: attempt._id,
        selectedOptionId,
        isCorrect,
        isWinner: false,
        serverTimestamp: now(),
        responseTimeMs: now() - attempt.startedAt,
        pointsAwarded: 0,
      });
    }
  });
  return { ok: true, serverNow: now() };
}

export function submitAttempt(token, quizId) {
  const user = requireUser(token);
  lifecycleTick();
  const attempt = getState().attempts.find((a) => a.quizId === quizId && a.userId === user._id);
  if (!attempt) throw apiError("No attempt found");
  if (attempt.status === "terminated" || attempt.attemptStatus === "TERMINATED") {
    throw apiError("This quiz attempt has been terminated.", 409, { code: "ATTEMPT_TERMINATED" });
  }
  if (attempt.status !== "in_progress") return getResults(token, quizId);
  mutate((s) => {
    const a = s.attempts.find((x) => x._id === attempt._id);
    finalizeAttempt(s, a, now(), "submitted");
  });
  emit("attempt:submitted", { quizId, userId: user._id });
  return getResults(token, quizId);
}

export function getResults(token, quizId) {
  const user = requireUser(token);
  const quiz = getState().quizzes.find((q) => q._id === quizId);
  if (!quiz) throw apiError("Quiz not found", 404);
  const attempt = getState().attempts.find((a) => a.quizId === quizId && a.userId === user._id);
  if (!attempt) throw apiError("No results yet", 404);
  if (attempt.status === "in_progress") throw apiError("Quiz is still in progress");
  const questions = getState().questions.filter((q) => q.quizId === quizId);
  const answers = getState().answers.filter((a) => a.attemptId === attempt._id);
  const board = getLeaderboard(token, quizId);
  const rank = board.findIndex((r) => r.userId === user._id) + 1;
  const showAnswers = user.role === "admin" || quiz.showAnswersAfter;
  return {
    quiz: sanitizeQuiz(quiz, user.role),
    totalQuestions: questions.length,
    attemptedQuestions: attempt.attemptedCount,
    correctAnswers: attempt.correctCount,
    incorrectAnswers: attempt.incorrectCount,
    score: attempt.score,
    percentage: questions.length ? Math.round((attempt.correctCount / questions.length) * 100) : 0,
    rank: quiz.showLeaderboard ? rank : null,
    timeTaken: attempt.timeTaken,
    integrityStatus: attempt.integrityStatus || "CLEAN",
    integrityViolationCount: attempt.integrityViolationCount || 0,
    integrityEvents: clone(attempt.integrityEvents || []),
    attemptStatus: attempt.attemptStatus || (attempt.status === "expired" ? "EXPIRED" : "SUBMITTED"),
    terminationReason: attempt.terminationReason || null,
    terminatedAt: attempt.terminatedAt || null,
    terminatedBy: attempt.terminatedBy || null,
    status: attempt.status,
    review: showAnswers
      ? questions
          .sort((a, b) => a.order - b.order)
          .map((q) => {
            const ans = answers.find((a) => a.questionId === q._id);
            return {
              question: q.text,
              options: q.options,
              selectedOptionId: ans?.selectedOptionId || null,
              correctOptionId: q.correctOptionId,
              explanation: q.explanation,
              isCorrect: Boolean(ans?.isCorrect),
            };
          })
      : null,
  };
}

export function openLobby(token, quizId) {
  requireAdmin(token);
  const quiz = getState().quizzes.find((q) => q._id === quizId);
  if (!quiz) throw apiError("Quiz not found", 404);
  if (!["live", "game"].includes(quiz.mode)) throw apiError("Lobby is for live and game quizzes");
  if (["COMPLETED", "EXPIRED", "CANCELLED"].includes(quiz.status)) throw apiError("Cannot open lobby for a finished quiz");
  mutate((s) => {
    const q = s.quizzes.find((x) => x._id === quizId);
    q.lobbyOpen = true;
    if (q.status === "DRAFT") q.status = "SCHEDULED";
    q.updatedAt = now();
  });
  emit("quiz:lobbyOpen", { quizId });
  return getLiveState(token, quizId);
}

export function startLiveQuiz(token, quizId) {
  requireAdmin(token);
  const quiz = getState().quizzes.find((q) => q._id === quizId);
  if (!quiz) throw apiError("Quiz not found", 404);
  if (["EXPIRED", "COMPLETED", "CANCELLED"].includes(quiz.status)) throw apiError("Cannot start this quiz");
  const questions = getState().questions.filter((q) => q.quizId === quizId);
  if (!questions.length) throw apiError("Add questions before starting");
  mutate((s) => {
    const q = s.quizzes.find((x) => x._id === quizId);
    q.status = "LIVE";
    q.lobbyOpen = true;
    q.startedAt = now();
    q.updatedAt = now();
  });
  emit("quiz:start", { quizId, serverNow: now() });
  return getLiveState(token, quizId);
}

export function startQuestion(token, quizId, questionId) {
  requireAdmin(token);
  const quiz = getState().quizzes.find((q) => q._id === quizId);
  if (!quiz) throw apiError("Quiz not found", 404);
  if (quiz.status !== "LIVE") throw apiError("Start the quiz first");
  const questions = getState()
    .questions.filter((q) => q.quizId === quizId)
    .sort((a, b) => a.order - b.order);
  const question = questionId
    ? questions.find((q) => q._id === questionId)
    : questions[quiz.currentQuestionIndex + 1] || questions[0];
  if (!question) throw apiError("Question not found");
  mutate((s) => {
    const q = s.quizzes.find((x) => x._id === quizId);
    q.currentQuestionId = question._id;
    q.currentQuestionIndex = questions.findIndex((x) => x._id === question._id);
    q.questionStartedAt = now();
    q.questionPaused = false;
    q.pausedRemaining = null;
    q.updatedAt = now();
  });
  emit("quiz:question", {
    quizId,
    question: sanitizeQuestion(question, true),
    index: questions.findIndex((x) => x._id === question._id),
    total: questions.length,
    timeLimit: question.timeLimit,
    startedAt: now(),
    serverNow: now(),
  });
  return getLiveState(token, quizId);
}

export function pauseQuestion(token, quizId) {
  requireAdmin(token);
  mutate((s) => {
    const q = s.quizzes.find((x) => x._id === quizId);
    if (!q || !q.questionStartedAt || q.questionPaused) return;
    const question = s.questions.find((qs) => qs._id === q.currentQuestionId);
    const limit = (question?.timeLimit || 30) * 1000;
    q.pausedRemaining = Math.max(0, q.questionStartedAt + limit - now());
    q.questionPaused = true;
  });
  emit("quiz:timer", { quizId, paused: true });
  return getLiveState(token, quizId);
}

export function resumeQuestion(token, quizId) {
  requireAdmin(token);
  const current = getState().quizzes.find((x) => x._id === quizId);
  if (current?.questionPaused && current.pausedRemaining === 0) {
    throw apiError("This question has ended. Start the next question instead.");
  }
  mutate((s) => {
    const q = s.quizzes.find((x) => x._id === quizId);
    if (!q || !q.questionPaused) return false;
    const question = s.questions.find((qs) => qs._id === q.currentQuestionId);
    const limit = (question?.timeLimit || 30) * 1000;
    q.questionStartedAt = now() - (limit - (q.pausedRemaining || 0));
    q.questionPaused = false;
    q.pausedRemaining = null;
  });
  emit("quiz:timer", { quizId, paused: false, serverNow: now() });
  return getLiveState(token, quizId);
}

function endQuestionInternal(s, quiz, t) {
  quiz.questionEndedAt = t;
  quiz.questionPaused = true;
  quiz.pausedRemaining = 0;
}

export function endQuestion(token, quizId) {
  requireAdmin(token);
  mutate((s) => {
    const q = s.quizzes.find((x) => x._id === quizId);
    if (q) endQuestionInternal(s, q, now());
  });
  const stats = getAnswerStats(quizId, getState().quizzes.find((q) => q._id === quizId)?.currentQuestionId);
  emit("quiz:questionEnded", { quizId, stats });
  emit("quiz:answerStats", { quizId, stats });
  emit("quiz:leaderboard", { quizId, leaderboard: getLeaderboard(token, quizId) });
  return getLiveState(token, quizId);
}

export function nextQuestion(token, quizId) {
  requireAdmin(token);
  const quiz = getState().quizzes.find((q) => q._id === quizId);
  const questions = getState()
    .questions.filter((q) => q.quizId === quizId)
    .sort((a, b) => a.order - b.order);
  const next = questions[quiz.currentQuestionIndex + 1];
  if (!next) return endQuiz(token, quizId);
  return startQuestion(token, quizId, next._id);
}

export function endQuiz(token, quizId) {
  requireAdmin(token);
  mutate((s) => {
    const q = s.quizzes.find((x) => x._id === quizId);
    if (!q) return;
    q.status = "COMPLETED";
    q.endedAt = now();
    q.lobbyOpen = false;
    q.questionPaused = true;
    q.updatedAt = now();
  });
  const leaderboard = getLeaderboard(token, quizId);
  emit("quiz:end", { quizId, leaderboard });
  emit("quiz:leaderboard", { quizId, leaderboard });
  return { ok: true, leaderboard };
}

export function getAnswerStats(quizId, questionId) {
  if (!questionId) return null;
  const question = getState().questions.find((q) => q._id === questionId);
  const answers = getState().answers.filter((a) => a.questionId === questionId);
  const participants = getState().participants.filter((p) => p.quizId === quizId);
  const optionCounts = {};
  (question?.options || []).forEach((o) => {
    optionCounts[o.id] = answers.filter((a) => a.selectedOptionId === o.id).length;
  });
  const winner = getState().gameWinners.find((g) => g.questionId === questionId) || null;
  return {
    questionId,
    total: answers.length,
    correct: answers.filter((a) => a.isCorrect).length,
    incorrect: answers.filter((a) => a.isCorrect === false).length,
    unanswered: Math.max(0, participants.length - answers.length),
    optionCounts,
    winner,
  };
}

function awardPoints(s, participant, question, quiz, isCorrect) {
  const pts = question.points ?? quiz.marksPerQuestion ?? 1;
  const neg = question.negativePoints ?? quiz.negativePoints ?? 0;
  const delta = isCorrect ? pts : quiz.negativeMarking ? -neg : 0;
  participant.score = (participant.score || 0) + delta;
  if (isCorrect) participant.correctCount = (participant.correctCount || 0) + 1;
  else participant.incorrectCount = (participant.incorrectCount || 0) + 1;
  return delta;
}

const localQueues = new Map();

async function withLock(name, fn) {
  // Cross-tab exclusive lock (Web Locks API) when available
  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    return navigator.locks.request(name, { mode: "exclusive" }, fn);
  }
  // Fallback: serialize within this tab via a promise queue
  const prev = localQueues.get(name) || Promise.resolve();
  const run = prev.catch(() => {}).then(fn);
  localQueues.set(name, run.catch(() => {}));
  return run;
}

export async function submitLiveAnswer(token, quizId, questionId, selectedOptionId, sessionId) {
  const user = requireUser(token);
  lifecycleTick();
  const quiz = getState().quizzes.find((q) => q._id === quizId);
  if (!quiz) throw apiError("Quiz not found", 404);
  if (quiz.status !== "LIVE") throw apiError("Quiz is not live");
  if (quiz.currentQuestionId !== questionId) throw apiError("This question is not active");
  if (quiz.questionPaused && quiz.pausedRemaining === 0) throw apiError("Question has ended");
  const question = getState().questions.find((q) => q._id === questionId && q.quizId === quizId);
  if (!question) throw apiError("Invalid question");
  const limit = (question.timeLimit || 30) * 1000;
  if (!quiz.questionPaused && quiz.questionStartedAt && now() > quiz.questionStartedAt + limit) {
    throw apiError("Time is up for this question");
  }
  if (!question.options.some((o) => o.id === selectedOptionId)) throw apiError("Invalid option");

  // One lock per question across ALL tabs: answers to the same question are processed
  // strictly one at a time, in server-arrival order. This makes "first correct" atomic.
  return withLock(`answer:${quizId}:${questionId}`, async () => {
    const participant = getState().participants.find((p) => p.quizId === quizId && p.userId === user._id);
    if (!participant) throw apiError("Join the quiz first");
    if (participant.attemptStatus === "TERMINATED") {
      throw apiError("This quiz attempt has been terminated.", 409, { code: "ATTEMPT_TERMINATED" });
    }
    if (participant.sessionId !== sessionId) {
      throw apiError("Another active quiz session owns this attempt.", 409, { code: "SESSION_MISMATCH" });
    }

    const isCorrect = selectedOptionId === question.correctOptionId;
    let winnerCreated = false;
    let pointsAwarded = 0;
    let responseTimeMs = 0;

    mutate((s) => {
      // Re-validate against the freshest data inside the transaction.
      const liveQuiz = s.quizzes.find((x) => x._id === quizId);
      if (!liveQuiz || liveQuiz.status !== "LIVE" || liveQuiz.currentQuestionId !== questionId) {
        throw apiError("This question is not active");
      }
      if (liveQuiz.questionPaused && liveQuiz.pausedRemaining === 0) throw apiError("Question has ended");
      if (liveQuiz.teamMode && participant.teamId) {
        const teamAnswer = s.answers.find(
          (a) => a.quizId === quizId && a.questionId === questionId && a.teamId === participant.teamId
        );
        if (teamAnswer) throw apiError("Your team has already answered this question");
      }
      const existing = s.answers.find(
        (a) => a.quizId === quizId && a.questionId === questionId && a.participantId === participant._id
      );
      if (existing) throw apiError("You have already answered this question");
      responseTimeMs = now() - (liveQuiz.questionStartedAt || now());

      const p = s.participants.find((x) => x._id === participant._id);
      pointsAwarded = awardPoints(s, p, question, quiz, isCorrect);
      const answer = {
        _id: oid("ans"),
        quizId,
        questionId,
        participantId: participant._id,
        teamId: participant.teamId,
        userId: user._id,
        attemptId: null,
        selectedOptionId,
        isCorrect,
        isWinner: false,
        serverTimestamp: now(),
        responseTimeMs,
        pointsAwarded,
      };
      s.answers.push(answer);

      if (quiz.mode === "game" && isCorrect) {
        const already = s.gameWinners.find((g) => g.quizId === quizId && g.questionId === questionId);
        if (!already) {
          const winner = {
            _id: oid("w"),
            quizId,
            questionId,
            participantId: participant._id,
            teamId: participant.teamId,
            userId: user._id,
            submittedAnswer: selectedOptionId,
            correctness: true,
            serverTimestamp: now(),
            responseTimeMs,
            winnerStatus: true,
            name: p.name,
          };
          s.gameWinners.push(winner);
          answer.isWinner = true;
          winnerCreated = true;
        }
      }
    });

    emit("quiz:answer", {
      quizId,
      questionId,
      participantId: participant._id,
      isCorrect: quiz.mode === "game" ? undefined : undefined,
      received: true,
    });
    const stats = getAnswerStats(quizId, questionId);
    emit("quiz:answerStats", { quizId, stats });
    if (winnerCreated) {
      const winner = getState().gameWinners.find((g) => g.quizId === quizId && g.questionId === questionId);
      emit("quiz:winner", { quizId, questionId, winner });
    }
    emit("quiz:leaderboard", { quizId, leaderboard: getLeaderboard(token, quizId) });
    return {
      ok: true,
      accepted: true,
      isCorrect: undefined,
      isWinner: winnerCreated,
      serverNow: now(),
    };
  });
}

export function getLiveState(token, quizId) {
  const user = requireUser(token);
  lifecycleTick();
  const quiz = getState().quizzes.find((q) => q._id === quizId);
  if (!quiz) throw apiError("Quiz not found", 404);
  const questions = getState()
    .questions.filter((q) => q.quizId === quizId)
    .sort((a, b) => a.order - b.order);
  const current = questions.find((q) => q._id === quiz.currentQuestionId) || null;
  const participant = getState().participants.find((p) => p.quizId === quizId && p.userId === user._id);
  const myAnswer = current
    ? getState().answers.find(
        (a) =>
          a.questionId === current._id &&
          (a.participantId === participant?._id || (quiz.teamMode && a.teamId && a.teamId === participant?.teamId))
      )
    : null;
  const questionEnded = Boolean(quiz.questionPaused && quiz.pausedRemaining === 0);
  const hide = user.role !== "admin" && !questionEnded;
  let remaining = null;
  if (current && quiz.questionStartedAt) {
    const limit = (current.timeLimit || 30) * 1000;
    if (quiz.questionPaused) remaining = quiz.pausedRemaining ?? 0;
    else remaining = Math.max(0, quiz.questionStartedAt + limit - now());
  }
  return {
    quiz: sanitizeQuiz(quiz, user.role),
    questions: user.role === "admin" ? questions : questions.map((q) => sanitizeQuestion(q, true)),
    currentQuestion: current ? sanitizeQuestion(current, hide && user.role !== "admin") : null,
    index: quiz.currentQuestionIndex,
    total: questions.length,
    remaining,
    questionEnded,
    paused: quiz.questionPaused,
    serverNow: now(),
    participant,
    hasAnswered: Boolean(myAnswer),
    mySelectedOptionId: myAnswer?.selectedOptionId || null,
    participants: listParticipants(token, quizId),
    teams: listTeams(token, quizId),
    stats: current ? getAnswerStats(quizId, current._id) : null,
    leaderboard: getLeaderboard(token, quizId),
    winners: getState().gameWinners.filter((g) => g.quizId === quizId),
    connectedCount: connectedParticipants(quizId).length,
  };
}

export function getLeaderboard(token, quizId) {
  const user = requireUser(token);
  const quiz = getState().quizzes.find((q) => q._id === quizId);
  if (!quiz) throw apiError("Quiz not found", 404);
  const adminOwnsQuiz = user.role === "admin" && quiz.createdBy === user._id;
  if (quiz.teamMode) {
    const teams = listTeams(token, quizId);
    const answers = getState().answers.filter((a) => a.quizId === quizId);
    return teams
      .map((t) => {
        const tAnswers = answers.filter((a) => a.teamId === t._id);
        const avgResp =
          tAnswers.length > 0 ? tAnswers.reduce((s, a) => s + a.responseTimeMs, 0) / tAnswers.length : 0;
        return {
          id: t._id,
          name: t.name,
          kind: "team",
          score: t.members.reduce((s, m) => Math.max(s, m.score || 0), 0) || t.score,
          correct: t.members.reduce((s, m) => s + (m.correctCount || 0), 0),
          incorrect: t.members.reduce((s, m) => s + (m.incorrectCount || 0), 0),
          responseTime: avgResp,
          members: t.members.map((m) => m.name),
        };
      })
      .sort((a, b) => b.score - a.score || a.responseTime - b.responseTime)
      .map((row, i) => ({ ...row, rank: i + 1 }));
  }
  const participants = getState().participants.filter((p) => p.quizId === quizId);
  const answers = getState().answers.filter((a) => a.quizId === quizId);
  return participants
    .map((p) => {
      const pAnswers = answers.filter((a) => a.participantId === p._id);
      const avgResp =
        pAnswers.length > 0 ? pAnswers.reduce((s, a) => s + a.responseTimeMs, 0) / pAnswers.length : 0;
      return {
        id: p._id,
        userId: p.userId,
        name: p.name,
        kind: "individual",
        score: p.score || 0,
        correct: p.correctCount || 0,
        incorrect: p.incorrectCount || 0,
        responseTime: avgResp,
        ...(adminOwnsQuiz || p.userId === user._id
          ? {
              integrityStatus: p.integrityStatus || "CLEAN",
              integrityViolationCount: p.integrityViolationCount || 0,
              integrityEvents: clone(p.integrityEvents || []),
            }
          : {}),
      };
    })
    .sort((a, b) => b.score - a.score || a.responseTime - b.responseTime)
    .map((row, i) => ({ ...row, rank: i + 1 }));
}

export function adminOverview(token) {
  requireAdmin(token);
  lifecycleTick();
  const s = getState();
  const quizzes = s.quizzes.map((q) => ({ ...q, computedStatus: computeQuizStatus(q) }));
  return {
    totalQuizzes: quizzes.length,
    activeQuizzes: quizzes.filter((q) => q.computedStatus === "LIVE").length,
    scheduledQuizzes: quizzes.filter((q) => q.computedStatus === "SCHEDULED").length,
    completedQuizzes: quizzes.filter((q) => ["COMPLETED", "EXPIRED"].includes(q.computedStatus)).length,
    totalParticipants: s.participants.length,
    totalQuestions: s.questions.length,
    totalTeams: s.teams.length,
    recent: quizzes
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 8)
      .map((q) => ({
        ...q,
        participantCount: s.participants.filter((p) => p.quizId === q._id).length,
        questionCount: s.questions.filter((qs) => qs.quizId === q._id).length,
      })),
  };
}

export function analytics(token) {
  requireAdmin(token);
  const s = getState();
  const quizzes = s.quizzes;
  const participantsPerQuiz = quizzes.map((q) => ({
    name: q.title.length > 18 ? q.title.slice(0, 18) + "…" : q.title,
    participants: s.participants.filter((p) => p.quizId === q._id).length,
  }));
  const avgScore = quizzes.map((q) => {
    const ps = s.participants.filter((p) => p.quizId === q._id);
    const avg = ps.length ? ps.reduce((a, p) => a + (p.score || 0), 0) / ps.length : 0;
    return { name: q.title.length > 18 ? q.title.slice(0, 18) + "…" : q.title, score: Number(avg.toFixed(2)) };
  });
  const allAnswers = s.answers;
  const correct = allAnswers.filter((a) => a.isCorrect).length;
  const incorrect = allAnswers.filter((a) => a.isCorrect === false).length;
  const questions = s.questions.map((q) => {
    const ans = allAnswers.filter((a) => a.questionId === q._id);
    const c = ans.filter((a) => a.isCorrect).length;
    return {
      name: `Q${q.order + 1}`,
      accuracy: ans.length ? Math.round((c / ans.length) * 100) : 0,
      responses: ans.length,
    };
  });
  const attempts = s.attempts;
  const completed = attempts.filter((a) => a.status === "submitted" || a.status === "expired").length;
  const completionRate = attempts.length ? Math.round((completed / attempts.length) * 100) : 0;
  const byDay = {};
  s.participants.forEach((p) => {
    const day = new Date(p.joinedAt).toISOString().slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;
  });
  const participationOverTime = Object.entries(byDay)
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([date, count]) => ({ date, count }));
  const top = s.participants
    .slice()
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 8)
    .map((p) => ({
      name: p.name,
      score: p.score || 0,
      quiz: quizzes.find((q) => q._id === p.quizId)?.title || "",
    }));
  return {
    participantsPerQuiz,
    avgScore,
    correctVsIncorrect: [
      { name: "Correct", value: correct },
      { name: "Incorrect", value: incorrect },
    ],
    questionAccuracy: questions.slice(0, 16),
    completionRate,
    participationOverTime,
    topPerformers: top,
    totals: {
      answers: allAnswers.length,
      correct,
      incorrect,
      attempts: attempts.length,
      completed,
    },
  };
}

export function quizAnalytics(token, quizId) {
  requireAdmin(token);
  const quiz = getState().quizzes.find((q) => q._id === quizId);
  if (!quiz) throw apiError("Quiz not found", 404);
  const participants = getState().participants.filter((p) => p.quizId === quizId);
  const teams = getState().teams.filter((t) => t.quizId === quizId);
  const answers = getState().answers.filter((a) => a.quizId === quizId);
  const attempts = getState().attempts.filter((a) => a.quizId === quizId);
  const questions = getState()
    .questions.filter((q) => q.quizId === quizId)
    .sort((a, b) => a.order - b.order);
  const scores = participants.map((p) => p.score || 0);
  const completed = attempts.filter((a) => a.status !== "in_progress").length;
  const questionStats = questions.map((q) => {
    const ans = answers.filter((a) => a.questionId === q._id);
    const c = ans.filter((a) => a.isCorrect).length;
    const avg =
      ans.length > 0 ? Math.round(ans.reduce((s, a) => s + a.responseTimeMs, 0) / ans.length) : 0;
    return {
      id: q._id,
      text: q.text,
      total: ans.length,
      correct: c,
      incorrect: ans.length - c,
      accuracy: ans.length ? Math.round((c / ans.length) * 100) : 0,
      averageResponseTime: avg,
    };
  });
  const winners = getState().gameWinners
    .filter((g) => g.quizId === quizId)
    .map((g) => ({
      ...g,
      questionText: questions.find((q) => q._id === g.questionId)?.text,
    }));
  return {
    quiz: sanitizeQuiz(quiz, "admin"),
    totalParticipants: participants.length,
    totalTeams: teams.length,
    completionRate: attempts.length ? Math.round((completed / attempts.length) * 100) : participants.length ? 100 : 0,
    averageScore: scores.length ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)) : 0,
    highestScore: scores.length ? Math.max(...scores) : 0,
    lowestScore: scores.length ? Math.min(...scores) : 0,
    averageResponseTime: answers.length
      ? Math.round(answers.reduce((s, a) => s + a.responseTimeMs, 0) / answers.length)
      : 0,
    correctPercent: answers.length ? Math.round((answers.filter((a) => a.isCorrect).length / answers.length) * 100) : 0,
    incorrectPercent: answers.length
      ? Math.round((answers.filter((a) => !a.isCorrect).length / answers.length) * 100)
      : 0,
    questionStats,
    winners,
    rankings: getLeaderboard(token, quizId),
  };
}

export function searchPeople(token, query = {}) {
  requireAdmin(token);
  const q = (query.search || "").toLowerCase();
  const participants = getState().participants.filter((p) => !q || p.name.toLowerCase().includes(q));
  const teams = getState().teams.filter((t) => !q || t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q));
  return {
    participants: participants.slice(0, 50).map((p) => ({
      ...p,
      quizTitle: getState().quizzes.find((q) => q._id === p.quizId)?.title,
    })),
    teams: teams.slice(0, 50).map((t) => ({
      ...t,
      quizTitle: getState().quizzes.find((q) => q._id === t.quizId)?.title,
      memberCount: t.members.length,
    })),
  };
}

export function leaveQuiz(token, quizId) {
  const user = requireUser(token);
  mutate((s) => {
    if (s.presence[quizId]) delete s.presence[quizId][user._id];
  });
  emit("quiz:participantLeft", { quizId, userId: user._id });
  return { ok: true };
}

export { apiError };
