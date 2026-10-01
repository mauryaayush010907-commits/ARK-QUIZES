import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getLiveState, heartbeat, joinQuiz, leaveQuiz } from "../../engine/api";
import { useEngineTick } from "../../hooks/useEngine";
import lobbyImg from "../../assets/images/lobby.jpg";
import { Badge } from "../../components/ui";

export default function Lobby() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const tick = useEngineTick();

  useEffect(() => {
    try {
      joinQuiz(token, { quizId: id });
    } catch {
      /* already joined or not open */
    }
    const t = setInterval(() => heartbeat(token, id), 2500);
    return () => {
      clearInterval(t);
      try {
        leaveQuiz(token, id);
      } catch {
        /* ignore */
      }
    };
  }, [token, id]);

  const state = useMemo(() => {
    try {
      return getLiveState(token, id);
    } catch {
      return null;
    }
  }, [token, id, tick]);

  useEffect(() => {
    if (!state) return;
    if (state.quiz.status === "LIVE" && state.currentQuestion) {
      navigate(state.quiz.mode === "game" ? `/play/game/${id}` : `/play/live/${id}`);
    } else if (state.quiz.status === "LIVE" && state.quiz.startedAt) {
      navigate(state.quiz.mode === "game" ? `/play/game/${id}` : `/play/live/${id}`);
    } else if (state.quiz.status === "COMPLETED") {
      navigate(`/play/leaderboard/${id}`);
    }
  }, [state, id, navigate]);

  if (!state) {
    return <p className="text-mist">Unable to load this lobby.</p>;
  }

  return (
    <div className="anim-in overflow-hidden rounded-[28px] border border-white/8">
      <div className="relative h-52">
        <img src={lobbyImg} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07070b] to-transparent" />
      </div>
      <div className="-mt-10 px-6 pb-8">
        <Badge tone={state.quiz.mode === "game" ? "gold" : "rose"}>{state.quiz.mode}</Badge>
        <h1 className="mt-3 font-display text-4xl">{state.quiz.title}</h1>
        <p className="mt-2 text-mist">{state.quiz.description}</p>
        <p className="mt-4 font-mono text-cyan-200">{state.quiz.quizCode}</p>
        <div className="mt-8 rounded-2xl border border-white/8 bg-white/4 p-5 text-center">
          <div className="mx-auto mb-3 h-3 w-3 rounded-full bg-cyan-300 live-dot" />
          <p className="text-lg font-semibold">Waiting for host…</p>
          <p className="mt-1 text-sm text-mist">
            You'll jump into the question automatically. Don't refresh unless you need to reconnect.
          </p>
          <p className="mt-4 text-sm">
            Playing as <strong>{state.participant?.name || user.name}</strong>
            {state.participant?.teamId ? " · team mode" : ""}
          </p>
          <p className="mt-2 font-display text-4xl">{state.participants.length}</p>
          <p className="text-xs uppercase tracking-wider text-mist">in the room</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {state.participants.map((p) => (
            <span key={p._id} className="rounded-full bg-white/5 px-3 py-1 text-xs">
              <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${p.connected ? "bg-lime-400" : "bg-white/30"}`} />
              {p.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
