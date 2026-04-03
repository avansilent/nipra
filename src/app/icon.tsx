import { ImageResponse } from "next/og";

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
          background: "linear-gradient(180deg, #6b6258 0%, #867c71 100%)",
          color: "#ffffff",
          borderRadius: 96,
          fontSize: 240,
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