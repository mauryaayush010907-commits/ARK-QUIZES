import { Link } from "react-router-dom";
import {
  Trophy,
  Radio,
  CalendarClock,
  CheckCircle2,
  Users,
  HelpCircle,
  UsersRound,
  Plus,
  ArrowUpRight,
  Activity,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { adminOverview } from "../../engine/api";
import { useEngineTick, formatDate } from "../../hooks/useEngine";
import {
  Badge,
  Button,
  EmptyState,
  ModeBadge,
  StatusBadge,
} from "../../components/ui";
import { useMemo } from "react";

export default function Dashboard() {
  const { token } = useAuth();
  const tick = useEngineTick();

  const data = useMemo(
    () => adminOverview(token),
    [token, tick]
  );

  const cards = [
    {
      label: "Total quizzes",
      value: data.totalQuizzes,
      icon: Trophy,
      iconBg: "bg-violet-50",
      iconColor: "text-[#6D4AFF]",
    },
    {
      label: "Active now",
      value: data.activeQuizzes,
      icon: Radio,
      iconBg: "bg-cyan-50",
      iconColor: "text-[#06B6D4]",
    },
    {
      label: "Scheduled",
      value: data.scheduledQuizzes,
      icon: CalendarClock,
      iconBg: "bg-indigo-50",
      iconColor: "text-indigo-600",
    },
    {
      label: "Completed",
      value: data.completedQuizzes,
      icon: CheckCircle2,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      label: "Participants",
      value: data.totalParticipants,
      icon: Users,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      label: "Questions",
      value: data.totalQuestions,
      icon: HelpCircle,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
    },
    {
      label: "Teams",
      value: data.totalTeams,
      icon: UsersRound,
      iconBg: "bg-teal-50",
      iconColor: "text-teal-600",
    },
  ];

  return (
    <div className="min-h-full bg-[#F5F7FC] text-[#111827]">
      <div className="space-y-8 p-1 sm:p-2">

        {/* ================= HEADER ================= */}
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#6D4AFF]" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6D4AFF]">
                Overview
              </p>
            </div>

            <h1 className="text-3xl font-bold tracking-[-0.03em] text-[#111827] sm:text-4xl">
              Command center
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-[#64748B]">
              Monitor quizzes, participants, teams, and live activity from one
              centralized dashboard.
            </p>
          </div>

          <Link to="/admin/quizzes/new">
            <Button>
              <Plus size={16} />
              New quiz
            </Button>
          </Link>
        </header>

        {/* ================= LIVE STATUS ================= */}
        {data.activeQuizzes > 0 && (
          <div className="flex flex-col gap-3 rounded-2xl border border-red-100 bg-white px-5 py-4 shadow-[0_4px_20px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50">
                <Activity size={18} className="text-red-500" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <Badge tone="live">Live</Badge>
                  <p className="text-sm font-semibold text-[#111827]">
                    {data.activeQuizzes} quiz
                    {data.activeQuizzes > 1 ? "zes" : ""} currently in session
                  </p>
                </div>

                <p className="mt-1 text-xs text-[#64748B]">
                  Real-time activity is being monitored.
                </p>
              </div>
            </div>

            <Link
              to="/admin/quizzes"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#6D4AFF] transition hover:text-[#5835E8]"
            >
              View quizzes
              <ArrowUpRight size={15} />
            </Link>
          </div>
        )}

        {/* ================= STATISTICS ================= */}
        <section>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => {
              const Icon = card.icon;

              return (
                <div
                  key={card.label}
                  className="group relative overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.035)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D7D0FF] hover:shadow-[0_10px_30px_rgba(15,23,42,0.07)]"
                >
                  <div className="flex items-start justify-between">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.iconBg}`}
                    >
                      <Icon size={20} className={card.iconColor} />
                    </div>

                    <ArrowUpRight
                      size={16}
                      className="text-[#CBD5E1] transition-colors group-hover:text-[#6D4AFF]"
                    />
                  </div>

                  <div className="mt-5">
                    <p className="text-sm font-medium text-[#64748B]">
                      {card.label}
                    </p>

                    <p className="mt-1 text-3xl font-bold tracking-[-0.03em] text-[#111827]">
                      {card.value ?? 0}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ================= RECENT QUIZZES ================= */}
        <section>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-[-0.02em] text-[#111827]">
                Recent quizzes
              </h2>

              <p className="mt-1 text-sm text-[#64748B]">
                Your latest quiz activity and assessment sessions.
              </p>
            </div>

            <Link
              to="/admin/quizzes"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#6D4AFF] transition hover:text-[#5835E8]"
            >
              View all
              <ArrowUpRight size={15} />
            </Link>
          </div>

          {data.recent.length === 0 ? (
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.035)]">
              <EmptyState
                icon={Trophy}
                title="No quiz data available yet."
                body="Create a scheduled exam, live room, or fastest-answer game to populate this dashboard."
                action={
                  <Link to="/admin/quizzes/new">
                    <Button>Create your first quiz</Button>
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_4px_20px_rgba(15,23,42,0.035)]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    <tr>
                      <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                        Title
                      </th>

                      <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                        Mode
                      </th>

                      <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                        Status
                      </th>

                      <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                        People
                      </th>

                      <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                        Created
                      </th>

                      <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                        Start
                      </th>

                      <th className="px-5 py-4" />
                    </tr>
                  </thead>

                  <tbody>
                    {data.recent.map((q) => (
                      <tr
                        key={q._id}
                        className="border-b border-[#F1F5F9] transition-colors last:border-0 hover:bg-[#FAFAFF]"
                      >
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-semibold text-[#111827]">
                              {q.title}
                            </p>

                            <p className="mt-1 font-mono text-[11px] text-[#94A3B8]">
                              {q.quizCode}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <ModeBadge mode={q.mode} />
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge status={q.computedStatus} />
                        </td>

                        <td className="px-5 py-4 font-medium text-[#334155]">
                          {q.participantCount}
                        </td>

                        <td className="px-5 py-4 text-[#64748B]">
                          {formatDate(q.createdAt)}
                        </td>

                        <td className="px-5 py-4 text-[#64748B]">
                          {formatDate(q.startTime)}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Link
                            to={`/admin/quizzes/${q._id}`}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-[#6D4AFF] transition hover:bg-[#F0EBFF]"
                          >
                            Open
                            <ArrowUpRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}