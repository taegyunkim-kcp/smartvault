function SortableTh({ label, sortKeyName, sortKey, sortDir, onSort }) {
  const active = sortKey === sortKeyName;
  return (
    <th className="sortable" onClick={() => onSort(sortKeyName)}>
      {label}
      <span className="sort-indicator">{active ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}</span>
    </th>
  );
}

export default SortableTh;
