import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Crown, WifiOff } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { getLiveState, getQuizSessionId, heartbeat, submitLiveAnswer, leaveQuiz } from "../../engine/api";
import { subscribe } from "../../engine/store";
import { useEngineTick, formatMs } from "../../hooks/useEngine";
import useQuizIntegrity from "../../hooks/useQuizIntegrity";
import IntegrityTermination from "../../components/IntegrityTermination";
import IntegritySessionConflict from "../../components/IntegritySessionConflict";
import { Button, TimerRing } from "../../components/ui";
import winnerImg from "../../assets/images/winner.jpg";

export default function LivePlay({ game }) {
  const { id } = useParams();
  const { token, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const tick = useEngineTick();
  const [offline, setOffline] = useState(!navigator.onLine);
  const [flash, setFlash] = useState(null);
  const [terminated, setTerminated] = useState(null);
  const sessionIdRef = useRef(null);
  if (!sessionIdRef.current) sessionIdRef.current = getQuizSessionId(id);

  const state = useMemo(() => {
    try {
      return getLiveState(token, id);
    } catch {
      return null;
    }
  }, [token, id, tick]);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const activeParticipant = state?.quiz?.status === "LIVE" &&
      state.participant && state.participant.attemptStatus !== "TERMINATED";
    const t = activeParticipant ? setInterval(() => heartbeat(token, id), 2500) : null;
    if (activeParticipant) heartbeat(token, id);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      if (t) clearInterval(t);
      try {
        leaveQuiz(token, id);
      } catch {
        /* ignore */
      }
    };
  }, [token, id, state?.quiz?.status, state?.participant?.attemptStatus, Boolean(state?.participant)]);

  useEffect(() => {
    return subscribe((e) => {
      if (e.payload?.quizId !== id) return;
      if (e.event === "quiz:question") setFlash("in");
      if (e.event === "quiz:winner" && e.payload.winner?.userId === user._id) {
        toast.success("You locked the first correct answer");
      }
    });
  }, [id, user, toast]);

  const integrity = useQuizIntegrity({
    token,
    attemptId: state?.participant?._id,
    quizId: id,
    sessionId: sessionIdRef.current,
    enabled: state?.quiz?.status === "LIVE" && Boolean(state?.participant) && state?.participant?.attemptStatus !== "TERMINATED" && !terminated,
    onViolation: setTerminated,
    heartbeatManagedExternally: true,
  });

  useEffect(() => {
    if (state?.participant?.attemptStatus === "TERMINATED") {
      setTerminated(state.participant.integrityViolation || state.participant.integrityEvents?.at(-1) || {
        reason: "This attempt was previously terminated.",
        timestamp: state.participant.terminatedAt,
      });
    }
  }, [state]);

  useEffect(() => {
    if (state?.quiz?.status === "COMPLETED") navigate(`/play/leaderboard/${id}`);
  }, [state, id, navigate]);

  if (!state) return <p className="text-mist">Reconnecting to the room…</p>;
  if (terminated || state.participant?.attemptStatus === "TERMINATED") {
    return <IntegrityTermination violation={terminated || state.participant.integrityViolation || state.participant.integrityEvents?.at(-1)} />;
  }
  if (integrity.sessionConflict) return <IntegritySessionConflict />;

  const q = state.currentQuestion;
  const limit = (q?.timeLimit || 30) * 1000;

  const answer = async (opt) => {
    try {
      const res = await submitLiveAnswer(token, id, q._id, opt, sessionIdRef.current);
      if (res.isWinner) toast.success("First correct — you win this question");
      else toast.info("Answer received");
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className={`mx-auto max-w-3xl anim-in ${flash ? "anim-in" : ""}`}>
      {offline && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-sm">
          <WifiOff size={14} /> Connection lost — answers will sync when you reconnect. Score is safe.
        </div>
      )}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-mist">{state.quiz.title}</p>
          <p className="text-sm">
            {user.name}
            {state.participant?.score != null && state.quiz.status === "LIVE" ? ` · ${state.participant.score} pts` : ""}
          </p>
        </div>
        {q && state.remaining != null && <TimerRing remaining={state.remaining} total={limit} />}
      </div>

      {!q && (
        <div className="rounded-3xl border border-white/8 bg-panel p-10 text-center">
          <p className="text-lg font-semibold">Waiting for the next question…</p>
          <p className="mt-2 text-sm text-mist">Stay on this screen. The host will push the next item to everyone at once.</p>
        </div>
      )}

      {q && (
        <div key={q._id} className="anim-in rounded-3xl border border-white/8 bg-panel p-6 sm:p-8">
          <p className="text-xs uppercase tracking-wider text-mist">
            Question {state.index + 1} / {state.total}
            {state.questionEnded ? " · closed" : " · live"}
          </p>
          <h1 className={`mt-3 font-display leading-tight ${game ? "text-4xl sm:text-5xl" : "text-3xl"}`}>{q.text}</h1>
          <div className={`mt-6 grid gap-3 ${game ? "sm:grid-cols-1" : ""}`}>
            {q.options.map((o) => {
              const selected = state.mySelectedOptionId === o.id;
              return (
                <button
                  key={o.id}
                  disabled={state.hasAnswered || state.questionEnded || state.remaining === 0}
                  onClick={() => answer(o.id)}
                  className={`option-card rounded-2xl border px-4 py-4 text-left text-base transition disabled:opacity-70 ${
                    selected ? "border-violet-400 bg-violet-500/20 glow-violet" : "border-white/10 bg-white/4 hover:border-white/25"
                  } ${game ? "py-5 text-lg" : ""}`}
                >
                  <span className="mr-3 font-mono text-mist">{o.id}</span>
                  {o.text}
                </button>
              );
            })}
          </div>
          {state.hasAnswered && !state.questionEnded && (
            <p className="mt-4 text-sm text-cyan-200">Locked in. Waiting for the host to close this question.</p>
          )}
          {state.questionEnded && (
            <p className="mt-4 text-sm text-mist">Question ended. Correct answers stay hidden until the host allows review.</p>
          )}
        </div>
      )}

      {game && state.stats?.winner && (
        <div className="relative mt-5 overflow-hidden rounded-3xl border border-amber-400/20">
          <img src={winnerImg} alt="" className="h-28 w-full object-cover opacity-70" />
          <div className="absolute inset-0 flex items-center gap-3 bg-black/45 px-5">
            <Crown className="text-gold" />
            <div>
              <p className="text-xs uppercase tracking-wider text-gold">Winner</p>
              <p className="text-lg font-semibold">{state.stats.winner.name}</p>
              <p className="font-mono text-xs text-white/70">{formatMs(state.stats.winner.responseTimeMs)}</p>
            </div>
          </div>
        </div>
      )}

      {state.quiz.showLeaderboard && state.leaderboard.length > 0 && (
        <div className="mt-5 rounded-2xl border border-white/8 bg-panel p-4">
          <p className="mb-2 text-xs uppercase tracking-wider text-mist">Live leaderboard</p>
          {state.leaderboard.slice(0, 5).map((r) => (
            <div key={r.id} className="flex items-center gap-3 py-1 text-sm">
              <span className="w-5 font-mono text-gold">{r.rank}</span>
              <span className="flex-1 truncate">{r.name}</span>
              <span>{r.score}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex justify-center">
        <Button variant="ghost" onClick={() => navigate(`/play/lobby/${id}`)}>
          Back to lobby
        </Button>
      </div>
    </div>
  );
}
