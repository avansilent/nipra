type AdminMetricCardProps = {
  label: string;
  value: string | number;
  helper: string;
  accent?: "slate" | "stone";
};

const accentClasses = {
  slate: "from-slate-900 via-slate-700 to-slate-500",
  stone: "from-stone-700 via-stone-600 to-slate-500",
};

export default function AdminMetricCard({ label, value, helper, accent = "slate" }: AdminMetricCardProps) {
  return (
    <div className="relative overflow-hidden rounded-[26px] border border-stone-200/70 bg-white/96 px-5 py-5 shadow-[0_18px_40px_rgba(36,32,28,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_50px_rgba(36,32,28,0.08)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/85" />
      <div className={`h-1.5 w-12 rounded-full bg-gradient-to-r ${accentClasses[accent]}`} />
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{helper}</p>
    </div>
  );
}