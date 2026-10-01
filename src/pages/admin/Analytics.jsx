import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  TrendingUp,
  Users,
  CheckCircle2,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { analytics as loadAnalytics } from "../../engine/api";
import { useEngineTick } from "../../hooks/useEngine";
import { EmptyState } from "../../components/ui";

const COLORS = ["#6D4AFF", "#06B6D4"];

const tooltipStyle = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #E2E8F0",
  borderRadius: "12px",
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
  padding: "10px 12px",
};

const tooltipLabelStyle = {
  color: "#111827",
  fontWeight: 600,
};

const tooltipItemStyle = {
  color: "#64748B",
};

export default function Analytics() {
  const { token } = useAuth();
  const tick = useEngineTick();

  const data = useMemo(
    () => loadAnalytics(token),
    [token, tick]
  );

  const empty =
    data.totals.answers === 0 &&
    data.participantsPerQuiz.every(
      (x) => x.participants === 0
    );

  if (empty) {
    return (
      <div className="min-h-full bg-[#F5F7FC] text-[#111827] anim-in">
        <div className="space-y-8">

          {/* Header */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#6D4AFF]" />

              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6D4AFF]">
                Insights
              </p>
            </div>

            <h1 className="text-3xl font-bold tracking-[-0.03em] text-[#111827] sm:text-4xl">
              Analytics
            </h1>

            <p className="mt-2 text-sm leading-6 text-[#64748B]">
              Understand participation, performance, accuracy, and quiz
              activity from your real records.
            </p>
          </div>

          {/* Empty state */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.035)]">
            <EmptyState
              icon={BarChart3}
              title="No quiz data available yet."
              body="Charts populate from real attempts, answers and participants stored in the database."
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#F5F7FC] text-[#111827] anim-in">
      <div className="space-y-8">

        {/* =========================================================
            HEADER
        ========================================================= */}
        <header>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#6D4AFF]" />

            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6D4AFF]">
              Insights
            </p>
          </div>

          <h1 className="text-3xl font-bold tracking-[-0.03em] text-[#111827] sm:text-4xl">
            Analytics
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">
            Track participation, quiz performance, question accuracy, and
            overall activity using real data from your platform.
          </p>
        </header>

        {/* =========================================================
            KPI CARDS
        ========================================================= */}
        <section className="grid gap-4 sm:grid-cols-3">

          <Kpi
            label="Answers recorded"
            value={data.totals.answers}
            icon={BarChart3}
            iconBg="bg-violet-50"
            iconColor="text-[#6D4AFF]"
          />

          <Kpi
            label="Completion rate"
            value={`${data.completionRate}%`}
            icon={CheckCircle2}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
          />

          <Kpi
            label="Correct / incorrect"
            value={`${data.totals.correct} / ${data.totals.incorrect}`}
            icon={TrendingUp}
            iconBg="bg-cyan-50"
            iconColor="text-[#06B6D4]"
          />

        </section>

        {/* =========================================================
            CHART GRID
        ========================================================= */}
        <section className="grid gap-5 xl:grid-cols-2">

          {/* Participants */}
          <ChartCard
            title="Participants per quiz"
            description="Number of participants across recent quizzes"
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={data.participantsPerQuiz}
                margin={{
                  top: 10,
                  right: 10,
                  left: -20,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  stroke="#E2E8F0"
                  strokeDasharray="4 4"
                  vertical={false}
                />

                <XAxis
                  dataKey="name"
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />

                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                />

                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  cursor={{
                    fill: "#F8FAFC",
                  }}
                />

                <Bar
                  dataKey="participants"
                  fill="#6D4AFF"
                  radius={[7, 7, 0, 0]}
                  maxBarSize={42}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Average score */}
          <ChartCard
            title="Average score"
            description="Average participant score by quiz"
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={data.avgScore}
                margin={{
                  top: 10,
                  right: 10,
                  left: -20,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  stroke="#E2E8F0"
                  strokeDasharray="4 4"
                  vertical={false}
                />

                <XAxis
                  dataKey="name"
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />

                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />

                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  cursor={{
                    fill: "#F8FAFC",
                  }}
                />

                <Bar
                  dataKey="score"
                  fill="#06B6D4"
                  radius={[7, 7, 0, 0]}
                  maxBarSize={42}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Question accuracy */}
          <ChartCard
            title="Question accuracy"
            description="How accurately participants answered questions"
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={data.questionAccuracy}
                margin={{
                  top: 10,
                  right: 10,
                  left: -20,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  stroke="#E2E8F0"
                  strokeDasharray="4 4"
                  vertical={false}
                />

                <XAxis
                  dataKey="name"
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />

                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />

                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  cursor={{
                    fill: "#F8FAFC",
                  }}
                />

                <Bar
                  dataKey="accuracy"
                  fill="#7C5CFC"
                  radius={[7, 7, 0, 0]}
                  maxBarSize={42}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Correct vs incorrect */}
          <ChartCard
            title="Correct vs incorrect"
            description="Overall answer accuracy across quizzes"
          >
            {data.totals.answers === 0 ? (
              <EmptyChartState message="No answers recorded." />
            ) : (
              <div className="relative">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data.correctVsIncorrect}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={72}
                      outerRadius={100}
                      paddingAngle={4}
                      stroke="#FFFFFF"
                      strokeWidth={4}
                    >
                      {data.correctVsIncorrect.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelStyle={tooltipLabelStyle}
                      itemStyle={tooltipItemStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#111827]">
                      {data.totals.answers}
                    </p>

                    <p className="text-[11px] font-medium uppercase tracking-wider text-[#94A3B8]">
                      Answers
                    </p>
                  </div>
                </div>
              </div>
            )}
          </ChartCard>

          {/* Participation over time */}
          <ChartCard
            title="Participation over time"
            description="Participant activity across the timeline"
          >
            {data.participationOverTime.length === 0 ? (
              <EmptyChartState message="No participation timeline yet." />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart
                  data={data.participationOverTime}
                  margin={{
                    top: 10,
                    right: 10,
                    left: -20,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid
                    stroke="#E2E8F0"
                    strokeDasharray="4 4"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="date"
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />

                  <YAxis
                    stroke="#94A3B8"
                    fontSize={11}
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                  />

                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                    itemStyle={tooltipItemStyle}
                  />

                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#6D4AFF"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{
                      r: 5,
                      fill: "#6D4AFF",
                      stroke: "#FFFFFF",
                      strokeWidth: 3,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Top performers */}
          <ChartCard
            title="Top performers"
            description="Highest recorded scores"
          >
            {data.topPerformers.length === 0 ? (
              <EmptyChartState message="No scores yet." />
            ) : (
              <div className="space-y-2">
                {data.topPerformers.map((p, i) => (
                  <div
                    key={p.name + i}
                    className="group flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 transition-all hover:border-[#D7D0FF] hover:bg-[#FAF9FF]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-sm font-bold text-[#6D4AFF]">
                        {i + 1}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#111827]">
                          {p.name}
                        </p>

                        <p className="mt-0.5 truncate text-xs text-[#64748B]">
                          {p.quiz}
                        </p>
                      </div>
                    </div>

                    <span className="ml-4 text-xl font-bold tracking-[-0.02em] text-[#111827]">
                      {p.score}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>

        </section>
      </div>
    </div>
  );
}

/* ===============================================================
   CHART CARD
================================================================ */

function ChartCard({ title, description, children }) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.035)] transition-shadow duration-200 hover:shadow-[0_8px_28px_rgba(15,23,42,0.055)]">

      <div className="mb-4">
        <h3 className="text-base font-bold tracking-[-0.01em] text-[#111827]">
          {title}
        </h3>

        {description && (
          <p className="mt-1 text-xs text-[#64748B]">
            {description}
          </p>
        )}
      </div>

      {children}
    </div>
  );
}

/* ===============================================================
   KPI
================================================================ */

function Kpi({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
}) {
  return (
    <div className="group rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.035)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D7D0FF] hover:shadow-[0_10px_30px_rgba(15,23,42,0.07)]">

      <div className="flex items-start justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}
        >
          <Icon size={19} className={iconColor} />
        </div>

        <span className="text-xs font-medium text-[#CBD5E1]">
          LIVE
        </span>
      </div>

      <div className="mt-5">
        <p className="text-sm font-medium text-[#64748B]">
          {label}
        </p>

        <p className="mt-1 text-3xl font-bold tracking-[-0.03em] text-[#111827]">
          {value}
        </p>
      </div>
    </div>
  );
}

/* ===============================================================
   EMPTY CHART STATE
================================================================ */

function EmptyChartState({ message }) {
  return (
    <div className="flex h-[280px] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F1F5F9]">
          <BarChart3 size={18} className="text-[#94A3B8]" />
        </div>

        <p className="text-sm text-[#64748B]">
          {message}
        </p>
      </div>
    </div>
  );
}