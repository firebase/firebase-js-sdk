/**
 * Shims @types/dom-chromium-ai
 * TODO: replace with @types/dom-chromium-ai once we can use es2020.intl.
 */
export interface AI {
    readonly languageModel: AILanguageModelFactory;
}

interface AICreateMonitor extends EventTarget {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ondownloadprogress: ((this: AICreateMonitor, ev: DownloadProgressEvent) => any) | null;

    addEventListener<K extends keyof AICreateMonitorEventMap>(
        type: K,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        listener: (this: AICreateMonitor, ev: AICreateMonitorEventMap[K]) => any,
        options?: boolean | AddEventListenerOptions,
    ): void;
    addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
    ): void;
    removeEventListener<K extends keyof AICreateMonitorEventMap>(
        type: K,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        listener: (this: AICreateMonitor, ev: AICreateMonitorEventMap[K]) => any,
        options?: boolean | EventListenerOptions,
    ): void;
    removeEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions,
    ): void;
}

interface DownloadProgressEvent extends Event {
    readonly loaded: number;
    readonly total: number;
}

interface AICreateMonitorEventMap {
    downloadprogress: DownloadProgressEvent;
}

type AICreateMonitorCallback = (monitor: AICreateMonitor) => void;

type AICapabilityAvailability = "readily" | "after-download" | "no";

// Language Model
// https://github.com/explainers-by-googlers/prompt-api/#full-api-surface-in-web-idl

interface AILanguageModelFactory {
    create(
        options?: AILanguageModelCreateOptionsWithSystemPrompt | AILanguageModelCreateOptionsWithoutSystemPrompt,
    ): Promise<AILanguageModel>;
    capabilities(): Promise<AILanguageModelCapabilities>;
}

interface AILanguageModelCreateOptions {
    signal?: AbortSignal;
    monitor?: AICreateMonitorCallback;

    topK?: number;
    temperature?: number;
}

export interface AILanguageModelCreateOptionsWithSystemPrompt extends AILanguageModelCreateOptions {
    systemPrompt?: string;
    initialPrompts?: AILanguageModelPrompt[];
}

interface AILanguageModelCreateOptionsWithoutSystemPrompt extends AILanguageModelCreateOptions {
    systemPrompt?: never;
    initialPrompts?:
        | [AILanguageModelSystemPrompt, ...AILanguageModelPrompt[]]
        | AILanguageModelPrompt[];
}

type AILanguageModelPromptRole = "user" | "assistant";
type AILanguageModelInitialPromptRole = "system" | AILanguageModelPromptRole;

interface AILanguageModelPrompt {
    role: AILanguageModelPromptRole;
    content: string;
}

interface AILanguageModelInitialPrompt {
    role: AILanguageModelInitialPromptRole;
    content: string;
}

interface AILanguageModelSystemPrompt extends AILanguageModelInitialPrompt {
    role: "system";
}

type AILanguageModelPromptInput = string | AILanguageModelPrompt | AILanguageModelPrompt[];

interface AILanguageModel extends EventTarget {
    prompt(input: AILanguageModelPromptInput, options?: AILanguageModelPromptOptions): Promise<string>;
    promptStreaming(input: AILanguageModelPromptInput, options?: AILanguageModelPromptOptions): ReadableStream<string>;

    countPromptTokens(input: AILanguageModelPromptInput, options?: AILanguageModelPromptOptions): Promise<number>;
    readonly maxTokens: number;
    readonly tokensSoFar: number;
    readonly tokensLeft: number;

    readonly topK: number;
    readonly temperature: number;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    oncontextoverflow: ((this: AILanguageModel, ev: Event) => any) | null;

    addEventListener<K extends keyof AILanguageModelEventMap>(
        type: K,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        listener: (this: AILanguageModel, ev: AILanguageModelEventMap[K]) => any,
        options?: boolean | AddEventListenerOptions,
    ): void;
    addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
    ): void;
    removeEventListener<K extends keyof AILanguageModelEventMap>(
        type: K,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        listener: (this: AILanguageModel, ev: AILanguageModelEventMap[K]) => any,
        options?: boolean | EventListenerOptions,
    ): void;
    removeEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions,
    ): void;

    clone(options?: AILanguageModelCloneOptions): Promise<AILanguageModel>;
    destroy(): void;
}

interface AILanguageModelEventMap {
    contextoverflow: Event;
}

interface AILanguageModelPromptOptions {
    signal?: AbortSignal;
}

interface AILanguageModelCloneOptions {
    signal?: AbortSignal;
}

interface AILanguageModelCapabilities {
    readonly available: AICapabilityAvailability;
    languageAvailable(languageTag: Intl.UnicodeBCP47LocaleIdentifier): AICapabilityAvailability;

    readonly defaultTopK: number | null;
    readonly maxTopK: number | null;
    readonly defaultTemperature: number | null;
    readonly maxTemperature: number | null;
}
