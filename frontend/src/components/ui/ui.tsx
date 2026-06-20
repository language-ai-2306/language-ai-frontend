/** Shared, presentational UI primitives for the gamified speech app. */
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './ui.css';

type Variant = 'primary' | 'success' | 'soft' | 'ghost';
type Size = 'md' | 'lg' | 'xl';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = 'primary',
  size = 'lg',
  className = '',
  children,
  ...rest
}: ButtonProps): JSX.Element {
  return (
    <button className={`btn btn--${variant} btn--${size} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}

export function ProgressBar({ value, label }: { value: number; label?: string }): JSX.Element {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      className="progressbar"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <span className="progressbar__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Pill({
  children,
  tone = 'violet',
}: {
  children: ReactNode;
  tone?: 'violet' | 'amber' | 'green' | 'rose';
}): JSX.Element {
  return <span className={`pill pill--${tone}`}>{children}</span>;
}

interface TileProps {
  icon: string;
  title: string;
  subtitle?: string;
  accent: 'violet' | 'green' | 'amber' | 'sky' | 'rose';
  onClick: () => void;
}

export function Tile({ icon, title, subtitle, accent, onClick }: TileProps): JSX.Element {
  return (
    <button type="button" className={`tile tile--${accent}`} onClick={onClick}>
      <span className="tile__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="tile__title">{title}</span>
      {subtitle && <span className="tile__subtitle">{subtitle}</span>}
    </button>
  );
}

export function ScreenHeader({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}): JSX.Element {
  return (
    <header className="screenhead">
      {onBack ? (
        <button type="button" className="screenhead__back" onClick={onBack} aria-label="Back to home">
          ‹
        </button>
      ) : (
        <span className="screenhead__spacer" />
      )}
      <h1 className="screenhead__title">{title}</h1>
      <span className="screenhead__right">{right}</span>
    </header>
  );
}
