/**
 * LegalModal — shows a Terms of Service / Privacy Policy document in a scrollable
 * overlay. The same component serves both audiences ('user' for the companion
 * app, 'therapist' for the clinician portal); pass which one to open. A tab lets
 * the reader switch between Terms and Privacy without leaving the dialog.
 */
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

import {
  getLegalDoc,
  type LegalAudience,
  type LegalBlock,
  type LegalKind,
} from './legalDocs';
import './legal.css';

interface LegalModalProps {
  audience: LegalAudience;
  /** Which document to open first. */
  kind: LegalKind;
  onClose: () => void;
}

function Block({ block }: { block: LegalBlock }): JSX.Element {
  if (typeof block === 'string') return <p className="legal-p">{block}</p>;
  return (
    <ul className="legal-list">
      {block.list.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export function LegalModal({ audience, kind, onClose }: LegalModalProps): JSX.Element {
  const [current, setCurrent] = useState<LegalKind>(kind);
  const doc = getLegalDoc(audience, current);

  // Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="legal-overlay" role="dialog" aria-modal="true" aria-label={doc.title} onClick={onClose}>
      <div className="legal-card" onClick={(e) => e.stopPropagation()}>
        <header className="legal-head">
          <div className="legal-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={current === 'terms'}
              className={`legal-tab${current === 'terms' ? ' is-active' : ''}`}
              onClick={() => setCurrent('terms')}
            >
              Terms of Service
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={current === 'privacy'}
              className={`legal-tab${current === 'privacy' ? ' is-active' : ''}`}
              onClick={() => setCurrent('privacy')}
            >
              Privacy Policy
            </button>
          </div>
          <button type="button" className="legal-close" onClick={onClose} aria-label="Close">
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="legal-body">
          <h1 className="legal-title">{doc.title}</h1>
          <p className="legal-blurb">{doc.blurb}</p>

          {doc.sections.map((section) => (
            <section key={section.heading} className="legal-section">
              <h2 className="legal-h">{section.heading}</h2>
              {section.blocks.map((block, i) => (
                <Block key={i} block={block} />
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
