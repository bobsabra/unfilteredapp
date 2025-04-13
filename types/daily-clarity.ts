export type DailyEntry = {
  id: string;
  date: number;
  mainTask: string;
  blocker: string;
  boldMove: string;
  insights?: { text: string; completed: boolean }[];
};

export type DailyHistory = DailyEntry[];
