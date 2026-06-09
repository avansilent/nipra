"use client";

import { useCallback, useEffect, useState, type ChangeEvent, type ReactNode } from "react";

type MaterialType = "note" | "book" | "link" | "pdf";
type SessionStatus = "scheduled" | "live" | "completed" | "cancelled";

type SessionMaterial = {
  id: string;
  session_id: string;
  material_type: MaterialType;
  title: string;
  description: string | null;
  external_url: string | null;
  visible_from: string | null;
  sort_order: number;
  created_at?: string;
  hasFile?: boolean;
  signedUrl?: string | null;
};

type MaterialFormState = {
  title: string;
  description: string;
  materialType: MaterialType;
  externalUrl: string;
  sortOrder: string;
  file: File | null;
};

type SessionMaterialsPanelProps = {
  sessionId: string;
  sessionStatus: SessionStatus;
  disabled?: boolean;
  onChanged?: () => void;
};

const emptyMaterialForm = (): MaterialFormState => ({
  title: "",
  description: "",
  materialType: "note",
  externalUrl: "",
  sortOrder: "0",
  file: null,
});

const inputClass =
  "w-full rounded-[22px] bg-[#f8fafd] px-4 py-3 text-sm text-slate-900 outline-none shadow-[0_10px_24px_rgba(226,232,240,0.8)] transition duration-300 focus:bg-white focus:shadow-[0_0_0_4px_rgba(186,230,253,0.55),0_14px_28px_rgba(226,232,240,0.9)]";
const textareaClass = `${inputClass} min-h-[96px] resize-y`;
const labelClass = "mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500";
const hintClass = "mt-2 text-xs text-slate-500";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-[1.45rem] bg-sky-600 px-4 py-2.5 text-[0.92rem] font-semibold text-white shadow-[0_14px_30px_rgba(56,189,248,0.24)] transition duration-300 hover:-translate-y-0.5 hover:bg-sky-700 hover:shadow-[0_18px_36px_rgba(56,189,248,0.3)] disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-[1.45rem] bg-[#f6f8fb] px-4 py-2.5 text-[0.92rem] font-semibold text-slate-900 shadow-[0_10px_22px_rgba(226,232,240,0.84)] transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_28px_rgba(226,232,240,0.92)] disabled:cursor-not-allowed disabled:opacity-60";
const dangerButtonClass =
  "inline-flex items-center justify-center rounded-[1.35rem] bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 shadow-[0_10px_22px_rgba(252,165,165,0.16)] transition duration-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60";
const nestedCardClass =
  "rounded-[24px] bg-white/92 p-4 shadow-[0_14px_30px_rgba(226,232,240,0.86)]";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
      {hint ? <p className={hintClass}>{hint}</p> : null}
    </label>
  );
}

