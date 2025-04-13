export const DOMAINS = ['personal', 'finance', 'career', 'health', 'relationships', 'spiritual'] as const;

export type Domain = typeof DOMAINS[number];

export const getDomainColor = (domain: Domain): string => {
  switch (domain) {
    case 'career':
      return '#4CAF50';
    case 'relationships':
      return '#E91E63';
    case 'personal':
      return '#2196F3';
    case 'finance':
      return '#FFC107';
    case 'health':
      return '#FF5722';
    case 'spiritual':
      return '#9C27B0';
    default:
      return '#666';
  }
};