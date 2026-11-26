import { PrismaClient } from "@prisma/client";

// The schema names DIRECT_URL (for migrations). Neon's Vercel integration calls it
// DATABASE_URL_UNPOOLED; with neither set, fall back to DATABASE_URL.
process.env.DIRECT_URL ||= process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

const g = globalThis as unknown as { __prisma?: PrismaClient };
export const db: PrismaClient = g.__prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") g.__prisma = db;
export type Db = PrismaClient;
