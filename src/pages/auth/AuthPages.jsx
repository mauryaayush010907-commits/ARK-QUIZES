import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Button, Input } from "../../components/ui";
import logo from "../../assets/images/logo.png";
import lobby from "../../assets/images/lobby.jpg";

function Shell({ title, subtitle, children, footer }) {
  return (
    <div className="mesh grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <div className="relative hidden overflow-hidden lg:block">
        <img src={lobby} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(108,59,255,0.22),transparent_28%),linear-gradient(135deg,rgba(247,248,252,0.55),rgba(238,241,250,0.9))]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.03)_1px,transparent_1px)] bg-[size:28px_28px] opacity-60" />
        <div className="absolute bottom-10 left-10 right-10 max-w-lg rounded-[28px] border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-md">
          <p className="text-[10px] uppercase tracking-[0.22em] text-violet-700">The room waits</p>
          <p className="mt-3 font-display text-5xl text-slate-900">The room waits for the host.</p>
          <p className="mt-3 max-w-md text-sm text-slate-600">
            Join with a quiz code, sit in the lobby, and receive every question the moment it is released.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center px-4 py-12 sm:px-6 lg:px-10">
        <div className="w-full max-w-md rounded-[30px] border border-slate-200 bg-white/90 p-6 shadow-[0_22px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-7">
          <Link to="/" className="mb-8 flex items-center gap-2 text-slate-900">
            <img src={logo} alt="" className="h-9 w-9 rounded-xl object-cover" />
            <span className="text-lg font-extrabold tracking-tight">ARK-QUIZES</span>
          </Link>
          <h1 className="font-display text-4xl text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
          <div className="mt-8 space-y-4">{children}</div>
          <p className="mt-6 text-sm text-slate-600">{footer}</p>
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success("Welcome back");
      const dest = location.state?.from || (user.role === "admin" ? "/admin" : "/play");
      navigate(dest);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell
      title="Sign in"
      subtitle="Hosts enter the command center. Participants enter the arena."
      footer={
        <>
          New here?{" "}
          <Link to="/register" className="text-violet-700">
            Create an account
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <Button className="w-full" loading={loading} type="submit">
          Continue
        </Button>
      </form>
    </Shell>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student" });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await register(form);
      toast.success("Account created");
      navigate(user.role === "admin" ? "/admin" : "/play");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell
      title="Create account"
      subtitle="Register as a host to author quizzes, or as a participant to compete."
      footer={
        <>
          Already registered?{" "}
          <Link to="/login" className="text-violet-700">
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <Input label="Full name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
        <Input label="Email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
        <Input
          label="Password"
          type="password"
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
          hint="At least 6 characters"
          required
        />
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: "student", label: "Participant" },
            { id: "admin", label: "Host / Admin" },
          ].map((r) => (
            <button
              type="button"
              key={r.id}
              onClick={() => set("role", r.id)}
              className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                form.role === r.id ? "border-violet-200 bg-violet-50 text-violet-700" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-violet-200"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <Button className="w-full" loading={loading} type="submit">
          Create account
        </Button>
      </form>
    </Shell>
  );
}
