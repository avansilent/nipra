"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Card from "../../components/Card";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";

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

        const { data: enrollmentRows, error: enrollmentError } = await supabase
          .from("enrollments")
          .select("course:course_id (id, title, description)")
          .eq("student_id", user.id);

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
    <section className="w-full max-w-6xl mx-auto py-20 px-6 md:px-0">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold font-poppins">My Courses</h1>
          <p className="text-sm md:text-base text-[#64748b]">You can see only courses assigned to your account.</p>
        </div>
        <Link href="/student/dashboard" className="btn px-4 py-2 rounded-xl">Student Dashboard</Link>
      </div>

      {!ready ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={`course-skeleton-${idx}`}
              className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm animate-pulse"
            >
              <div className="h-4 w-3/4 rounded bg-slate-200" />
              <div className="mt-3 h-3 w-full rounded bg-slate-200" />
              <div className="mt-2 h-3 w-2/3 rounded bg-slate-200" />
              <div className="mt-5 h-8 w-24 rounded-full bg-slate-200" />
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : courses.length === 0 ? (
        <p className="text-sm text-slate-500">No courses yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {courses.map((course) => (
            <Card
              key={course.id}
              title={course.title}
              subtitle={course.description ?? "Assigned course"}
              cta="View Course"
            />
          ))}
        </div>
      )}
    </section>
  );
}
