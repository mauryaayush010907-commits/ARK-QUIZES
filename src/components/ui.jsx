import { useEffect, useState } from "react";
import { Loader2, Search, X } from "lucide-react";

export function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

/* =========================================================
   BUTTON
========================================================= */

export function Button({
  children,
  className = "",
  variant = "primary",
  size = "md",
  loading,
  ...props
}) {
  const sizes = {
    sm: "h-9 px-3 text-xs",
    md: "h-11 px-4 text-sm",
    lg: "h-12 px-5 text-base",
  };

  const variants = {
    primary:
      "bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 hover:brightness-[1.03]",

    ghost:
      "border border-slate-200 bg-slate-100 text-slate-700 hover:border-violet-200 hover:bg-slate-200 hover:text-slate-900",

    danger:
      "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/20",

    gold:
      "bg-gradient-to-r from-amber-400 to-yellow-500 font-semibold text-slate-900 shadow-lg shadow-amber-500/20",

    outline:
      "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900",

    light:
      "border border-slate-200 bg-white font-semibold text-slate-900 hover:bg-slate-100",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        sizes[size],
        variants[variant],
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

/* =========================================================
   INPUT
========================================================= */

export function Input({
  label,
  hint,
  error,
  className = "",
  icon: Icon,
  ...props
}) {
  return (
    <label className="block space-y-1.5">
      {label && (
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
          {label}
        </span>
      )}

      <div className="relative">
        {Icon && (
          <Icon
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
        )}

        <input
          className={cn(
            "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100",
            Icon && "pl-9",
            error && "border-rose-400",
            className
          )}
          {...props}
        />
      </div>

      {hint && !error && (
        <p className="text-xs text-slate-500">
          {hint}
        </p>
      )}

      {error && (
        <p className="text-xs text-rose-500">
          {error}
        </p>
      )}
    </label>
  );
}

/* =========================================================
   TEXTAREA
========================================================= */

export function Textarea({
  label,
  className = "",
  ...props
}) {
  return (
    <label className="block space-y-1.5">
      {label && (
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
          {label}
        </span>
      )}

      <textarea
        className={cn(
          "min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100",
          className
        )}
        {...props}
      />
    </label>
  );
}

/* =========================================================
   SELECT
========================================================= */

export function Select({
  label,
  children,
  className = "",
  ...props
}) {
  return (
    <label className="block space-y-1.5">
      {label && (
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
          {label}
        </span>
      )}

      <select
        className={cn(
          "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100",
          className
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

/* =========================================================
   BADGE
========================================================= */

export function Badge({
  children,
  tone = "slate",
}) {
  const map = {
    slate: "bg-slate-100 text-slate-700",
    violet: "bg-violet-50 text-violet-700",
    cyan: "bg-cyan-50 text-cyan-700",
    gold: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-600",
    lime: "bg-lime-50 text-lime-700",

    live:
      "bg-gradient-to-r from-rose-50 to-violet-50 text-rose-600",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
        map[tone]
      )}
    >
      {children}
    </span>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

export function StatusBadge({ status }) {
  const tone =
    {
      DRAFT: "slate",
      SCHEDULED: "cyan",
      LIVE: "live",
      COMPLETED: "lime",
      EXPIRED: "gold",
      CANCELLED: "rose",
    }[status] || "slate";

  return (
    <Badge tone={tone}>
      {status === "LIVE" && (
        <span className="live-dot h-1.5 w-1.5 rounded-full bg-rose-400" />
      )}

      {status}
    </Badge>
  );
}

/* =========================================================
   MODE BADGE
========================================================= */

export function ModeBadge({ mode }) {
  const label = {
    scheduled: "Scheduled",
    live: "Live",
    game: "Fastest Answer",
  }[mode] || mode;

  const tone = {
    scheduled: "violet",
    live: "rose",
    game: "gold",
  }[mode] || "slate";

  return (
    <Badge tone={tone}>
      {label}
    </Badge>
  );
}

/* =========================================================
   CARD
========================================================= */

export function Card({
  children,
  className = "",
}) {
  return (
    <div
      className={cn(
        "premium-panel rounded-3xl p-5",
        className
      )}
    >
      {children}
    </div>
  );
}

/* =========================================================
   MODAL
========================================================= */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}) {
  useEffect(() => {
    if (!open) return undefined;

    const onKey = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/30 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <button
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Close"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-modal-title"
        className={cn(
          "relative max-h-[92vh] w-full overflow-auto rounded-t-3xl border border-slate-200 bg-white/95 p-5 shadow-[0_30px_80px_rgba(15,23,42,0.12)] sm:rounded-3xl",
          wide ? "max-w-3xl" : "max-w-lg"
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 id="app-modal-title" className="font-display text-2xl text-slate-900">
            {title}
          </h3>

          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={18} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

/* =========================================================
   CONFIRM
========================================================= */

export function Confirm({
  open,
  onClose,
  onConfirm,
  title,
  body,
  danger,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
    >
      <p className="text-sm leading-6 text-slate-600">
        {body}
      </p>

      <div className="mt-5 flex justify-end gap-2">
        <Button
          variant="ghost"
          onClick={onClose}
        >
          Cancel
        </Button>

        <Button
          variant={danger ? "danger" : "primary"}
          onClick={onConfirm}
        >
          Confirm
        </Button>
      </div>
    </Modal>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="empty-state flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
          <Icon size={26} />
        </div>
      )}

      <h3 className="empty-state-title text-lg font-semibold">
        {title}
      </h3>

      <p className="empty-state-body mt-1 max-w-md text-sm leading-6">
        {body}
      </p>

      {action && (
        <div className="mt-5">
          {action}
        </div>
      )}
    </div>
  );
}
/* =========================================================
   SKELETON
========================================================= */

export function Skeleton({
  className = "",
}) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-slate-100",
        className
      )}
    />
  );
}

/* =========================================================
   SEARCH BOX
========================================================= */

export function SearchBox({
  value,
  onChange,
  placeholder = "Search…",
}) {
  return (
    <Input
      icon={Search}
      value={value}
      onChange={(e) =>
        onChange(e.target.value)
      }
      placeholder={placeholder}
    />
  );
}

/* =========================================================
   PAGINATION
========================================================= */

export function Pagination({
  page,
  pages,
  onPage,
}) {
  if (pages <= 1) return null;

  return (
    <div className="flex items-center justify-end gap-2 pt-4">
      <Button
        size="sm"
        variant="ghost"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        Prev
      </Button>

      <span className="text-xs text-slate-500">
        {page} / {pages}
      </span>

      <Button
        size="sm"
        variant="ghost"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}

/* =========================================================
   FIELD CHECK
========================================================= */

export function FieldCheck({
  label,
  checked,
  onChange,
  hint,
}) {
  return (
    <label
      className="
        flex
        cursor-pointer
        items-start
        gap-3
        rounded-2xl
        border
        border-slate-200
        bg-white
        p-3
        transition
        hover:border-violet-300
        hover:bg-violet-50/40
      "
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) =>
          onChange(e.target.checked)
        }
        className="mt-1 accent-[#6C3BFF]"
      />

      <span>
        <span className="block text-sm font-medium text-slate-900">
          {label}
        </span>

        {hint && (
          <span className="text-xs text-slate-500">
            {hint}
          </span>
        )}
      </span>
    </label>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "from-violet-500/15 to-cyan-500/10",
}) {
  return (
    <div
      className="
        relative
        overflow-hidden
        rounded-3xl
        border
        border-slate-200
        bg-white
        p-4
        shadow-[0_16px_35px_rgba(15,23,42,0.05)]
      "
    >
      <div
        className={cn(
          "absolute -right-6 -top-8 h-24 w-24 rounded-full bg-gradient-to-br opacity-80 blur-sm",
          accent
        )}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
            {label}
          </p>

          <p className="mt-3 font-display text-4xl text-slate-900">
            {value}
          </p>
        </div>

        {Icon && (
          <div
            className="
              rounded-2xl
              border
              border-slate-200
              bg-violet-50
              p-2
              text-violet-700
            "
          >
            <Icon size={18} />
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   PROGRESS
========================================================= */

export function Progress({
  value,
  max = 100,
}) {
  const pct = max
    ? Math.min(
        100,
        Math.round((value / max) * 100)
      )
    : 0;

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-gradient-to-r from-violet-600 via-violet-500 to-cyan-400"
        style={{
          width: `${pct}%`,
        }}
      />
    </div>
  );
}

/* =========================================================
   TABS
========================================================= */

export function Tabs({
  tabs,
  value,
  onChange,
}) {
  return (
    <div className="flex gap-1 overflow-auto rounded-2xl bg-slate-100 p-1 no-scrollbar">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition",

            value === t.id
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:bg-white/60 hover:text-slate-900"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* =========================================================
   TIMER RING
========================================================= */

export function TimerRing({
  remaining,
  total,
}) {
  const r = 28;
  const c = 2 * Math.PI * r;

  const pct = total
    ? Math.max(
        0,
        Math.min(1, remaining / total)
      )
    : 0;

  const danger = pct < 0.2;

  return (
    <div className="relative h-16 w-16">
      <svg
        viewBox="0 0 72 72"
        className="-rotate-90"
      >
        <circle
          cx="36"
          cy="36"
          r={r}
          stroke="#E2E8F0"
          strokeWidth="6"
          fill="none"
        />

        <circle
          cx="36"
          cy="36"
          r={r}
          stroke={
            danger
              ? "#EF4444"
              : "#06B6D4"
          }
          strokeWidth="6"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={
            c * (1 - pct)
          }
          strokeLinecap="round"
        />
      </svg>

      <div
        className="
          absolute
          inset-0
          flex
          items-center
          justify-center
          font-mono
          text-sm
          font-semibold
          text-slate-900
        "
      >
        {Math.max(
          0,
          Math.ceil(remaining / 1000)
        )}
      </div>
    </div>
  );
}

/* =========================================================
   CONFIRM HOOK
========================================================= */

export function useConfirm() {
  const [state, setState] = useState({
    open: false,
  });

  const confirm = (opts) =>
    new Promise((resolve) => {
      setState({
        open: true,
        ...opts,

        onClose: () => {
          setState({
            open: false,
          });

          resolve(false);
        },

        onConfirm: () => {
          setState({
            open: false,
          });

          resolve(true);
        },
      });
    });

  const node = <Confirm {...state} />;

  return [confirm, node];
}