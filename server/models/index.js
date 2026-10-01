import mongoose from "mongoose";

const { Schema, model } = mongoose;

const integrityEventSchema = new Schema(
  {
    quizId: { type: Schema.Types.ObjectId, ref: "Quiz", required: true },
    attemptId: { type: Schema.Types.ObjectId, required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sessionId: { type: String, required: true },
    type: {
      type: String,
      enum: ["TAB_SWITCH", "PAGE_HIDDEN", "WINDOW_BLUR", "FULLSCREEN_EXIT", "PAGE_LEFT"],
      required: true,
    },
    reason: { type: String, required: true, maxlength: 160 },
    timestamp: { type: Date, required: true },
    clientTimestamp: Date,
    duration: { type: Number, min: 0, max: 3600 },
    receivedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const integrityFields = {
  integrityStatus: { type: String, enum: ["CLEAN", "CHEATING"], default: "CLEAN" },
  integrityViolationCount: { type: Number, default: 0, min: 0 },
  integrityEvents: { type: [integrityEventSchema], default: [] },
  integrityViolation: { type: integrityEventSchema, default: null },
  attemptStatus: { type: String, enum: ["ACTIVE", "SUBMITTED", "EXPIRED", "TERMINATED"], default: "ACTIVE" },
  sessionId: { type: String, default: null, index: true },
  terminationReason: { type: String, default: null },
  terminatedAt: Date,
  terminatedBy: { type: String, enum: ["INTEGRITY_SYSTEM"], default: null },
  lastIntegrityEventAt: Date,
  lastHeartbeatAt: Date,
};

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "student"], default: "student", index: true },
    avatarColor: String,
  },
  { timestamps: true }
);

const quizSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: String,
    mode: { type: String, enum: ["scheduled", "live", "game"], required: true, index: true },
    status: {
      type: String,
      enum: ["DRAFT", "SCHEDULED", "LIVE", "COMPLETED", "EXPIRED", "CANCELLED"],
      default: "DRAFT",
      index: true,
    },
    startTime: { type: Date, index: true },
    endTime: Date,
    duration: { type: Number, default: 30 },
    marksPerQuestion: { type: Number, default: 1 },
    negativeMarking: { type: Boolean, default: false },
    negativePoints: { type: Number, default: 0 },
    maxParticipants: Number,
    quizCode: { type: String, required: true, unique: true, index: true },
    instructions: String,
    teamMode: { type: Boolean, default: false },
    showAnswersAfter: { type: Boolean, default: false },
    showLeaderboard: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    currentQuestionId: { type: Schema.Types.ObjectId, ref: "Question" },
    currentQuestionIndex: { type: Number, default: -1 },
    questionStartedAt: Date,
    questionTimeLimit: { type: Number, default: 30 },
    questionPaused: { type: Boolean, default: false },
    pausedRemaining: Number,
    lobbyOpen: { type: Boolean, default: false },
    startedAt: Date,
    endedAt: Date,
  },
  { timestamps: true }
);

const questionSchema = new Schema(
  {
    quizId: { type: Schema.Types.ObjectId, ref: "Quiz", required: true, index: true },
    text: { type: String, required: true },
    image: String,
    options: [{ id: String, text: String }],
    correctOptionId: { type: String, required: true },
    points: { type: Number, default: 1 },
    negativePoints: { type: Number, default: 0 },
    explanation: String,
    order: { type: Number, default: 0 },
    timeLimit: { type: Number, default: 30 },
  },
  { timestamps: true }
);

const teamSchema = new Schema(
  {
    quizId: { type: Schema.Types.ObjectId, ref: "Quiz", required: true, index: true },
    name: { type: String, required: true },
    code: { type: String, required: true, index: true },
    leaderId: { type: Schema.Types.ObjectId, ref: "User" },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

const participantSchema = new Schema(
  {
    quizId: { type: Schema.Types.ObjectId, ref: "Quiz", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: String,
    teamId: { type: Schema.Types.ObjectId, ref: "Team" },
    joinedAt: { type: Date, default: Date.now },
    score: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    incorrectCount: { type: Number, default: 0 },
    status: { type: String, default: "joined" },
    socketId: String,
    ...integrityFields,
  },
  { timestamps: true }
);
participantSchema.index({ quizId: 1, userId: 1 }, { unique: true });

const attemptSchema = new Schema(
  {
    quizId: { type: Schema.Types.ObjectId, ref: "Quiz", required: true, index: true },
    participantId: { type: Schema.Types.ObjectId, ref: "Participant" },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    startedAt: Date,
    submittedAt: Date,
    expiresAt: Date,
    status: { type: String, enum: ["in_progress", "submitted", "expired", "terminated"], default: "in_progress" },
    score: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    incorrectCount: { type: Number, default: 0 },
    attemptedCount: { type: Number, default: 0 },
    timeTaken: { type: Number, default: 0 },
    ...integrityFields,
  },
  { timestamps: true }
);
attemptSchema.index({ quizId: 1, participantId: 1 });
attemptSchema.index({ quizId: 1, userId: 1 }, { unique: true });

const answerSchema = new Schema(
  {
    quizId: { type: Schema.Types.ObjectId, ref: "Quiz", required: true },
    questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
    participantId: { type: Schema.Types.ObjectId, ref: "Participant", required: true },
    teamId: { type: Schema.Types.ObjectId, ref: "Team" },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    attemptId: { type: Schema.Types.ObjectId, ref: "Attempt" },
    selectedOptionId: String,
    isCorrect: Boolean,
    isWinner: { type: Boolean, default: false },
    serverTimestamp: { type: Date, default: Date.now },
    responseTimeMs: Number,
    pointsAwarded: { type: Number, default: 0 },
  },
  { timestamps: true }
);
answerSchema.index({ quizId: 1, questionId: 1, participantId: 1 }, { unique: true });

const gameWinnerSchema = new Schema(
  {
    quizId: { type: Schema.Types.ObjectId, ref: "Quiz", required: true },
    questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
    participantId: { type: Schema.Types.ObjectId, ref: "Participant" },
    teamId: { type: Schema.Types.ObjectId, ref: "Team" },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    submittedAnswer: String,
    correctness: { type: Boolean, default: true },
    serverTimestamp: { type: Date, default: Date.now },
    responseTimeMs: Number,
    winnerStatus: { type: Boolean, default: true },
    name: String,
  },
  { timestamps: true }
);
gameWinnerSchema.index({ quizId: 1, questionId: 1 }, { unique: true });

export const User = model("User", userSchema);
export const Quiz = model("Quiz", quizSchema);
export const Question = model("Question", questionSchema);
export const Team = model("Team", teamSchema);
export const Participant = model("Participant", participantSchema);
export const Attempt = model("Attempt", attemptSchema);
export const Answer = model("Answer", answerSchema);
export const GameWinner = model("GameWinner", gameWinnerSchema);
