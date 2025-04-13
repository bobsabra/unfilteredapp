import { Domain } from './domains';

export type Event = {
  id: string;
  title: string;
  date: Date;
  type: Domain;
  description?: string;
  completed?: boolean;
  priorityId?: string;
};

export type EventHistory = Event[];