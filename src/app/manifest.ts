import type { MetadataRoute } from "next";
import { DEFAULT_LOGO_SRC } from "../lib/branding";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nipracademy",
    short_name: "Nipracademy",
    description: "Quality education that creates real change in a student's life.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0f172a",
    icons: [
      {
        src: DEFAULT_LOGO_SRC,
        sizes: "512x512",
        type: "image/jpeg",
      },
      {
        src: DEFAULT_LOGO_SRC,
        sizes: "192x192",
        type: "image/jpeg",
      },
    ],
  };
}