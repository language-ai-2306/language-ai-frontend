/**
 * RoomBackground — original, lightweight illustrated room (inline SVG).
 *
 * Deliberately low-contrast and calm so the mascot and phrase stay dominant.
 * Not a 3D render and not a copy of any reference room. Purely decorative.
 */
export function RoomBackground(): JSX.Element {
  return (
    <svg
      className="room-bg"
      viewBox="0 0 390 844"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF9EE" />
          <stop offset="1" stopColor="#FDEFD8" />
        </linearGradient>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#DBF4F8" />
          <stop offset="1" stopColor="#CDEFF4" />
        </linearGradient>
        <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F6DFBC" />
          <stop offset="1" stopColor="#EFD2A6" />
        </linearGradient>
      </defs>

      {/* Wall */}
      <rect x="0" y="0" width="390" height="844" fill="url(#wall)" />

      {/* Floor */}
      <path d="M0 600 Q195 560 390 600 L390 844 L0 844 Z" fill="url(#floor)" />

      {/* Window with soft sky, sun and clouds */}
      <g opacity="0.9">
        <rect x="36" y="92" width="150" height="150" rx="20" fill="#FFFFFF" />
        <rect x="46" y="102" width="130" height="130" rx="14" fill="url(#sky)" />
        <circle cx="78" cy="138" r="18" fill="#FFD88A" />
        <ellipse cx="138" cy="150" rx="26" ry="13" fill="#FFFFFF" opacity="0.85" />
        <ellipse cx="120" cy="190" rx="22" ry="11" fill="#FFFFFF" opacity="0.7" />
        <rect x="108" y="102" width="6" height="130" fill="#FFFFFF" />
        <rect x="46" y="160" width="130" height="6" fill="#FFFFFF" />
      </g>

      {/* Framed stars picture (top-right) */}
      <g opacity="0.85">
        <rect x="278" y="120" width="78" height="64" rx="12" fill="#FFFFFF" />
        <rect x="286" y="128" width="62" height="48" rx="8" fill="#E9E7FB" />
        <path d="M300 152 l4 -10 4 10 11 1 -8 7 3 11 -10 -6 -10 6 3 -11 -8 -7 z" fill="#FFD88A" />
        <path d="M326 160 l3 -7 3 7 8 1 -6 5 2 8 -7 -4 -7 4 2 -8 -6 -5 z" fill="#6867D8" opacity="0.5" />
      </g>

      {/* Bookshelf (right) */}
      <g opacity="0.8">
        <rect x="296" y="430" width="74" height="150" rx="10" fill="#F0D9B6" />
        <rect x="304" y="446" width="58" height="6" rx="3" fill="#E2C290" />
        <rect x="304" y="500" width="58" height="6" rx="3" fill="#E2C290" />
        <rect x="308" y="456" width="9" height="40" rx="3" fill="#6867D8" opacity="0.55" />
        <rect x="320" y="460" width="9" height="36" rx="3" fill="#56C7B2" opacity="0.7" />
        <rect x="332" y="454" width="9" height="42" rx="3" fill="#FFB3B3" opacity="0.7" />
        <rect x="346" y="462" width="9" height="34" rx="3" fill="#FFD88A" />
      </g>

      {/* Plant (left, on the floor) */}
      <g opacity="0.85">
        <path d="M44 560 q-14 -46 6 -78" stroke="#56C7B2" strokeWidth="8" fill="none" strokeLinecap="round" />
        <path d="M50 558 q14 -40 40 -54" stroke="#56C7B2" strokeWidth="8" fill="none" strokeLinecap="round" />
        <path d="M48 556 q-2 -44 -22 -64" stroke="#56C7B2" strokeWidth="8" fill="none" strokeLinecap="round" />
        <path d="M28 556 h44 l-6 40 h-32 z" fill="#E59B73" />
      </g>

      {/* Rug under the mascot */}
      <ellipse cx="195" cy="690" rx="150" ry="40" fill="#CDEFF4" opacity="0.75" />
      <ellipse cx="195" cy="690" rx="110" ry="28" fill="#BFE9F0" opacity="0.7" />

      {/* Cushion */}
      <rect x="246" y="668" width="84" height="46" rx="20" fill="#FFD0CF" opacity="0.8" />
    </svg>
  );
}
