export interface LanguageModel extends EventTarget {
    create(options?: LanguageModelCreateOptions): Promise<LanguageModel>;
    availability(options?: LanguageModelCreateCoreOptions): Promise<Availability>;
    prompt(input: LanguageModelPrompt, options?: LanguageModelPromptOptions): Promise<string>;
    promptStreaming(input: LanguageModelPrompt, options?: LanguageModelPromptOptions): ReadableStream;
    measureInputUsage(input: LanguageModelPrompt, options?: LanguageModelPromptOptions): Promise<number>;
    destroy(): undefined;
}
export enum Availability { "unavailable", "downloadable", "downloading", "available" };
export interface LanguageModelParams {
    readonly defaultTopK: number;
    readonly maxTopK: number;
    readonly defaultTemperature: number;
    readonly maxTemperature: number;
}
export interface LanguageModelCreateCoreOptions {
    topK?: number;
    temperature?: number;
    expectedInputs?: Array<LanguageModelExpectedInput>;
}
export interface LanguageModelCreateOptions extends LanguageModelCreateCoreOptions {
    signal?: AbortSignal;
    monitor?: AICreateMonitorCallback;
    systemPrompt?: string;
    initialPrompts?: LanguageModelInitialPrompts;
}
export interface LanguageModelPromptOptions {
    responseJSONSchema?: any;
    signal?: AbortSignal;
}
export interface LanguageModelExpectedInput {
    type: LanguageModelMessageType;
    languages?: Array<string>;
}
export type LanguageModelPrompt = Array<LanguageModelMessage> | Array<LanguageModelMessageShorthand> | string;
export type LanguageModelInitialPrompts = Array<LanguageModelMessage> | Array<LanguageModelMessageShorthand>;
export interface LanguageModelMessage {
    role: LanguageModelMessageRole;
    content: Array<LanguageModelMessageContent>;
}
export interface LanguageModelMessageShorthand {
    role: LanguageModelMessageRole;
    content: string;
}
export interface LanguageModelMessageContent {
    type: LanguageModelMessageType;
    content: LanguageModelMessageContentValue;
}
export interface LanguageModelPromptDict {
    role?: LanguageModelMessageRole;
    type?: LanguageModelMessageType;
    content: LanguageModelMessageContent;
}
export type LanguageModelMessageRole = "system" | "user" | "assistant";
export type LanguageModelMessageType = "text" | "image" | "audio";
export type LanguageModelMessageContentValue = ImageBitmapSource | AudioBuffer | BufferSource | string;