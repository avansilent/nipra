import Image from "next/image";
import { Space_Grotesk } from "next/font/google";

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

type AboutFounderStoryProps = {
  siteName: string;
};

export default function AboutFounderStory({ siteName }: AboutFounderStoryProps) {
  return (
    <section className="app-page-shell relative bg-white pt-3 sm:pt-4 lg:pt-6" style={{ marginTop: "-5.5rem" }}>
      <div className="mx-auto max-w-6xl px-5 pb-14 pt-8 sm:px-8 sm:pb-16 sm:pt-10 lg:px-12 lg:pb-20 lg:pt-16">
        <div className="grid gap-8 min-[480px]:grid-cols-[1.05fr_0.95fr] min-[480px]:items-start lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-12">
          <div className="min-w-0 space-y-5">
            <span className="block text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-slate-500">About Us</span>

            <h1
              className={`${displayFont.className} max-w-[10ch] text-[clamp(2.2rem,5vw,4.8rem)] font-semibold leading-[0.92] tracking-[-0.08em] text-slate-950`}
              style={{ textWrap: "balance" }}
            >
              Teaching should feel clear, disciplined, and useful.
            </h1>

            <p className="max-w-2xl text-[1rem] leading-8 text-slate-600 sm:text-[1.05rem]" style={{ textWrap: "pretty" }}>
              At {siteName}, our founder built the academy around one simple belief: students learn best when concepts are explained clearly, practice is steady, and guidance is personal, so every class feels calm, focused, and genuinely useful from the first lesson to the final exam.
            </p>

            <span className="block text-[0.74rem] font-semibold uppercase tracking-[0.24em] text-slate-400">Founder, {siteName}</span>
          </div>

          <div className="relative flex justify-center min-[480px]:justify-end lg:justify-center">
            <div className="w-full max-w-[11.5rem] min-[480px]:max-w-[13rem] sm:max-w-[18rem] lg:max-w-[24rem]">
              <Image
                src="/founder.jpg.jpeg"
                alt="Founder of Nipracademy"
                width={516}
                height={635}
                priority
                sizes="(min-width: 1024px) 24rem, (min-width: 640px) 18rem, (min-width: 480px) 13rem, 11.5rem"
                className="h-auto w-full object-contain object-center"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
