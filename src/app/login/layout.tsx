import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | Nipracademy",
  description: "Login to Nipracademy with mobile OTP, Google, or student credentials.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
