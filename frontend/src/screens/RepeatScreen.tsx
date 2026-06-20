/** Repeat-after-me — the avatar says a word, the user says it back. */
import { PracticeScreen } from './PracticeScreen';
import { REPEAT_WORDS } from '../store/data';

export function RepeatScreen(): JSX.Element {
  return (
    <PracticeScreen
      title="Repeat after me"
      exercise="repeat"
      items={REPEAT_WORDS}
      instruction="Listen to the word, then tap the mic and say it back."
      renderTarget={(word) => <p className="target-word">{word}</p>}
    />
  );
}
