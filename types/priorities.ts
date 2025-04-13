import { Decision } from './decisions';

export type PriorityDomain = 'career' | 'health' | 'relationships' | 'personal' | 'finance' | 'spiritual';

export type Priority = {
  id: string;
  title: string;
  description?: string;
  domain: PriorityDomain;
  timeline: { start: Date; end: Date };
  status: 'active' | 'completed' | 'archived';
  createdAt: Date;
  linkedDecisions?: string[]; // IDs of linked decisions
  progress?: number; // 0-100
};

export type PriorityContextType = {
  priorities: Priority[];
  loading: boolean;
  error: string | null;
  getPriorities: () => Promise<void>;
  addPriority: (priority: Omit<Priority, 'id' | 'createdAt'>) => Promise<void>;
  updatePriority: (priority: Priority) => Promise<void>;
  removePriority: (id: string) => Promise<void>;
  linkDecision: (priorityId: string, decisionId: string) => Promise<void>;
};