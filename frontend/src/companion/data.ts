/** Practice phrases + encouraging feedback copy for the prototype. */
import type { FeedbackResult } from './types';

/**
 * Assigned practice phrases. Index 2 is the sample the screen opens on, so the
 * child first sees "Phrase 3 of 8" with the rabbit phrase from the brief.
 */
export const PHRASES: string[] = [
  'The sun is shining in the sky.',
  'My cat likes to chase the ball.',
  'The little rabbit jumped over the log.',
  'We are going to the park today.',
  'I can ride my bike very fast.',
  'The green frog hops from leaf to leaf.',
  'Pancakes taste yummy in the morning.',
  'Goodnight moon, goodnight little stars.',
];

/** Where the screen starts — opens on phrase 3 of 8 per the brief. */
export const START_INDEX = 2;

export const SUCCESS_FEEDBACK: FeedbackResult[] = [
  {
    tone: 'success',
    message: 'Wonderful effort! You stayed with the whole phrase.',
    tip: 'You kept a lovely, steady pace.',
  },
  {
    tone: 'success',
    message: 'Lovely speaking! That sounded smooth and clear.',
    tip: 'Take a breath and enjoy the next one.',
  },
  {
    tone: 'success',
    message: 'You did it! I heard every single word.',
    tip: 'Your speaking voice is getting stronger.',
  },
];

export const RETRY_FEEDBACK: FeedbackResult[] = [
  {
    tone: 'retry',
    message: 'Nice effort! Let us try the first part once more.',
    tip: 'Start gently and take your time.',
  },
  {
    tone: 'retry',
    message: 'Good try! Want to give that one another go?',
    tip: 'There is no rush at all — I am right here.',
  },
  {
    tone: 'retry',
    message: 'Great trying! Let us say it slowly together.',
    tip: 'Slow and steady is perfect.',
  },
];

export function randomFrom<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}
