import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  KeyRound,
  Timer,
  Radio,
  Swords,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { listQuizzes } from "../../engine/api";
import { getState as db } from "../../engine/store";
import { useEngineTick, formatDate } from "../../hooks/useEngine";

import {
  Button,
  EmptyState,
  ModeBadge,
  StatusBadge,
} from "../../components/ui";

export default function StudentHome() {
  const { token, user } = useAuth();
  const tick = useEngineTick();

  const list = useMemo(
    () => listQuizzes(token, { limit: 50, page: 1 }),
    [token, tick]
  );

  const mine = useMemo(() => {
    const ids = new Set(
      db()
        .participants
        .filter((p) => p.userId === user._id)
        .map((p) => p.quizId)
    );

    return list.items.filter((q) => ids.has(q._id));
  }, [list, user, tick]);

  const open = list.items.filter((q) =>
    ["LIVE", "SCHEDULED"].includes(q.computedStatus)
  );

  return (
    <div className="space-y-8 anim-in">
      {/* =====================================================
          HERO
          ===================================================== */}
      <section
        className="
          overflow-hidden
          rounded-[30px]
          border border-slate-200
          bg-[radial-gradient(circle_at_top_left,_rgba(108,59,255,0.08),transparent_22%),linear-gradient(135deg,#ffffff,#f3f6ff)]
          p-6
          shadow-[0_18px_45px_rgba(15,23,42,0.06)]
          sm:p-8
        "
      >
        <p className="text-[10px] uppercase tracking-[0.22em] text-violet-700">
          Arena
        </p>

        <h1
          className="
            mt-2
            max-w-lg
            font-display
            text-4xl
            leading-tight
            text-slate-900
            sm:text-5xl
          "
        >
          Ready when the host is.
        </h1>

        <p
          className="
            mt-3
            max-w-xl
            text-sm
            leading-6
            text-slate-600
          "
        >
          Enter a quiz code to join a lobby, sit a scheduled paper,
          or fight for first-correct glory.
        </p>

        <Link
          to="/play/join"
          className="mt-6 inline-block"
        >
          <Button>
            <KeyRound size={16} />
            Join with code
          </Button>
        </Link>
      </section>

      {/* =====================================================
          YOUR QUIZZES
          ===================================================== */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Your quizzes
          </h2>
        </div>

        {mine.length === 0 ? (
          <EmptyState
            icon={Timer}
            title="You haven't joined a quiz yet."
            body="Use a host's quiz code to enter a scheduled exam, live room, or fastest-answer game."
            action={
              <Link to="/play/join">
                <Button>
                  Join a quiz
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {mine.map((q) => (
              <QuizCard
                key={q._id}
                q={q}
              />
            ))}
          </div>
        )}
      </section>

      {/* =====================================================
          OPEN QUIZZES
          ===================================================== */}
      {open.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Open right now
            </h2>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {open.map((q) => (
              <QuizCard
                key={q._id}
                q={q}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}


/* =========================================================
   QUIZ CARD
   ========================================================= */

function QuizCard({ q }) {
  const href =
    q.mode === "scheduled"
      ? q.computedStatus === "LIVE"
        ? `/play/quiz/${q._id}`
        : q.computedStatus === "EXPIRED" ||
            q.computedStatus === "COMPLETED"
          ? `/play/results/${q._id}`
          : `/play/join?code=${q.quizCode}`
      : q.computedStatus === "COMPLETED"
        ? `/play/leaderboard/${q._id}`
        : `/play/lobby/${q._id}`;

  const Icon =
    q.mode === "game"
      ? Swords
      : q.mode === "live"
        ? Radio
        : Timer;

  return (
    <Link
      to={href}
      className="
        group
        block
        rounded-3xl
        border border-slate-200
        bg-white
        p-4
        shadow-[0_16px_32px_rgba(15,23,42,0.05)]
        transition-all
        duration-200
        hover:-translate-y-0.5
        hover:border-violet-200
        hover:shadow-[0_20px_38px_rgba(108,59,255,0.08)]
      "
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        {/* Mode icon */}
        <div
          className="
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-2xl
            bg-violet-50
            text-violet-700
            transition
            duration-200
            group-hover:bg-violet-100
          "
        >
          <Icon size={18} />
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap justify-end gap-2">
          <ModeBadge mode={q.mode} />
          <StatusBadge status={q.computedStatus} />
        </div>
      </div>

      {/* Quiz title */}
      <h3
        className="
          mt-3
          text-lg
          font-semibold
          text-slate-900
          transition-colors
          group-hover:text-violet-700
        "
      >
        {q.title}
      </h3>

      {/* Description */}
      <p
        className="
          mt-1
          line-clamp-2
          text-sm
          leading-6
          text-slate-600
        "
      >
        {q.description || "No description"}
      </p>

      {/* Quiz code */}
      <p
        className="
          mt-3
          font-mono
          text-xs
          font-medium
          tracking-wide
          text-violet-700
        "
      >
        {q.quizCode}
      </p>

      {/* Start date */}
      <p className="mt-1 text-xs text-slate-500">
        {formatDate(q.startTime)}
      </p>
    </Link>
  );
}