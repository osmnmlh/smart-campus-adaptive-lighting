type TopologyToolbarProps = Readonly<{
  onFitView: () => void;
  onResetView: () => void;
  onClearSelection: () => void;
  clearSelectionDisabled: boolean;
}>;

export function TopologyToolbar({
  onFitView,
  onResetView,
  onClearSelection,
  clearSelectionDisabled,
}: TopologyToolbarProps) {
  return (
    <div className="topology-toolbar" role="toolbar" aria-label="Topology viewport controls">
      <button type="button" onClick={onFitView} aria-label="Fit View">
        Fit View
      </button>
      <button type="button" onClick={onResetView} aria-label="Reset View">
        Reset View
      </button>
      <button
        type="button"
        onClick={onClearSelection}
        disabled={clearSelectionDisabled}
        aria-label="Clear Selection"
      >
        Clear Selection
      </button>
    </div>
  );
}
