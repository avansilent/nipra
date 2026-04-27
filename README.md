This is a Next.js 16 app for Nipra Academy with public course admissions, Supabase-backed institute data, and Razorpay-based admission payments.

## Getting Started

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

The app uses the App Router under `src/app`.

## Razorpay Admission Setup

The public admission flow creates a Razorpay order, stores the draft in `admission_payments`, opens hosted checkout, verifies the payment on the server, and only then issues student credentials.

### 1. Apply the latest Supabase schema

The payment ledger table and policies live in [supabase/schema.sql](supabase/schema.sql).

### 2. Add environment variables

Use [`.env.example`](.env.example) as the template for local setup.

Required for Razorpay admissions:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `ADMISSION_SIGNING_SECRET`

### 3. Configure Razorpay webhook

Set the webhook URL to:

- `https://your-domain.com/api/auth/payments/razorpay/webhook`

Subscribe at minimum to:

- `payment.captured`
- `order.paid`
- `payment.failed`

For local webhook testing, expose `http://localhost:3000` through a tunnel such as ngrok or Cloudflare Tunnel and point Razorpay to the tunneled HTTPS URL.

### 4. Run a test payment

Start the app with `npm run dev`, open `/courses`, select a course, complete the admission form, and pay in Razorpay test mode. If checkout succeeds but the tab refreshes or the browser closes, the admission page now restores the pending order automatically and resumes credential issuance from the stored payment state.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Vercel Deployment

Deploy this project on Vercel with standard Next.js settings:

- Build command: `npm run build`
- Output directory: leave default (managed by Next.js/Vercel)

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

If you use server-side file upload/download routes backed by Supabase Storage with elevated access checks, add:

- `SUPABASE_SERVICE_ROLE_KEY`

## API Routes

This directory contains example API routes for the headless API app.

For more details, see [route.js file convention](https://nextjs.org/docs/app/api-reference/file-conventions/route).
