import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { startAttempt, saveScheduledAnswer, submitAttempt, getResults, getQuizSessionId } from "../../engine/api";
import { useEngineTick, formatMs } from "../../hooks/useEngine";
import useQuizIntegrity from "../../hooks/useQuizIntegrity";
import IntegrityTermination from "../../components/IntegrityTermination";
import IntegritySessionConflict from "../../components/IntegritySessionConflict";
import { Button, Progress, TimerRing } from "../../components/ui";

export default function ScheduledTake() {
  const { id } = useParams();
  const { token } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const tick = useEngineTick();
  const [session, setSession] = useState(null);
  const [index, setIndex] = useState(0);
  const [expired, setExpired] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [terminated, setTerminated] = useState(null);
  const [sessionConflict, setSessionConflict] = useState(false);
  const [answers, setAnswers] = useState({});
  const autoSubmitted = useRef(false);
  const sessionId = useRef(getQuizSessionId(id)).current;
  const integrity = useQuizIntegrity({
    token,
    attemptId: session?.attempt?._id,
    quizId: id,
    sessionId: session?.attempt?.sessionId || sessionId,
    enabled: session?.attempt?.status === "in_progress" && !expired && !submitted && !terminated,
    onViolation: setTerminated,
  });

  useEffect(() => {
    try {
      const s = startAttempt(token, id, sessionId);
      setSession(s);
      const map = {};
      s.answers.forEach((a) => {
        map[a.questionId] = a.selectedOptionId;
      });
      setAnswers(map);
    } catch (e) {
      if (e.status === 410 || /expired/i.test(e.message)) setExpired(true);
      else if (e.extra?.code === "SESSION_MISMATCH") setSessionConflict(true);
      else if (e.extra?.code === "ATTEMPT_TERMINATED") {
        try {
          const result = getResults(token, id);
          setTerminated(result.integrityEvents?.at(-1) || { reason: "This attempt was previously terminated.", timestamp: result.terminatedAt });
        } catch {
          setTerminated({ reason: "This attempt was previously terminated." });
        }
      }
      else if (/already submitted/i.test(e.message)) navigate(`/play/results/${id}`);
      else toast.error(e.message);
    }
  }, [id, token]);

  const remaining = session?.attempt?.expiresAt ? Math.max(0, session.attempt.expiresAt - Date.now()) : 0;
  const total = session?.attempt ? session.attempt.expiresAt - session.attempt.startedAt : 1;

  useEffect(() => {
    if (session && remaining <= 0 && !autoSubmitted.current) {
      autoSubmitted.current = true;
      try {
        submitAttempt(token, id);
        setSubmitted(true);
        navigate(`/play/results/${id}`);
      } catch {
        setExpired(true);
      }
    }
  }, [remaining, session, token, id, navigate]);

  if (expired) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-amber-400/20 bg-amber-400/5 p-8 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Closed</p>
        <h1 className="mt-3 font-display text-5xl">Quiz Expired</h1>
        <p className="mt-3 text-mist">The availability window has ended. New attempts cannot start, and live time is up.</p>
        <Button className="mt-6" onClick={() => navigate(`/play/results/${id}`)}>
          View results if available
        </Button>
      </div>
    );
  }

  if (terminated) return <IntegrityTermination violation={terminated.lastViolation || terminated.violation || terminated} />;
  if (sessionConflict || integrity.sessionConflict) return <IntegritySessionConflict />;

  if (!session) return <p className="text-mist">Loading exam…</p>;

  const q = session.questions[index];
  const attempted = Object.keys(answers).length;

  const pick = (opt) => {
    setAnswers((a) => ({ ...a, [q._id]: opt }));
    try {
      saveScheduledAnswer(token, id, q._id, opt, sessionId);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const finish = () => {
    try {
      submitAttempt(token, id);
      setSubmitted(true);
      navigate(`/play/results/${id}`);
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="mx-auto max-w-3xl anim-in">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-mist">{session.quiz.title}</p>
          <p className="text-sm font-semibold">
            Question {index + 1} / {session.questions.length}
          </p>
        </div>
        <TimerRing remaining={remaining} total={total} />
      </div>
      <Progress value={attempted} max={session.questions.length} />
      <div className="mt-6 rounded-3xl border border-white/8 bg-panel p-6">
        <h2 className="font-display text-3xl leading-tight">{q?.text}</h2>
        {q?.image && <img src={q.image} alt="" className="mt-4 max-h-56 rounded-2xl object-cover" />}
        <div className="mt-6 grid gap-3">
          {q?.options.map((o) => (
            <button
              key={o.id}
              onClick={() => pick(o.id)}
              className={`option-card rounded-2xl border px-4 py-4 text-left text-sm transition ${
                answers[q._id] === o.id ? "border-violet-400 bg-violet-500/15 glow-violet" : "border-white/10 bg-white/4"
              }`}
            >
              <span className="mr-3 font-mono text-mist">{o.id}</span>
              {o.text}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between">
        <Button variant="ghost" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
          Previous
        </Button>
        <p className="font-mono text-xs text-mist">{formatMs(remaining)} remaining</p>
        {index < session.questions.length - 1 ? (
          <Button onClick={() => setIndex((i) => i + 1)}>Next</Button>
        ) : (
          <Button onClick={finish}>Submit</Button>
        )}
      </div>
    </div>
  );
}
