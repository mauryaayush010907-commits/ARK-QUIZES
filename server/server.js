import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import { Server } from "socket.io";
import routes from "./routes/index.js";
import { attachSockets } from "./sockets/quizSocket.js";
import { Attempt, Quiz } from "./models/index.js";
import { computeQuizStatus } from "./utils/helpers.js";

const app = express();
const server = http.createServer(app);
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

const io = new Server(server, {
  cors: { origin: clientUrl.split(","), credentials: true },
});
app.set("io", io);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: clientUrl.split(","), credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(rateLimit({ windowMs: 60_000, max: 180, standardHeaders: true, legacyHeaders: false }));

app.get("/api/health", (_req, res) => res.json({ ok: true, time: Date.now() }));
app.use("/api", routes);

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (process.env.NODE_ENV !== "production") console.error(err);
  res.status(status).json({ ...(err.code ? { code: err.code } : {}), message: err.message || "Server error" });
});

attachSockets(io);

async function lifecycleTick() {
  const quizzes = await Quiz.find({ status: { $in: ["SCHEDULED", "LIVE"] } });
  for (const quiz of quizzes) {
    const next = computeQuizStatus(quiz);
    if (next !== quiz.status) {
      quiz.status = next;
      await quiz.save();
    }
    if (quiz.mode === "scheduled" && next === "EXPIRED") {
      await Attempt.updateMany(
        { quizId: quiz._id, status: "in_progress" },
        { status: "expired", attemptStatus: "EXPIRED", submittedAt: new Date() }
      );
    }
    if ((quiz.mode === "live" || quiz.mode === "game") && quiz.status === "LIVE" && quiz.questionStartedAt && quiz.currentQuestionId && !quiz.questionPaused) {
      const q = await mongoose.model("Question").findById(quiz.currentQuestionId);
      const limit = (q?.timeLimit || quiz.questionTimeLimit || 30) * 1000;
      if (Date.now() >= new Date(quiz.questionStartedAt).getTime() + limit) {
        quiz.questionPaused = true;
        quiz.pausedRemaining = 0;
        await quiz.save();
        io.to(`quiz:${quiz._id}`).emit("quiz:questionEnded", { quizId: String(quiz._id) });
      }
    }
  }
}

const port = Number(process.env.PORT) || 5000;

async function start() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is required");
    process.exit(1);
  }
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is required");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  setInterval(() => lifecycleTick().catch(() => {}), 2000);
  server.listen(port, () => {
    console.log(`ARK-QUIZES API listening on ${port}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
