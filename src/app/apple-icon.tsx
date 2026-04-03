import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #6b6258 0%, #867c71 100%)",
          color: "#ffffff",
          borderRadius: 40,
          fontSize: 88,
          fontWeight: 800,
          letterSpacing: "-0.08em",
        }}
      >
        N
      </div>
    ),
    size
  );
}