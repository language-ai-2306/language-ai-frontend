/**
 * SilentSoundToast — a mobile-only reminder shown once per session when a game
 * starts, nudging the user to check their phone isn't on silent so they can hear
 * Ollie.
 *
 * NOTE: the web platform CANNOT read the hardware silent/ringer switch on iOS or
 * Android (no browser API exposes it), so this is an honest reminder — not real
 * silent-mode detection. It only shows on touch devices, only when in-app sound
 * is enabled (so we don't contradict a user who muted on purpose), and only once
 * per browser session.
 */
import { useCallback, useEffect, useState } from 'react';

import { GAME_STARTED_EVENT } from '../api/client';
import { useApp } from '../store/AppStore';
import './SilentSoundToast.css';

const SESSION_KEY = 'languageai.silentReminderShown';
const AUTO_DISMISS_MS = 7000;

/** Touch devices (phones/tablets) — the only place a hardware silent switch exists. */
function isTouchDevice(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(pointer: coarse)').matches === true
  );
}

export function SilentSoundToast(): JSX.Element | null {
  const { state } = useApp();
  const [visible, setVisible] = useState(false);

  const dismiss = useCallback(() => setVisible(false), []);

  // Show the reminder the first time a game starts on a touch device this session.
  useEffect(() => {
    const onGameStart = (): void => {
      if (!isTouchDevice()) return;
      if (!state.settings.sound) return; // user muted in-app on purpose — don't nag
      try {
        if (sessionStorage.getItem(SESSION_KEY)) return; // already reminded this session
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch {
        // sessionStorage blocked (e.g. private mode) — still show it this once.
      }
      setVisible(true);
    };
    window.addEventListener(GAME_STARTED_EVENT, onGameStart);
    return () => window.removeEventListener(GAME_STARTED_EVENT, onGameStart);
  }, [state.settings.sound]);

  // Auto-dismiss after a few seconds (long enough to read a warning).
  useEffect(() => {
    if (!visible) return;
    const id = window.setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [visible, dismiss]);

  if (!visible) return null;

  return (
    <div className="silenttoast" role="status" aria-live="polite">
      <span className="silenttoast__icon" aria-hidden="true">
        🔇
      </span>
      <span className="silenttoast__msg">
        If your phone is on silent, switch it off so you can hear Ollie.
      </span>
      <button
        type="button"
        className="silenttoast__close"
        onClick={dismiss}
        aria-label="Dismiss sound reminder"
      >
        ✕
      </button>
    </div>
  );
}
