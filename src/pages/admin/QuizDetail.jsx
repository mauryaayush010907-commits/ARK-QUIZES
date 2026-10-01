import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Copy,
  Trash2,
  GripVertical,
  Upload,
  Radio,
  Pencil,
  BarChart3,
  Users,
  UsersRound,
  Trophy,
  Clock3,
  CheckCircle2,
  Target,
  Timer,
  Eye,
  ChevronRight,
  FileQuestion,
  ShieldAlert,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

import {
  getQuiz,
  listQuestions,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  duplicateQuestion,
  reorderQuestions,
  importQuestions,
  listParticipants,
  getQuizIntegrity,
  getLeaderboard,
  quizAnalytics,
  openLobby,
  startLiveQuiz,
  updateQuiz,
} from "../../engine/api";

import {
  useEngineTick,
  formatDate,
  formatMs,
} from "../../hooks/useEngine";

import {
  Badge,
  Button,
  EmptyState,
  Input,
  Modal,
  ModeBadge,
  StatusBadge,
  Tabs,
  Textarea,
  useConfirm,
} from "../../components/ui";

const blankQ = {
  text: "",
  options: [
    { id: "A", text: "" },
    { id: "B", text: "" },
    { id: "C", text: "" },
    { id: "D", text: "" },
  ],
  correctOptionId: "A",
  points: 1,
  negativePoints: 0,
  explanation: "",
  timeLimit: 30,
};

