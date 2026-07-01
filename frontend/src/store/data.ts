/** Static practice content + encouragement copy. No "wrong" answers exist. */

export const READ_SENTENCES: string[] = [
  'The sun is bright today.',
  'I like to play outside.',
  'My dog runs very fast.',
  'We are going to the park.',
  'Reading out loud is fun.',
  'I can do hard things.',
  'Slow and steady is okay.',
  'My voice is strong and clear.',
];

/** Warm, varied praise. Effort is always celebrated — stutters are welcome. */
export const PRAISE: string[] = [
  'Awesome try!',
  'You did it!',
  'Great speaking!',
  'Nice and clear!',
  'Keep it up!',
  'Way to go!',
  'Brilliant!',
  'I love your voice!',
  'Super effort!',
  'You are doing great!',
];

export function randomFrom<T>(list: readonly T[], avoid?: T): T {
  if (list.length === 1) return list[0];
  let pick = list[Math.floor(Math.random() * list.length)];
  while (avoid !== undefined && pick === avoid) {
    pick = list[Math.floor(Math.random() * list.length)];
  }
  return pick;
}
