import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getRawUntisData, getStoredUserStats, type UntisDataFilter } from './actions';
import { DevTestClient } from './dev-client';

export const dynamic = 'force-dynamic';

/**
 * Dev Test Site Page
 * 
 * This page shows all the Untis data and how it is filtered.
 * Use this for development and testing purposes.
 */
export default async function DevTestPage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}) {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  // Get filter params from URL
  const params = await searchParams;
  const filter: UntisDataFilter | undefined = params.startDate || params.endDate
    ? {
        startDate: params.startDate || getDefaultStartDate(),
        endDate: params.endDate || getDefaultEndDate(),
      }
    : undefined;

  // Fetch raw Untis data and stored stats in parallel
  const [rawData, storedStats] = await Promise.all([
    getRawUntisData(filter),
    getStoredUserStats(),
  ]);

  // If no Untis connection, show a message
  if (!rawData) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Dev Test Site</h1>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-yellow-800 mb-2">No Untis Connection</h2>
            <p className="text-yellow-700">
              You need to connect your Untis account first. 
              Go to the <a href="/onboarding" className="underline">onboarding page</a> to connect.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DevTestClient 
        rawData={rawData}
        storedStats={storedStats}
        currentFilter={filter}
      />
    </div>
  );
}

function getDefaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split('T')[0];
}

function getDefaultEndDate(): string {
  return new Date().toISOString().split('T')[0];
}