export default function QuizDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const tick = useEngineTick();

  const [tab, setTab] = useState("questions");
  const [editor, setEditor] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importResult, setImportResult] = useState(null);
  const [confirm, confirmNode] = useConfirm();
  const [preview, setPreview] = useState(null);
  const [integrityDetail, setIntegrityDetail] = useState(null);

  const quiz = useMemo(() => {
    try {
      return getQuiz(token, id, {
        includeQuestions: true,
      });
    } catch {
      return null;
    }
  }, [token, id, tick]);

  const questions = useMemo(
    () => (quiz ? listQuestions(token, id) : []),
    [token, id, tick, quiz]
  );

  const participants = useMemo(
    () => (quiz ? listParticipants(token, id) : []),
    [token, id, tick, quiz]
  );

  const integrityRecords = useMemo(
    () => {
      try {
        return quiz ? getQuizIntegrity(token, id) : [];
      } catch {
        return [];
      }
    },
    [token, id, tick, quiz]
  );

  const board = useMemo(() => {
    try {
      return quiz ? getLeaderboard(token, id) : [];
    } catch {
      return [];
    }
  }, [token, id, tick, quiz]);

  const analytics = useMemo(() => {
    try {
      return quiz ? quizAnalytics(token, id) : null;
    } catch {
      return null;
    }
  }, [token, id, tick, quiz]);

  if (!quiz) {
    return (
      <div className="min-h-full bg-[#F5F7FC] p-4">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
          <EmptyState
            title="Quiz not found"
            body="It may have been deleted."
          />
        </div>
      </div>
    );
  }

  const saveQuestion = () => {
    try {
      if (editor._id) {
        updateQuestion(token, editor._id, editor);
      } else {
        addQuestion(token, id, editor);
      }

      toast.success("Question saved");
      setEditor(null);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const removeQ = async (qid) => {
    const ok = await confirm({
      title: "Delete question?",
      body: "This cannot be undone.",
      danger: true,
    });

    if (!ok) return;

    try {
      deleteQuestion(token, qid);
      toast.success("Deleted");
    } catch (e) {
      toast.error(e.message);
    }
  };

  const move = (index, dir) => {
    const next = questions.slice();
    const j = index + dir;

    if (j < 0 || j >= next.length) return;

    const tmp = next[index];
    next[index] = next[j];
    next[j] = tmp;

    reorderQuestions(
      token,
      id,
      next.map((q) => q._id)
    );
  };

  const doImport = () => {
    try {
      let items = [];
      const raw = importText.trim();

      if (raw.startsWith("[") || raw.startsWith("{")) {
        const parsed = JSON.parse(raw);
        items = Array.isArray(parsed)
          ? parsed
          : parsed.questions || [];
      } else {
        items = raw
          .split("\n")
          .filter(Boolean);
      }

      const res = importQuestions(
        token,
        id,
        items
      );

      setImportResult(res);

      toast.success(
        `${res.created} questions imported`
      );
    } catch (e) {
      toast.error(
        e.message || "Invalid import file"
      );
    }
  };

  return (
    <div className="min-h-full bg-[#F5F7FC] text-[#111827] anim-in">
      {confirmNode}

      <div className="space-y-6">

        {/* =====================================================
            BACK NAVIGATION
        ===================================================== */}
        <button
          onClick={() =>
            navigate("/admin/quizzes")
          }
          className="inline-flex items-center gap-2 text-sm font-medium text-[#64748B] transition hover:text-[#6D4AFF]"
        >
          <ArrowLeft size={15} />
          All quizzes
        </button>

        {/* =====================================================
            QUIZ HEADER
        ===================================================== */}
        <section className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_4px_24px_rgba(15,23,42,0.04)]">

          <div className="p-5 sm:p-6 lg:p-7">

            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">

              <div className="min-w-0">

                <div className="flex flex-wrap items-center gap-2">
                  <ModeBadge mode={quiz.mode} />
                  <StatusBadge
                    status={quiz.computedStatus}
                  />
                </div>

                <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#111827] sm:text-4xl">
                  {quiz.title}
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#64748B]">
                  {quiz.description ||
                    "Manage questions, participants, rankings and quiz performance from this workspace."}
                </p>

                {/* Quiz code */}
                <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2">

                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                    Quiz code
                  </span>

                  <span className="font-mono text-sm font-bold tracking-wider text-[#6D4AFF]">
                    {quiz.quizCode}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(
                        quiz.quizCode
                      );

                      toast.success(
                        "Code copied"
                      );
                    }}
                    className="ml-1 flex h-6 w-6 items-center justify-center rounded-md text-[#94A3B8] transition hover:bg-[#F0EBFF] hover:text-[#6D4AFF]"
                    title="Copy quiz code"
                  >
                    <Copy size={13} />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 flex-wrap gap-2">

                {(quiz.mode === "live" ||
                  quiz.mode === "game") && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        try {
                          openLobby(token, id);
                          toast.success(
                            "Lobby opened"
                          );
                          navigate(
                            `/admin/quizzes/${id}/live`
                          );
                        } catch (e) {
                          toast.error(e.message);
                        }
                      }}
                    >
                      <Radio size={16} />
                      Open lobby
                    </Button>

                    <Link
                      to={`/admin/quizzes/${id}/live`}
                    >
                      <Button>
                        <Radio size={16} />
                        Live control
                      </Button>
                    </Link>
                  </>
                )}

                <Link
                  to={`/admin/quizzes/${id}/edit`}
                >
                  <Button variant="outline">
                    <Pencil size={16} />
                    Edit
                  </Button>
                </Link>

                {quiz.status === "DRAFT" &&
                  quiz.mode === "scheduled" && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        try {
                          updateQuiz(
                            token,
                            id,
                            {
                              status: "SCHEDULED",
                            }
                          );

                          toast.success(
                            "Scheduled"
                          );
                        } catch (e) {
                          toast.error(
                            e.message
                          );
                        }
                      }}
                    >
                      <Clock3 size={16} />
                      Schedule
                    </Button>
                  )}
              </div>
            </div>
          </div>

          {/* ===================================================
              QUICK STATS
          =================================================== */}
          <div className="border-t border-[#E2E8F0] bg-[#FAFBFD] px-5 py-4 sm:px-6 lg:px-7">

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

              <QuizStat
                icon={FileQuestion}
                label="Questions"
                value={questions.length}
                color="violet"
              />

              <QuizStat
                icon={Users}
                label="Participants"
                value={quiz.participantCount}
                color="cyan"
              />

              <QuizStat
                icon={UsersRound}
                label="Teams"
                value={quiz.teamCount}
                color="emerald"
              />

              <QuizStat
                icon={Timer}
                label="Duration"
                value={
                  quiz.mode === "scheduled"
                    ? `${quiz.duration} min`
                    : `${quiz.questionTimeLimit}s / Q`
                }
                color="amber"
              />

            </div>
          </div>
        </section>

        {/* =====================================================
            TABS
        ===================================================== */}
        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-2 shadow-[0_4px_20px_rgba(15,23,42,0.035)]">

          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              {
                id: "questions",
                label: "Questions",
              },
              {
                id: "people",
                label: "Participants",
              },
              {
                id: "integrity",
                label: "Integrity",
              },
              {
                id: "board",
                label: "Leaderboard",
              },
              {
                id: "analytics",
                label: "Analytics",
              },
            ]}
          />
        </section>

        {/* =====================================================
            QUESTIONS
        ===================================================== */}
        {tab === "questions" && (
          <QuestionsPanel
            questions={questions}
            move={move}
            setEditor={setEditor}
            setPreview={setPreview}
            removeQ={removeQ}
            token={token}
            toast={toast}
            setImportOpen={setImportOpen}
            setImportResult={setImportResult}
          />
        )}

        {/* =====================================================
            PARTICIPANTS
        ===================================================== */}
        {tab === "people" && (
          <ParticipantsPanel
            participants={participants}
          />
        )}

        {tab === "integrity" && (
          <IntegrityPanel records={integrityRecords} onSelect={setIntegrityDetail} />
        )}

        {/* =====================================================
            LEADERBOARD
        ===================================================== */}
        {tab === "board" && (
          <LeaderboardPanel
            board={board}
          />
        )}

        {/* =====================================================
            ANALYTICS
        ===================================================== */}
        {tab === "analytics" &&
          analytics && (
            <AnalyticsPanel
              analytics={analytics}
            />
          )}

          <Modal
            open={Boolean(integrityDetail)}
            onClose={() => setIntegrityDetail(null)}
            title={integrityDetail ? `${integrityDetail.studentName} · Quiz Integrity` : "Quiz Integrity"}
            wide
          >
            {integrityDetail && <IntegrityDetail record={integrityDetail} />}
          </Modal>

        {/* =====================================================
            QUESTION EDITOR
        ===================================================== */}
        <Modal
          open={Boolean(editor)}
          onClose={() =>
            setEditor(null)
          }
          title={
            editor?._id
              ? "Edit question"
              : "New question"
          }
          wide
        >
          {editor && (
            <QuestionEditor
              editor={editor}
              setEditor={setEditor}
              saveQuestion={saveQuestion}
            />
          )}
        </Modal>

        {/* =====================================================
            PREVIEW
        ===================================================== */}
        <Modal
          open={Boolean(preview)}
          onClose={() =>
            setPreview(null)
          }
          title="Question preview"
        >
          {preview && (
            <QuestionPreview
              preview={preview}
            />
          )}
        </Modal>

        {/* =====================================================
            IMPORT
        ===================================================== */}
        <Modal
          open={importOpen}
          onClose={() =>
            setImportOpen(false)
          }
          title="Import questions"
          wide
        >
          <ImportQuestions
            importText={importText}
            setImportText={setImportText}
            importResult={importResult}
            setImportOpen={setImportOpen}
            doImport={doImport}
          />
        </Modal>

      </div>
    </div>
  );
}

