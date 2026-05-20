import { NextResponse } from "next/server";

function redirectToGeneratedIcon(request: Request) {
  return NextResponse.redirect(new URL("/icon", request.url), 308);
}

export const GET = redirectToGeneratedIcon;
export const HEAD = redirectToGeneratedIcon;
