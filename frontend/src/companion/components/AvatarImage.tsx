/** Round avatar image with a graceful fallback (User icon) if missing / broken. */
import { useState } from 'react';
import { User } from 'lucide-react';

export function AvatarImage({ url, size = 40 }: { url?: string | null; size?: number }): JSX.Element {
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size, borderRadius: '50%' } as const;

  if (url && !failed) {
    return (
      <img
        src={url}
        alt="Profile avatar"
        onError={() => setFailed(true)}
        style={{ ...box, objectFit: 'cover', display: 'block' }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{ ...box, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.2)' }}
    >
      <User size={Math.round(size * 0.55)} />
    </span>
  );
}
