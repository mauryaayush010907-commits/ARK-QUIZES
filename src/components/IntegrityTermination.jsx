import { useNavigate } from "react-router-dom";
import { ShieldX } from "lucide-react";
import { Button } from "./ui";

export default function IntegrityTermination({ violation }) {
  const navigate = useNavigate();
  const reason = violation?.reason || "The active quiz page was left or became inactive.";
  const detectedAt = violation?.timestamp
    ? new Date(violation.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-[#FECACA] bg-white p-6 text-center shadow-[0_12px_40px_rgba(15,23,42,0.08)] sm:p-9">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FEF2F2] text-[#EF4444]">
        <ShieldX size={28} />
      </div>
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-[#EF4444]">Quiz session terminated</p>
      <h1 className="mt-2 text-2xl font-bold text-[#11182F]">Your attempt has ended</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#596580]">
        The quiz page was left or became inactive. Your attempt was terminated and the activity was recorded in the quiz report.
      </p>
      <div className="mt-5 rounded-xl border border-[#E2E6F0] bg-[#F5F7FC] p-4 text-left">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#596580]">Violation</p>
        <p className="mt-1 text-sm font-semibold text-[#11182F]">{reason}</p>
        {detectedAt && <p className="mt-2 font-mono text-xs text-[#596580]">Detected {detectedAt}</p>}
      </div>
      <p className="mt-4 text-xs text-[#596580]">This decision uses browser-visible session signals, not proof of intent.</p>
      <Button className="mt-6" onClick={() => navigate("/play", { replace: true })}>Return to Dashboard</Button>
    </section>
  );
}
