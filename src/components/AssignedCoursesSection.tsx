"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAdaptiveMotion } from "../hooks/useAdaptiveMotion";
import { balancedItemReveal, balancedSectionReveal, hoverLift, itemReveal, sectionReveal, viewportOnce } from "../lib/motion";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";

type CourseRow = {
  id: string;
  title: string;
  description: string | null;
};

type EnrollmentSelectRow = { course: CourseRow | CourseRow[] | null };

const softPortalActionClass =
  "inline-flex w-full items-center justify-center rounded-full border border-slate-200/75 bg-white/96 px-4 py-2.5 text-[0.92rem] font-semibold text-slate-900 shadow-[0_12px_24px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_16px_28px_rgba(15,23,42,0.06)] sm:w-auto sm:px-5 sm:py-3 sm:text-sm";

export default function AssignedCoursesSection() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { allowHoverMotion, allowRichMotion } = useAdaptiveMotion();
  const [ready, setReady] = useState(false);
  const [hasAuthenticatedUser, setHasAuthenticatedUser] = useState(false);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sectionVariants = allowRichMotion ? sectionReveal : balancedSectionReveal;
  const itemVariants = allowRichMotion ? itemReveal : balancedItemReveal;
  const hoverMotion = allowHoverMotion ? hoverLift : undefined;

  useEffect(() => {
    const loadAssignedCourses = async () => {
      if (!supabase) {
        setReady(true);
        return;
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setReady(true);
          return;
        }

        setHasAuthenticatedUser(true);

        const { data: profile } = await supabase
          .from("profiles")
          .select("institute_id")
          .eq("id", user.id)
          .maybeSingle();

        const instituteId =
          profile?.institute_id ??
          (user.app_metadata?.institute_id as string | undefined) ??
          (user.user_metadata?.institute_id as string | undefined) ??
          null;

        if (!instituteId) {
          setError("Institute not assigned for this account.");
          return;
        }

        const { data: enrollmentRows, error: enrollmentError } = await supabase
          .from("enrollments")
          .select("course:course_id (id, title, description)")
          .eq("student_id", user.id)
          .eq("institute_id", instituteId);

        if (enrollmentError) {
          setError(enrollmentError.message);
          return;
        }

        const enrolledCourses = ((enrollmentRows ?? []) as EnrollmentSelectRow[]).flatMap((row) => {
          if (!row.course) {
            return [];
          }

          return Array.isArray(row.course) ? row.course : [row.course];
        });

        setCourses(enrolledCourses);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load assigned courses.");
      } finally {
        setReady(true);
      }
    };

    void loadAssignedCourses();
  }, [supabase]);

  if (!hasAuthenticatedUser && ready) {
    return null;
  }

  if (!hasAuthenticatedUser && !ready) {
    return null;
  }

  return (
    <motion.section
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      variants={sectionVariants}
      className="relative mt-14 overflow-hidden rounded-[2rem] border border-slate-200/38 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(247,247,248,0.92))] p-6 shadow-[0_12px_28px_rgba(15,23,42,0.025)] sm:p-7"
    >
      <div className="relative z-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-slate-500">Private Portal</p>
            <h2 className="mt-3 text-[clamp(1.75rem,3vw,2.45rem)] font-semibold leading-[1.04] tracking-[-0.06em] text-slate-950">
              Courses already attached to your account.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              If you are logged in, this section reflects the live courses already mapped to your private portal.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/student/dashboard" className={softPortalActionClass}>
              Open Student Portal
            </Link>
          </div>
        </div>

        {!ready ? (
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={`course-skeleton-${idx}`} className="animate-pulse rounded-[1.65rem] border border-slate-200/40 bg-white/88 p-5 shadow-[0_10px_20px_rgba(15,23,42,0.03)]">
                <div className="h-4 w-24 rounded-full bg-slate-200" />
                <div className="mt-4 h-7 w-3/4 rounded-2xl bg-slate-200" />
                <div className="mt-4 h-4 w-full rounded-full bg-slate-100" />
                <div className="mt-2 h-4 w-2/3 rounded-full bg-slate-100" />
                <div className="mt-6 h-10 w-32 rounded-full bg-slate-200" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="mt-8 rounded-[1.45rem] border border-slate-200/42 bg-white/84 px-5 py-4 text-sm text-slate-700 shadow-[0_10px_20px_rgba(15,23,42,0.03)]">
            {error}
          </div>
        ) : courses.length === 0 ? (
          <div className="mt-8 rounded-[1.5rem] border border-slate-200/40 bg-white/78 px-5 py-5 text-sm leading-7 text-slate-600">
            No courses are attached to this account yet.
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course, index) => (
              <motion.article
                key={course.id}
                variants={itemVariants}
                whileHover={hoverMotion}
                className="flex h-full min-w-0 flex-col rounded-[1.65rem] border border-slate-200/38 bg-white/92 p-5 shadow-[0_10px_20px_rgba(15,23,42,0.028)]"
              >
                <div className="min-w-0">
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">Assigned Course</p>
                    <h3 className="mt-3 overflow-wrap-anywhere text-[1.15rem] font-semibold leading-[1.08] tracking-[-0.05em] text-slate-950 sm:text-[1.2rem]">
                      {course.title}
                    </h3>
                  </div>
                </div>

                <p className="mt-4 overflow-wrap-anywhere text-sm leading-7 text-slate-600">
                  {course.description ?? "This course is already live in your student workspace and available for guided study."}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="inline-flex rounded-full border border-slate-200/70 bg-white/88 px-3 py-2 text-xs font-medium text-slate-600">
                    Portal ready
                  </span>
                  <span className="inline-flex rounded-full border border-slate-200/70 bg-white/88 px-3 py-2 text-xs font-medium text-slate-600">
                    Attached to your account
                  </span>
                </div>

                <div className="mt-auto flex flex-wrap gap-3 pt-5">
                  <Link href="/student/dashboard" className={softPortalActionClass}>
                    Open Portal
                  </Link>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </motion.section>
  );
}