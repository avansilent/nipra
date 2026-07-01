"use client";

type ResourceReaderModalProps = {
  title: string;
  url: string;
  downloadUrl?: string | null;
  onClose: () => void;
};

function startDownload(url: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export default function ResourceReaderModal({ title, url, downloadUrl, onClose }: ResourceReaderModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/72 px-3 py-5 backdrop-blur-sm sm:px-4 sm:py-6">
      <div className="flex h-full max-h-[880px] w-full max-w-6xl flex-col overflow-hidden rounded-[26px] bg-white shadow-[0_28px_80px_rgba(15,23,42,0.34)]">
        <div className="flex flex-col gap-3 border-b border-stone-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-slate-950">{title}</p>
            <p className="mt-1 text-xs text-stone-500">Secure in-page reader</p>
          </div>
          <div className="grid shrink-0 grid-cols-3 gap-2 sm:flex">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-stone-100 px-3 py-2 text-xs font-semibold text-slate-800 sm:px-4 sm:text-sm"
            >
              New tab
            </a>
            {downloadUrl ? (
              <button
                type="button"
                onClick={() => startDownload(downloadUrl)}
                className="inline-flex min-h-10 items-center justify-center rounded-full bg-stone-100 px-3 py-2 text-xs font-semibold text-slate-800 sm:px-4 sm:text-sm"
              >
                Download
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold text-white sm:px-4 sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 bg-stone-50">
          <iframe
            title={`${title} reader`}
            src={`${url}#toolbar=1&navpanes=0&view=FitH`}
            className="h-full min-h-[68vh] w-full border-0 bg-white"
          />
        </div>
      </div>
    </div>
  );
}
