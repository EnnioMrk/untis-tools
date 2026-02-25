import { WebUntisSecretAuth } from 'webuntis';
import { authenticator } from 'otplib';
import { prisma, disconnectPrisma } from './prisma';
import { decrypt } from '../lib/encryption';
import { calculateStats } from './stats';
import type { UserStatsData, SyncResult } from './types';
import { getSchoolYearStart } from '../lib/school-year';

// Configuration
const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Logger utility for the worker
 */
const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[${new Date().toISOString()}] INFO: ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[${new Date().toISOString()}] ERROR: ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[${new Date().toISOString()}] WARN: ${message}`, ...args);
  },
};

/**
 * Fetch timetable data for a user from Untis
 */
async function fetchTimetable(
  untis: WebUntisSecretAuth,
  startDate: Date,
  endDate: Date
): Promise<any[]> {
  try {
    const timetable = await untis.getOwnTimetableForRange(startDate, endDate);
    return timetable || [];
  } catch (error) {
    logger.warn('Failed to fetch timetable', { error });
    return [];
  }
}

/**
 * Fetch absence data for a user from Untis
 */
async function fetchAbsences(
  untis: WebUntisSecretAuth,
  startDate: Date,
  endDate: Date
): Promise<any[]> {
  try {
    const absences = await untis.getAbsentLesson(startDate, endDate);
    return absences?.absences || [];
  } catch (error) {
    logger.warn('Failed to fetch absences', { error });
    return [];
  }
}

/**
 * Sync data for a single user
 */
async function syncUser(
  userId: string,
  serverUrl: string,
  school: string,
  username: string,
  encryptedSecret: string
): Promise<SyncResult> {
  const startTime = Date.now();
  let untis: WebUntisSecretAuth | null = null;
  
  try {
    // Decrypt the secret
    const secret = decrypt(encryptedSecret);
    
    // Create Untis client using WebUntisSecretAuth
    // Parameters: school, user, secret, baseurl, identity, authenticator, disableUserAgent
    untis = new WebUntisSecretAuth(
      school,
      username,
      secret,
      serverUrl,
      'UntisStats-Worker',
      authenticator,
      false
    );
    
    // Login to Untis
    await untis.login();
    logger.info(`Logged in to Untis for user ${userId}`);
    
    // Calculate date range - use school year start for full year data
    const endDate = new Date();
    const startDate = await getSchoolYearStart();
    
    // Fetch data
    const [timetable, absences] = await Promise.all([
      fetchTimetable(untis, startDate, endDate),
      fetchAbsences(untis, startDate, endDate),
    ]);
    
    logger.info(`Fetched ${timetable.length} lessons and ${absences.length} absences for user ${userId}`);
    
    // Get previous stats if available
    const previousStats = await prisma.userStats.findUnique({
      where: { userId },
    });
    
    const previousStatsData: UserStatsData | null = previousStats as any;
    
    // Calculate new statistics
    const stats = calculateStats(timetable, absences, previousStatsData);
    
    // Save to database
    await prisma.userStats.upsert({
      where: { userId },
      create: {
        userId,
        absences7Days: stats.absenceCounts.last7Days,
        absences14Days: stats.absenceCounts.last14Days,
        absences30Days: stats.absenceCounts.last30Days,
        absencesAllTime: stats.absenceCounts.allTime,
        trend7Days: stats.trendChanges.last7Days as any,
        trend14Days: stats.trendChanges.last14Days as any,
        trend30Days: stats.trendChanges.last30Days as any,
        subjectBreakdown: stats.subjectBreakdown as any,
        dailyTrend: stats.dailyTrend as any,
        lastCalculated: new Date(),
      },
      update: {
        absences7Days: stats.absenceCounts.last7Days,
        absences14Days: stats.absenceCounts.last14Days,
        absences30Days: stats.absenceCounts.last30Days,
        absencesAllTime: stats.absenceCounts.allTime,
        trend7Days: stats.trendChanges.last7Days as any,
        trend14Days: stats.trendChanges.last14Days as any,
        trend30Days: stats.trendChanges.last30Days as any,
        subjectBreakdown: stats.subjectBreakdown as any,
        dailyTrend: stats.dailyTrend as any,
        lastCalculated: new Date(),
      },
    });
    
    // Update lastSyncAt on the connection
    await prisma.untisConnection.update({
      where: { userId },
      data: { lastSyncAt: new Date() },
    });
    
    const duration = Date.now() - startTime;
    logger.info(`Successfully synced user ${userId} in ${duration}ms`);
    
    return {
      userId,
      success: true,
      duration,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to sync user ${userId}: ${errorMessage}`);
    
    return {
      userId,
      success: false,
      error: errorMessage,
      duration: Date.now() - startTime,
    };
  } finally {
    // Always logout to clean up the session
    if (untis) {
      try {
        await untis.logout();
      } catch {
        // Ignore logout errors
      }
    }
  }
}

/**
 * Run a sync cycle for all users with active Untis connections
 */
async function runSyncCycle(): Promise<void> {
  logger.info('Starting sync cycle');
  const cycleStartTime = Date.now();
  
  try {
    // Get all active Untis connections
    const connections = await prisma.untisConnection.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: { email: true },
        },
      },
    });
    
    logger.info(`Found ${connections.length} active connections to sync`);
    
    if (connections.length === 0) {
      logger.info('No active Untis connections found. Users need to connect their Untis account first.');
      return;
    }
    
    const results: SyncResult[] = [];
    
    // Process each user sequentially to avoid rate limiting
    for (const connection of connections) {
      logger.info(`Processing user: ${connection.userId}, server: ${connection.serverUrl}, school: ${connection.school}`);
      const result = await syncUser(
        connection.userId,
        connection.serverUrl,
        connection.school,
        connection.username,
        connection.secret
      );
      results.push(result);
    }
    
    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalDuration = Date.now() - cycleStartTime;
    
    logger.info(
      `Sync cycle completed: ${successful} successful, ${failed} failed, took ${totalDuration}ms`
    );
    
    // Log any failures
    for (const result of results.filter(r => !r.success)) {
      logger.error(`User ${result.userId} failed: ${result.error}`);
    }
  } catch (error) {
    logger.error('Sync cycle failed with error:', error);
  }
}

/**
 * Main worker function
 */
async function main(): Promise<void> {
  logger.info('Untis Stats Worker starting');
  logger.info(`Sync interval: ${SYNC_INTERVAL_MS / 60000} minutes`);
  
  // Run initial sync immediately
  await runSyncCycle();
  
  // Schedule subsequent syncs
  setInterval(async () => {
    await runSyncCycle();
  }, SYNC_INTERVAL_MS);
  
  logger.info('Worker is running. Press Ctrl+C to stop.');
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  await disconnectPrisma();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  await disconnectPrisma();
  process.exit(0);
});

// Start the worker
main().catch((error) => {
  logger.error('Worker failed to start:', error);
  process.exit(1);
});
