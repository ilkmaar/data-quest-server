import { PrismaClient } from "@prisma/client";

export const CLIENT_APP_URL = process.env.CLIENT_APP_URL;
export const REDIRECT_URL = `${CLIENT_APP_URL}/profile`;
export const PORT = process.env.PORT || 4000;
export const prisma = new PrismaClient();
