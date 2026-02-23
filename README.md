This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/create-next-app).

## Getting Started

First, run the development server:

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

You can start editing the page by modifying `app/route.ts`. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Deploy on Cloudflare Pages (OpenNext)

Use these exact settings in Cloudflare Pages project build configuration:

- Build command: `npm run pages:build`
- Build output directory: `.open-next`
- Deploy command: `npm run pages:deploy` (or `npx wrangler pages deploy .open-next --project-name nipra`)
- Wrangler config: `wrangler.toml` (already included in repo)

If Cloudflare runs `npx wrangler deploy`, deployment fails with:

`It looks like you've run a Workers-specific command in a Pages project.`

Reason: `wrangler deploy` is for Workers projects, while this repository is configured as a Pages project (`pages_build_output_dir` is set in `wrangler.toml`).

This project generates `.open-next/_worker.js`, flattens `.open-next/assets` into `.open-next`, and writes `.open-next/_routes.json` during `pages:build` so Cloudflare serves `/_next/static/*` directly. If output is set to `.open-next/assets`, assets are not flattened, or `_routes.json` is missing, the app can render a blank page with many 404 chunk/css errors.

## API Routes

This directory contains example API routes for the headless API app.

For more details, see [route.js file convention](https://nextjs.org/docs/app/api-reference/file-conventions/route).
