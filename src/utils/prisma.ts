import { PrismaClient } from '@prisma/client';
export const prisma=new PrismaClient();
export const jsonSafe=(value: unknown): unknown=>JSON.parse(JSON.stringify(value,(_,v)=>typeof v==='bigint'?v.toString():v));
export const newId = (): bigint => BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000));
