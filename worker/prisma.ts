import { PrismaClient } from '@prisma/client';
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from 'pg';

/**
 * Prisma client instance for the worker
 * 
 * This is a separate instance from the Next.js app since the worker
 * runs as a standalone Bun process.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.POSTGRES_URL;
  
  const pool = new Pool({ 
    connectionString,
  });
  
  const adapter = new PrismaPg(pool);
  
  return new PrismaClient({ 
    adapter,
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

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
