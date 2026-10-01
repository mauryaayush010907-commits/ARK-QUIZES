import { useMemo, useState } from "react";
import {
  Users,
  UsersRound,
  UserCheck,
  Search,
  ShieldCheck,
  Trophy,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { searchPeople } from "../../engine/api";
import { useEngineTick, formatDate } from "../../hooks/useEngine";
import {
  EmptyState,
  SearchBox,
  Tabs,
  Badge,
} from "../../components/ui";

export function ParticipantsPage() {
  return <PeopleView kind="participants" />;
}

export function TeamsPage() {
  return <PeopleView kind="teams" />;
}

function PeopleView({ kind }) {
  const { token } = useAuth();
  const tick = useEngineTick();

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState(kind);

  const data = useMemo(
    () => searchPeople(token, { search }),
    [token, search, tick]
  );

  const rows =
    tab === "teams"
      ? data.teams
      : data.participants;

  const participantCount = data.participants?.length || 0;
  const teamCount = data.teams?.length || 0;

  return (
    <div className="min-h-full bg-[#F5F7FC] text-[#111827] anim-in">
      <div className="space-y-6">

        {/* =====================================================
            PAGE HEADER
        ===================================================== */}
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">

          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0EBFF]">
                {tab === "teams" ? (
                  <UsersRound
                    size={18}
                    className="text-[#6D4AFF]"
                  />
                ) : (
                  <Users
                    size={18}
                    className="text-[#6D4AFF]"
                  />
                )}
              </span>

              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6D4AFF]">
                Directory
              </p>
            </div>

            <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#111827] sm:text-4xl">
              {tab === "teams"
                ? "Teams"
                : "Participants"}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">
              Manage participants and teams across your
              quiz sessions from one centralized directory.
            </p>
          </div>

          {/* Header statistics */}
          <div className="grid grid-cols-2 gap-3 sm:w-auto">

            <HeaderStat
              icon={Users}
              label="Participants"
              value={participantCount}
              color="violet"
            />

            <HeaderStat
              icon={UsersRound}
              label="Teams"
              value={teamCount}
              color="cyan"
            />

          </div>
        </div>

        {/* =====================================================
            NAVIGATION + SEARCH
        ===================================================== */}
        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-3 shadow-[0_4px_20px_rgba(15,23,42,0.035)]">

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

            <div className="overflow-x-auto">
              <Tabs
                value={tab}
                onChange={setTab}
                tabs={[
                  {
                    id: "participants",
                    label: "Participants",
                  },
                  {
                    id: "teams",
                    label: "Teams",
                  },
                ]}
              />
            </div>

            <div className="w-full lg:max-w-sm">
              <SearchBox
                value={search}
                onChange={setSearch}
                placeholder="Search name, team or code"
              />
            </div>

          </div>
        </section>

        {/* =====================================================
            RESULT HEADER
        ===================================================== */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <h2 className="text-lg font-bold tracking-[-0.02em] text-[#111827]">
              {tab === "teams"
                ? "Registered teams"
                : "Registered participants"}
            </h2>

            <p className="mt-1 text-xs text-[#64748B]">
              {rows.length}{" "}
              {tab === "teams"
                ? rows.length === 1
                  ? "team"
                  : "teams"
                : rows.length === 1
                ? "participant"
                : "participants"}{" "}
              found
              {search && (
                <>
                  {" "}
                  for{" "}
                  <span className="font-medium text-[#475569]">
                    "{search}"
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="hidden items-center gap-2 text-xs text-[#94A3B8] sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Live database records
          </div>

        </div>

        {/* =====================================================
            EMPTY STATE
        ===================================================== */}
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-1 shadow-[0_4px_20px_rgba(15,23,42,0.035)]">
            <EmptyState
              icon={
                tab === "teams"
                  ? UsersRound
                  : Users
              }
              title={
                search
                  ? "No matching records."
                  : "No records yet."
              }
              body={
                search
                  ? "Try a different name, team or quiz code."
                  : "People and teams appear here after they join a quiz."
              }
            />
          </div>
        ) : tab === "teams" ? (
          <TeamsGrid teams={data.teams} />
        ) : (
          <ParticipantsTable
            participants={data.participants}
          />
        )}
      </div>
    </div>
  );
}

/* ===============================================================
   HEADER STAT
================================================================ */

