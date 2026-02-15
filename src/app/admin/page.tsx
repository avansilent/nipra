"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";
import type { HomeContent, Program, Stat, Testimonial, Faq } from "../../types/home";
import { defaultHomeContent, mergeHomeContent } from "../../data/homeContent";

const emptyProgram = (): Program => ({
  id: `program-${Date.now()}`,
  title: "",
  subtitle: "Focus",
  chips: [],
  ctaLabel: "Explore",
  ctaHref: "/courses",
});

const emptyStat = (): Stat => ({
  id: `stat-${Date.now()}`,
  label: "",
  value: "",
});

const emptyTestimonial = (): Testimonial => ({
  id: `testimonial-${Date.now()}`,
  name: "",
  role: "",
  quote: "",
});

const emptyFaq = (): Faq => ({
  id: `faq-${Date.now()}`,
  question: "",
  answer: "",
});

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [content, setContent] = useState<HomeContent>(defaultHomeContent);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isAdmin = useMemo(() => {
    const role =
      session?.user?.app_metadata?.role ?? session?.user?.user_metadata?.role;
    return role === "admin";
  }, [session]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const load = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session ?? null);

      if (!data.session) {
        setLoading(false);
        return;
      }

      const { data: row, error: fetchError } = await supabase
        .from("site_content")
        .select("data")
        .eq("key", "home")
        .single();

      if (fetchError) {
        setError(fetchError.message);
      } else if (row?.data) {
        setContent(mergeHomeContent(row.data as Partial<HomeContent>));
      }

      setLoading(false);
    };

    load();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: upsertError } = await supabase
        .from("site_content")
        .upsert({ key: "home", data: content }, { onConflict: "key" });

      if (upsertError) {
        setError(upsertError.message);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof HomeContent>(key: K, value: HomeContent[K]) => {
    setContent((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <section className="w-full max-w-5xl mx-auto px-6 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-sm text-sm text-slate-600">
          Loading admin tools...
        </div>
      </section>
    );
  }

  if (!session) {
    return (
      <section className="w-full max-w-5xl mx-auto px-6 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-sm">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Admin access required
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Please log in with an admin account to manage site content.
          </p>
          <a href="/login" className="btn mt-6 inline-flex text-sm">
            Go to login
          </a>
        </div>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="w-full max-w-5xl mx-auto px-6 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-sm">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Admin role required
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Your account is signed in, but it does not have admin privileges.
          </p>
          <a href="/" className="btn mt-6 inline-flex text-sm">
            Back to home
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full max-w-6xl mx-auto px-6 py-10 md:py-12">
      <header className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Admin panel
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Update the homepage content and publish changes instantly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-slate-800 transition-colors"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </header>

      {(error || success) && (
        <div className="mb-6 text-sm">
          {error && <p className="text-red-500">{error}</p>}
          {success && <p className="text-emerald-600">Changes saved.</p>}
        </div>
      )}

      <div className="space-y-6 md:space-y-8">
        <section className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm p-6 md:p-7 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Programs section</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-medium text-slate-500">
              Heading
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={content.programsHeading}
                onChange={(e) => updateField("programsHeading", e.target.value)}
              />
            </label>
            <label className="text-xs font-medium text-slate-500">
              Description
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={content.programsDescription}
                onChange={(e) => updateField("programsDescription", e.target.value)}
              />
            </label>
          </div>

          <div className="space-y-4">
            {content.programs.map((program, index) => (
              <div key={program.id} className="rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500">Program {index + 1}</p>
                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        "programs",
                        content.programs.filter((_, i) => i !== index)
                      )
                    }
                    className="text-xs text-red-500"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Title"
                    value={program.title}
                    onChange={(e) => {
                      const next = [...content.programs];
                      next[index] = { ...program, title: e.target.value };
                      updateField("programs", next);
                    }}
                  />
                  <input
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Subtitle"
                    value={program.subtitle}
                    onChange={(e) => {
                      const next = [...content.programs];
                      next[index] = { ...program, subtitle: e.target.value };
                      updateField("programs", next);
                    }}
                  />
                </div>
                <input
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Chips (comma separated)"
                  value={program.chips.join(", ")}
                  onChange={(e) => {
                    const next = [...content.programs];
                    next[index] = {
                      ...program,
                      chips: e.target.value
                        .split(",")
                        .map((chip) => chip.trim())
                        .filter(Boolean),
                    };
                    updateField("programs", next);
                  }}
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="CTA label"
                    value={program.ctaLabel}
                    onChange={(e) => {
                      const next = [...content.programs];
                      next[index] = { ...program, ctaLabel: e.target.value };
                      updateField("programs", next);
                    }}
                  />
                  <input
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="CTA link"
                    value={program.ctaHref}
                    onChange={(e) => {
                      const next = [...content.programs];
                      next[index] = { ...program, ctaHref: e.target.value };
                      updateField("programs", next);
                    }}
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => updateField("programs", [...content.programs, emptyProgram()])}
              className="text-xs text-slate-600 hover:text-slate-900"
            >
              + Add program
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm p-6 md:p-7 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Stats</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-medium text-slate-500">
              Heading
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={content.statsHeading}
                onChange={(e) => updateField("statsHeading", e.target.value)}
              />
            </label>
            <label className="text-xs font-medium text-slate-500">
              Subtitle
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={content.statsSubtitle}
                onChange={(e) => updateField("statsSubtitle", e.target.value)}
              />
            </label>
          </div>
          <div className="space-y-3">
            {content.stats.map((stat, index) => (
              <div key={stat.id} className="grid gap-3 md:grid-cols-3">
                <input
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Label"
                  value={stat.label}
                  onChange={(e) => {
                    const next = [...content.stats];
                    next[index] = { ...stat, label: e.target.value };
                    updateField("stats", next);
                  }}
                />
                <input
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Value"
                  value={stat.value}
                  onChange={(e) => {
                    const next = [...content.stats];
                    next[index] = { ...stat, value: e.target.value };
                    updateField("stats", next);
                  }}
                />
                <button
                  type="button"
                  onClick={() =>
                    updateField(
                      "stats",
                      content.stats.filter((_, i) => i !== index)
                    )
                  }
                  className="text-xs text-red-500"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => updateField("stats", [...content.stats, emptyStat()])}
              className="text-xs text-slate-600 hover:text-slate-900"
            >
              + Add stat
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm p-6 md:p-7 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Testimonials</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-medium text-slate-500">
              Heading
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={content.testimonialsHeading}
                onChange={(e) => updateField("testimonialsHeading", e.target.value)}
              />
            </label>
            <label className="text-xs font-medium text-slate-500">
              Subtitle
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={content.testimonialsSubtitle}
                onChange={(e) => updateField("testimonialsSubtitle", e.target.value)}
              />
            </label>
          </div>
          <div className="space-y-4">
            {content.testimonials.map((testimonial, index) => (
              <div key={testimonial.id} className="rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500">Testimonial {index + 1}</p>
                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        "testimonials",
                        content.testimonials.filter((_, i) => i !== index)
                      )
                    }
                    className="text-xs text-red-500"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Name"
                    value={testimonial.name}
                    onChange={(e) => {
                      const next = [...content.testimonials];
                      next[index] = { ...testimonial, name: e.target.value };
                      updateField("testimonials", next);
                    }}
                  />
                  <input
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Role"
                    value={testimonial.role}
                    onChange={(e) => {
                      const next = [...content.testimonials];
                      next[index] = { ...testimonial, role: e.target.value };
                      updateField("testimonials", next);
                    }}
                  />
                </div>
                <textarea
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Quote"
                  value={testimonial.quote}
                  onChange={(e) => {
                    const next = [...content.testimonials];
                    next[index] = { ...testimonial, quote: e.target.value };
                    updateField("testimonials", next);
                  }}
                  rows={3}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                updateField("testimonials", [...content.testimonials, emptyTestimonial()])
              }
              className="text-xs text-slate-600 hover:text-slate-900"
            >
              + Add testimonial
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm p-6 md:p-7 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">FAQs</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-medium text-slate-500">
              Heading
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={content.faqsHeading}
                onChange={(e) => updateField("faqsHeading", e.target.value)}
              />
            </label>
            <label className="text-xs font-medium text-slate-500">
              Subtitle
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={content.faqsSubtitle}
                onChange={(e) => updateField("faqsSubtitle", e.target.value)}
              />
            </label>
          </div>
          <div className="space-y-4">
            {content.faqs.map((faq, index) => (
              <div key={faq.id} className="rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500">FAQ {index + 1}</p>
                  <button
                    type="button"
                    onClick={() =>
                      updateField("faqs", content.faqs.filter((_, i) => i !== index))
                    }
                    className="text-xs text-red-500"
                  >
                    Remove
                  </button>
                </div>
                <input
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Question"
                  value={faq.question}
                  onChange={(e) => {
                    const next = [...content.faqs];
                    next[index] = { ...faq, question: e.target.value };
                    updateField("faqs", next);
                  }}
                />
                <textarea
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Answer"
                  value={faq.answer}
                  onChange={(e) => {
                    const next = [...content.faqs];
                    next[index] = { ...faq, answer: e.target.value };
                    updateField("faqs", next);
                  }}
                  rows={3}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => updateField("faqs", [...content.faqs, emptyFaq()])}
              className="text-xs text-slate-600 hover:text-slate-900"
            >
              + Add FAQ
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm p-6 md:p-7 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Contact section</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-medium text-slate-500">
              Heading
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={content.contactHeading}
                onChange={(e) => updateField("contactHeading", e.target.value)}
              />
            </label>
            <label className="text-xs font-medium text-slate-500">
              Subtitle
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={content.contactSubtitle}
                onChange={(e) => updateField("contactSubtitle", e.target.value)}
              />
            </label>
          </div>
          <label className="text-xs font-medium text-slate-500">
            CTA label
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={content.contactCtaLabel}
              onChange={(e) => updateField("contactCtaLabel", e.target.value)}
            />
          </label>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm p-6 md:p-7 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Newsletter section</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-medium text-slate-500">
              Heading
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={content.newsletterHeading}
                onChange={(e) => updateField("newsletterHeading", e.target.value)}
              />
            </label>
            <label className="text-xs font-medium text-slate-500">
              Subtitle
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={content.newsletterSubtitle}
                onChange={(e) => updateField("newsletterSubtitle", e.target.value)}
              />
            </label>
          </div>
          <label className="text-xs font-medium text-slate-500">
            CTA label
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={content.newsletterCtaLabel}
              onChange={(e) => updateField("newsletterCtaLabel", e.target.value)}
            />
          </label>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm p-6 md:p-7 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Footer</h2>
          <label className="text-xs font-medium text-slate-500">
            Tagline
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={content.footerTagline}
              onChange={(e) => updateField("footerTagline", e.target.value)}
            />
          </label>
        </section>
      </div>
    </section>
  );
}
