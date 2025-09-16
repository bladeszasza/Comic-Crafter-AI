/**
 * A utility function to wrap an asynchronous function, log its execution time,
 * and provide formatted output to the console.
 * @param description A description of the operation being timed.
 * @param promiseFn A function that returns the promise to be executed.
 * @returns The result of the promise.
 */
export async function logExecutionTime<T>(description: string, promiseFn: () => Promise<T>): Promise<T> {
  console.log(`%c[START] ${description}`, 'color: #3498db; font-weight: bold;');
  const startTime = performance.now();
  try {
    const result = await promiseFn();
    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`%c[ END ] ${description} - Took ${duration} seconds.`, 'color: #2ecc71; font-weight: bold;');
    return result;
  } catch (error) {
    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    console.error(`%c[FAIL ] ${description} - Failed after ${duration} seconds.`, 'color: #e74c3c; font-weight: bold;');
    // It's important to re-throw the error so the application's error handling works as expected.
    throw error;
  }
}