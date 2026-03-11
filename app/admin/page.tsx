import { redirect } from 'next/navigation';
import { Shield, TicketPercent, Users } from 'lucide-react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureAdminAccess, formatPlanSource } from '@/lib/subscription';
import {
  createAdminReferralCode,
  createCouponCode,
  toggleUserAdmin,
  updateUserSubscription,
} from './actions';

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  await ensureAdminAccess(session.user.id);

  const [users, referralCodes, couponCodes] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        planSource: true,
        isAdmin: true,
        trialEndsAt: true,
        accessEndsAt: true,
        ownedReferralCode: {
          select: {
            code: true,
          },
        },
      },
    }),
    prisma.referralCode.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        code: true,
        label: true,
        isActive: true,
        maxRedemptions: true,
        owner: {
          select: {
            email: true,
          },
        },
        _count: {
          select: {
            redemptions: true,
          },
        },
      },
    }),
    prisma.couponCode.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        code: true,
        description: true,
        discountPercent: true,
        freeMonths: true,
        isActive: true,
      },
    }),
  ]);

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10 dark:bg-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <Shield className="h-7 w-7 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Admin</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Manage users, create referral codes, and keep subscription operations under control.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 flex items-center gap-3">
              <Users className="h-5 w-5 text-violet-600" />
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Create referral code</h2>
            </div>
            <form action={createAdminReferralCode} className="space-y-4">
              <input
                type="text"
                name="code"
                placeholder="Optional custom code"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none ring-0 transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <input
                type="text"
                name="label"
                placeholder="Label"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none ring-0 transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <input
                type="number"
                name="maxRedemptions"
                min={1}
                placeholder="Optional max redemptions"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none ring-0 transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <button className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700">
                Create referral code
              </button>
            </form>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 flex items-center gap-3">
              <TicketPercent className="h-5 w-5 text-emerald-600" />
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Create coupon code</h2>
            </div>
            <form action={createCouponCode} className="space-y-4">
              <input
                type="text"
                name="code"
                placeholder="Optional custom code"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none ring-0 transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <input
                type="text"
                name="description"
                placeholder="Description"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none ring-0 transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  type="number"
                  name="discountPercent"
                  min={0}
                  max={100}
                  placeholder="Discount %"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none ring-0 transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                <input
                  type="number"
                  name="freeMonths"
                  min={0}
                  max={24}
                  placeholder="Free months"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none ring-0 transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <button className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
                Create coupon code
              </button>
            </form>
          </article>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Users</h2>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-230 text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Referral</th>
                  <th className="px-4 py-3">Admin</th>
                  <th className="px-4 py-3">Update</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 align-top dark:border-slate-800/80">
                    <td className="px-4 py-4 text-slate-900 dark:text-white">
                      <div className="font-medium">{user.name || 'Unnamed user'}</div>
                      <div className="text-slate-500 dark:text-slate-400">{user.email}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-700 dark:text-slate-300">{user.plan}</td>
                    <td className="px-4 py-4 text-slate-700 dark:text-slate-300">{formatPlanSource(user.planSource)}</td>
                    <td className="px-4 py-4 text-slate-700 dark:text-slate-300">{user.ownedReferralCode?.code || '—'}</td>
                    <td className="px-4 py-4">
                      <form action={toggleUserAdmin}>
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="nextValue" value={String(!user.isAdmin)} />
                        <button className="rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                          {user.isAdmin ? 'Remove admin' : 'Make admin'}
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-4">
                      <form action={updateUserSubscription} className="flex items-center gap-2">
                        <input type="hidden" name="userId" value={user.id} />
                        <select
                          name="plan"
                          defaultValue={user.plan}
                          className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        >
                          <option value="BASIC">Basic</option>
                          <option value="STANDARD">Standard</option>
                          <option value="PREMIUM">Premium</option>
                        </select>
                        <select
                          name="planSource"
                          defaultValue={user.planSource}
                          className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        >
                          <option value="NONE">Inactive</option>
                          <option value="SUBSCRIPTION">Subscription</option>
                          <option value="TRIAL">Trial</option>
                          <option value="BONUS">Bonus</option>
                        </select>
                        <button className="rounded-lg bg-slate-900 px-3 py-2 font-medium text-white transition hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
                          Save
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Referral codes</h2>
            <div className="mt-5 space-y-3">
              {referralCodes.map((code) => (
                <div key={code.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="font-semibold text-slate-900 dark:text-white">{code.code}</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {code.label || 'No label'} · {code._count.redemptions} redemption(s)
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                    Owner: {code.owner?.email || 'Admin managed'}
                    {code.maxRedemptions ? ` · max ${code.maxRedemptions}` : ''}
                    {code.isActive ? ' · active' : ' · inactive'}
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Coupon codes</h2>
            <div className="mt-5 space-y-3">
              {couponCodes.map((code) => (
                <div key={code.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="font-semibold text-slate-900 dark:text-white">{code.code}</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {code.description || 'No description'}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                    {code.discountPercent ? `${code.discountPercent}% off` : 'No percentage discount'}
                    {` · ${code.freeMonths} free month(s)`}
                    {code.isActive ? ' · active' : ' · inactive'}
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
