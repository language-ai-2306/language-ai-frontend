/** Read-aloud — the user reads a displayed sentence at their own pace. */
import { PracticeScreen } from './PracticeScreen';
import { READ_SENTENCES } from '../store/data';

export function ReadAloudScreen(): JSX.Element {
  return (
    <PracticeScreen
      title="Read aloud"
      exercise="read"
      items={READ_SENTENCES}
      instruction="Read the sentence out loud, nice and slow. Take your time."
      speakRate={0.85}
      renderTarget={(sentence) => <p className="reading-text">{sentence}</p>}
    />
  );
}