function HeaderStat({
  icon: Icon,
  label,
  value,
  color,
}) {
  const styles = {
    violet: {
      bg: "bg-[#F0EBFF]",
      icon: "text-[#6D4AFF]",
    },
    cyan: {
      bg: "bg-cyan-50",
      icon: "text-[#06B6D4]",
    },
  };

  const style = styles[color] || styles.violet;

  return (
    <div className="min-w-[145px] rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 shadow-[0_4px_20px_rgba(15,23,42,0.035)]">
      <div className="flex items-center justify-between">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${style.bg}`}
        >
          <Icon
            size={16}
            className={style.icon}
          />
        </div>

        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
          Live
        </span>
      </div>

      <p className="mt-3 text-xl font-bold tracking-[-0.03em] text-[#111827]">
        {value}
      </p>

      <p className="mt-0.5 text-[11px] font-medium text-[#64748B]">
        {label}
      </p>
    </div>
  );
}

/* ===============================================================
   TEAMS
================================================================ */

function TeamsGrid({ teams }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

      {teams.map((team, index) => (
        <div
          key={team._id}
          className="group rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.035)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D7D0FF] hover:shadow-[0_10px_30px_rgba(109,74,255,0.08)]"
        >

          {/* Top row */}
          <div className="flex items-start justify-between gap-4">

            <div className="flex min-w-0 items-center gap-3">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F0EBFF]">
                <UsersRound
                  size={20}
                  className="text-[#6D4AFF]"
                />
              </div>

              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-[#111827]">
                  {team.name}
                </h3>

                <div className="mt-1 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                  <span className="text-[11px] text-[#64748B]">
                    Active team
                  </span>
                </div>
              </div>

            </div>

            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F8FAFC] text-[11px] font-bold text-[#94A3B8]">
              {String(index + 1).padStart(2, "0")}
            </span>

          </div>

          {/* Team code */}
          <div className="mt-5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5">

            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#94A3B8]">
              Team code
            </p>

            <div className="mt-1 flex items-center justify-between">

              <span className="font-mono text-sm font-semibold tracking-wide text-[#6D4AFF]">
                {team.code}
              </span>

              <span className="text-[10px] text-[#94A3B8]">
                ID
              </span>

            </div>
          </div>

          {/* Bottom information */}
          <div className="mt-4 flex items-center justify-between gap-3">

            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-[#94A3B8]">
                Quiz
              </p>

              <p className="mt-1 truncate text-xs font-medium text-[#475569]">
                {team.quizTitle}
              </p>
            </div>

            <div className="shrink-0">
              <Badge tone="violet">
                {team.memberCount}{" "}
                {team.memberCount === 1
                  ? "member"
                  : "members"}
              </Badge>
            </div>

          </div>
        </div>
      ))}
    </div>
  );
}

/* ===============================================================
   PARTICIPANTS TABLE
================================================================ */

function ParticipantsTable({
  participants,
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_4px_20px_rgba(15,23,42,0.035)]">

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">

        <table className="w-full min-w-[700px] text-sm">

          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">

              <th className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
                Participant
              </th>

              <th className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
                Quiz
              </th>

              <th className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
                Score
              </th>

              <th className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
                Joined
              </th>

              <th className="px-5 py-3.5 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
                Status
              </th>

            </tr>
          </thead>

          <tbody>

            {participants.map((p, index) => (
              <tr
                key={p._id}
                className="border-b border-[#F1F5F9] transition-colors last:border-0 hover:bg-[#FAFBFF]"
              >

                {/* Participant */}
                <td className="px-5 py-4">

                  <div className="flex items-center gap-3">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F0EBFF] text-xs font-bold text-[#6D4AFF]">
                      {getInitials(p.name)}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[#334155]">
                        {p.name}
                      </p>

                      <p className="mt-0.5 text-[10px] text-[#94A3B8]">
                        Participant #{index + 1}
                      </p>
                    </div>

                  </div>

                </td>

                {/* Quiz */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">

                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-50">
                      <Trophy
                        size={13}
                        className="text-[#06B6D4]"
                      />
                    </div>

                    <span className="max-w-[220px] truncate text-sm text-[#475569]">
                      {p.quizTitle}
                    </span>

                  </div>
                </td>

                {/* Score */}
                <td className="px-5 py-4">

                  <div className="flex items-center gap-2">

                    <span className="font-bold text-[#111827]">
                      {p.score}
                    </span>

                    <span className="text-[10px] text-[#94A3B8]">
                      pts
                    </span>

                  </div>

                </td>

                {/* Joined */}
                <td className="px-5 py-4">
                  <span className="text-xs text-[#64748B]">
                    {formatDate(p.joinedAt)}
                  </span>
                </td>

                {/* Status */}
                <td className="px-5 py-4 text-right">

                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Registered
                  </span>

                </td>

              </tr>
            ))}

          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y divide-[#F1F5F9] md:hidden">

        {participants.map((p, index) => (
          <div
            key={p._id}
            className="p-4"
          >

            <div className="flex items-start gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0EBFF] text-xs font-bold text-[#6D4AFF]">
                {getInitials(p.name)}
              </div>

              <div className="min-w-0 flex-1">

                <div className="flex items-start justify-between gap-3">

                  <div>
                    <p className="font-semibold text-[#334155]">
                      {p.name}
                    </p>

                    <p className="mt-0.5 text-[10px] text-[#94A3B8]">
                      Participant #{index + 1}
                    </p>
                  </div>

                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Active
                  </span>

                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">

                  <div className="rounded-lg bg-[#F8FAFC] p-2.5">
                    <p className="text-[9px] uppercase tracking-wider text-[#94A3B8]">
                      Quiz
                    </p>

                    <p className="mt-1 truncate text-xs font-medium text-[#475569]">
                      {p.quizTitle}
                    </p>
                  </div>

                  <div className="rounded-lg bg-[#F8FAFC] p-2.5">
                    <p className="text-[9px] uppercase tracking-wider text-[#94A3B8]">
                      Score
                    </p>

                    <p className="mt-1 text-sm font-bold text-[#111827]">
                      {p.score} pts
                    </p>
                  </div>

                </div>

                <p className="mt-2 text-[10px] text-[#94A3B8]">
                  Joined {formatDate(p.joinedAt)}
                </p>

              </div>

            </div>
          </div>
        ))}

      </div>
    </div>
  );
}

/* ===============================================================
   HELPERS
================================================================ */

function getInitials(name = "") {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "?";

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}