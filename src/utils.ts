export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const retry = async <T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 3000
): Promise<T> => {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt < retries - 1) {
        console.warn(`Retrying... (${attempt + 1}/${retries})`);
        await delay(delayMs);
      } else {
        console.error(`Failed after ${retries} attempts.`);
        throw error;
      }
    }
  }
  throw new Error('Function failed after all retries');
};

export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}
