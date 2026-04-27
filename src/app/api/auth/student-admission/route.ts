import { NextResponse } from "next/server";

export async function POST(request: Request) {
  void request;
  return NextResponse.json(
    {
      error:
        "The manual admission endpoint has been disabled. Use the secure Razorpay admission flow instead.",
    },
    { status: 410 }
  );
}