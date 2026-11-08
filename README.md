# Acrostic-Structural-Adtech
Acrostic Structural Ad Engine. ASAE converts text into sponsored acrostic text: a sponsor message (any words an advertiser types) appears as ONE compact column of bold, coloured first letters down the left edge of consecutive sentences, while every name, number, date, quote and link is proven unchanged.

## View and build locally

1. Open the public repository: https://github.com/Ryan254/Acrostic-Structural-Adtech
2. Select **Code → HTTPS**, copy the clone URL, then clone it with Git.
3. Install Node.js 20+ and pnpm, then run `pnpm install` from the project folder.
4. Copy the project environment variables into `.env.local` using your own values. Required server-side values include `DATABASE_URL`, `BETTER_AUTH_SECRET`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and `PAYPAL_SANDBOX_BUYER_EMAIL`. Never commit `.env.local` or expose secrets in client code.
5. Start the development server with `pnpm dev`, then open `http://localhost:3000`.
6. Create an account or sign in to test Publisher, AI Surfaces, Campaigns, Receipts, PayPal Sandbox checkout, and the AYE dashboard.

## Main tools

- Next.js App Router, React, TypeScript, and Tailwind CSS
- Neon Postgres with Drizzle ORM and Better Auth
- PayPal Sandbox Checkout and Payouts APIs
- SWR for client data refresh and settlement status
- GitHub for source control and Vercel for deployment

## Production build

Run `pnpm build` to verify the production build, then deploy the repository through Vercel. Add the same environment variables to the Vercel project’s Production environment before deploying. PayPal Sandbox credentials are server-only and must not be placed in `NEXT_PUBLIC_*` variables.
