import { useMemo, useState } from 'react';

export function useSortableList(items, defaultKey = null) {
  const [sortKey, setSortKey] = useState(defaultKey);
  const [sortDir, setSortDir] = useState('asc');

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sorted = useMemo(() => {
    if (!items || !sortKey) return items;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...items].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      return String(av).localeCompare(String(bv), 'ko') * dir;
    });
  }, [items, sortKey, sortDir]);

  return { sorted, sortKey, sortDir, toggleSort };
}
