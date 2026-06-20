/** ChatBar — voice (mic) + text input with client-side validation. */
import { memo, useState, type FormEvent } from 'react';

import { MAX_MESSAGE_LENGTH } from '../../api/client';
import './ChatBar.css';

export interface ChatBarProps {
  onSend: (message: string) => void;
  /** Disables the text input + send (loading or avatar speaking). */
  disabled: boolean;
  micSupported: boolean;
  micDisabled: boolean;
  isListening: boolean;
  /** Live transcript shown in the field while listening. */
  interim: string;
  onMicToggle: () => void;
}

function MicIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"
      />
      <path
        fill="currentColor"
        d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21a1 1 0 1 0 2 0v-3.08A7 7 0 0 0 19 11Z"
      />
    </svg>
  );
}

function ChatBarComponent({
  onSend,
  disabled,
  micSupported,
  micDisabled,
  isListening,
  interim,
  onMicToggle,
}: ChatBarProps): JSX.Element {
  const [value, setValue] = useState('');

  const trimmed = value.trim();
  const tooLong = value.length > MAX_MESSAGE_LENGTH;
  const canSend = trimmed.length > 0 && !tooLong && !disabled && !isListening;

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    if (!canSend) return;
    onSend(trimmed);
    setValue('');
  };

  const fieldText = isListening ? interim || 'Listening…' : value;

  return (
    <form className="chatbar" onSubmit={handleSubmit}>
      <label className="chatbar__label" htmlFor="chat-input">
        Talk or type to your avatar
      </label>
      <div className="chatbar__row">
        <button
          type="button"
          className={`chatbar__mic${isListening ? ' chatbar__mic--active' : ''}`}
          onClick={onMicToggle}
          disabled={!micSupported || micDisabled}
          aria-pressed={isListening}
          aria-label={isListening ? 'Stop listening' : 'Talk to the avatar'}
          title={
            micSupported
              ? isListening
                ? 'Stop listening'
                : 'Talk to the avatar'
              : 'Voice input needs Chrome, Edge, or Safari'
          }
        >
          <MicIcon />
        </button>
        <input
          id="chat-input"
          className="chatbar__input"
          type="text"
          autoComplete="off"
          placeholder="Type a message…"
          value={fieldText}
          maxLength={MAX_MESSAGE_LENGTH + 1 /* allow overflow to show the warning */}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled || isListening}
          aria-invalid={tooLong}
        />
        <button className="chatbar__send" type="submit" disabled={!canSend}>
          {disabled ? '…' : 'Send'}
        </button>
      </div>
      {tooLong && (
        <p className="chatbar__warn" role="alert">
          Message must be {MAX_MESSAGE_LENGTH} characters or fewer.
        </p>
      )}
    </form>
  );
}

export const ChatBar = memo(ChatBarComponent);
