import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import JoinAdmissionFlow from "../../../components/JoinAdmissionFlow";
import { academyAdmissionNote, academyCatalog, academyLocation, academySession } from "../../../data/academyCatalog";
import { findAdmissionCourseForCatalogCourse, getCatalogCourseById } from "../../../lib/courseCatalog";
import { fetchPublishedCourses } from "../../../lib/publicCourses";
import { fetchSiteSettings } from "../../../lib/siteSettings";

type CourseDetailPageProps = {
  params: Promise<{
    courseId: string;
  }>;
};

export function generateStaticParams() {
  return academyCatalog.map((course) => ({ courseId: course.id }));
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { courseId } = await params;
  const catalogCourse = getCatalogCourseById(courseId);

  if (!catalogCourse) {
    notFound();
  }

  const [siteSettings, publishedCourses] = await Promise.all([fetchSiteSettings(), fetchPublishedCourses()]);
  const admissionCourse = findAdmissionCourseForCatalogCourse(catalogCourse.id, publishedCourses);

  return (
    <section className="app-page-shell course-detail-shell">
      <div className="mx-auto max-w-5xl space-y-7 lg:space-y-8">
        <section className="course-detail-panel rounded-[2.2rem] p-6 sm:p-8">
          <Link
            href="/courses"
            className="inline-flex items-center rounded-full border border-slate-200/70 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:text-slate-950"
          >
            Back to all courses
          </Link>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.02fr)_minmax(16rem,0.98fr)] lg:items-start">
            <div className="min-w-0">
              <p className="inline-flex items-center rounded-full bg-white/94 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-slate-600 shadow-[0_10px_18px_rgba(15,23,42,0.03)]">
                {academySession} • {academyLocation}
              </p>

              <h1 className="course-detail-title overflow-wrap-anywhere mt-5 max-w-[14ch] text-[clamp(2.25rem,4.6vw,3.7rem)] font-semibold leading-[0.95] tracking-[-0.075em] text-slate-950">
                {catalogCourse.title}
              </h1>

              <p className="overflow-wrap-anywhere mt-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                {catalogCourse.subtitle}
              </p>

              <p className="course-body overflow-wrap-anywhere mt-5 max-w-3xl text-[0.96rem] leading-7 text-slate-600 sm:text-[1rem]">
                {catalogCourse.summary}
              </p>

              <div className="course-detail-stat-grid mt-6">
                <div className="course-detail-stat">
                  <span>Admission fee</span>
                  <strong>{catalogCourse.admissionFee}</strong>
                </div>
                <div className="course-detail-stat">
                  <span>Monthly fee</span>
                  <strong>{catalogCourse.monthlyFee}</strong>
                </div>
                <div className="course-detail-stat">
                  <span>Payment</span>
                  <strong>{admissionCourse ? "Razorpay ready" : "Application ready"}</strong>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="#admission"
                  className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-4 py-2.5 text-[0.92rem] font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-[0_16px_30px_rgba(15,23,42,0.16)] sm:w-auto sm:px-5 sm:py-3 sm:text-sm"
                >
                  Go to application
                </Link>
                <p className="course-inline-note max-w-xl overflow-wrap-anywhere text-sm leading-7 text-slate-500">
                  {admissionCourse
                    ? "This course already opens with a direct payment flow for the selected program."
                    : "The application below keeps the first step short and simple before payment."}
                </p>
              </div>
            </div>

            <div className="course-detail-info-card overflow-hidden rounded-[2rem] p-4 sm:p-5">
              <div className="relative aspect-[16/11] overflow-hidden rounded-[1.45rem] bg-slate-100/70">
                <Image
                  src={catalogCourse.imageSrc}
                  alt={catalogCourse.imageAlt}
                  fill
                  sizes="(min-width: 1024px) 32rem, 100vw"
                  className="object-cover"
                />
              </div>

              <div className="mt-5 space-y-3">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Inside this course</p>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {catalogCourse.subjects.slice(0, 4).map((subject) => (
                    <p key={subject} className="overflow-wrap-anywhere text-sm leading-6 text-slate-600">
                      {subject}
                    </p>
                  ))}
                </div>
              </div>
              <p className="mt-5 rounded-[1.3rem] bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600 overflow-wrap-anywhere">
                {admissionCourse
                  ? "This course is ready for direct secure admission. Open the application below, fill the essential details, and pay through Razorpay. Student access is created only after verification."
                  : academyAdmissionNote}
              </p>
            </div>
          </div>
        </section>

        <section id="admission" className="course-application-shell space-y-4 scroll-mt-28">
          <div className="course-application-intro max-w-4xl min-w-0 rounded-[2rem]">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-slate-500">Admission And Payment</p>
            <h2 className="mt-3 text-[clamp(1.8rem,3vw,2.45rem)] font-semibold leading-[1.04] tracking-[-0.06em] text-slate-950">
              Complete admission for this course.
            </h2>
            <p className="course-body overflow-wrap-anywhere mt-3 text-sm leading-7 text-slate-600 sm:text-base">
              Only the main details are required to start. The form below is already focused on this course, then payment opens in secure Razorpay checkout.
            </p>
          </div>

          <JoinAdmissionFlow
            courses={publishedCourses}
            siteSettings={siteSettings}
            interest={catalogCourse.title}
            initialCourseId={admissionCourse?.id}
            lockCourseSelection={Boolean(admissionCourse)}
            embedded
          />
        </section>
      </div>
    </section>
  );
}