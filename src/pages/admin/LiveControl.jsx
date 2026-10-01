import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Play,
  Pause,
  SkipForward,
  Square,
  Radio,
  Users,
  Crown,
  ArrowLeft,
  Activity,
  Trophy,
  Wifi,
  ShieldAlert,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

import {
  getLiveState,
  openLobby,
  startLiveQuiz,
  startQuestion,
  pauseQuestion,
  resumeQuestion,
  endQuestion,
  nextQuestion,
  endQuiz,
  heartbeat,
} from "../../engine/api";

import { useEngineTick, formatMs } from "../../hooks/useEngine";
import { subscribe } from "../../engine/store";

import {
  Badge,
  Button,
  EmptyState,
  Progress,
  StatusBadge,
  TimerRing,
  Modal,
} from "../../components/ui";

export default function LiveControl() {
  const { id } = useParams();
  const { token } = useAuth();
  const toast = useToast();
  const tick = useEngineTick();
  const [integrityParticipant, setIntegrityParticipant] = useState(null);
  const [integrityAlert, setIntegrityAlert] = useState(null);
  const seenAlerts = useRef(new Set());
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const state = useMemo(() => {
    try {
      return getLiveState(token, id);
    } catch {
      return null;
    }
  }, [token, id, tick]);

  useEffect(() => subscribe((event) => {
    const alert = event.payload;
    if (event.event !== "CHEATING_ALERT" || String(alert?.quizId) !== String(id)) return;
    const key = alert.eventId || `${alert.attemptId}:${alert.eventType}:${alert.timestamp}`;
    if (seenAlerts.current.has(key)) return;
    seenAlerts.current.add(key);
    if (seenAlerts.current.size > 100) seenAlerts.current.delete(seenAlerts.current.values().next().value);
    setIntegrityAlert(alert);
    toastRef.current.error(`Quiz Integrity Violation: ${alert.studentName}. ${alert.reason}. Attempt terminated.`);
  }), [id]);

  useEffect(() => {
    const t = setInterval(() => heartbeat(token, id), 3000);

    heartbeat(token, id);

    return () => clearInterval(t);
  }, [token, id]);

  if (!state) {
    return (
      <div className="min-h-full bg-[#F5F7FC] p-4 text-[#111827]">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.035)]">
          <EmptyState
            title="Quiz not found"
            body="Check the link and try again."
          />
        </div>
      </div>
    );
  }

  const {
    quiz,
    currentQuestion,
    remaining,
    total,
    index,
    stats,
    participants,
    leaderboard,
    winners,
    questionEnded,
    paused,
  } = state;

  const limit =
    (currentQuestion?.timeLimit ||
      quiz.questionTimeLimit ||
      30) * 1000;

  const answered = stats?.total || 0;

  const run = async (fn, ok) => {
    try {
      await fn();

      if (ok) {
        toast.success(ok);
      }
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="min-h-full bg-[#F5F7FC] text-[#111827] anim-in">
      <div className="space-y-6">

        {/* =====================================================
            HEADER
        ===================================================== */}
        <header className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">

          <div>
            <Link
              to={`/admin/quizzes/${id}`}
              className="inline-flex items-center gap-2 text-xs font-medium text-[#64748B] transition hover:text-[#6D4AFF]"
            >
              <ArrowLeft size={13} />
              Back to quiz
            </Link>

            <div className="mt-3 flex flex-wrap items-center gap-3">

              <h1 className="text-2xl font-bold tracking-[-0.03em] text-[#111827] sm:text-3xl">
                {quiz.title}
              </h1>

              <StatusBadge status={quiz.computedStatus} />

              {quiz.lobbyOpen && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-100 bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold text-[#0891B2]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#06B6D4]" />
                  Lobby open
                </span>
              )}
            </div>

            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-md bg-[#F0EBFF] px-2 py-1 font-mono text-xs font-semibold text-[#6D4AFF]">
                {quiz.quizCode}
              </span>

              {quiz.status === "LIVE" && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Live session
                </span>
              )}
            </div>
          </div>

          {/* Header actions */}
          <div className="flex flex-wrap gap-2">

            {quiz.status !== "LIVE" &&
              quiz.status !== "COMPLETED" && (
                <>
                  <Button
                    variant="outline"
                    onClick={() =>
                      run(
                        () => openLobby(token, id),
                        "Lobby opened"
                      )
                    }
                  >
                    <Radio size={16} />
                    Open lobby
                  </Button>

                  <Button
                    onClick={() =>
                      run(
                        () => startLiveQuiz(token, id),
                        "Quiz started"
                      )
                    }
                  >
                    <Play size={16} />
                    Start quiz
                  </Button>
                </>
              )}

            {quiz.status === "LIVE" && (
              <Button
                variant="danger"
                onClick={() =>
                  run(
                    () => endQuiz(token, id),
                    "Quiz ended"
                  )
                }
              >
                <Square size={16} />
                End quiz
              </Button>
            )}
          </div>
        </header>

        {integrityAlert && (
          <section role="alert" className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-rose-700">Quiz Integrity Violation</p>
              <p className="mt-1 text-sm font-semibold text-[#11182F]">{integrityAlert.studentName}</p>
              <p className="mt-0.5 text-sm text-[#596580]">{integrityAlert.reason} · Attempt terminated</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const participant = participants.find((item) => String(item._id) === String(integrityAlert.attemptId));
                  if (participant) setIntegrityParticipant(participant);
                }}
              >View report</Button>
              <button type="button" onClick={() => setIntegrityAlert(null)} className="rounded-lg p-2 text-rose-700 hover:bg-rose-100" aria-label="Dismiss alert">×</button>
            </div>
          </section>
        )}

        {/* =====================================================
            LIVE OVERVIEW BAR
        ===================================================== */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

          <LiveMini
            icon={Radio}
            label="Session"
            value={quiz.status === "LIVE" ? "Live" : quiz.status}
            color="violet"
          />

          <LiveMini
            icon={Users}
            label="Connected"
            value={state.connectedCount}
            color="cyan"
          />

          <LiveMini
            icon={Activity}
            label="Answers"
            value={answered}
            color="emerald"
          />

          <LiveMini
            icon={Trophy}
            label="Question"
            value={
              currentQuestion
                ? `${index + 1} / ${total}`
                : "—"
            }
            color="amber"
          />

        </div>

        {/* =====================================================
            MAIN CONTROL GRID
        ===================================================== */}
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">

          {/* ===================================================
              LEFT COLUMN
          =================================================== */}
          <div className="space-y-5">

            {/* Question control */}
            <section className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_4px_20px_rgba(15,23,42,0.035)]">

              {/* Section header */}
              <div className="flex flex-col gap-4 border-b border-[#E2E8F0] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6D4AFF]">
                    Live question
                  </p>

                  <p className="mt-1 text-sm font-medium text-[#64748B]">
                    {currentQuestion
                      ? `Question ${index + 1} of ${total}`
                      : "No active question"}
                  </p>
                </div>

                {currentQuestion &&
                  remaining != null && (
                    <div className="flex items-center gap-3">
                      {paused && (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                          Paused
                        </span>
                      )}

                      <div className="shrink-0">
                        <TimerRing
                          remaining={remaining}
                          total={limit}
                        />
                      </div>
                    </div>
                  )}
              </div>

              {/* Question content */}
              <div className="p-5 sm:p-6">

                {currentQuestion ? (
                  <>
                    <div className="rounded-xl bg-[#F8FAFC] p-5">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                        Current question
                      </p>

                      <h2 className="text-xl font-bold leading-relaxed tracking-[-0.02em] text-[#111827] sm:text-2xl">
                        {currentQuestion.text}
                      </h2>
                    </div>

                    {/* Answer options */}
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {currentQuestion.options.map((o) => {
                        const count =
                          stats?.optionCounts?.[o.id] || 0;

                        const pct = participants.length
                          ? Math.round(
                              (count / participants.length) * 100
                            )
                          : 0;

                        const isCorrect =
                          o.id ===
                          currentQuestion.correctOptionId;

                        return (
                          <div
                            key={o.id}
                            className={`rounded-xl border p-4 transition-colors ${
                              isCorrect
                                ? "border-emerald-200 bg-emerald-50/70"
                                : "border-[#E2E8F0] bg-white hover:border-[#D7D0FF]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3 text-sm">

                              <div className="flex min-w-0 items-start gap-3">
                                <span
                                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                                    isCorrect
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-[#F1F5F9] text-[#64748B]"
                                  }`}
                                >
                                  {o.id}
                                </span>

                                <span className="pt-1 font-medium leading-5 text-[#334155]">
                                  {o.text}
                                </span>
                              </div>

                              <span className="shrink-0 text-xs font-semibold text-[#64748B]">
                                {count}
                              </span>
                            </div>

                            <div className="mt-3">
                              <Progress value={pct} />
                            </div>

                            <div className="mt-1.5 flex justify-between text-[10px] text-[#94A3B8]">
                              <span>Responses</span>
                              <span>{pct}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="flex min-h-[260px] items-center justify-center rounded-xl bg-[#F8FAFC] px-6 text-center">
                    <div>
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#F0EBFF]">
                        <Radio
                          size={21}
                          className="text-[#6D4AFF]"
                        />
                      </div>

                      <p className="mt-4 text-sm font-semibold text-[#111827]">
                        Ready to broadcast
                      </p>

                      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[#64748B]">
                        {quiz.status === "LIVE"
                          ? "Press Start question to broadcast the first item to every connected participant."
                          : "Start the quiz, then release questions one at a time."}
                      </p>
                    </div>
                  </div>
                )}

                {/* Question controls */}
                <div className="mt-6 flex flex-wrap gap-2">

                  <Button
                    onClick={() =>
                      run(
                        () => startQuestion(token, id),
                        "Question live"
                      )
                    }
                    disabled={quiz.status !== "LIVE"}
                  >
                    <Play size={16} />
                    Start question
                  </Button>

                  {paused ? (
                    <Button
                      variant="outline"
                      onClick={() =>
                        run(
                          () => resumeQuestion(token, id)
                        )
                      }
                      disabled={
                        !currentQuestion ||
                        questionEnded
                      }
                    >
                      <Play size={16} />
                      Resume
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() =>
                        run(
                          () => pauseQuestion(token, id)
                        )
                      }
                      disabled={!currentQuestion}
                    >
                      <Pause size={16} />
                      Pause
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    onClick={() =>
                      run(
                        () => endQuestion(token, id)
                      )
                    }
                    disabled={!currentQuestion}
                  >
                    End question
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() =>
                      run(
                        () => nextQuestion(token, id)
                      )
                    }
                    disabled={quiz.status !== "LIVE"}
                  >
                    <SkipForward size={16} />
                    Next
                  </Button>
                </div>

                {questionEnded && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-sm font-medium text-amber-800">
                      Question closed. Submissions are locked.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* =================================================
                FASTEST WINNERS
            ================================================= */}
            {quiz.mode === "game" && (
              <section className="rounded-2xl border border-amber-200 bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.035)]">

                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
                    <Crown
                      size={18}
                      className="text-amber-600"
                    />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-[#111827]">
                      Fastest correct winners
                    </h3>

                    <p className="mt-0.5 text-xs text-[#64748B]">
                      Server-validated fastest correct answers
                    </p>
                  </div>
                </div>

                {winners.length === 0 ? (
                  <div className="mt-4 rounded-xl bg-[#F8FAFC] px-4 py-4">
                    <p className="text-sm text-[#64748B]">
                      No winner recorded yet. The first correct
                      server-side answer will lock this slot.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-2">
                    {winners.map((w, i) => (
                      <div
                        key={w._id}
                        className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3"
                      >
                        <span className="text-sm text-[#334155]">
                          Q{i + 1} →{" "}
                          <strong className="text-[#111827]">
                            {w.name}
                          </strong>
                        </span>

                        <span className="rounded-md bg-white px-2 py-1 font-mono text-xs font-semibold text-[#64748B]">
                          {formatMs(w.responseTimeMs)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>

          {/* ===================================================
              RIGHT COLUMN
          =================================================== */}
          <div className="space-y-5">

            {/* Live metrics */}
            <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.035)]">

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#111827]">
                    Live metrics
                  </h3>

                  <p className="mt-1 text-xs text-[#64748B]">
                    Current session activity
                  </p>
                </div>

                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-50">
                  <Activity
                    size={16}
                    className="text-[#06B6D4]"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <Mini
                  label="Connected"
                  value={state.connectedCount}
                />

                <Mini
                  label="Joined"
                  value={participants.length}
                />

                <Mini
                  label="Answers"
                  value={answered}
                />

                <Mini
                  label="Unanswered"
                  value={
                    stats?.unanswered ??
                    participants.length
                  }
                />
              </div>
            </section>

            {/* Answer stats */}
            {stats && (
              <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_20px_rgba(15,23-Slate-42,0.035)]">

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#111827]">
                      Answer statistics
                    </h3>

                    <p className="mt-1 text-xs text-[#64748B]">
                      Current question performance
                    </p>
                  </div>

                  <CheckIcon />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">

                  <div className="rounded-xl bg-emerald-50 p-4">
                    <p className="text-xs font-medium text-emerald-700">
                      Correct
                    </p>

                    <p className="mt-1 text-2xl font-bold text-emerald-700">
                      {stats.correct}
                    </p>
                  </div>

                  <div className="rounded-xl bg-red-50 p-4">
                    <p className="text-xs font-medium text-red-700">
                      Incorrect
                    </p>

                    <p className="mt-1 text-2xl font-bold text-red-700">
                      {stats.incorrect}
                    </p>
                  </div>

                </div>

                {stats.winner && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
                    <Crown size={14} />
                    <span>
                      <strong>{stats.winner.name}</strong>{" "}
                      locked the win
                    </span>
                  </div>
                )}
              </section>
            )}

            {/* =================================================
                PARTICIPANTS
            ================================================= */}
            <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.035)]">

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#111827]">
                    Participants
                  </h3>

                  <p className="mt-1 text-xs text-[#64748B]">
                    People currently in the session
                  </p>
                </div>

                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50">
                  <Users
                    size={16}
                    className="text-[#6D4AFF]"
                  />
                </div>
              </div>

              <div className="scroller mt-4 max-h-64 space-y-1 overflow-auto">

                {participants.length === 0 && (
                  <div className="rounded-xl bg-[#F8FAFC] px-4 py-4">
                    <p className="text-sm leading-6 text-[#64748B]">
                      Waiting for people to join with{" "}
                      <span className="font-mono font-semibold text-[#6D4AFF]">
                        {quiz.quizCode}
                      </span>
                      .
                    </p>
                  </div>
                )}

                {participants.map((p) => {
                  const terminated = p.attemptStatus === "TERMINATED" || p.status === "terminated";
                  return (
                  <div
                    key={p._id}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-[#F8FAFC]"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">

                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          terminated
                            ? "bg-rose-500"
                            : p.connected
                            ? "bg-emerald-500"
                            : "bg-[#CBD5E1]"
                        }`}
                      />

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#334155]">
                          {p.name}
                        </p>
                        <p className={`text-[10px] font-semibold ${terminated ? "text-rose-700" : "text-[#64748B]"}`}>
                          {terminated ? "Terminated" : p.connected ? "Online" : "Offline"}
                        </p>

                        {p.team && (
                          <p className="truncate text-[11px] text-[#94A3B8]">
                            {p.team.name}
                          </p>
                        )}
                      </div>
                    </div>

                    <span className="ml-3 rounded-md bg-[#F1F5F9] px-2 py-1 font-mono text-xs font-semibold text-[#64748B]">
                      {p.score}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIntegrityParticipant(p)}
                      className={`ml-2 inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold transition hover:ring-2 hover:ring-offset-1 ${integrityClasses(p.integrityStatus)}`}
                      aria-label={`View ${p.name}'s quiz integrity details`}
                    >
                      <ShieldAlert size={13} />
                      {p.integrityViolationCount || 0} {p.integrityViolationCount === 1 ? "violation" : "violations"}
                    </button>
                  </div>
                  );
                })}
              </div>
            </section>

            {/* =================================================
                LEADERBOARD
            ================================================= */}
            <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.035)]">

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#111827]">
                    Leaderboard
                  </h3>

                  <p className="mt-1 text-xs text-[#64748B]">
                    Current ranking
                  </p>
                </div>

                <Trophy
                  size={17}
                  className="text-[#6D4AFF]"
                />
              </div>

              {leaderboard.length === 0 ? (
                <div className="mt-4 rounded-xl bg-[#F8FAFC] px-4 py-4">
                  <p className="text-sm text-[#64748B]">
                    No scores yet.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-1.5">
                  {leaderboard.slice(0, 8).map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[#F8FAFC]"
                    >
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                          r.rank === 1
                            ? "bg-amber-50 text-amber-700"
                            : r.rank === 2
                            ? "bg-slate-100 text-slate-600"
                            : r.rank === 3
                            ? "bg-orange-50 text-orange-700"
                            : "bg-[#F1F5F9] text-[#64748B]"
                        }`}
                      >
                        {r.rank}
                      </span>

                      <span className="flex-1 truncate text-sm font-medium text-[#334155]">
                        {r.name}
                      </span>

                      <span className="font-semibold text-[#111827]">
                        {r.score}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
      <Modal
        open={Boolean(integrityParticipant)}
        onClose={() => setIntegrityParticipant(null)}
        title={integrityParticipant ? `${integrityParticipant.name} · Quiz Integrity` : "Quiz Integrity"}
        wide
      >
        {integrityParticipant && <IntegrityDetails participant={integrityParticipant} />}
      </Modal>
    </div>
  );
}

function integrityClasses(status) {
  if (status === "CHEATING") return "bg-rose-50 text-rose-700";
  if (status === "WARNING") return "bg-amber-50 text-amber-700";
  return "bg-emerald-50 text-emerald-700";
}

function IntegrityDetails({ participant }) {
  const events = [...(participant.integrityEvents || [])].reverse();
  return (
    <div className="text-[#111827]">
      <div className="flex flex-wrap items-center gap-3 border-b border-[#E2E6F0] pb-4">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${integrityClasses(participant.integrityStatus)}`}>
          {participant.integrityStatus || "CLEAN"}
        </span>
        <span className="text-sm text-[#596580]">
          {participant.integrityViolationCount || 0} monitoring violations
        </span>
        {participant.terminationReason && <span className="text-sm font-semibold text-rose-700">Attempt terminated · {participant.terminationReason}</span>}
      </div>
      <h4 className="mt-4 text-sm font-semibold">Event history</h4>
      {events.length ? (
        <ol className="mt-2 divide-y divide-[#E2E6F0]">
          {events.map((event) => (
            <li key={event._id} className="grid gap-1 py-3 sm:grid-cols-[110px_1fr]">
              <time className="font-mono text-xs text-[#596580]">
                {new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </time>
              <div>
                <p className="text-xs font-bold text-[#11182F]">{event.type.replaceAll("_", " ")}</p>
                <p className="mt-0.5 text-sm text-[#596580]">{event.reason}</p>
                {event.duration != null && <p className="mt-1 text-xs text-[#596580]">Duration: {event.duration} seconds</p>}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-2 rounded-xl bg-[#F5F7FC] px-4 py-5 text-sm text-[#596580]">No monitoring violations recorded.</p>
      )}
      <p className="mt-3 text-xs text-[#64748B]">These browser signals are monitoring records, not proof of misconduct.</p>
    </div>
  );
}

/* ===============================================================
   LIVE MINI CARD
================================================================ */

function LiveMini({
  icon: Icon,
  label,
  value,
  color,
}) {
  const styles = {
    violet: {
      bg: "bg-violet-50",
      icon: "text-[#6D4AFF]",
    },
    cyan: {
      bg: "bg-cyan-50",
      icon: "text-[#06B6D4]",
    },
    emerald: {
      bg: "bg-emerald-50",
      icon: "text-emerald-600",
    },
    amber: {
      bg: "bg-amber-50",
      icon: "text-amber-600",
    },
  };

  const style = styles[color] || styles.violet;

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-[0_4px_20px_rgba(15,23,42,0.035)]">
      <div className="flex items-center justify-between">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${style.bg}`}
        >
          <Icon size={17} className={style.icon} />
        </div>

        <Wifi
          size={14}
          className="text-[#CBD5E1]"
        />
      </div>

      <p className="mt-4 text-xs font-medium text-[#64748B]">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold tracking-[-0.02em] text-[#111827]">
        {value}
      </p>
    </div>
  );
}

/* ===============================================================
   MINI STAT
================================================================ */

function Mini({ label, value }) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold tracking-[-0.03em] text-[#111827]">
        {value}
      </p>
    </div>
  );
}

/* ===============================================================
   SMALL ICON
================================================================ */

function CheckIcon() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
      <Activity
        size={16}
        className="text-emerald-600"
      />
    </div>
  );
}