export type InitResponse = {
  type: 'init';
  username: string;
  dateKey: string;
  dayNumber: number;
  streak: number;
  bestSteps: number | null;
  completedToday: boolean;
  playersToday: number;
};

export type FinishRequest = { steps: number; seconds: number };

export type FinishResponse = {
  type: 'finish';
  streak: number;
  bestSteps: number;
  playersToday: number;
  isNewBest: boolean;
};
