"use client";

import { useTracks } from "../../hooks/useTracks";
import CourseCard from "../../components/CourseCard";
import { defaultTracks } from "../../data/tracks";

export default function AdminPage() {
  const { tracks, updateTrack, addTrack, setTracks, removeTrack } = useTracks();

  const handleImageUpload = (index: number, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      if (!value) return;
      updateTrack(index, { thumbnailUrl: value, image: value });
    };
    reader.readAsDataURL(file);
  };

  return (
    <section className="w-full max-w-6xl mx-auto px-6 py-10 md:py-12">
      <header className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Admin panel
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Quickly adjust the home page categories, text, badges, and media.
            Changes save automatically in this browser.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => addTrack()}
            className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-slate-800 transition-colors"
          >
            + Add category
          </button>
          <button
            type="button"
            onClick={() => setTracks(defaultTracks)}
            className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Reset to default
          </button>
        </div>
      </header>

      <div className="space-y-5 md:space-y-6">
        {tracks.map((track, index) => (
          <div
            key={track.id}
            className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm p-5 md:p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                  Category {index + 1}
                </p>
                <p className="text-sm font-semibold text-slate-900 truncate max-w-[220px] md:max-w-xs">
                  {track.title || "Untitled"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeTrack(index)}
                className="text-xs text-slate-500 hover:text-red-500 rounded-full border border-slate-200 px-3 py-1 transition-colors"
              >
                Remove
              </button>
            </div>

            <div className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-start">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={track.title}
                    onChange={(e) => updateTrack(index, { title: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Short description
                  </label>
                  <input
                    type="text"
                    value={track.description ?? ""}
                    onChange={(e) => updateTrack(index, { description: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Tag label
                    </label>
                    <input
                      type="text"
                      value={track.tag}
                      onChange={(e) => updateTrack(index, { tag: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Levels (comma separated)
                    </label>
                    <input
                      type="text"
                      value={track.levels.join(", ")}
                      onChange={(e) =>
                        updateTrack(index, {
                          levels: e.target.value
                            .split(",")
                            .map((part) => part.trim())
                            .filter(Boolean),
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Image URL
                    </label>
                    <input
                      type="text"
                      value={track.image ?? ""}
                      onChange={(e) => updateTrack(index, { image: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Thumbnail URL
                    </label>
                    <input
                      type="text"
                      value={track.thumbnailUrl ?? ""}
                      onChange={(e) =>
                        updateTrack(index, { thumbnailUrl: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                    <div className="mt-2 space-y-1">
                      <label className="block text-[11px] font-medium text-slate-500">
                        Or upload image
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handleImageUpload(
                            index,
                            e.target.files && e.target.files[0]
                              ? e.target.files[0]
                              : null
                          )
                        }
                        className="block w-full text-[11px] text-slate-600"
                      />
                      <p className="text-[11px] text-slate-400">
                        You can either paste a URL above or pick a file
                        here.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Video link
                    </label>
                    <input
                      type="text"
                      value={track.videoUrl ?? ""}
                      onChange={(e) => updateTrack(index, { videoUrl: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Title font size
                    </label>
                    <select
                      value={track.titleClassName ?? "text-2xl"}
                      onChange={(e) =>
                        updateTrack(index, { titleClassName: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    >
                      <option value="text-xl">Small</option>
                      <option value="text-2xl">Medium</option>
                      <option value="text-3xl">Large</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-5">
                    <input
                      id={`popular-${track.id}`}
                      type="checkbox"
                      checked={!!track.popular}
                      onChange={(e) => updateTrack(index, { popular: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20"
                    />
                    <label
                      htmlFor={`popular-${track.id}`}
                      className="text-xs text-slate-600"
                    >
                      Mark as highlighted
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-4 md:mt-0">
                <p className="mb-2 text-xs font-medium text-slate-500">
                  Preview
                </p>
                <CourseCard
                  title={track.title}
                  duration={track.description}
                  tag={track.tag}
                  levels={track.levels}
                  image={track.thumbnailUrl || track.image}
                  popular={track.popular}
                  titleClassName={track.titleClassName}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
