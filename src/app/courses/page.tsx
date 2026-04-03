"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Card from "../../components/Card";
import {
  academyAdmissionNote,
  academyCatalog,
  academyLocation,
  academyMission,
  academyOffers,
  academySession,
} from "../../data/academyCatalog";
import { buttonHover, createStaggerContainer, hoverLift, itemReveal, sectionReveal, tapPress, viewportOnce } from "../../lib/motion";
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
          <motion.p variants={itemReveal} className="academy-section-kicker">{academySession} | {academyLocation}</motion.p>
          <motion.h1 variants={itemReveal} className="app-page-title font-poppins">Courses and fee structure</motion.h1>
          <motion.p variants={itemReveal} className="app-page-subtitle">
            {academyMission} Explore every class range, subject group, monthly fee band, and admission fee in one place.
          </motion.p>
        </motion.div>

        <motion.div whileHover={buttonHover} whileTap={tapPress} className="inline-flex">
          <Link href="/join" className="mobile-page-cta btn px-4 py-2 rounded-xl">Start Admission</Link>
        </motion.div>
      </motion.div>

      <motion.div initial="hidden" whileInView="show" viewport={viewportOnce} variants={sectionReveal} className="academy-note-banner mt-10">
        <div>
          <p className="academy-note-title">Admission fee first</p>
          <p className="academy-note-copy">{academyAdmissionNote}</p>
        </div>
        <Link href="/join" className="btn academy-note-cta rounded-full px-6 py-3 text-sm font-semibold">
          Open Join Form
        </Link>
      </motion.div>

      <motion.div
        id="catalog"
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        variants={coursesGrid}
        className="academy-course-grid mt-10"
      >
        {academyCatalog.map((course) => (
          <motion.article key={course.id} variants={itemReveal} whileHover={hoverLift} className="academy-course-card">
            <div className="academy-course-media">
              <Image
                src={course.imageSrc}
                alt={course.imageAlt}
                fill
                sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw"
                className="academy-course-image"
              />
            </div>

            <div className="academy-course-body">
              <div className="academy-course-topline">
                <p className="academy-course-eyebrow">{course.subtitle}</p>
                <div className="academy-course-fee-stack">
                  <span className="academy-fee-pill">Admission {course.admissionFee}</span>
                  <span className="academy-fee-pill academy-fee-pill-soft">{course.monthlyFee}</span>
                </div>
              </div>

              <h2 className="academy-course-title">{course.title}</h2>
              <p className="academy-course-copy">{course.summary}</p>

              <div className="academy-course-detail-block">
                <p className="academy-course-label">Subjects</p>
                <div className="academy-chip-row">
                  {course.subjects.map((subject) => (
                    <span key={subject} className="academy-chip">{subject}</span>
                  ))}
                </div>
              </div>

              <div className="academy-course-detail-block">
                <p className="academy-course-label">Focus</p>
                <ul className="academy-focus-list">
                  {course.focus.map((item) => (
                    <li key={item} className="academy-focus-item">{item}</li>
                  ))}
                </ul>
              </div>

              <Link href={`/join?interest=${encodeURIComponent(course.title)}`} className="btn academy-course-cta rounded-full px-5 py-3 text-sm font-semibold">
                {course.ctaLabel}
              </Link>
            </div>
          </motion.article>
        ))}
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        variants={coursesGrid}
        className="academy-offer-grid mt-10"
      >
        {academyOffers.map((offer) => (
          <motion.article key={offer.id} variants={itemReveal} whileHover={hoverLift} className="academy-offer-card">
            <p className="academy-offer-kicker">Special offer</p>
            <h2 className="academy-offer-title">{offer.title}</h2>
            <p className="academy-offer-copy">{offer.description}</p>
          </motion.article>
        ))}
      </motion.div>

      {hasAuthenticatedUser ? (
        <div className="mt-16">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            variants={sectionReveal}
            className="section-head mb-8 text-left"
          >
            <h2 className="section-title">My assigned courses</h2>
            <p className="section-subtitle max-w-none">
              These are the courses already attached to your student account inside the portal.
            </p>
          </motion.div>

          {!ready ? (
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={viewportOnce}
              variants={coursesGrid}
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
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
            <p className="text-sm text-slate-500">No courses are attached to this account yet.</p>
          ) : (
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={viewportOnce}
              variants={coursesGrid}
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
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
        </div>
      ) : null}
    </section>
  );
}
