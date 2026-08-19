import { PrismaClient } from '@/generated/prisma';

/**
 * Prisma Client 单例。
 * dev 热重载会重复执行模块，挂在 globalThis 上避免连接数膨胀。
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
