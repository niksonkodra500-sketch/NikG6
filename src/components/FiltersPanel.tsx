import { FILTER_LABELS, type FilterName } from '../editor/types';

interface FiltersPanelProps {
  current: FilterName;
  onSelect: (filter: FilterName) => void;
}

export function FiltersPanel({ current, onSelect }: FiltersPanelProps) {
  const filters = Object.keys(FILTER_LABELS) as FilterName[];

  return (
    <div className="panel filters-panel">
      <h2>Filters</h2>
      <div className="filter-grid">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            className={current === filter ? 'active' : ''}
            onClick={() => {
              onSelect(filter);
            }}
          >
            {FILTER_LABELS[filter]}
          </button>
        ))}
      </div>
    </div>
  );
}
