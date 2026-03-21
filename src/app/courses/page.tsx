"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Card from "../../components/Card";
import { buttonHover, createStaggerContainer, itemReveal, sectionReveal, tapPress, viewportOnce } from "../../lib/motion";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";

const pageHeaderItems = createStaggerContainer(0.12, 0.05);
const coursesGrid = createStaggerContainer(0.12, 0.05);

type CourseRow = {
  id: string;
  title: string;
  description: string | null;
};

type EnrollmentSelectRow = { course: CourseRow | CourseRow[] | null };

export default function Courses() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [ready, setReady] = useState(false);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAssignedCourses = async () => {
      if (!supabase) {
        setError("Supabase is not configured.");
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
        setError(loadError instanceof Error ? loadError.message : "Unable to load courses.");
      } finally {
        setReady(true);
      }
    };

    loadAssignedCourses();
  }, [supabase]);

  return (
    <section className="app-page-shell">
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        variants={sectionReveal}
        className="app-page-header-row"
      >
        <motion.div initial="hidden" whileInView="show" viewport={viewportOnce} variants={pageHeaderItems} className="app-page-header mb-0">
          <motion.h1 variants={itemReveal} className="app-page-title font-poppins">My Courses</motion.h1>
          <motion.p variants={itemReveal} className="app-page-subtitle">You can see only courses assigned to your account.</motion.p>
        </motion.div>
        <motion.div whileHover={buttonHover} whileTap={tapPress} className="inline-flex">
          <Link href="/student/dashboard" className="mobile-page-cta btn px-4 py-2 rounded-xl">Student Dashboard</Link>
        </motion.div>
      </motion.div>

      {!ready ? (
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          variants={coursesGrid}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {Array.from({ length: 4 }).map((_, idx) => (
            <motion.div
              key={`course-skeleton-${idx}`}
              variants={itemReveal}
              className="rounded-2xl bg-white/80 p-4 shadow-sm animate-pulse"
            >
              <div className="h-4 w-3/4 rounded bg-slate-200" />
              <div className="mt-3 h-3 w-full rounded bg-slate-200" />
              <div className="mt-2 h-3 w-2/3 rounded bg-slate-200" />
              <div className="mt-5 h-8 w-24 rounded-full bg-slate-200" />
            </motion.div>
          ))}
        </motion.div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : courses.length === 0 ? (
        <p className="text-sm text-slate-500">No courses yet.</p>
      ) : (
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          variants={coursesGrid}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {courses.map((course) => (
            <Card
              key={course.id}
              title={course.title}
              subtitle={course.description ?? "Assigned course"}
              cta="View Course"
            />
          ))}
        </motion.div>
      )}
    </section>
  );
}
