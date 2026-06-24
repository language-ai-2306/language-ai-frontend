/** ProgressIndicator — "Phrase N of M" label + slim progress bar. */
export interface ProgressIndicatorProps {
  index: number;
  total: number;
}

export function ProgressIndicator({ index, total }: ProgressIndicatorProps): JSX.Element {
  const current = index + 1;
  const pct = (current / total) * 100;

  return (
    <div className="progress-indicator">
      <span className="progress-indicator__label">
        Phrase {current} of {total}
      </span>
      <div
        className="progress-indicator__track"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={`Phrase ${current} of ${total}`}
      >
        <span className="progress-indicator__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
