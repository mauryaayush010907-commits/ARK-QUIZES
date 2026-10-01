import { useNavigate } from "react-router-dom";
import { MonitorX } from "lucide-react";
import { Button } from "./ui";

export default function IntegritySessionConflict() {
  const navigate = useNavigate();

  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-[#FDE68A] bg-white p-6 text-center shadow-[0_12px_40px_rgba(15,23,42,0.08)] sm:p-9">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FFFBEB] text-[#D97706]">
        <MonitorX size={27} />
      </div>
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-[#B45309]">Active session found</p>
      <h1 className="mt-2 text-2xl font-bold text-[#11182F]">This quiz is open in another window</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#596580]">
        Only the window that started this attempt can continue. This session check is not recorded as an integrity violation.
      </p>
      <Button className="mt-6" onClick={() => navigate("/play", { replace: true })}>Return to Dashboard</Button>
    </section>
  );
}
