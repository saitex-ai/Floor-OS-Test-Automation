/**
 * Random lowercase letters, for unique test-data names in fields validated
 * "Alphabets only" (e.g. Contact Name), where a timestamp can't be used.
 */
export function randomLetters(length = 8): string {
  return Array.from({ length }, () =>
    String.fromCharCode(97 + Math.floor(Math.random() * 26)),
  ).join('');
}
