/** ChatBar — message input with client-side validation. */
import { memo, useState, type FormEvent } from 'react';

import { MAX_MESSAGE_LENGTH } from '../../api/client';
import './ChatBar.css';

export interface ChatBarProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

function ChatBarComponent({ onSend, disabled }: ChatBarProps): JSX.Element {
  const [value, setValue] = useState('');

  const trimmed = value.trim();
  const tooLong = value.length > MAX_MESSAGE_LENGTH;
  const canSend = trimmed.length > 0 && !tooLong && !disabled;

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    if (!canSend) return;
    onSend(trimmed);
    setValue('');
  };

  return (
    <form className="chatbar" onSubmit={handleSubmit}>
      <label className="chatbar__label" htmlFor="chat-input">
        Say something to your avatar
      </label>
      <div className="chatbar__row">
        <input
          id="chat-input"
          className="chatbar__input"
          type="text"
          autoComplete="off"
          placeholder="Type a message…"
          value={value}
          maxLength={MAX_MESSAGE_LENGTH + 1 /* allow overflow to show the warning */}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
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