function integrityTone(status) {
  if (status === "CHEATING") return "bg-rose-50 text-rose-700";
  if (status === "WARNING") return "bg-amber-50 text-amber-700";
  return "bg-emerald-50 text-emerald-700";
}

function IntegrityPanel({ records, onSelect }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[#111827]">Quiz integrity</h2>
        <p className="mt-1 text-sm text-[#64748B]">Browser monitoring events associated with this quiz's attempts.</p>
      </div>
      {records.length === 0 ? (
        <div className="rounded-2xl border border-[#E2E6F0] bg-white p-1">
          <EmptyState icon={ShieldAlert} title="No active attempts yet." body="Integrity records appear when a student starts an attempt." />
        </div>
      ) : (
        <div className="divide-y divide-[#E2E6F0] overflow-hidden rounded-2xl border border-[#E2E6F0] bg-white">
          {records.map((record) => (
            <button
              key={record.attemptId}
              type="button"
              onClick={() => onSelect(record)}
              className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left transition hover:bg-[#F8FAFC] sm:px-5"
            >
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${integrityTone(record.integrityStatus)}`}>
                {record.integrityStatus || "CLEAN"}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#11182F]">{record.studentName}</span>
              <span className="text-xs text-[#596580]">{record.integrityViolationCount || 0} violations</span>
              {record.attemptStatus === "TERMINATED" && <span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700">Terminated</span>}
              <span className="text-xs text-[#596580]">{record.integrityEvents?.length || 0} events</span>
              <ChevronRight size={15} className="text-[#94A3B8]" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function IntegrityDetail({ record }) {
  const events = [...(record.integrityEvents || [])].reverse();
  return (
    <div className="text-[#111827]">
      <div className="flex flex-wrap items-center gap-3 border-b border-[#E2E6F0] pb-4">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${integrityTone(record.integrityStatus)}`}>
          {record.integrityStatus || "CLEAN"}
        </span>
        <span className="text-sm text-[#596580]">{record.integrityViolationCount || 0} monitoring violations</span>
        {record.attemptStatus === "TERMINATED" && <span className="text-sm font-semibold text-rose-700">Attempt terminated automatically</span>}
      </div>
      {record.terminationReason && (
        <p className="mt-3 text-sm text-[#596580]">
          Termination reason: <span className="font-semibold text-[#11182F]">{record.terminationReason.replaceAll("_", " ")}</span>
          {record.terminatedAt && <> · {new Date(record.terminatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</>}
        </p>
      )}
      <h3 className="mt-4 text-sm font-semibold">Event history</h3>
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
      <p className="mt-3 text-xs text-[#64748B]">Browser signals are monitoring records, not proof of misconduct.</p>
    </div>
  );
}

/* ===============================================================
   QUIZ STAT
================================================================ */

function QuizStat({
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
    emerald: {
      bg: "bg-emerald-50",
      icon: "text-emerald-600",
    },
    amber: {
      bg: "bg-amber-50",
      icon: "text-amber-600",
    },
  };

  const s =
    styles[color] || styles.violet;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white px-4 py-3">

      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${s.bg}`}
      >
        <Icon
          size={17}
          className={s.icon}
        />
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
          {label}
        </p>

        <p className="mt-0.5 text-lg font-bold tracking-[-0.02em] text-[#111827]">
          {value}
        </p>
      </div>
    </div>
  );
}

/* ===============================================================
   QUESTIONS PANEL
================================================================ */

function QuestionsPanel({
  questions,
  move,
  setEditor,
  setPreview,
  removeQ,
  token,
  toast,
  setImportOpen,
  setImportResult,
}) {
  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <h2 className="text-xl font-bold tracking-[-0.03em] text-[#111827]">
            Question bank
          </h2>

          <p className="mt-1 text-sm text-[#64748B]">
            Create, organize and manage the questions
            in this quiz.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">

          <Button
            onClick={() =>
              setEditor({
                ...blankQ,
                options:
                  blankQ.options.map(
                    (o) => ({ ...o })
                  ),
              })
            }
          >
            <Plus size={16} />
            Add question
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setImportOpen(true);
              setImportResult(null);
            }}
          >
            <Upload size={16} />
            Import
          </Button>

        </div>
      </div>

      {/* Empty */}
      {questions.length === 0 ? (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-1 shadow-[0_4px_20px_rgba(15,23,42,0.035)]">
          <EmptyState
            icon={Plus}
            title="No questions yet."
            body="Add multiple-choice questions or import a JSON/CSV file."
          />
        </div>
      ) : (
        <div className="space-y-3">

          {questions.map((q, i) => (
            <QuestionCard
              key={q._id}
              question={q}
              index={i}
              move={move}
              setEditor={setEditor}
              setPreview={setPreview}
              removeQ={removeQ}
              token={token}
              toast={toast}
            />
          ))}

        </div>
      )}
    </div>
  );
}

/* ===============================================================
   QUESTION CARD
================================================================ */

function QuestionCard({
  question,
  index,
  move,
  setEditor,
  setPreview,
  removeQ,
  token,
  toast,
}) {
  return (
    <div className="group rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_4px_20px_rgba(15,23,42,0.035)] transition hover:border-[#D7D0FF] hover:shadow-[0_8px_28px_rgba(109,74,255,0.06)]">

      <div className="flex gap-4 p-4 sm:p-5">

        {/* Number / reorder */}
        <div className="hidden w-10 shrink-0 flex-col items-center gap-1 sm:flex">

          <button
            onClick={() =>
              move(index, -1)
            }
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#94A3B8] transition hover:bg-[#F0EBFF] hover:text-[#6D4AFF]"
            title="Move question"
          >
            <GripVertical size={16} />
          </button>

          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F8FAFC] font-mono text-xs font-bold text-[#64748B]">
            {String(index + 1).padStart(2, "0")}
          </span>

        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">

          <div className="flex flex-wrap items-start justify-between gap-3">

            <div className="min-w-0">

              <div className="mb-2 flex items-center gap-2 sm:hidden">
                <span className="rounded-lg bg-[#F0EBFF] px-2 py-1 font-mono text-[10px] font-bold text-[#6D4AFF]">
                  Q{index + 1}
                </span>
              </div>

              <p className="font-semibold leading-6 text-[#111827]">
                {question.text}
              </p>

            </div>

            {/* Question meta */}
            <div className="flex shrink-0 items-center gap-2">

              <span className="rounded-lg bg-[#F8FAFC] px-2.5 py-1.5 text-[10px] font-semibold text-[#64748B]">
                {question.points} pts
              </span>

              <span className="rounded-lg bg-[#F8FAFC] px-2.5 py-1.5 text-[10px] font-semibold text-[#64748B]">
                {question.timeLimit}s
              </span>

            </div>
          </div>

          {/* Options */}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">

            {question.options.map((o) => {
              const correct =
                o.id ===
                question.correctOptionId;

              return (
                <div
                  key={o.id}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-xs ${
                    correct
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-[#E2E8F0] bg-[#F8FAFC]"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-bold ${
                      correct
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-white text-[#64748B]"
                    }`}
                  >
                    {o.id}
                  </span>

                  <span
                    className={
                      correct
                        ? "font-medium text-emerald-800"
                        : "text-[#475569]"
                    }
                  >
                    {o.text}
                  </span>

                  {correct && (
                    <CheckCircle2
                      size={14}
                      className="ml-auto shrink-0 text-emerald-600"
                    />
                  )}
                </div>
              );
            })}

          </div>

          {question.explanation && (
            <p className="mt-3 text-xs text-[#64748B]">
              <span className="font-semibold text-[#475569]">
                Explanation:
              </span>{" "}
              {question.explanation}
            </p>
          )}

          {/* Actions */}
          <div className="mt-4 flex flex-wrap gap-2">

            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setPreview(question)
              }
            >
              <Eye size={14} />
              Preview
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setEditor(question)
              }
            >
              <Pencil size={14} />
              Edit
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                duplicateQuestion(
                  token,
                  question._id
                );

                toast.success(
                  "Duplicated"
                );
              }}
            >
              <Copy size={14} />
              Duplicate
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                removeQ(question._id)
              }
            >
              <Trash2 size={14} />
              Delete
            </Button>

          </div>

        </div>
      </div>
    </div>
  );
}

