import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getResults, getLeaderboard, getOwnIntegrity } from "../../engine/api";
import { useEngineTick, formatMs } from "../../hooks/useEngine";
import { Button, EmptyState } from "../../components/ui";

export function ResultsPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const tick = useEngineTick();
  const navigate = useNavigate();
  const data = useMemo(() => {
    try {
      return getResults(token, id);
    } catch (e) {
      return { error: e.message };
    }
  }, [token, id, tick]);
  if (data.error) {
    return (
      <EmptyState
        title="Results not available"
        body={data.error}
        action={
          <Button variant="ghost" onClick={() => navigate("/play")}>
            Home
          </Button>
        }
      />
    );
  }

  const items = [
    ["Total questions", data.totalQuestions],
    ["Attempted", data.attemptedQuestions],
    ["Correct", data.correctAnswers],
    ["Incorrect", data.incorrectAnswers],
    ["Score", data.score],
    ["Percentage", `${data.percentage}%`],
    ["Rank", data.rank ?? "Hidden"],
    ["Time taken", formatMs(data.timeTaken)],
  ];
  const integrityTone = {
    CLEAN: "border-emerald-200 bg-emerald-50 text-emerald-800",
    WARNING: "border-amber-200 bg-amber-50 text-amber-800",
    CHEATING: "border-rose-200 bg-rose-50 text-rose-800",
  }[data.integrityStatus] || "border-emerald-200 bg-emerald-50 text-emerald-800";

  return (
    <div className="mx-auto max-w-3xl space-y-6 anim-in">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-violet-300">Results</p>
        <h1 className="font-display text-4xl">{data.quiz.title}</h1>
        <p className="text-sm text-mist">Status: {data.attemptStatus === "TERMINATED" ? "Terminated" : data.status}</p>
      </div>
      {data.attemptStatus === "TERMINATED" && (
        <div className="rounded-2xl border border-rose-300/30 bg-rose-500/10 p-4">
          <p className="text-sm font-semibold text-rose-100">Attempt terminated automatically</p>
          <p className="mt-1 text-sm text-mist">Reason: {data.integrityEvents?.at(-1)?.reason || data.terminationReason?.replaceAll("_", " ")}</p>
          {data.terminatedAt && <p className="mt-1 font-mono text-xs text-mist">{new Date(data.terminatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-white/8 bg-panel p-4">
            <p className="text-[11px] uppercase tracking-wider text-mist">{k}</p>
            <p className="mt-1 font-display text-3xl">{v}</p>
          </div>
        ))}
      </div>
      <section className="rounded-2xl border border-white/10 bg-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mist">Quiz integrity</p>
            <p className="mt-1 text-sm text-white">
              {data.integrityViolationCount ? "Monitoring violations detected" : "No monitoring violations recorded"}
            </p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${integrityTone}`}>
            {data.integrityStatus || "CLEAN"}
          </span>
          <p className="text-sm text-mist">Total violations: {data.integrityViolationCount || 0}</p>
        </div>
        {data.integrityEvents?.length > 0 && (
          <ol className="mt-4 divide-y divide-white/10">
            {data.integrityEvents.map((event) => (
              <li key={event._id || `${event.type}-${event.timestamp}`} className="grid gap-1 py-3 sm:grid-cols-[100px_1fr]">
                <time className="font-mono text-xs text-mist">
                  {new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </time>
                <div>
                  <p className="text-xs font-semibold text-white">{event.type.replaceAll("_", " ")}</p>
                  <p className="mt-0.5 text-sm text-mist">{event.reason}</p>
                  {event.duration != null && <p className="mt-1 text-xs text-mist">Duration: {event.duration} seconds</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-3 text-xs text-mist">Browser monitoring signals are not proof of misconduct.</p>
      </section>
      {data.review ? (
        <div className="space-y-3">
          <h2 className="font-semibold">Answer review</h2>
          {data.review.map((r, i) => (
            <div key={i} className="rounded-2xl border border-white/8 bg-panel p-4">
              <p className="font-medium">
                {i + 1}. {r.question}
              </p>
              <p className={`mt-2 text-sm ${r.isCorrect ? "text-lime-300" : "text-rose-300"}`}>
                Your answer: {r.selectedOptionId || "—"} · Correct: {r.correctOptionId}
              </p>
              {r.explanation && <p className="mt-1 text-sm text-mist">{r.explanation}</p>}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-mist">The host has hidden answer review for this quiz.</p>
      )}
    </div>
  );
}

export function LeaderboardPage() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const tick = useEngineTick();
  const data = useMemo(() => {
    try {
      return getLeaderboard(token, id);
    } catch {
      return [];
    }
  }, [token, id, tick]);
  const ownIntegrity = useMemo(() => {
    try {
      return getOwnIntegrity(token, id);
    } catch {
      return null;
    }
  }, [token, id, tick]);
  const ownResult = ownIntegrity || data.find((row) => row.userId === user?._id);

  return (
    <div className="mx-auto max-w-2xl anim-in">
      <p className="text-xs uppercase tracking-[0.2em] text-gold">Final standings</p>
      <h1 className="font-display text-4xl">Leaderboard</h1>
      {ownResult && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-panel p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-mist">Your quiz integrity</p>
            <p className="mt-1 text-sm text-white">{ownResult.integrityViolationCount ? "Monitoring violations detected" : "No monitoring violations recorded"}</p>
          </div>
          <span className="text-sm font-semibold text-white">{ownResult.attemptStatus === "TERMINATED" ? "TERMINATED" : ownResult.integrityStatus || "CLEAN"} · {ownResult.integrityViolationCount || 0} violations</span>
        </div>
      )}
      {ownResult?.integrityEvents?.length > 0 && (
        <ol className="mt-3 divide-y divide-white/10 rounded-2xl border border-white/10 bg-panel px-4">
          {ownResult.integrityEvents.map((event) => (
            <li key={event._id || `${event.type}-${event.timestamp}`} className="grid gap-1 py-3 sm:grid-cols-[100px_1fr]">
              <time className="font-mono text-xs text-mist">
                {new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </time>
              <div>
                <p className="text-xs font-semibold text-white">{event.type.replaceAll("_", " ")}</p>
                <p className="mt-0.5 text-sm text-mist">{event.reason}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-6 space-y-2">
        {data.length === 0 && <EmptyState title="No scores yet." body="The board fills as answers are recorded." />}
        {data.map((r) => (
          <div key={r.id} className="flex items-center gap-4 rounded-2xl border border-white/8 bg-panel px-4 py-3">
            <span className="w-8 font-mono text-xl text-gold">{r.rank}</span>
            <div className="flex-1">
              <p className="font-semibold">{r.name}</p>
              <p className="text-xs text-mist">
                {r.correct} correct · {formatMs(r.responseTime)} avg
              </p>
            </div>
            <span className="font-display text-3xl">{r.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
