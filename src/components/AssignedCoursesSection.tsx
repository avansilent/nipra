"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "./Card";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";

type CourseRow = {
  id: string;
  title: string;
  description: string | null;
};

type EnrollmentSelectRow = { course: CourseRow | CourseRow[] | null };

export default function AssignedCoursesSection() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [ready, setReady] = useState(false);
  const [hasAuthenticatedUser, setHasAuthenticatedUser] = useState(false);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [error, setError] = useState<string | null>(null);

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
    <div className="mt-16">
      <div className="section-head mb-8 text-left">
        <h2 className="section-title">My assigned courses</h2>
        <p className="section-subtitle max-w-none">
          These are the courses already attached to your student account inside the portal.
        </p>
      </div>

      {!ready ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={`course-skeleton-${idx}`}
              className="rounded-2xl bg-white/80 p-4 shadow-sm animate-pulse"
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
        <p className="text-sm text-slate-500">No courses are attached to this account yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
    </div>
  );
}