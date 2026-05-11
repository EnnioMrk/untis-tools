### 🚀 Unified Entitlement Ledger & Auto-Renewal System

**Objective:** 
Remove all "Access Flag" logic (`trialEndsAt`, `accessEndsAt`, `referralBonusMonths`) and replace it with a **Chronological Access Ledger**. The system must automatically "stack" access, handle Paddle billing continuously, and provide 100% transparency of access sources.

---

### 1. Data Layer (The Ledger)
Add the following to schema.prisma and remove old access columns only *after* migration:

```prisma
enum GrantType { SUBSCRIPTION, TRIAL, REFERRAL, COUPON, ADMIN }
enum GrantStatus { PENDING, ACTIVE, EXPIRED }

model AccessGrant {
  id              String      @id @default(cuid())
  userId          String
  plan            Plan        @default(PREMIUM) // Target plan of this grant
  type            GrantType
  status          GrantStatus @default(PENDING)
  months          Int         @default(1)
  
  // Linkages
  paddleId        String?     @unique // For Subscription/Transaction IDs
  sourceUserId    String?     // For Referrals (who triggered this)
  
  // Timeline
  activatedAt     DateTime?
  expiresAt       DateTime?   
  createdAt       DateTime    @default(now())
  
  user            User        @relation(fields: [userId], references: [id])
  @@index([userId, status])
}
```

---

### 2. The Logic Engine (`lib/access-engine.ts`)
Create a central engine that handles the calculation of the "Effective Access":

- **Feature Stacking:** If a user has a `SUBSCRIPTION` (Priority 1) and a `REFERRAL` (Priority 2), the Subscription is active first. The Referral grant stays `PENDING`.
- **The "Timeline Resolver":**
    1. Fetch all `ACTIVE` and `PENDING` grants for a user.
    2. Sort by Priority (Sub > Trial > Bonus) then by `createdAt`.
    3. Calculate the `effectiveExpiry`: 
       - Start with `now`.
       - For each `ACTIVE` grant: Add `expiresAt - now` to the timeline.
       - For each `PENDING` grant: If the user is currently "expired" or their access ends soon, automatically transition this grant to `ACTIVE` and set `expiresAt = tailOfTimeline + months`.
- **Access State Object:** Return `{ hasAccess: boolean, plan: Plan, expiresAt: Date | null, sourceGrants: AccessGrant[] }`.

---

### 3. Automatic Lifecycle Management
- **JIT Activation:** Implement a "Refresh Grants" function called in a high-level server component (e.g., `layout.tsx`) or a middleware.
    - If a user's current session shows they are `BASIC` but they have `PENDING` grants, the engine must "consume" the oldest grant immediately to restore `PREMIUM`.
- **Paddle Webhook Integration:**
    - `subscription.activated`/`transaction.completed`: Create a 1-month `SUBSCRIPTION` grant. Set status to `ACTIVE` immediately.
    - `subscription.canceled`: Do **NOT** remove access. The existing grant remains `ACTIVE` until its `expiresAt`. The ledger system naturally handles the rest.
- **Referral Reward Automation:**
    - When a referred user pays: Create a 1-month `REFERRAL` grant for the owner with status `PENDING`.

---

### 4. MVP Implementation Workflow
1.  **Migration Path:**
    - Create a script that iterates through every user.
    - If `trialEndsAt > now`, create an `ACTIVE` `TRIAL` grant.
    - If `referralBonusMonths > 0`, create X number of `PENDING` `REFERRAL` grants.
2.  **API Consolidation:**
    - Create a single server action `redeemCode(code)` that checks both `ReferralCode` and `CouponCode` tables.
    - On success, it inserts a `PENDING` grant and returns the "New Expiry Date" to the UI.
3.  **UI Feedback:**
    - Update the Premium page to show the "Queue": *"Your next month is covered by a referral bonus from [Friend Name]"*.

---

### 5. Failure Handling & Safety
- **Conflict Resolution:** If Paddle sends a webhook for a period already covered by an active grant, the engine must "push" the existing grant's end date or add the new month as `PENDING`.
- **Database Atomicity:** All grant activations (PENDING -> ACTIVE) must happen inside a `$transaction` to prevent double-spending bonus months.

**Execution Prompt:** "Based on the MVP Spec above, refactor the existing payment system. Start by updating the Prisma schema, then implement the `access-engine.ts` utility, and finally update the Paddle webhook handler and Signup actions."