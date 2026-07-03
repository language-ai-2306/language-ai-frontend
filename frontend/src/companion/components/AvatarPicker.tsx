/** Grid of selectable animal avatars (image with emoji fallback). */
import { useState } from 'react';

import { PATIENT_AVATARS, type AvatarOption } from '../avatars';

function Tile({
  option,
  selected,
  onSelect,
}: {
  option: AvatarOption;
  selected: boolean;
  onSelect: () => void;
}): JSX.Element {
  const [failed, setFailed] = useState(false);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={option.label}
      className={`su-avatar ${selected ? 'is-selected' : ''}`}
      onClick={onSelect}
    >
      {failed ? (
        <span aria-hidden="true">{option.emoji}</span>
      ) : (
        <img src={option.url} alt="" onError={() => setFailed(true)} />
      )}
    </button>
  );
}

export function AvatarPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string) => void;
}): JSX.Element {
  return (
    <div className="su-avatars" role="radiogroup" aria-label="Choose an avatar">
      {PATIENT_AVATARS.map((a) => (
        <Tile key={a.key} option={a} selected={value === a.url} onSelect={() => onChange(a.url)} />
      ))}
    </div>
  );
}
