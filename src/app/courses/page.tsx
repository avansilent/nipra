import Image from "next/image";
import Link from "next/link";
import AssignedCoursesSection from "../../components/AssignedCoursesSection";
import {
  academyAdmissionNote,
  academyCatalog,
  academyLocation,
  academyMission,
  academyOffers,
  academySession,
} from "../../data/academyCatalog";

export default function Courses() {
  return (
    <section className="app-page-shell">
      <div className="app-page-header-row">
        <div className="app-page-header mb-0">
          <p className="academy-section-kicker">{academySession} | {academyLocation}</p>
          <h1 className="app-page-title font-poppins">Courses and fee structure</h1>
          <p className="app-page-subtitle">
            {academyMission} Explore every class range, subject group, monthly fee band, and admission fee in one place.
          </p>
        </div>

        <div className="inline-flex">
          <Link href="/join" className="mobile-page-cta btn px-4 py-2 rounded-xl">Start Admission</Link>
        </div>
      </div>

      <div className="academy-note-banner mt-10">
        <div>
          <p className="academy-note-title">Admission fee first</p>
          <p className="academy-note-copy">{academyAdmissionNote}</p>
        </div>
        <Link href="/join" className="btn academy-note-cta rounded-full px-6 py-3 text-sm font-semibold">
          Open Join Form
        </Link>
      </div>

      <div
        id="catalog"
        className="academy-course-grid mt-10"
      >
        {academyCatalog.map((course, index) => (
          <article key={course.id} className="academy-course-card">
            <div className="academy-course-media">
              <Image
                src={course.imageSrc}
                alt={course.imageAlt}
                fill
                sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw"
                priority={index < 2}
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
          </article>
        ))}
      </div>

      <div className="academy-offer-grid mt-10">
        {academyOffers.map((offer) => (
          <article key={offer.id} className="academy-offer-card">
            <p className="academy-offer-kicker">Special offer</p>
            <h2 className="academy-offer-title">{offer.title}</h2>
            <p className="academy-offer-copy">{offer.description}</p>
          </article>
        ))}
      </div>

      <AssignedCoursesSection />
    </section>
  );
}
