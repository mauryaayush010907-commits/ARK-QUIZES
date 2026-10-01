import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { joinQuiz, lookupByCode } from "../../engine/api";
import { Button, Input } from "../../components/ui";

export default function JoinQuiz() {
  const { token } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [code, setCode] = useState(params.get("code") || "");
  const [preview, setPreview] = useState(null);
  const [teamName, setTeamName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [loading, setLoading] = useState(false);

  const lookup = (e) => {
    e?.preventDefault();

    try {
      const q = lookupByCode(code);
      setPreview(q);
    } catch (err) {
      toast.error(err.message);
      setPreview(null);
    }
  };

  const join = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await joinQuiz(token, {
        quizCode: code,
        teamName: teamName || undefined,
        teamCode: teamCode || undefined,
      });

      toast.success("Joined " + res.quiz.title);

      if (res.quiz.mode === "scheduled") {
        navigate(`/play/quiz/${res.quiz._id}`);
      } else {
        navigate(`/play/lobby/${res.quiz._id}`);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg anim-in">

      {/* Page heading */}
      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-600">
          Join room
        </p>

        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-slate-900">
          Join a quiz
        </h1>
      </div>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        Enter the host's code. We'll check availability before you enter the
        room.
      </p>

      {/* Main form */}
      <form
        className="mt-6 space-y-4 rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)]"
        onSubmit={preview ? join : lookup}
      >
        <Input
          label="Quiz code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="QUIZ-7X29"
          className="font-mono uppercase"
        />

        {/* Quiz preview */}
        {preview && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
              {preview.mode} · {preview.status}
            </p>

            <p className="mt-2 text-lg font-semibold text-slate-900">
              {preview.title}
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              {preview.description}
            </p>

            {preview.teamMode && (
              <div className="mt-4 grid gap-3">
                <Input
                  label="Create / join team name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                />

                <Input
                  label="Or existing team code"
                  value={teamCode}
                  onChange={(e) =>
                    setTeamCode(e.target.value.toUpperCase())
                  }
                />
              </div>
            )}
          </div>
        )}

        <Button
          className="w-full"
          loading={loading}
          type="submit"
        >
          {preview ? "Enter" : "Look up"}
        </Button>
      </form>
    </div>
  );
}