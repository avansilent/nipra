"use client";

import { adminTabs, type AdminTab } from "./adminTabs";

type AdminSidebarProps = {
  activeTab: AdminTab;
  onSelect: (tab: AdminTab) => void;
  siteName: string;
};

export default function AdminSidebar({ activeTab, onSelect, siteName }: AdminSidebarProps) {
  return (
    <aside className="rounded-[32px] bg-white/94 p-5 shadow-[0_22px_56px_rgba(226,232,240,0.92)]">
      <div className="rounded-[26px] bg-[#f7f9fc] p-4 shadow-[0_12px_28px_rgba(226,232,240,0.84)] backdrop-blur-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">System Admin</p>
        <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-slate-900">{siteName || "Nipra Academy"}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          One workspace for student access, academic operations, resources, and live website controls.
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">Workspace Modules</p>
        <span className="rounded-full bg-[#f7f9fc] px-3 py-1 text-[11px] font-medium text-slate-600 shadow-[0_8px_18px_rgba(226,232,240,0.72)]">
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
              className={`rounded-[24px] px-4 py-3 text-left transition duration-300 ${
                isActive
                  ? "bg-white text-slate-900 shadow-[0_14px_32px_rgba(226,232,240,0.96)]"
                  : "bg-transparent text-slate-900 hover:-translate-y-0.5 hover:bg-[#f7f9fc] hover:shadow-[0_10px_24px_rgba(226,232,240,0.82)]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{item.label}</div>
                  <div className={`mt-1 text-xs ${isActive ? "text-slate-500" : "text-slate-500"}`}>{item.description}</div>
                </div>
                <span
                  className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-semibold ${
                    isActive
                      ? "bg-sky-50 text-sky-700"
                      : "bg-white text-slate-500 shadow-[0_8px_18px_rgba(226,232,240,0.72)]"
                  }`}
                >
                  {item.label.slice(0, 2).toUpperCase()}
                </span>
              </div>
            </button>
          );
        })}
      </nav>

      <div className="mt-5 rounded-[24px] bg-[#f7f9fc] px-4 py-3 text-sm text-slate-600 shadow-[0_10px_24px_rgba(226,232,240,0.78)]">
        Every module stays live against institute data, so edits apply from one place instead of scattered screens.
      </div>
    </aside>
  );
}