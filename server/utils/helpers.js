export function generateQuizCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `QUIZ-${s}`;
}

export function generateTeamCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `TEAM-${s}`;
}

export function computeQuizStatus(quiz, t = Date.now()) {
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

export function sanitizeQuestion(q, hide) {
  const obj = typeof q.toObject === "function" ? q.toObject() : { ...q };
  if (hide) {
    delete obj.correctOptionId;
    delete obj.explanation;
  }
  return obj;
}

export function publicUser(u) {
  return { _id: u._id, name: u.name, email: u.email, role: u.role, avatarColor: u.avatarColor, createdAt: u.createdAt };
}

export function httpError(status, message, code) {
  const err = new Error(message);
  err.status = status;
  if (code) err.code = code;
  return err;
}
