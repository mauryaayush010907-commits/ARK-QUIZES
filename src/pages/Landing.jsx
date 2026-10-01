import { Link } from "react-router-dom";
import { ArrowRight, Radio, Swords, CalendarClock, ShieldCheck, Gauge, UsersRound } from "lucide-react";
import logo from "../assets/images/logo.png";
import { Button } from "../components/ui";

const hero = "/images/hero.png";

const features = [
  {
    icon: CalendarClock,
    title: "Scheduled exams",
    body: "Windowed availability, duration caps, negative marking, and automatic expiry driven by server time.",
  },
  {
    icon: Radio,
    title: "Live control rooms",
    body: "Open a lobby, push questions simultaneously, watch answer stats land, then advance the room.",
  },
  {
    icon: Swords,
    title: "Fastest-answer games",
    body: "The first correct payload the server accepts becomes the winner. Later correct answers cannot steal it.",
  },
  {
    icon: UsersRound,
    title: "Teams or solos",
    body: "Individual contestants or locked team submissions — one answer per team, per question.",
  },
  {
    icon: Gauge,
    title: "Authoritative scoring",
    body: "Clients never compute scores or timestamps. The engine validates identity, activity, and uniqueness.",
  },
  {
    icon: ShieldCheck,
    title: "Anti-cheat rails",
    body: "Duplicate answers, late submissions, inactive questions and expired quizzes are rejected at the source.",
  },
];

export default function Landing() {
  return (
    <div className="mesh grain min-h-screen text-slate-900">
      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-white/80 px-3 py-2 shadow-sm backdrop-blur-sm">
          <img src={logo} alt="ARK-QUIZES" className="h-8 w-8 rounded-xl object-cover" />
          <span className="text-lg font-extrabold tracking-tight text-slate-900">ARK-QUIZES</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login" className="hidden rounded-xl px-3 py-2 text-sm text-slate-600 transition hover:text-slate-900 sm:inline">
            Sign in
          </Link>
          <Link to="/register">
            <Button size="sm">Create account</Button>
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-6 lg:grid-cols-[1.05fr_0.95fr] lg:pt-10">
        <div className="anim-in">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-violet-700">
            Live quiz operating system
          </p>
          <h1 className="max-w-xl font-display text-5xl leading-[0.95] text-slate-900 sm:text-6xl lg:text-7xl">
            Command every question. Crown the first correct mind.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
            ARK-QUIZES is a professional quiz management and competition platform — scheduled assessments, live host-driven
            rooms, and atomic fastest-answer games with real analytics. No fake leaderboards. No client-side scoring.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register">
              <Button size="lg">
                Launch a quiz <ArrowRight size={16} />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="ghost">
                Host or join
              </Button>
            </Link>
          </div>
          <div className="mt-8 grid max-w-lg grid-cols-3 gap-4 border-t border-slate-200 pt-6">
            {[
              ["3", "Quiz modes"],
              ["∞", "Live rooms"],
              ["1", "Winner / question"],
            ].map(([k, v]) => (
              <div key={v}>
                <p className="font-display text-3xl text-slate-900">{k}</p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{v}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-scene anim-in" aria-label="Live quiz hero artwork">
          <div className="hero-glow hero-glow--violet" />
          <div className="hero-glow hero-glow--blue" />
          <div className="hero-particle hero-particle--1" />
          <div className="hero-particle hero-particle--2" />
          <div className="hero-particle hero-particle--3" />
          <div className="hero-particle hero-particle--4" />
          <div className="hero-particle hero-particle--5" />
          <img src={hero} alt="Live quiz command center" className="hero-image" />
          <div className="hero-floor" />
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-20">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-violet-600">Platform</p>
            <h2 className="mt-2 max-w-2xl font-display text-4xl text-slate-900">Built like a competition product, not a classroom form.</h2>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="glass-card rounded-3xl p-5 transition hover:-translate-y-0.5 hover:border-violet-200">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-cyan-50 text-violet-700">
                <f.icon size={18} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
