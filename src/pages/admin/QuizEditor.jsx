import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { createQuiz, updateQuiz, getQuiz, generateQuizCode } from "../../engine/api";
import { Button, FieldCheck, Input, Select, Textarea } from "../../components/ui";

function freshForm() {
  return {
    title: "",
    description: "",
    mode: "scheduled",
    startTime: "",
    endTime: "",
    duration: 30,
    marksPerQuestion: 1,
    negativeMarking: false,
    negativePoints: 0.25,
    maxParticipants: "",
    quizCode: generateQuizCode(),
    instructions: "",
    teamMode: false,
    showAnswersAfter: true,
    showLeaderboard: true,
    questionTimeLimit: 30,
    publish: false,
  };
}

function toLocal(v) {
  if (!v) return "";
  const d = new Date(v);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function QuizEditor() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { token } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(freshForm);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!isEdit) return;
    try {
      const q = getQuiz(token, id);
      setForm({
        ...freshForm(),
        ...q,
        startTime: toLocal(q.startTime),
        endTime: toLocal(q.endTime),
        maxParticipants: q.maxParticipants || "",
      });
    } catch (e) {
      toast.error(e.message);
    }
  }, [id, isEdit, token]);

  const save = async (publish) => {
    setLoading(true);
    try {
      const payload = {
        ...form,
        publish,
        startTime: form.startTime ? new Date(form.startTime).toISOString() : null,
        endTime: form.endTime ? new Date(form.endTime).toISOString() : null,
        maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : null,
      };
      const q = isEdit ? updateQuiz(token, id, payload) : createQuiz(token, payload);
      toast.success(isEdit ? "Quiz updated" : "Quiz created");
      navigate(`/admin/quizzes/${q._id}`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 anim-in">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-violet-300">{isEdit ? "Edit" : "Create"}</p>
        <h1 className="font-display text-4xl">{isEdit ? "Edit quiz" : "New quiz"}</h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { id: "scheduled", title: "Scheduled", body: "Timed window, self-paced" },
          { id: "live", title: "Live room", body: "Host-driven questions" },
          { id: "game", title: "Fastest answer", body: "First correct wins" },
        ].map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => set("mode", m.id)}
            className={`rounded-2xl border p-4 text-left ${
              form.mode === m.id ? "border-violet-400 bg-violet-500/15 glow-violet" : "border-white/10 bg-white/4"
            }`}
          >
            <p className="font-semibold">{m.title}</p>
            <p className="mt-1 text-xs text-mist">{m.body}</p>
          </button>
        ))}
      </div>

      <div className="space-y-4 rounded-2xl border border-white/8 bg-panel p-5">
        <Input label="Title" value={form.title} onChange={(e) => set("title", e.target.value)} />
        <Textarea label="Description" value={form.description} onChange={(e) => set("description", e.target.value)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Quiz code" value={form.quizCode} onChange={(e) => set("quizCode", e.target.value.toUpperCase())} />
          <Input
            label="Question time (seconds)"
            type="number"
            value={form.questionTimeLimit}
            onChange={(e) => set("questionTimeLimit", e.target.value)}
          />
        </div>
        {form.mode === "scheduled" && (
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="Start" type="datetime-local" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} />
            <Input label="End" type="datetime-local" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} />
            <Input label="Duration (minutes)" type="number" value={form.duration} onChange={(e) => set("duration", e.target.value)} />
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Marks / question" type="number" value={form.marksPerQuestion} onChange={(e) => set("marksPerQuestion", e.target.value)} />
          <Input label="Negative points" type="number" step="0.25" value={form.negativePoints} onChange={(e) => set("negativePoints", e.target.value)} />
          <Input label="Max participants" type="number" value={form.maxParticipants} onChange={(e) => set("maxParticipants", e.target.value)} />
        </div>
        <Textarea label="Instructions" value={form.instructions} onChange={(e) => set("instructions", e.target.value)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldCheck label="Negative marking" checked={form.negativeMarking} onChange={(v) => set("negativeMarking", v)} />
          <FieldCheck label="Team mode" checked={form.teamMode} onChange={(v) => set("teamMode", v)} hint="One answer per team per question" />
          <FieldCheck label="Show answers after completion" checked={form.showAnswersAfter} onChange={(v) => set("showAnswersAfter", v)} />
          <FieldCheck label="Show leaderboard" checked={form.showLeaderboard} onChange={(v) => set("showLeaderboard", v)} />
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button variant="outline" loading={loading} onClick={() => save(false)}>
          Save draft
        </Button>
        <Button loading={loading} onClick={() => save(true)}>
          Save & publish
        </Button>
      </div>
    </div>
  );
}
