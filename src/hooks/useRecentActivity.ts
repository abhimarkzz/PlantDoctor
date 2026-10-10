import { useCallback, useEffect, useState } from 'react';

/**
 * Recent question activity, backed by real localStorage (genuine local state).
 * This is NOT fabricated data — it only ever contains questions the user
 * actually submitted on this device. It stores no answers and claims nothing
 * about backend verification.
 */

const STORAGE_KEY = 'plantdoctor.recentQuestions.v1';
const MAX_ITEMS = 8;

export interface RecentQuestion {
  id: string;
  query: string;
  cropId: string | null;
  regionId: string | null;
  submittedAt: string;
  /** Whether this was answered by the demo adapter (illustrative). */
  illustrative: boolean;
}

function read(): RecentQuestion[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RecentQuestion[]) : [];
  } catch {
    return [];
  }
}

function write(items: RecentQuestion[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable — fail silently, feature is non-critical */
  }
}

export function useRecentActivity() {
  const [items, setItems] = useState<RecentQuestion[]>([]);

  useEffect(() => {
    setItems(read());
  }, []);

  const add = useCallback((entry: Omit<RecentQuestion, 'id' | 'submittedAt'>) => {
    setItems((prev) => {
      const next: RecentQuestion[] = [
        {
          ...entry,
          id: `q-${Date.now()}`,
          submittedAt: new Date().toISOString(),
        },
        ...prev,
      ].slice(0, MAX_ITEMS);
      write(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    write([]);
    setItems([]);
  }, []);

  return { items, add, clear };
}
