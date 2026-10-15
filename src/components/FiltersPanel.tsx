import { FILTER_LABELS, type FilterName } from '../editor/types';

interface FiltersPanelProps {
  current: FilterName;
  onSelect: (filter: FilterName) => void;
  onClose?: () => void;
}

export function FiltersPanel({ current, onSelect, onClose }: FiltersPanelProps) {
  const filters = Object.keys(FILTER_LABELS) as FilterName[];

  return (
    <div className="panel floating filters-panel">
      <div className="panel-header">
        <h2>Filters</h2>
        {onClose && (
          <button
            type="button"
            className="panel-close"
            aria-label="Close filters"
            onClick={onClose}
          >
            ×
          </button>
        )}
      </div>
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
