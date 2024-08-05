import { PrismaClient } from '@prisma/client';

export const APP_URL = process.env.APP_URL;
export const REDIRECT_URL = `${APP_URL}/profile`;
export const PORT = process.env.PORT || 4000;
export const prisma = new PrismaClient();