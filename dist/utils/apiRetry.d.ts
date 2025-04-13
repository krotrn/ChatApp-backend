export interface IApiCall<T> {
    (): Promise<T>;
}
export declare const resilientApiCall: <T>(fn: IApiCall<T>, retries?: number) => Promise<T>;
