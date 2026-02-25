import { PrismaClient } from '@prisma/client';

/**
 * Prisma client instance for the worker
 * 
 * This is a separate instance from the Next.js app since the worker
 * runs as a standalone Bun process.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
});

// In development, store the client on the global object to prevent
// multiple instances during hot reloading (though less relevant for worker)
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;

/**
 * Gracefully disconnect Prisma on shutdown
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
