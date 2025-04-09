export interface IApiCall<T> {
  (): Promise<T>;
}

export const resilientApiCall = async <T>(
  fn: IApiCall<T>,
  retries: number = 3,
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await new Promise<void>((res) => setTimeout(res, 1000 * (4 - retries)));
      return resilientApiCall(fn, retries - 1);
    }
    throw error;
  }
};
