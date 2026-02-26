import { redirect } from 'next/navigation';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import {
    getUserStatsNoCache,
    getUserWidgets,
    hasUntisConnection,
    getUserPlan,
    getDataStartDate,
    getPresetDateOptions,
} from './actions';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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
    const [stats, widgets, plan, dataStartDate, presetDates] =
        await Promise.all([
            getUserStatsNoCache(),
            getUserWidgets(),
            getUserPlan(),
            getDataStartDate(),
            getPresetDateOptions(),
        ]);

    const isPremium = plan === 'PREMIUM';

    return (
        <main className="min-h-screen bg-gray-50">
            <div className="max-w-5xl mx-auto px-4 py-8">
                <DashboardClient
                    initialWidgets={widgets}
                    initialStats={stats}
                    isPremium={isPremium}
                    initialDate={dataStartDate.date}
                    isCustom={dataStartDate.isCustom}
                    presetDates={presetDates}
                />
            </div>
        </main>
    );
}
