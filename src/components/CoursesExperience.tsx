"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import AssignedCoursesSection from "./AssignedCoursesSection";
import { academyCatalog, academyLocation, academySession } from "../data/academyCatalog";
import { useAdaptiveMotion } from "../hooks/useAdaptiveMotion";
import {
  balancedItemReveal,
  balancedSectionReveal,
  createStaggerContainer,
  hoverLift,
  itemReveal,
  sectionReveal,
  tapPress,
  viewportOnce,
} from "../lib/motion";

type CoursesExperienceProps = {
  contactPhone: string;
  admissionOpenCourseIds?: string[];
};

function compactCopy(value: string, limit = 100) {
  if (value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit).trimEnd()}...`;
}

export default function CoursesExperience({ contactPhone, admissionOpenCourseIds = [] }: CoursesExperienceProps) {
  const { allowHoverMotion, allowRichMotion } = useAdaptiveMotion();

  const sectionVariants = allowRichMotion ? sectionReveal : balancedSectionReveal;
  const itemVariants = allowRichMotion ? itemReveal : balancedItemReveal;
  const gridVariants = createStaggerContainer(allowRichMotion ? 0.1 : 0.075, 0.02);
  const hoverMotion = allowHoverMotion ? hoverLift : undefined;
  const tapMotion = allowHoverMotion ? tapPress : undefined;
  const phoneLabel = contactPhone.trim() || "Counselor line available";
  const admissionReadyCourseIds = new Set(admissionOpenCourseIds);

  return (
    <section className="app-page-shell courses-page-shell">
      <div className="mx-auto max-w-6xl space-y-8 lg:space-y-10">
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          variants={sectionVariants}
          className="courses-hero-panel rounded-[2rem] p-6 sm:p-8"
        >
          <motion.div variants={itemVariants} className="max-w-5xl min-w-0 space-y-6">
            <p className="inline-flex items-center rounded-full border border-slate-200/70 bg-white px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-slate-600">
              {academySession} • {academyLocation}
            </p>

            <h1 className="course-hero-title max-w-[11ch] text-[clamp(2.35rem,5vw,3.85rem)] font-semibold leading-[0.95] tracking-[-0.075em] text-slate-950">
              Choose a course and start the application.
            </h1>

            <p className="course-body max-w-3xl text-[0.96rem] leading-7 text-slate-600 sm:text-[1rem]">
              Each course box opens a cleaner course page with that course already connected to its own application and payment flow.
            </p>

            <div className="course-hero-meta-grid">
              <div className="course-hero-meta-item">
                <span>Flow</span>
                <strong>Course -&gt; form -&gt; payment</strong>
              </div>
              <div className="course-hero-meta-item">
                <span>Application</span>
                <strong>Direct and course-specific</strong>
              </div>
              <div className="course-hero-meta-item">
                <span>Help line</span>
                <strong>{phoneLabel}</strong>
              </div>
            </div>
          </motion.div>
        </motion.section>

        <motion.section
          id="catalog"
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          variants={sectionVariants}
          className="space-y-5"
        >
          <motion.div variants={itemVariants} className="max-w-3xl min-w-0">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-slate-500">Course Catalog</p>
            <h2 className="course-section-title mt-3 text-[clamp(1.8rem,3vw,2.45rem)] font-semibold leading-[1.04] tracking-[-0.06em] text-slate-950">
              Open the course you want to join.
            </h2>
            <p className="course-body mt-3 text-sm leading-7 text-slate-600 sm:text-base">
              The full card is clickable and takes the student straight into that course application and payment section.
            </p>
          </motion.div>

          <motion.div variants={gridVariants} className="courses-catalog-grid">
            {academyCatalog.map((course) => (
              <motion.div
                key={course.id}
                variants={itemVariants}
                whileHover={hoverMotion}
                whileTap={tapMotion}
                tabIndex={-1}
                className="courses-catalog-card group flex h-full min-w-0 flex-col rounded-[1.85rem] p-5"
              >
                <Link href={`/courses/${course.id}#admission`} className="flex h-full min-w-0 flex-col">
                  <div className="relative aspect-[16/10] overflow-hidden rounded-[1.4rem] bg-slate-100/70">
                    <Image
                      src={course.imageSrc}
                      alt={course.imageAlt}
                      fill
                      sizes="(min-width: 1400px) 17rem, (min-width: 1024px) 24vw, (min-width: 640px) 42vw, 100vw"
                      className="object-cover transition duration-500 ease-out group-hover:scale-[1.03]"
                    />
                  </div>

                  <div className="min-w-0 px-0.5">
                    <p className="course-meta-label mt-4 text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {course.subtitle}
                    </p>

                    <h3 className="course-card-title mt-2.5 text-[1.08rem] font-semibold leading-[1.1] tracking-[-0.045em] text-slate-950">
                      {course.title}
                    </h3>

                    <p className="course-card-copy mt-2.5 text-[0.92rem] leading-6 text-slate-600">{compactCopy(course.summary, 112)}</p>
                  </div>

                  <div className="course-card-stat-grid">
                    <div className="course-card-stat">
                      <span>Admission</span>
                      <strong>{course.admissionFee}</strong>
                    </div>
                    <div className="course-card-stat">
                      <span>Monthly</span>
                      <strong>{course.monthlyFee}</strong>
                    </div>
                  </div>

                  <div className="mt-auto flex flex-col items-start gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <p className="course-inline-note min-w-0 overflow-wrap-anywhere text-sm leading-6 text-slate-500">
                      {admissionReadyCourseIds.has(course.id) ? "Application and payment ready" : "Open course application"}
                    </p>
                    <span className="course-card-action shrink-0 text-[0.84rem] font-semibold">
                      Open form
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        <AssignedCoursesSection />
      </div>
    </section>
  );
}