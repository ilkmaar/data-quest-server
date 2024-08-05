import { prisma } from '../config.js';

export const context = ({ req }) => ({
  prisma,
  userId: req.user?.id,
  role: req.user?.role,
});