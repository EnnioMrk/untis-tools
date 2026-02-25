> Build a full-stack Next.js 15 (App Router) web application called **"UntisStats"** using **Bun** (as the runtime and package manager), TypeScript, Tailwind CSS, Shadcn UI, PostgreSQL, and Prisma ORM. The app connects to the WebUntis school API and displays a customizable analytics dashboard.
>
> ---
>
> **Environment Variables & Database Setup**
> A `.env` file is already present and contains the variable `POSTGRES_URL`. Do not generate a new `.env` file. Ensure that the `schema.prisma` file specifically uses `url = env("POSTGRES_URL")` in its `datasource db` block instead of the default `DATABASE_URL`.
>
> ---
>
> **Authentication**
> Use Auth.js (v5) for session-based authentication. Users can sign up and log in with email/password. Protect all dashboard routes with middleware. Store users in PostgreSQL via Prisma.
>
> ---
>
> **Untis Connection (QR Code Onboarding)**
> After login, if no Untis account is linked, show an onboarding screen where the user can upload an image of their WebUntis QR code or paste the raw `untis://setschool?url=...&school=...&user=...&key=...` URI string. On the server (Next.js Server Action), use the `webuntis` package with the `WebUntisQR` class and `otplib` to test the connection, then extract and store the `serverUrl`, `school`, `username`, and `secret` fields in an `UntisConnection` Prisma model linked to the user. Encrypt the `secret` field at rest using `node:crypto` (supported by Bun). Never store the raw QR image.
>
> ---
>
> **Background Sync Worker (Bun)**
> A separate **Bun** worker process (run in its own Docker container using the `oven/bun` image, sharing the same Prisma DB) that runs on a cron schedule. For each user with an active `UntisConnection`, it: logs into Untis using `WebUntisSecretAuth` + `otplib`, fetches timetable and absence data for the past 30 days, calculates all statistics (7/14/30-day absence counts, per-subject breakdowns of attended/absent/cancelled, absence percentage per subject, 30-day daily trend rates), and saves the results to a `UserStats` Prisma model as precomputed JSON fields. The dashboard reads exclusively from `UserStats`, never live from Untis.
>
> ---
>
> **Dashboard: Interactive Grid & Edit Mode**
> The main dashboard utilizes `react-grid-layout` for a customizable grid. It features a toggleable **"Edit Mode"**. 
> - **View Mode (Default):** The grid is locked (`isDraggable={false}`, `isResizable={false}`). Widgets cleanly display their data.
> - **Edit Mode:** When activated via an "Edit Dashboard" button, the grid unlocks. Users can drag to rearrange or resize widgets (spanning 1 or 2 columns). 
> - **Removing Widgets:** In Edit Mode, a visible "X" or trash icon appears in the top-right corner of every widget's Shadcn `CardHeader`, allowing the user to remove it from the grid.
> - **Adding Widgets (Widget Library):** In Edit Mode, an "Add Widget" button opens a Widget Library (using a Shadcn UI `Sheet` or `Dialog`). This library lists all available widget types. Clicking one adds it to the bottom of the grid.
> - **Saving:** A "Save Layout" button exits Edit Mode and fires a Next.js Server Action to persist the new widget list and their `react-grid-layout` coordinates (JSON) to the user's `Widget` Prisma model.
>
> The following widget types must be implemented, all using **Recharts** wrapped in `<ResponsiveContainer>`:
> 1. **KPI Cards (×4):** Display "Last 7 Days", "Last 14 Days", "Last 30 Days", "All Time" absence counts with percentage trend changes (e.g., "↑ 100% increase").
> 2. **Absence Bar Chart:** A standard vertical `BarChart` showing total absences per subject for a given time range.
> 3. **Absence Trend Line Chart:** A `LineChart` showing the daily absence rate (%) over the last 30 days.
> 4. **Subject Breakdown Stacked Bar Chart:** A horizontal stacked `BarChart` (`layout="vertical"`) showing `attended`, `absences`, and `cancelled` lessons stacked side-by-side. Colors: red (absences), indigo (attended), gray (cancelled).
> 5. **Absence Recommender Widget:** A list of cards per subject calculating `absenceRate = absences / totalLessons`. Uses color-coded severity labels with hardcoded Tailwind classes (e.g., red for ≥25%, green for <12%).
>
> ---
>
> **Premium Plan & Payments (Paddle Billing)**
> Integrate Paddle Billing as the Merchant of Record. The User Prisma model has a `plan` field (enum: `FREE` | `PREMIUM`), `paddleCustomerId`, and `paddleSubscriptionId`. Free users are limited to 5 widgets; Premium users get unlimited widgets and access to additional themes.
>
> - **Checkout:** A "Go Premium" button calls a Next.js Server Action that opens the Paddle Checkout overlay using `@paddle/paddle-js`. Pass the user's DB `id` as `customData`.
> - **Webhook:** A Next.js API Route at `app/api/webhooks/paddle/route.ts` uses `@paddle/paddle-node` to verify the Paddle signature. Upgrade to `PREMIUM` on `subscription.activated`; downgrade to `FREE` on `subscription.canceled`.
> - **Server-Side Enforcement:** The "Save Layout" Server Action must read the user's `plan` from PostgreSQL *before* saving. If a FREE user tries to save >5 widgets, throw an error. Premium widget types from the library are locked for FREE users.
>
> ---
>
> **Tech Stack & Deployment Summary**
> - **Runtime & Package Manager:** Bun (`bun install`, `bun run`, `bunx prisma generate`)
> - Framework: Next.js 15 (App Router), TypeScript
> - Styling: Tailwind CSS + Shadcn UI
> - Charts: Recharts with `<ResponsiveContainer>`
> - Grid: `react-grid-layout`
> - Auth: Auth.js v5
> - ORM: Prisma + PostgreSQL (using `POSTGRES_URL`)
> - Cache: React `cache()` for server-component data fetching
> - Untis: `webuntis` package + `otplib`
> - Payments: Paddle Billing (`@paddle/paddle-js` + `@paddle/paddle-node`)
> - **Docker Deployment:** Provide a `docker-compose.yml` and a `Dockerfile` using `oven/bun:latest` as the base image for the `web` service and the standalone `worker` service, passing the `POSTGRES_URL`. Provide a `redis` service as well.
>
> ---
>
> Start by generating the full Prisma schema (making sure to use `env("POSTGRES_URL")`), then the folder structure, then the Dockerfile/docker-compose for Bun, and finally implement in this order: Auth → Untis onboarding → Background worker → Dashboard (Grid + Edit Mode + Widget Library) → Paddle integration.