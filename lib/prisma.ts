import { PrismaClient } from '@prisma/client';

// Create Prisma Client
// const adapter = new PrismaPg({
//   connectionString: process.env.DATABASE_URL!,
// });

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;