/* ===============================================================
   PARTICIPANTS
================================================================ */

function ParticipantsPanel({
  participants,
}) {
  return (
    <div className="space-y-4">

      <div>
        <h2 className="text-xl font-bold tracking-[-0.03em] text-[#111827]">
          Participants
        </h2>

        <p className="mt-1 text-sm text-[#64748B]">
          Monitor everyone registered for this quiz.
        </p>
      </div>

      {participants.length === 0 ? (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-1">
          <EmptyState
            icon={Users}
            title="No participants yet."
            body="Share the quiz code so people can join."
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_4px_20px_rgba(15,23,42,0.035)]">

          <div className="overflow-x-auto">

            <table className="w-full min-w-[760px] text-sm">

              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">

                  <th className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                    Participant
                  </th>

                  <th className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                    Team
                  </th>

                  <th className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                    Score
                  </th>

                  <th className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                    Accuracy
                  </th>

                  <th className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                    Joined
                  </th>

                  <th className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                    Presence
                  </th>

                </tr>
              </thead>

              <tbody>

                {participants.map((p) => {

                  const total =
                    p.correctCount +
                    p.incorrectCount;

                  const accuracy =
                    total > 0
                      ? Math.round(
                          (p.correctCount /
                            total) *
                            100
                        )
                      : 0;

                  return (
                    <tr
                      key={p._id}
                      className="border-b border-[#F1F5F9] last:border-0 hover:bg-[#FAFBFF]"
                    >

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">

                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0EBFF] text-xs font-bold text-[#6D4AFF]">
                            {getInitials(
                              p.name
                            )}
                          </div>

                          <span className="font-semibold text-[#334155]">
                            {p.name}
                          </span>

                        </div>
                      </td>

                      <td className="px-5 py-4 text-[#64748B]">
                        {p.team?.name || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-bold text-[#111827]">
                          {p.score}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-medium text-[#475569]">
                          {accuracy}%
                        </span>
                      </td>

                      <td className="px-5 py-4 text-xs text-[#64748B]">
                        {formatDate(
                          p.joinedAt
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                            p.connected
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              p.connected
                                ? "bg-emerald-500"
                                : "bg-slate-400"
                            }`}
                          />
                          {p.connected
                            ? "Online"
                            : "Offline"}
                        </span>
                      </td>

                    </tr>
                  );
                })}

              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===============================================================
   LEADERBOARD
================================================================ */

function LeaderboardPanel({
  board,
}) {
  return (
    <div className="space-y-4">

      <div>
        <h2 className="text-xl font-bold tracking-[-0.03em] text-[#111827]">
          Leaderboard
        </h2>

        <p className="mt-1 text-sm text-[#64748B]">
          Current rankings based on recorded quiz performance.
        </p>
      </div>

      {board.length === 0 ? (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-1">
          <EmptyState
            icon={Trophy}
            title="Leaderboard is empty."
            body="Scores appear after answers are recorded."
          />
        </div>
      ) : (
        <div className="grid gap-3">

          {board.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-[0_4px_20px_rgba(15,23,42,0.035)]"
            >

              <RankBadge rank={r.rank} />

              <div className="min-w-0 flex-1">

                <p className="truncate font-semibold text-[#111827]">
                  {r.name}
                </p>

                <p className="mt-1 text-xs text-[#64748B]">
                  {r.kind} · {r.correct} correct ·{" "}
                  {formatMs(
                    r.responseTime
                  )} avg
                </p>

              </div>

              <div className="text-right">

                <p className="text-2xl font-bold tracking-[-0.04em] text-[#111827]">
                  {r.score}
                </p>

                <p className="text-[10px] uppercase tracking-wider text-[#94A3B8]">
                  points
                </p>

              </div>

              <ChevronRight
                size={16}
                className="hidden text-[#CBD5E1] sm:block"
              />

            </div>
          ))}

        </div>
      )}
    </div>
  );
}

function RankBadge({ rank }) {
  const styles =
    rank === 1
      ? "bg-amber-50 text-amber-700"
      : rank === 2
      ? "bg-slate-100 text-slate-600"
      : rank === 3
      ? "bg-orange-50 text-orange-700"
      : "bg-[#F8FAFC] text-[#64748B]";

  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-bold ${styles}`}
    >
      #{rank}
    </div>
  );
}

/* ===============================================================
   ANALYTICS
================================================================ */

function AnalyticsPanel({
  analytics,
}) {
  const metrics = [
    {
      label: "Average score",
      value: analytics.averageScore,
      icon: BarChart3,
      color: "violet",
    },
    {
      label: "Highest score",
      value: analytics.highestScore,
      icon: Trophy,
      color: "amber",
    },
    {
      label: "Lowest score",
      value: analytics.lowestScore,
      icon: Target,
      color: "cyan",
    },
    {
      label: "Accuracy",
      value: `${analytics.correctPercent}%`,
      icon: CheckCircle2,
      color: "emerald",
    },
    {
      label: "Completion",
      value: `${analytics.completionRate}%`,
      icon: CheckCircle2,
      color: "violet",
    },
    {
      label: "Avg response",
      value: formatMs(
        analytics.averageResponseTime
      ),
      icon: Timer,
      color: "cyan",
    },
    {
      label: "Participants",
      value: analytics.totalParticipants,
      icon: Users,
      color: "emerald",
    },
    {
      label: "Teams",
      value: analytics.totalTeams,
      icon: UsersRound,
      color: "amber",
    },
  ];

  return (
    <div className="space-y-5">

      <div>
        <h2 className="text-xl font-bold tracking-[-0.03em] text-[#111827]">
          Quiz analytics
        </h2>

        <p className="mt-1 text-sm text-[#64748B]">
          Performance metrics calculated from this quiz's recorded data.
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

        {metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            {...metric}
          />
        ))}

      </div>

      {/* Question performance */}
      <section className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_4px_20px_rgba(15,23,42,0.035)]">

        <div className="border-b border-[#E2E8F0] px-5 py-4">
          <h3 className="text-sm font-bold text-[#111827]">
            Question performance
          </h3>

          <p className="mt-1 text-xs text-[#64748B]">
            Accuracy and response metrics for each question.
          </p>
        </div>

        <div className="overflow-x-auto">

          <table className="w-full min-w-[780px] text-sm">

            <thead>
              <tr className="bg-[#F8FAFC]">

                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                  Question
                </th>

                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                  Responses
                </th>

                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                  Correct
                </th>

                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                  Incorrect
                </th>

                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                  Accuracy
                </th>

                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                  Avg time
                </th>

              </tr>
            </thead>

            <tbody>

              {analytics.questionStats.map(
                (q, index) => (
                  <tr
                    key={q.id}
                    className="border-t border-[#F1F5F9] hover:bg-[#FAFBFF]"
                  >

                    <td className="max-w-[380px] px-5 py-4">
                      <div className="flex items-start gap-3">

                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F0EBFF] font-mono text-[10px] font-bold text-[#6D4AFF]">
                          {index + 1}
                        </span>

                        <span className="font-medium leading-5 text-[#334155]">
                          {q.text}
                        </span>

                      </div>
                    </td>

                    <td className="px-5 py-4 text-[#475569]">
                      {q.total}
                    </td>

                    <td className="px-5 py-4 font-medium text-emerald-600">
                      {q.correct}
                    </td>

                    <td className="px-5 py-4 font-medium text-red-500">
                      {q.incorrect}
                    </td>

                    <td className="px-5 py-4">

                      <div className="flex items-center gap-2">

                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#E2E8F0]">
                          <div
                            className="h-full rounded-full bg-[#6D4AFF]"
                            style={{
                              width: `${Math.min(
                                q.accuracy,
                                100
                              )}%`,
                            }}
                          />
                        </div>

                        <span className="text-xs font-semibold text-[#475569]">
                          {q.accuracy}%
                        </span>

                      </div>
                    </td>

                    <td className="px-5 py-4 text-[#64748B]">
                      {formatMs(
                        q.averageResponseTime
                      )}
                    </td>

                  </tr>
                )
              )}

            </tbody>
          </table>
        </div>
      </section>

      {/* Winners */}
      {analytics.winners?.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.035)]">

          <div className="flex items-center gap-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
              <Trophy
                size={17}
                className="text-amber-600"
              />
            </div>

            <div>
              <h3 className="text-sm font-bold text-[#111827]">
                Fastest-answer winners
              </h3>

              <p className="mt-1 text-xs text-[#64748B]">
                Fastest validated responses recorded during the quiz.
              </p>
            </div>

          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">

            {analytics.winners.map(
              (w, i) => (
                <div
                  key={w._id}
                  className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3"
                >

                  <div className="flex items-center gap-3">

                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 font-mono text-[10px] font-bold text-amber-700">
                      Q{i + 1}
                    </span>

                    <span className="text-sm font-semibold text-[#334155]">
                      {w.name}
                    </span>

                  </div>

                  <span className="font-mono text-xs text-[#64748B]">
                    {formatMs(
                      w.responseTimeMs
                    )}
                  </span>

                </div>
              )
            )}

          </div>
        </section>
      )}
    </div>
  );
}

/* ===============================================================
   METRIC CARD
================================================================ */

function MetricCard({
  label,
  value,
  icon: Icon,
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
    emerald: {
      bg: "bg-emerald-50",
      icon: "text-emerald-600",
    },
    amber: {
      bg: "bg-amber-50",
      icon: "text-amber-600",
    },
  };

  const s =
    styles[color] || styles.violet;

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-[0_4px_20px_rgba(15,23,42,0.035)]">

      <div
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.bg}`}
      >
        <Icon
          size={17}
          className={s.icon}
        />
      </div>

      <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold tracking-[-0.03em] text-[#111827]">
        {value}
      </p>

    </div>
  );
}

/* ===============================================================
   QUESTION EDITOR
================================================================ */

function QuestionEditor({
  editor,
  setEditor,
  saveQuestion,
}) {
  return (
    <div className="space-y-5">

      <Textarea
        label="Question"
        value={editor.text}
        onChange={(e) =>
          setEditor({
            ...editor,
            text: e.target.value,
          })
        }
      />

      <Input
        label="Image URL (optional)"
        value={editor.image || ""}
        onChange={(e) =>
          setEditor({
            ...editor,
            image: e.target.value,
          })
        }
      />

      <div className="space-y-3">

        <div>
          <p className="text-sm font-semibold text-[#111827]">
            Answer options
          </p>

          <p className="mt-1 text-xs text-[#64748B]">
            Select the correct option and enter the answer choices.
          </p>
        </div>

        {editor.options.map((o, i) => {

          const correct =
            editor.correctOptionId ===
            o.id;

          return (
            <div
              key={o.id}
              className="flex items-center gap-2"
            >

              <button
                type="button"
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-bold transition ${
                  correct
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] hover:border-[#D7D0FF]"
                }`}
                onClick={() =>
                  setEditor({
                    ...editor,
                    correctOptionId: o.id,
                  })
                }
              >
                {o.id}
              </button>

              <input
                className="h-10 min-w-0 flex-1 rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm text-[#334155] outline-none transition placeholder:text-[#94A3B8] focus:border-[#A996FF] focus:ring-2 focus:ring-[#6D4AFF]/10"
                value={o.text}
                placeholder={`Option ${o.id}`}
                onChange={(e) => {

                  const options =
                    editor.options.slice();

                  options[i] = {
                    ...o,
                    text: e.target.value,
                  };

                  setEditor({
                    ...editor,
                    options,
                  });
                }}
              />

              {correct && (
                <span className="hidden text-[10px] font-semibold text-emerald-600 sm:block">
                  Correct
                </span>
              )}

            </div>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">

        <Input
          label="Points"
          type="number"
          value={editor.points}
          onChange={(e) =>
            setEditor({
              ...editor,
              points: e.target.value,
            })
          }
        />

        <Input
          label="Negative"
          type="number"
          value={editor.negativePoints}
          onChange={(e) =>
            setEditor({
              ...editor,
              negativePoints:
                e.target.value,
            })
          }
        />

        <Input
          label="Time limit (s)"
          type="number"
          value={editor.timeLimit}
          onChange={(e) =>
            setEditor({
              ...editor,
              timeLimit: e.target.value,
            })
          }
        />

      </div>

      <Textarea
        label="Explanation"
        value={editor.explanation}
        onChange={(e) =>
          setEditor({
            ...editor,
            explanation: e.target.value,
          })
        }
      />

      <div className="flex justify-end gap-2 border-t border-[#E2E8F0] pt-4">

        <Button
          variant="outline"
          onClick={() =>
            setEditor(null)
          }
        >
          Cancel
        </Button>

        <Button onClick={saveQuestion}>
          Save question
        </Button>

      </div>
    </div>
  );
}

