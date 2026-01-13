import { env } from '../env';

export const isAdmin = (userId: number): boolean => env.ADMIN_IDS.includes(userId);
