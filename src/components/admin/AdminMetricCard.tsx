type AdminMetricCardProps = {
  label: string;
  value: string | number;
  helper: string;
  accent?: "slate" | "stone";
};

const accentClasses = {
  slate: "bg-sky-100 text-sky-700",
  stone: "bg-slate-100 text-slate-600",
};

export default function AdminMetricCard({ label, value, helper, accent = "slate" }: AdminMetricCardProps) {
  return (
    <div className="rounded-[28px] bg-white/94 px-5 py-5 shadow-[0_18px_42px_rgba(226,232,240,0.9)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_54px_rgba(226,232,240,0.96)]">
      <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${accentClasses[accent]}`}>{label}</span>
      <p className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-slate-900">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{helper}</p>
    </div>
  );
}