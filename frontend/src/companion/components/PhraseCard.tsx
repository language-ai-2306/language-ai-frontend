/** PhraseCard — the floating card showing the phrase to practise. */
export function PhraseCard({ phrase }: { phrase: string }): JSX.Element {
  return (
    <div className="phrase-card">
      <span className="phrase-card__eyebrow">Say this</span>
      <p className="phrase-card__text">{phrase}</p>
    </div>
  );
}
