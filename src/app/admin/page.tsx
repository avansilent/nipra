"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";
import type { HomeContent, Program, Stat, Testimonial, Faq } from "../../types/home";
import { defaultHomeContent, mergeHomeContent } from "../../data/homeContent";

type AdminStats = {
  students: number;
  admins: number;
  courses: number;
  tests: number;
  notes: number;
  results: number;
};

type ProfileRow = {
  id: string;
  role: string;
  created_at: string;
};

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

const withTimeout = async <T,>(
  promise: Promise<T> | PromiseLike<T>,
  ms = 4000
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Request timed out")), ms);
  });

  try {
    return await Promise.race([Promise.resolve(promise), timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [content, setContent] = useState<HomeContent>(defaultHomeContent);
  const [stats, setStats] = useState<AdminStats>({
    students: 0,
    admins: 0,
    courses: 0,
    tests: 0,
    notes: 0,
    results: 0,
  });
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const loadAdminData = async (supabase: NonNullable<ReturnType<typeof createSupabaseBrowserClient>>) => {
    const [coursesResp, testsResp, notesResp, resultsResp, profilesResp] = await Promise.all([
      withTimeout(supabase.from("courses").select("id", { count: "exact", head: true })),
      withTimeout(supabase.from("tests").select("id", { count: "exact", head: true })),
      withTimeout(supabase.from("notes").select("id", { count: "exact", head: true })),
      withTimeout(supabase.from("results").select("test_id", { count: "exact", head: true })),
      withTimeout(
        supabase
          .from("profiles")
          .select("id, role, created_at")
          .order("created_at", { ascending: false })
          .limit(20)
      ),
    ]);

    const profileRows = (profilesResp.data ?? []) as ProfileRow[];
    setProfiles(profileRows);

    const students = profileRows.filter((row) => row.role !== "admin").length;
    const admins = profileRows.filter((row) => row.role === "admin").length;

    setStats({
      students,
      admins,
      courses: coursesResp.count ?? 0,
      tests: testsResp.count ?? 0,
      notes: notesResp.count ?? 0,
      results: resultsResp.count ?? 0,
    });
  };

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setLoading(false);
      setError("Supabase is not configured yet. Please add env vars.");
      return;
    }

    const load = async () => {
      try {
        const { data } = await withTimeout(supabase.auth.getSession());
        setSession(data.session ?? null);

        if (!data.session) {
          return;
        }

        const { data: profile } = await withTimeout(
          supabase
            .from("profiles")
            .select("role")
            .eq("id", data.session.user.id)
            .maybeSingle()
        );

        const currentRole =
          profile?.role ??
          data.session.user.app_metadata?.role ??
          data.session.user.user_metadata?.role;

        const adminAccess = currentRole === "admin";
        setIsAdmin(adminAccess);

        if (!adminAccess) {
          return;
        }

        const { data: row, error: fetchError } = await withTimeout(
          supabase
            .from("site_content")
            .select("data")
            .eq("key", "home")
            .single()
        );

        if (fetchError) {
          setError(fetchError.message);
        } else if (row?.data) {
          setContent(mergeHomeContent(row.data as Partial<HomeContent>));
        }

        await loadAdminData(supabase);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load admin panel.");
      } finally {
        setLoading(false);
      }
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
      if (!supabase) {
        setError("Supabase is not configured yet. Please add env vars.");
        setSaving(false);
        return;
      }
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

  const handleRoleChange = async (userId: string, nextRole: "admin" | "student") => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase is not configured yet. Please add env vars.");
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role: nextRole })
      .eq("id", userId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setProfiles((prev) =>
      prev.map((row) => (row.id === userId ? { ...row, role: nextRole } : row))
    );
    setStats((prev) => {
      const nextProfiles = profiles.map((p) =>
        p.id === userId ? { ...p, role: nextRole } : p
      );
      const admins = nextProfiles.filter((p) => p.role === "admin").length;
      const students = nextProfiles.filter((p) => p.role !== "admin").length;
      return { ...prev, admins, students };
    });
  };

  const handleRefresh = async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !session) {
      return;
    }

    try {
      setError(null);
      const { data: row, error: fetchError } = await withTimeout(
        supabase
          .from("site_content")
          .select("data")
          .eq("key", "home")
          .single()
      );

      if (fetchError) {
        setError(fetchError.message);
      } else if (row?.data) {
        setContent(mergeHomeContent(row.data as Partial<HomeContent>));
      }

      await loadAdminData(supabase);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Unable to refresh dashboard.");
    }
  };

  if (loading) {
    return (
      <section className="admin-shell">
        <div className="admin-card admin-card--compact">
          Loading admin tools...
        </div>
      </section>
    );
  }

  if (!session) {
    return (
      <section className="admin-shell">
        <div className="admin-card admin-card--compact">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Admin access required
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Please log in with an admin account to manage site content.
          </p>
          <a href="/login" className="admin-link mt-6 inline-flex text-sm">
            Go to login
          </a>
        </div>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="admin-shell">
        <div className="admin-card admin-card--compact">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Admin role required
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Your account is signed in, but it does not have admin privileges.
          </p>
          <a href="/" className="admin-link mt-6 inline-flex text-sm">
            Back to home
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-shell">
      <header className="admin-header admin-header--premium">
        <div>
          <p className="admin-kicker">Nipra Control Room</p>
          <h1 className="admin-title">Admin panel</h1>
          <p className="admin-subtitle">
            Update the homepage content and publish changes instantly.
          </p>
        </div>

        <div className="admin-actions">
          <button
            type="button"
            onClick={handleRefresh}
            className="admin-secondary"
          >
            Refresh data
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="admin-primary"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </header>

      <nav className="admin-quicknav" aria-label="Admin sections">
        <a href="#overview" className="admin-pill">Overview</a>
        <a href="#roles" className="admin-pill">Users</a>
        <a href="#programs" className="admin-pill">Programs</a>
        <a href="#stats" className="admin-pill">Stats</a>
        <a href="#testimonials" className="admin-pill">Testimonials</a>
        <a href="#faqs" className="admin-pill">FAQs</a>
        <a href="#contact" className="admin-pill">Contact</a>
        <a href="#newsletter" className="admin-pill">Newsletter</a>
        <a href="#footer" className="admin-pill">Footer</a>
      </nav>

      {(error || success) && (
        <div className="mb-6 text-sm">
          {error && <p className="text-red-500">{error}</p>}
          {success && <p className="text-emerald-600">Changes saved.</p>}
        </div>
      )}

      <div className="admin-stack">
        <section id="overview" className="admin-card">
          <h2 className="admin-section-title">Global overview</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="admin-surface text-sm">
              <p className="text-slate-500">Students</p>
              <p className="text-xl font-semibold text-slate-900">{stats.students}</p>
            </div>
            <div className="admin-surface text-sm">
              <p className="text-slate-500">Admins</p>
              <p className="text-xl font-semibold text-slate-900">{stats.admins}</p>
            </div>
            <div className="admin-surface text-sm">
              <p className="text-slate-500">Courses</p>
              <p className="text-xl font-semibold text-slate-900">{stats.courses}</p>
            </div>
            <div className="admin-surface text-sm">
              <p className="text-slate-500">Tests</p>
              <p className="text-xl font-semibold text-slate-900">{stats.tests}</p>
            </div>
            <div className="admin-surface text-sm">
              <p className="text-slate-500">Notes</p>
              <p className="text-xl font-semibold text-slate-900">{stats.notes}</p>
            </div>
            <div className="admin-surface text-sm">
              <p className="text-slate-500">Results</p>
              <p className="text-xl font-semibold text-slate-900">{stats.results}</p>
            </div>
          </div>
        </section>

        <section id="roles" className="admin-card">
          <h2 className="admin-section-title">User roles (global access)</h2>
          <div className="space-y-3">
            {profiles.length === 0 ? (
              <p className="text-sm text-slate-500">No users found yet.</p>
            ) : (
              profiles.map((profile) => (
                <div key={profile.id} className="admin-role-row grid gap-3 md:grid-cols-[1fr_auto] items-center p-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{profile.id}</p>
                    <p className="text-xs text-slate-500">Role: {profile.role}</p>
                  </div>
                  <select
                    value={profile.role === "admin" ? "admin" : "student"}
                    onChange={(e) => handleRoleChange(profile.id, e.target.value as "admin" | "student")}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="student">student</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
              ))
            )}
          </div>
        </section>

        <section id="programs" className="admin-card">
          <h2 className="admin-section-title">Programs section</h2>
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

        <section id="stats" className="admin-card">
          <h2 className="admin-section-title">Stats</h2>
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

        <section id="testimonials" className="admin-card">
          <h2 className="admin-section-title">Testimonials</h2>
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

        <section id="faqs" className="admin-card">
          <h2 className="admin-section-title">FAQs</h2>
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

        <section id="contact" className="admin-card">
          <h2 className="admin-section-title">Contact section</h2>
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

        <section id="newsletter" className="admin-card">
          <h2 className="admin-section-title">Newsletter section</h2>
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

        <section id="footer" className="admin-card">
          <h2 className="admin-section-title">Footer</h2>
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
