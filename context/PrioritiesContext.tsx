import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Priority, PriorityContextType } from '@/types/priorities';

const PrioritiesContext = createContext<PriorityContextType>({
  priorities: [],
  loading: false,
  error: null,
  getPriorities: async () => {},
  addPriority: async () => {},
  updatePriority: async () => {},
  removePriority: async () => {},
  linkDecision: async () => {},
});

export function PrioritiesProvider({ children }: { children: React.ReactNode }) {
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getPriorities = async () => {
    try {
      setLoading(true);
      const stored = await AsyncStorage.getItem('priorities');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert string dates back to Date objects
        const withDates = parsed.map((p: any) => ({
          ...p,
          timeline: {
            start: new Date(p.timeline.start),
            end: new Date(p.timeline.end),
          },
          createdAt: new Date(p.createdAt),
        }));
        setPriorities(withDates);
      }
      setError(null);
    } catch (err) {
      setError('Failed to load priorities');
      console.error('Error loading priorities:', err);
    } finally {
      setLoading(false);
    }
  };

  const addPriority = async (priority: Omit<Priority, 'id' | 'createdAt'>) => {
    try {
      setLoading(true);
      const newPriority: Priority = {
        ...priority,
        id: Math.random().toString(36).substring(7),
        createdAt: new Date(),
      };
      const updated = [...priorities, newPriority];
      await AsyncStorage.setItem('priorities', JSON.stringify(updated));
      setPriorities(updated);
      setError(null);
    } catch (err) {
      setError('Failed to add priority');
      console.error('Error adding priority:', err);
    } finally {
      setLoading(false);
    }
  };

  const updatePriority = async (priority: Priority) => {
    try {
      setLoading(true);
      const updated = priorities.map(p => 
        p.id === priority.id ? priority : p
      );
      await AsyncStorage.setItem('priorities', JSON.stringify(updated));
      setPriorities(updated);
      setError(null);
    } catch (err) {
      setError('Failed to update priority');
      console.error('Error updating priority:', err);
    } finally {
      setLoading(false);
    }
  };

  const removePriority = async (id: string) => {
    try {
      setLoading(true);
      const updated = priorities.filter(p => p.id !== id);
      await AsyncStorage.setItem('priorities', JSON.stringify(updated));
      setPriorities(updated);
      setError(null);
    } catch (err) {
      setError('Failed to remove priority');
      console.error('Error removing priority:', err);
    } finally {
      setLoading(false);
    }
  };

  const linkDecision = async (priorityId: string, decisionId: string) => {
    try {
      setLoading(true);
      const priority = priorities.find(p => p.id === priorityId);
      if (!priority) throw new Error('Priority not found');

      const updated = priorities.map(p => {
        if (p.id === priorityId) {
          return {
            ...p,
            linkedDecisions: [...(p.linkedDecisions || []), decisionId],
          };
        }
        return p;
      });

      await AsyncStorage.setItem('priorities', JSON.stringify(updated));
      setPriorities(updated);
      setError(null);
    } catch (err) {
      setError('Failed to link decision');
      console.error('Error linking decision:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getPriorities();
  }, []);

  return (
    <PrioritiesContext.Provider
      value={{
        priorities,
        loading,
        error,
        getPriorities,
        addPriority,
        updatePriority,
        removePriority,
        linkDecision,
      }}
    >
      {children}
    </PrioritiesContext.Provider>
  );
}

export const usePriorities = () => useContext(PrioritiesContext);