import Link from "next/link";
import { fetchSiteSettings } from "../../lib/siteSettings";

const offers = [
  {
    title: "Academic Excellence",
    description:
      "We provide coaching for school students with a strong focus on concept clarity in Science, Mathematics, and English for CBSE and Bihar Board learners.",
  },
  {
    title: "Experienced Guidance",
    description:
      "Our teachers simplify complex topics and make sure every student understands the fundamentals clearly and confidently.",
  },
  {
    title: "Regular Tests and Practice",
    description:
      "Regular tests, assignments, and doubt-solving sessions help track progress and improve performance consistently.",
  },
  {
    title: "Online and Offline Classes",
    description:
      "Flexible learning options allow students to study in classrooms as well as through digital platforms with the same continuity.",
  },
  {
    title: "Skill Development",
    description:
      "Beyond academics, we emphasize communication skills, confidence building, and overall personality development.",
  },
];

const reasons = [
  "Student-centered teaching approach",
  "Personalized attention for every learner",
  "Focus on concept clarity rather than rote learning",
  "Consistent performance improvement tracking",
  "Positive and motivating study environment",
];

const courses = [
  "Pre-Primary (Nursery to UKG)",
  "Primary (Class 1 to 5)",
  "Middle School (Class 6 to 8)",
  "Secondary Board Preparation (Class 9 and 10)",
  "Senior Secondary Science, Commerce, and Arts streams (Class 11 and 12)",
];

export default async function AboutPage() {
  const siteSettings = await fetchSiteSettings();

  return (
    <section className="app-page-shell">
      <div className="about-shell">
        <div className="about-hero">
          <span className="about-kicker">About Us</span>
          <h1 className="about-title">Nipracademy is a dedicated coaching institute built to shape strong concepts, disciplined learning, and confident students.</h1>
          <p className="about-copy">
            Nipracademy is a dedicated coaching institute based in Deo, Aurangabad, Bihar, committed to providing quality education and shaping the future of students. We believe that strong concepts, disciplined learning, and the right guidance are the key pillars of success in academics and in life.
          </p>
          <p className="about-copy about-copy-muted">
            Our mission is to create a learning environment where students not only study, but also understand, apply, and grow with confidence.
          </p>
        </div>

        <div className="about-pillars">
          <div className="about-pillar-card">
            <p className="about-card-kicker">Our Mission</p>
            <p className="about-card-copy">
              To create a learning environment where students understand deeply, apply their learning effectively, and grow with discipline and confidence.
            </p>
          </div>
          <div className="about-pillar-card">
            <p className="about-card-kicker">Our Vision</p>
            <p className="about-card-copy">
              To become a trusted and result-oriented educational institute that empowers students with knowledge, skills, and confidence to achieve their academic and career goals.
            </p>
          </div>
        </div>

        <div className="about-section-head">
          <h2 className="about-section-title">What We Offer</h2>
          <p className="about-section-copy">A well-guided academic ecosystem designed for concept clarity, regular practice, and complete student growth.</p>
        </div>

        <div className="about-offer-grid">
          {offers.map((offer) => (
            <article key={offer.title} className="about-offer-card">
              <h3 className="about-offer-title">{offer.title}</h3>
              <p className="about-offer-copy">{offer.description}</p>
            </article>
          ))}
        </div>

        <div className="about-detail-grid">
          <div className="about-detail-card">
            <p className="about-card-kicker">Why Choose Nipracademy</p>
            <ul className="about-list">
              {reasons.map((reason) => (
                <li key={reason} className="about-list-item">{reason}</li>
              ))}
            </ul>
          </div>

          <div className="about-detail-card">
            <p className="about-card-kicker">Our Courses</p>
            <ul className="about-list">
              {courses.map((course) => (
                <li key={course} className="about-list-item">{course}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="about-commitment-card">
          <p className="about-card-kicker">Our Commitment</p>
          <p className="about-card-copy">
            At Nipracademy, we are committed to guiding students at every step of their academic journey. We aim to build not just good students, but confident individuals ready to face future challenges.
          </p>
          <p className="about-card-copy about-copy-muted">
            If you are looking for the right guidance, disciplined learning, and a supportive environment, {siteSettings.siteName} is the perfect place to start your journey toward success.
          </p>
        </div>

        <div className="about-commitment-card">
          <p className="about-card-kicker">Join Us</p>
          <p className="about-card-copy">
            Start with the support, structure, and mentorship needed for meaningful academic progress. Learn in an environment designed to make students clear, consistent, and confident.
          </p>
          <p className="about-card-copy about-copy-muted">
            Admission begins with the one-time admission fee only. After payment, the team guides families through the batch details, monthly fee plan, and final confirmation.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/join" className="btn rounded-full px-6 py-3 text-sm">Start Admission</Link>
            <Link href="/#contact" className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-800 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">Talk to Counselors</Link>
          </div>
        </div>
      </div>
    </section>
  );
}