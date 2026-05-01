/* eslint-disable @next/next/no-img-element */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

const logoMarkPath = join(process.cwd(), "public", "logo 3.jpeg");
const logoMarkDataUrl = `data:image/jpeg;base64,${readFileSync(logoMarkPath).toString("base64")}`;

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          borderRadius: 96,
        }}
      >
        <img src={logoMarkDataUrl} alt="Nipracademy" width={380} height={380} style={{ objectFit: "contain" }} />
      </div>
    ),
    size
  );
}