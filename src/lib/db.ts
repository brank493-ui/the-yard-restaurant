// Database configuration
// Note: This app uses static data for Vercel deployment
// For production with a database, use PostgreSQL, MongoDB, or Supabase

// Prisma is kept for local development if needed
// But all API routes now use static/in-memory data for Vercel compatibility

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: typeof PrismaClient.prototype | undefined
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
