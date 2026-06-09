"use client";

export type CourseMode = "offline" | "online" | "hybrid";

type CourseModeSelectorProps = {
  value: CourseMode;
  onChange: (value: CourseMode) => void;
  className?: string;
  disabled?: boolean;
};

const defaultSelectClass =
  "w-full rounded-[22px] bg-[#f8fafd] px-4 py-3 text-sm text-slate-900 outline-none shadow-[0_10px_24px_rgba(226,232,240,0.8)] transition duration-300 focus:bg-white focus:shadow-[0_0_0_4px_rgba(186,230,253,0.55),0_14px_28px_rgba(226,232,240,0.9)]";

const courseModes: Array<{ value: CourseMode; label: string }> = [
  { value: "offline", label: "Offline" },
  { value: "online", label: "Online" },
  { value: "hybrid", label: "Hybrid" },
];

export function normalizeCourseMode(value: unknown): CourseMode {
  return value === "online" || value === "hybrid" ? value : "offline";
}

export default function CourseModeSelector({
  value,
  onChange,
  className,
  disabled,
}: CourseModeSelectorProps) {
  return (
    <select
      className={className ?? defaultSelectClass}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(normalizeCourseMode(event.target.value))}
    >
      {courseModes.map((mode) => (
        <option key={mode.value} value={mode.value}>
          {mode.label}
        </option>
      ))}
    </select>
  );
}
