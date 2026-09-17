import { PrismaClient } from "@prisma/client";
export const db = globalThis.farmDb || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalThis.farmDb = db;
