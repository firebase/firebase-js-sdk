export interface ApplicationVerifier {
    readonly type: string;
    verify(): Promise<string>;
}