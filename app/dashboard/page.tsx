import { redirect } from 'next/navigation';
import { DashboardGrid } from '@/components/dashboard/dashboard-grid';
import { getUserStats, getUserWidgets, hasUntisConnection, getUserPlan } from './actions';
import { auth } from '@/lib/auth';

export default async function DashboardPage() {
  const session = await auth();

  // Check if user is authenticated
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  // Check if user has an Untis connection
  const hasConnection = await hasUntisConnection();
  if (!hasConnection) {
    redirect('/onboarding');
  }

  // Fetch user data in parallel
  const [stats, widgets, plan] = await Promise.all([
    getUserStats(),
    getUserWidgets(),
    getUserPlan(),
  ]);

  const isPremium = plan === 'PREMIUM';

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <DashboardGrid
          initialWidgets={widgets}
          stats={stats}
          isPremium={isPremium}
        />
      </div>
    </main>
  );
}