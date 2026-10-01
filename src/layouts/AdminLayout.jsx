import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Trophy,
  BarChart3,
  Users,
  UsersRound,
  LogOut,
  Menu,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/images/logo.png";

const links = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/quizzes", label: "Quizzes", icon: Trophy },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/participants", label: "People", icon: Users },
  { to: "/admin/teams", label: "Teams", icon: UsersRound },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="mesh min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full min-h-screen w-[260px] flex-col border-r border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur-xl transition duration-200 lg:relative ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="" className="h-9 w-9 rounded-xl object-cover" />
            <div>
              <p className="text-sm font-extrabold tracking-tight text-slate-900">ARK-QUIZES</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-violet-700">Command Center</p>
            </div>
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)}>
            <X size={18} className="text-slate-700" />
          </button>
        </div>
        <nav className="flex-1 space-y-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? "bg-violet-50 text-violet-700 shadow-[inset_0_0_0_1px_rgba(108,59,255,0.12)]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              <l.icon size={16} />
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto rounded-3xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-slate-900"
              style={{ background: user?.avatarColor || "#7c6cff" }}
            >
              {user?.name?.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{user?.name}</p>
              <p className="truncate text-[11px] text-slate-500">{user?.email}</p>
            </div>
            <button
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              title="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-slate-900/20 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="min-h-screen">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-xl lg:px-8">
          <button className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-700 lg:hidden" onClick={() => setOpen(true)}>
            <Menu size={18} />
          </button>
          <div className="hidden items-center gap-2 text-xs text-slate-600 lg:flex">
            <Zap size={14} className="text-cyan-500" />
            Server-authoritative scoring · Real-time rooms
          </div>
          <div className="ml-auto text-xs text-slate-600">{user?.name}</div>
        </header>
        <main className="px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
