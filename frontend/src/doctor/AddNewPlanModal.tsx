/**
 * AddNewPlanModal — the "Add New Plan" chooser shown over a patient's profile.
 * Two ways to start a plan: pick a clinically-validated template, or build one
 * from scratch. Presentational only — the parent wires the two actions.
 */
import { useEffect } from 'react';
import { Copy, SquarePen, X } from 'lucide-react';

import './add-plan.css';

interface AddNewPlanModalProps {
  onClose: () => void;
  /** Open the library of foundational plan templates. */
  onChooseExisting: () => void;
  /** Start a blank, fully custom plan. */
  onCustomize: () => void;
}

export function AddNewPlanModal({
  onClose,
  onChooseExisting,
  onCustomize,
}: AddNewPlanModalProps): JSX.Element {
  // Esc closes the dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="apm-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="apm-title"
      onClick={onClose}
    >
      <div className="apm-card" onClick={(e) => e.stopPropagation()}>
        <header className="apm-head">
          <h2 id="apm-title" className="apm-head__title">
            Add New Plan
          </h2>
          <button type="button" className="apm-close" onClick={onClose} aria-label="Close">
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="apm-body">
          <button type="button" className="apm-option" onClick={onChooseExisting}>
            <span className="apm-option__icon">
              <Copy size={22} aria-hidden="true" />
            </span>
            <span className="apm-option__text">
              <span className="apm-option__title">Choose from Existing Plans</span>
              <span className="apm-option__desc">
                Select from a library of clinically validated foundational plans.
              </span>
            </span>
          </button>

          <button type="button" className="apm-option" onClick={onCustomize}>
            <span className="apm-option__icon apm-option__icon--violet">
              <SquarePen size={22} aria-hidden="true" />
            </span>
            <span className="apm-option__text">
              <span className="apm-option__title">Customize New Plan</span>
              <span className="apm-option__desc">
                Build a personalized treatment plan from scratch for your patient.
              </span>
            </span>
          </button>
        </div>

        <footer className="apm-foot">
          <button type="button" className="apm-cancel" onClick={onClose}>
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
}