/* ===============================================================
   QUESTION PREVIEW
================================================================ */

function QuestionPreview({
  preview,
}) {
  return (
    <div>

      <div className="rounded-xl bg-[#F8FAFC] p-4">
        <p className="text-lg font-bold leading-7 text-[#111827]">
          {preview.text}
        </p>
      </div>

      <div className="mt-4 grid gap-2">

        {preview.options.map((o) => {

          const correct =
            o.id ===
            preview.correctOptionId;

          return (
            <div
              key={o.id}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
                correct
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-[#E2E8F0] bg-white"
              }`}
            >

              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                  correct
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-[#F8FAFC] text-[#64748B]"
                }`}
              >
                {o.id}
              </span>

              <span className="text-[#334155]">
                {o.text}
              </span>

              {correct && (
                <CheckCircle2
                  size={15}
                  className="ml-auto text-emerald-600"
                />
              )}

            </div>
          );
        })}

      </div>
    </div>
  );
}

/* ===============================================================
   IMPORT
================================================================ */

function ImportQuestions({
  importText,
  setImportText,
  importResult,
  setImportOpen,
  doImport,
}) {
  return (
    <div>

      <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">

        <p className="text-sm leading-6 text-[#64748B]">
          Paste JSON or CSV content to import
          multiple questions at once.
        </p>

        <p className="mt-2 text-xs text-[#94A3B8]">
          JSON example:
        </p>

        <code className="mt-1 block overflow-x-auto rounded-lg bg-white p-3 font-mono text-[11px] text-[#6D4AFF]">
          [
          {"{"}
          "text":"Question...",
          "options":["A","B","C","D"],
          "correctIndex":1
          {"}"}
          ]
        </code>

        <p className="mt-3 text-xs text-[#94A3B8]">
          CSV format:
          text,A,B,C,D,correctLetter,points,time
        </p>

      </div>

      <Textarea
        value={importText}
        onChange={(e) =>
          setImportText(e.target.value)
        }
        className="mt-4 min-h-[200px] font-mono"
        placeholder="Paste JSON or CSV here..."
      />

      {importResult && (
        <div className="mt-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">

          <p className="text-sm font-semibold text-[#334155]">
            {importResult.created} valid ·{" "}
            {importResult.invalid} invalid
          </p>

          {importResult.errors?.map(
            (e) => (
              <p
                key={e.index}
                className="mt-1 text-xs text-red-600"
              >
                Row {e.index + 1}:{" "}
                {e.error}
              </p>
            )
          )}

        </div>
      )}

      <div className="mt-5 flex justify-end gap-2 border-t border-[#E2E8F0] pt-4">

        <Button
          variant="outline"
          onClick={() =>
            setImportOpen(false)
          }
        >
          Close
        </Button>

        <Button onClick={doImport}>
          Validate & import
        </Button>

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
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}