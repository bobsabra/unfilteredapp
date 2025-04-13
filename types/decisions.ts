export type Decision = {
  id: string;
  date: number;
  question: string;
  context?: string;
  recommendation: string;
  reasoning: string[];
  confidence: 'high' | 'medium' | 'low';
  timestamp: number;
  priorityId?: string;
};

export type DecisionHistory = Decision[];