export interface LanguageModel extends EventTarget {
    create(options?: LanguageModelCreateOptions): Promise<LanguageModel>;
    availability(options?: LanguageModelCreateCoreOptions): Promise<Availability>;
    prompt(input: LanguageModelPrompt, options?: LanguageModelPromptOptions): Promise<string>;
    promptStreaming(input: LanguageModelPrompt, options?: LanguageModelPromptOptions): ReadableStream;
    measureInputUsage(input: LanguageModelPrompt, options?: LanguageModelPromptOptions): Promise<number>;
    destroy(): undefined;
}
enum Availability { "unavailable", "downloadable", "downloading", "available" };
interface LanguageModelParams {
    readonly defaultTopK: number;
    readonly maxTopK: number;
    readonly defaultTemperature: number;
    readonly maxTemperature: number;
}
interface LanguageModelCreateCoreOptions {
    topK?: number;
    temperature?: number;
    expectedInputs?: LanguageModelExpectedInput[];
}
interface LanguageModelCreateOptions extends LanguageModelCreateCoreOptions {
    signal?: AbortSignal;
    systemPrompt?: string;
    initialPrompts?: LanguageModelInitialPrompts;
}
interface LanguageModelPromptOptions {
    signal?: AbortSignal;
}
interface LanguageModelExpectedInput {
    type: LanguageModelMessageType;
    languages?: string[];
}
type LanguageModelPrompt = LanguageModelMessage[] | LanguageModelMessageShorthand[] | string;
type LanguageModelInitialPrompts = LanguageModelMessage[] | LanguageModelMessageShorthand[];
interface LanguageModelMessage {
    role: LanguageModelMessageRole;
    content: LanguageModelMessageContent[];
}
interface LanguageModelMessageShorthand {
    role: LanguageModelMessageRole;
    content: string;
}
interface LanguageModelMessageContent {
    type: LanguageModelMessageType;
    content: LanguageModelMessageContentValue;
}
interface LanguageModelPromptDict {
    role?: LanguageModelMessageRole;
    type?: LanguageModelMessageType;
    content: LanguageModelMessageContent;
}
type LanguageModelMessageRole = "system" | "user" | "assistant";
type LanguageModelMessageType = "text" | "image" | "audio";
type LanguageModelMessageContentValue = ImageBitmapSource | AudioBuffer | BufferSource | string;