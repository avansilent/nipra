"use client";

import { adminTabs, type AdminTab } from "./adminTabs";

type AdminSidebarProps = {
  activeTab: AdminTab;
  onSelect: (tab: AdminTab) => void;
  siteName: string;
};

export default function AdminSidebar({ activeTab, onSelect, siteName }: AdminSidebarProps) {
  return (
    <aside className="relative overflow-hidden rounded-[30px] border border-stone-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,243,238,0.96))] p-5 shadow-[0_22px_56px_rgba(36,32,28,0.08)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" />
      <div className="pointer-events-none absolute -right-10 top-0 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(214,203,191,0.5),transparent_72%)] blur-3xl" />
      <div className="rounded-[24px] border border-stone-200/70 bg-white/82 p-4 shadow-[0_12px_30px_rgba(36,32,28,0.05)] backdrop-blur-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">System Admin</p>
        <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-slate-950">{siteName || "Nipra Academy"}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          One workspace for student access, academic operations, resources, and live website controls.
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">Workspace Modules</p>
        <span className="rounded-full border border-stone-200/70 bg-white/78 px-3 py-1 text-[11px] font-medium text-slate-600">
          6 active
        </span>
      </div>

      <nav className="mt-4 grid gap-2">
        {adminTabs.map((item) => {
          const isActive = item.id === activeTab;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`rounded-[24px] border px-4 py-3 text-left transition duration-200 ${
                isActive
                  ? "border-slate-800/80 bg-[linear-gradient(180deg,rgba(28,32,39,0.98),rgba(55,63,74,0.96))] text-white shadow-[0_18px_42px_rgba(24,28,36,0.18)]"
                  : "border-stone-200/70 bg-white/76 text-slate-700 shadow-[0_12px_28px_rgba(36,32,28,0.05)] hover:-translate-y-0.5 hover:border-stone-300/80 hover:bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{item.label}</div>
                  <div className={`mt-1 text-xs ${isActive ? "text-slate-300" : "text-slate-500"}`}>{item.description}</div>
                </div>
                <span
                  className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-semibold ${
                    isActive
                      ? "bg-white/12 text-white"
                      : "bg-stone-100 text-slate-500"
                  }`}
                >
                  {item.label.slice(0, 2).toUpperCase()}
                </span>
              </div>
            </button>
          );
        })}
      </nav>

      <div className="mt-5 rounded-[22px] border border-stone-200/70 bg-white/74 px-4 py-3 text-sm text-slate-600 shadow-[0_12px_28px_rgba(36,32,28,0.04)]">
        Every module stays live against institute data, so edits apply from one place instead of scattered screens.
      </div>
    </aside>
  );
}