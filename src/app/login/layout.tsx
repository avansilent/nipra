import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Student Login | Nipracademy | Mobile OTP",
  description:
    "Login to your Nipracademy student portal with mobile OTP. Access courses, notes, tests, and announcements.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
