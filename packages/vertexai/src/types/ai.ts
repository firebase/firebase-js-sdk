/**
 * Shims @types/dom-chromium-ai
 * TODO: replace with @types/dom-chromium-ai once we can use es2020.intl.
 */
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

// Language Model
// https://github.com/explainers-by-googlers/prompt-api/#full-api-surface-in-web-idl

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

type AILanguageModelPromptRole = "user" | "assistant";

interface AILanguageModelPrompt {
    role: AILanguageModelPromptRole;
    content: string;
}
