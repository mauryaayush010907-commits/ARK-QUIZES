import jwt from "jsonwebtoken";
import { Answer, GameWinner, Participant, Question, Quiz, User } from "../models/index.js";
import { computeQuizStatus, sanitizeQuestion } from "../utils/helpers.js";

function room(id) {
  return `quiz:${id}`;
}

async function identity(socket) {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) throw new Error("Authentication required");
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(payload.id).lean();
  if (!user) throw new Error("Invalid session");
  return user;
}

async function liveState(quizId, user) {
  const quiz = await Quiz.findById(quizId).lean();
  if (!quiz) throw new Error("Quiz not found");
  const questions = await Question.find({ quizId }).sort({ order: 1 }).lean();
  const current = questions.find((q) => String(q._id) === String(quiz.currentQuestionId)) || null;
  const storedParticipants = await Participant.find({ quizId }).lean();
  const participants = storedParticipants.map((participant) => {
        const adminOwnsQuiz = user.role === "admin" && String(quiz.createdBy) === String(user._id);
        if (adminOwnsQuiz || String(participant.userId) === String(user._id)) return participant;
        const {
          integrityStatus,
          integrityViolationCount,
          integrityEvents,
          lastIntegrityEventAt,
          lastHeartbeatAt,
          ...visible
        } = participant;
        return visible;
      });
  const answers = current ? await Answer.find({ questionId: current._id }).lean() : [];
  const winners = await GameWinner.find({ quizId }).lean();
  let remaining = null;
  if (current && quiz.questionStartedAt) {
    const limit = (current.timeLimit || 30) * 1000;
    remaining = quiz.questionPaused ? quiz.pausedRemaining ?? 0 : Math.max(0, new Date(quiz.questionStartedAt).getTime() + limit - Date.now());
  }
  const hide = user.role !== "admin";
  return {
    quiz: { ...quiz, computedStatus: computeQuizStatus(quiz) },
    currentQuestion: current ? sanitizeQuestion(current, hide) : null,
    index: quiz.currentQuestionIndex,
    total: questions.length,
    remaining,
    serverNow: Date.now(),
    participants,
    winners,
    stats: current
      ? {
          questionId: current._id,
          total: answers.length,
          correct: answers.filter((a) => a.isCorrect).length,
          incorrect: answers.filter((a) => !a.isCorrect).length,
          unanswered: Math.max(0, participants.length - answers.length),
        }
      : null,
  };
}

