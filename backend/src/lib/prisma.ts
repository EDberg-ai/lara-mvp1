import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

// Configure connection pool for Railway's PostgreSQL
// Railway can have connection resets, so we need resilience
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Handle connection errors gracefully
prisma.$on('error' as never, (e: Error) => {
  console.error('Prisma error:', e);
});

// Health check function to validate database connection
export async function validateDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✓ Database connection validated');
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

export default prisma;
