import { reddit } from '@devvit/web/server';
import { dayNumber } from '../../shared/detour';

export const createPost = async () => {
  const dateKey = new Date().toISOString().slice(0, 10);
  return await reddit.submitCustomPost({
    title: `Daily Detour #${dayNumber(dateKey)} — find today's shortest route!`,
  });
};
