import { NextResponse } from 'next/server';

// App Router-compatible route handler. We set a few basic security headers
// manually instead of using Express Helmet (not compatible here).
export function GET() {
  const res = NextResponse.json({ message: 'Secure API route!' });
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Referrer-Policy', 'no-referrer');
  return res;
}

export function POST() {
  const res = NextResponse.json({ message: 'Secure API route (POST)!' });
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  return res;
}
