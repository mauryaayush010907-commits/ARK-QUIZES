import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Copy, Trash2, Pencil, Radio, Trophy } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { listQuizzes, deleteQuiz, duplicateQuiz } from "../../engine/api";
import { useEngineTick, formatDate } from "../../hooks/useEngine";
import {
  Button,
  EmptyState,
  ModeBadge,
  Pagination,
  SearchBox,
  Select,
  StatusBadge,
  useConfirm,
} from "../../components/ui";

export default function Quizzes() {
  const { token } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const tick = useEngineTick();
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [confirm, confirmNode] = useConfirm();

  const data = useMemo(
    () => listQuizzes(token, { search, mode: mode || undefined, status: status || undefined, page, limit: 8, sort: "createdAt" }),
    [token, search, mode, status, page, tick]
  );

  const onDelete = async (id) => {
    const ok = await confirm({
      title: "Delete quiz?",
      body: "This removes the quiz, questions, participants, answers and winners. This cannot be undone.",
      danger: true,
    });
    if (!ok) return;
    try {
      deleteQuiz(token, id);
      toast.success("Quiz deleted");
    } catch (e) {
      toast.error(e.message);
    }
  };

  const onDup = (id) => {
    try {
      const q = duplicateQuiz(token, id);
      toast.success("Quiz duplicated");
      navigate(`/admin/quizzes/${q._id}`);
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6 anim-in">
      {confirmNode}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-violet-300">Library</p>
          <h1 className="font-display text-4xl">Quizzes</h1>
        </div>
        <Link to="/admin/quizzes/new">
          <Button>
            <Plus size={16} /> Create quiz
          </Button>
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="md:col-span-2">
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search title or quiz code" />
        </div>
        <Select value={mode} onChange={(e) => { setMode(e.target.value); setPage(1); }}>
          <option value="">All modes</option>
          <option value="scheduled">Scheduled</option>
          <option value="live">Live</option>
          <option value="game">Fastest answer</option>
        </Select>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {["DRAFT", "SCHEDULED", "LIVE", "COMPLETED", "EXPIRED", "CANCELLED"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      {data.items.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No quizzes match these filters."
          body="Create a quiz or clear search to see your library."
          action={
            <Link to="/admin/quizzes/new">
              <Button>New quiz</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3">
          {data.items.map((q) => (
            <div key={q._id} className="flex flex-col gap-4 rounded-2xl border border-white/8 bg-panel p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-base font-semibold">{q.title}</h3>
                  <ModeBadge mode={q.mode} />
                  <StatusBadge status={q.computedStatus} />
                </div>
                <p className="mt-1 text-sm text-mist line-clamp-1">{q.description || "No description"}</p>
                <p className="mt-2 font-mono text-xs text-cyan-200">{q.quizCode}</p>
                <p className="mt-1 text-xs text-mist">
                  {q.questionCount} questions · {q.participantCount} participants · {formatDate(q.createdAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(q.mode === "live" || q.mode === "game") && (
                  <Link to={`/admin/quizzes/${q._id}/live`}>
                    <Button size="sm" variant="ghost">
                      <Radio size={14} /> Control
                    </Button>
                  </Link>
                )}
                <Link to={`/admin/quizzes/${q._id}`}>
                  <Button size="sm" variant="ghost">
                    Open
                  </Button>
                </Link>
                <Link to={`/admin/quizzes/${q._id}/edit`}>
                  <Button size="sm" variant="ghost">
                    <Pencil size={14} />
                  </Button>
                </Link>
                <Button size="sm" variant="ghost" onClick={() => onDup(q._id)}>
                  <Copy size={14} />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(q._id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
          <Pagination page={data.page} pages={data.pages} onPage={setPage} />
        </div>
      )}
    </div>
  );
}
