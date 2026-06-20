/** RewardToast — celebratory "+1 star" popup shown after any practice attempt. */
import { useEffect } from 'react';

import { useApp } from '../store/AppStore';
import './RewardToast.css';

export function RewardToast(): JSX.Element | null {
  const { state, dismissToast } = useApp();

  useEffect(() => {
    if (!state.toast) return;
    const id = window.setTimeout(dismissToast, 1700);
    return () => window.clearTimeout(id);
  }, [state.toast, dismissToast]);

  if (!state.toast) return null;

  return (
    <div className="rewardtoast" role="status" aria-live="polite">
      <span className="rewardtoast__star" aria-hidden="true">
        ⭐
      </span>
      <span className="rewardtoast__msg">{state.toast}</span>
    </div>
  );
}
