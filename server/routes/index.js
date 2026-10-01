import { Router } from "express";
import { authenticateUser, requireAdmin, asyncHandler } from "../middleware/auth.js";
import * as c from "../controllers/quizController.js";

const router = Router();

router.post("/auth/register", asyncHandler(c.register));
router.post("/auth/login", asyncHandler(c.login));
router.get("/auth/me", authenticateUser, asyncHandler(c.me));

router.get("/quizzes/lookup", authenticateUser, asyncHandler(c.lookup));
router.post("/quizzes", authenticateUser, requireAdmin, asyncHandler(c.createQuiz));
router.get("/quizzes", authenticateUser, asyncHandler(c.listQuizzes));
router.get("/quizzes/:id", authenticateUser, asyncHandler(c.getQuiz));
router.put("/quizzes/:id", authenticateUser, requireAdmin, asyncHandler(c.updateQuiz));
router.delete("/quizzes/:id", authenticateUser, requireAdmin, asyncHandler(c.deleteQuiz));
router.post("/quizzes/:id/start", authenticateUser, requireAdmin, asyncHandler(c.startQuiz));
router.post("/quizzes/:id/end", authenticateUser, requireAdmin, asyncHandler(c.endQuiz));
router.get("/quizzes/:quizId/participants", authenticateUser, asyncHandler(c.listParticipants));

router.get("/quizzes/:quizId/questions", authenticateUser, asyncHandler(async (req, res) => {
  const { Question } = await import("../models/index.js");
  const { sanitizeQuestion } = await import("../utils/helpers.js");
  const hide = req.user.role !== "admin";
  const questions = (await Question.find({ quizId: req.params.quizId }).sort({ order: 1 }).lean()).map((q) =>
    sanitizeQuestion(q, hide)
  );
  res.json(questions);
}));
router.post("/quizzes/:quizId/questions", authenticateUser, requireAdmin, asyncHandler(c.addQuestion));
router.put("/questions/:id", authenticateUser, requireAdmin, asyncHandler(c.updateQuestion));
router.delete("/questions/:id", authenticateUser, requireAdmin, asyncHandler(c.deleteQuestion));
router.patch("/quizzes/:quizId/questions/reorder", authenticateUser, requireAdmin, asyncHandler(c.reorderQuestions));
router.post("/quizzes/:quizId/questions/import", authenticateUser, requireAdmin, asyncHandler(c.importQuestions));

router.post("/quizzes/:quizId/join", authenticateUser, asyncHandler(c.joinQuiz));
router.post("/quizzes/join", authenticateUser, asyncHandler(c.joinQuiz));
router.post("/quizzes/:quizId/start-attempt", authenticateUser, asyncHandler(c.startAttempt));
router.post("/attempts/:attemptId/heartbeat", authenticateUser, asyncHandler(c.heartbeatAttempt));
router.post("/attempts/:attemptId/integrity-events", authenticateUser, asyncHandler(c.recordIntegrityEvent));
router.get("/quizzes/:quizId/integrity", authenticateUser, asyncHandler(c.listQuizIntegrity));
router.get("/quizzes/:quizId/my-integrity", authenticateUser, asyncHandler(c.getOwnIntegrity));
router.post("/quizzes/:quizId/answer", authenticateUser, asyncHandler(c.saveAnswer));
router.post("/quizzes/:quizId/submit", authenticateUser, asyncHandler(c.submitAttempt));
router.get("/quizzes/:quizId/results", authenticateUser, asyncHandler(c.getResults));
router.get("/quizzes/:quizId/leaderboard", authenticateUser, asyncHandler(c.leaderboard));

router.get("/admin/analytics", authenticateUser, requireAdmin, asyncHandler(c.analytics));
router.get("/admin/quizzes/:quizId/analytics", authenticateUser, requireAdmin, asyncHandler(c.quizAnalytics));

export default router;