function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" }) {
  const toneClass = {
    neutral: "bg-stone-100 text-slate-900",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
  }[tone];

  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${toneClass}`}>{children}</span>;
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

async function readApiResponse<T>(response: Response, fallback: string): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? fallback);
  }

  return payload as T;
}

export default function SessionMaterialsPanel({
  sessionId,
  sessionStatus,
  disabled,
  onChanged,
}: SessionMaterialsPanelProps) {
  const [materials, setMaterials] = useState<SessionMaterial[]>([]);
  const [form, setForm] = useState<MaterialFormState>(emptyMaterialForm);
  const [filePickerKey, setFilePickerKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/sessions/${sessionId}/materials`, { cache: "no-store" });
      const payload = await readApiResponse<{ materials?: SessionMaterial[] }>(response, "Unable to load materials");
      setMaterials(payload.materials ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load materials");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadMaterials();
    }, 0);

    return () => {
      window.clearTimeout(loadTimer);
    };
  }, [loadMaterials]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, file: event.target.files?.[0] ?? null }));
  };

  const handleCreate = async () => {
    if (!form.title.trim()) {
      setError("Material title is required.");
      return;
    }

    if (form.materialType === "link" && !form.externalUrl.trim()) {
      setError("A valid HTTPS link is required.");
      return;
    }

    if (form.materialType !== "link" && !form.file) {
      setError("Select a PDF file before saving this material.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("title", form.title.trim());
      formData.append("description", form.description.trim());
      formData.append("material_type", form.materialType);
      formData.append("external_url", form.externalUrl.trim());
      formData.append("sort_order", form.sortOrder.trim() || "0");
      if (form.file) {
        formData.append("file", form.file);
      }

      const response = await fetch(`/api/admin/sessions/${sessionId}/materials`, {
        method: "POST",
        body: formData,
      });
      await readApiResponse(response, "Unable to save material");

      setForm(emptyMaterialForm());
      setFilePickerKey((prev) => prev + 1);
      setMessage("Material saved.");
      await loadMaterials();
      onChanged?.();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save material");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (material: SessionMaterial) => {
    if (!window.confirm(`Delete "${material.title}"?`)) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/sessions/${sessionId}/materials/${material.id}`, {
        method: "DELETE",
      });
      await readApiResponse(response, "Unable to delete material");
      setMessage("Material deleted.");
      await loadMaterials();
      onChanged?.();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete material");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_0.75fr]">
        <Field label="Material title">
          <input
            className={inputClass}
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Session notes"
          />
        </Field>
        <Field label="Type">
          <select
            className={inputClass}
            value={form.materialType}
            onChange={(event) => setForm((prev) => ({ ...prev, materialType: event.target.value as MaterialType, file: null }))}
          >
            <option value="note">Note</option>
            <option value="book">Book</option>
            <option value="pdf">PDF</option>
            <option value="link">Link</option>
          </select>
        </Field>
        <Field label="Sort order">
          <input
            className={inputClass}
            value={form.sortOrder}
            inputMode="numeric"
            onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
            placeholder="0"
          />
        </Field>
        <div className="lg:col-span-2">
          <Field label="Description">
            <textarea
              className={textareaClass}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Short note for admins and students"
            />
          </Field>
        </div>
        {form.materialType === "link" ? (
          <Field label="HTTPS link">
            <input
              className={inputClass}
              value={form.externalUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, externalUrl: event.target.value }))}
              placeholder="https://..."
            />
          </Field>
        ) : (
          <Field label="PDF file" hint={form.file ? form.file.name : "File unlocks after the session ends."}>
            <label className={`${secondaryButtonClass} w-full cursor-pointer`}>
              Choose PDF
              <input key={filePickerKey} type="file" accept="application/pdf,.pdf" className="hidden" onChange={handleFileChange} />
            </label>
          </Field>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={primaryButtonClass} disabled={disabled || saving} onClick={() => void handleCreate()}>
          Save Material
        </button>
        <StatusBadge tone={sessionStatus === "completed" ? "success" : "warning"}>
          {sessionStatus === "completed" ? "Unlocked" : "Unlocks on end live"}
        </StatusBadge>
        {message ? <span className="text-sm font-semibold text-emerald-700">{message}</span> : null}
        {error ? <span className="text-sm font-semibold text-rose-700">{error}</span> : null}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className={nestedCardClass}>
            <p className="text-sm text-slate-600">Loading materials...</p>
          </div>
        ) : materials.length === 0 ? (
          <div className={nestedCardClass}>
            <p className="font-semibold text-slate-900">No materials yet</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">Add notes, PDFs, books, or class links for this session.</p>
          </div>
        ) : (
          materials.map((material) => (
            <div key={material.id} className={`${nestedCardClass} flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between`}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900">{material.title}</p>
                  <StatusBadge tone="neutral">{material.material_type}</StatusBadge>
                </div>
                {material.description ? <p className="mt-1 text-sm leading-6 text-slate-600">{material.description}</p> : null}
                <p className="mt-2 text-xs text-slate-500">Visible from {formatDateTime(material.visible_from)}</p>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                {material.signedUrl ? (
                  <a href={material.signedUrl} target="_blank" rel="noreferrer" className={secondaryButtonClass}>
                    Open File
                  </a>
                ) : null}
                {material.external_url ? (
                  <a href={material.external_url} target="_blank" rel="noreferrer" className={secondaryButtonClass}>
                    Open Link
                  </a>
                ) : null}
                <button type="button" className={dangerButtonClass} disabled={saving} onClick={() => void handleDelete(material)}>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