export function attachSockets(io) {
  io.use(async (socket, next) => {
    try {
      socket.user = await identity(socket);
      next();
    } catch (e) {
      next(new Error(e.message));
    }
  });

  io.on("connection", (socket) => {
    socket.on("quiz:join", async ({ quizId }, cb) => {
      try {
        const participant = await Participant.findOne({ quizId, userId: socket.user._id }).select("attemptStatus").lean();
        if (participant?.attemptStatus === "TERMINATED") {
          const error = new Error("This quiz attempt has been terminated.");
          error.code = "ATTEMPT_TERMINATED";
          throw error;
        }
        socket.join(room(quizId));
        await Participant.updateOne({ quizId, userId: socket.user._id }, { socketId: socket.id });
        socket.to(room(quizId)).emit("quiz:participantJoined", {
          quizId,
          participant: { name: socket.user.name, userId: socket.user._id },
        });
        const state = await liveState(quizId, socket.user);
        cb?.({ ok: true, state });
      } catch (e) {
        cb?.({ ok: false, code: e.code, message: e.message });
      }
    });

    socket.on("quiz:adminJoin", async ({ quizId }, cb) => {
      try {
        if (socket.user.role !== "admin") throw new Error("Admin access required");
        const quiz = await Quiz.findOne({ _id: quizId, createdBy: socket.user._id }).select("_id").lean();
        if (!quiz) throw new Error("Quiz not found");
        socket.join(`${room(quizId)}:admins`);
        cb?.({ ok: true });
      } catch (e) {
        cb?.({ ok: false, message: e.message });
      }
    });

    socket.on("quiz:state", async ({ quizId }, cb) => {
      try {
        cb?.({ ok: true, state: await liveState(quizId, socket.user) });
      } catch (e) {
        cb?.({ ok: false, message: e.message });
      }
    });

    socket.on("quiz:start", async ({ quizId }, cb) => {
      try {
        if (socket.user.role !== "admin") throw new Error("Admin access required");
        const quiz = await Quiz.findById(quizId);
        if (!quiz) throw new Error("Quiz not found");
        if (["EXPIRED", "COMPLETED", "CANCELLED"].includes(quiz.status)) throw new Error("Cannot start this quiz");
        const count = await Question.countDocuments({ quizId });
        if (!count) throw new Error("Add questions before starting");
        quiz.status = "LIVE";
        quiz.lobbyOpen = true;
        quiz.startedAt = new Date();
        await quiz.save();
        io.to(room(quizId)).emit("quiz:start", { quizId, serverNow: Date.now() });
        cb?.({ ok: true });
      } catch (e) {
        cb?.({ ok: false, message: e.message });
      }
    });

    socket.on("quiz:question", async ({ quizId, questionId }, cb) => {
      try {
        if (socket.user.role !== "admin") throw new Error("Admin access required");
        const quiz = await Quiz.findById(quizId);
        const questions = await Question.find({ quizId }).sort({ order: 1 });
        const question = questionId
          ? questions.find((q) => String(q._id) === String(questionId))
          : questions[quiz.currentQuestionIndex + 1] || questions[0];
        if (!question) throw new Error("Question not found");
        quiz.status = "LIVE";
        quiz.currentQuestionId = question._id;
        quiz.currentQuestionIndex = questions.findIndex((q) => String(q._id) === String(question._id));
        quiz.questionStartedAt = new Date();
        quiz.questionPaused = false;
        quiz.pausedRemaining = null;
        await quiz.save();
        const payload = {
          quizId,
          question: sanitizeQuestion(question, true),
          index: quiz.currentQuestionIndex,
          total: questions.length,
          timeLimit: question.timeLimit,
          startedAt: quiz.questionStartedAt,
          serverNow: Date.now(),
        };
        io.to(room(quizId)).emit("quiz:question", payload);
        io.to(room(quizId)).emit("quiz:timer", { quizId, remaining: question.timeLimit * 1000, serverNow: Date.now() });
        cb?.({ ok: true });
      } catch (e) {
        cb?.({ ok: false, message: e.message });
      }
    });

    socket.on("quiz:nextQuestion", async ({ quizId }, cb) => {
      socket.emit("quiz:question", { quizId });
      cb?.({ ok: true });
    });

    socket.on("quiz:end", async ({ quizId }, cb) => {
      try {
        if (socket.user.role !== "admin") throw new Error("Admin access required");
        await Quiz.updateOne({ _id: quizId }, { status: "COMPLETED", endedAt: new Date(), lobbyOpen: false, questionPaused: true });
        io.to(room(quizId)).emit("quiz:end", { quizId });
        cb?.({ ok: true });
      } catch (e) {
        cb?.({ ok: false, message: e.message });
      }
    });

    socket.on("quiz:answer", async ({ quizId, questionId, selectedOptionId, sessionId }, cb) => {
      try {
        const quiz = await Quiz.findById(quizId);
        if (!quiz || quiz.status !== "LIVE") throw new Error("Quiz is not live");
        if (String(quiz.currentQuestionId) !== String(questionId)) throw new Error("This question is not active");
        const question = await Question.findById(questionId);
        if (!question) throw new Error("Invalid question");
        const limit = (question.timeLimit || 30) * 1000;
        if (!quiz.questionPaused && quiz.questionStartedAt && Date.now() > new Date(quiz.questionStartedAt).getTime() + limit) {
          throw new Error("Time is up for this question");
        }
        const participant = await Participant.findOne({ quizId, userId: socket.user._id });
        if (!participant) throw new Error("Join the quiz first");
        if (participant.attemptStatus === "TERMINATED") {
          const error = new Error("This quiz attempt has been terminated.");
          error.code = "ATTEMPT_TERMINATED";
          throw error;
        }
        if (typeof sessionId !== "string" || participant.sessionId !== sessionId) {
          const error = new Error("Another active quiz session owns this attempt.");
          error.code = "SESSION_MISMATCH";
          throw error;
        }
        if (quiz.teamMode && participant.teamId) {
          const teamAnswer = await Answer.findOne({ quizId, questionId, teamId: participant.teamId });
          if (teamAnswer) throw new Error("Your team has already answered this question");
        }
        const existing = await Answer.findOne({ quizId, questionId, participantId: participant._id });
        if (existing) throw new Error("You have already answered this question");
        const isCorrect = selectedOptionId === question.correctOptionId;
        const pts = isCorrect ? question.points || quiz.marksPerQuestion || 1 : quiz.negativeMarking ? -(question.negativePoints || 0) : 0;
        await Participant.updateOne({ _id: participant._id }, {
          $inc: { score: pts, correctCount: isCorrect ? 1 : 0, incorrectCount: isCorrect ? 0 : 1 },
        });
        const answer = await Answer.create({
          quizId,
          questionId,
          participantId: participant._id,
          teamId: participant.teamId,
          userId: socket.user._id,
          selectedOptionId,
          isCorrect,
          serverTimestamp: new Date(),
          responseTimeMs: Date.now() - new Date(quiz.questionStartedAt).getTime(),
          pointsAwarded: pts,
        });
        let winner = null;
        if (quiz.mode === "game" && isCorrect) {
          try {
            winner = await GameWinner.create({
              quizId,
              questionId,
              participantId: participant._id,
              teamId: participant.teamId,
              userId: socket.user._id,
              submittedAnswer: selectedOptionId,
              correctness: true,
              serverTimestamp: new Date(),
              responseTimeMs: answer.responseTimeMs,
              winnerStatus: true,
              name: participant.name,
            });
            await Answer.updateOne({ _id: answer._id }, { isWinner: true });
            io.to(room(quizId)).emit("quiz:winner", { quizId, questionId, winner });
          } catch (err) {
            if (err.code !== 11000) throw err;
          }
        }
        io.to(room(quizId)).emit("quiz:answer", { quizId, questionId, participantId: participant._id, received: true });
        const answers = await Answer.find({ questionId });
        io.to(room(quizId)).emit("quiz:answerStats", {
          quizId,
          stats: {
            total: answers.length,
            correct: answers.filter((a) => a.isCorrect).length,
            incorrect: answers.filter((a) => !a.isCorrect).length,
          },
        });
        cb?.({ ok: true, isWinner: Boolean(winner) });
      } catch (e) {
        cb?.({ ok: false, code: e.code, message: e.message });
      }
    });

    socket.on("disconnect", async () => {
      await Participant.updateMany({ socketId: socket.id }, { $unset: { socketId: 1 } });
    });
  });
}
