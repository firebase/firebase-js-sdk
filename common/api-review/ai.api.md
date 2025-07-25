## API Report File for "@firebase/ai"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts

import { AppCheckTokenResult } from '@firebase/app-check-interop-types';
import { FirebaseApp } from '@firebase/app';
import { FirebaseAuthTokenData } from '@firebase/auth-interop-types';
import { FirebaseError } from '@firebase/util';

// @public
export interface AI {
    app: FirebaseApp;
    backend: Backend;
    // @deprecated (undocumented)
    location: string;
}

// @public
export class AIError extends FirebaseError {
    constructor(code: AIErrorCode, message: string, customErrorData?: CustomErrorData | undefined);
    // (undocumented)
    readonly code: AIErrorCode;
    // (undocumented)
    readonly customErrorData?: CustomErrorData | undefined;
}

// @public
export const AIErrorCode: {
    readonly ERROR: "error";
    readonly REQUEST_ERROR: "request-error";
    readonly RESPONSE_ERROR: "response-error";
    readonly FETCH_ERROR: "fetch-error";
    readonly INVALID_CONTENT: "invalid-content";
    readonly API_NOT_ENABLED: "api-not-enabled";
    readonly INVALID_SCHEMA: "invalid-schema";
    readonly NO_API_KEY: "no-api-key";
    readonly NO_APP_ID: "no-app-id";
    readonly NO_MODEL: "no-model";
    readonly NO_PROJECT_ID: "no-project-id";
    readonly PARSE_FAILED: "parse-failed";
    readonly UNSUPPORTED: "unsupported";
};

// @public
export type AIErrorCode = (typeof AIErrorCode)[keyof typeof AIErrorCode];

// @public
export abstract class AIModel {
    // @internal
    protected constructor(ai: AI, modelName: string);
    // Warning: (ae-forgotten-export) The symbol "ApiSettings" needs to be exported by the entry point index.d.ts
    //
    // @internal (undocumented)
    protected _apiSettings: ApiSettings;
    readonly model: string;
    // @internal
    static normalizeModelName(modelName: string, backendType: BackendType): string;
    }

// @public
export interface AIOptions {
    backend: Backend;
}

// @public
export class AnyOfSchema extends Schema {
    constructor(schemaParams: SchemaParams & {
        anyOf: TypedSchema[];
    });
    // (undocumented)
    anyOf: TypedSchema[];
    // @internal (undocumented)
    toJSON(): SchemaRequest;
}

// @public
export class ArraySchema extends Schema {
    constructor(schemaParams: SchemaParams, items: TypedSchema);
    // (undocumented)
    items: TypedSchema;
    // @internal (undocumented)
    toJSON(): SchemaRequest;
}

// @public
export abstract class Backend {
    protected constructor(type: BackendType);
    readonly backendType: BackendType;
}

// @public
export const BackendType: {
    readonly VERTEX_AI: "VERTEX_AI";
    readonly GOOGLE_AI: "GOOGLE_AI";
};

// @public
export type BackendType = (typeof BackendType)[keyof typeof BackendType];

// @public
export interface BaseParams {
    // (undocumented)
    generationConfig?: GenerationConfig;
    // (undocumented)
    safetySettings?: SafetySetting[];
}

// @public
export const BlockReason: {
    readonly SAFETY: "SAFETY";
    readonly OTHER: "OTHER";
    readonly BLOCKLIST: "BLOCKLIST";
    readonly PROHIBITED_CONTENT: "PROHIBITED_CONTENT";
};

// @public
export type BlockReason = (typeof BlockReason)[keyof typeof BlockReason];

// @public
export class BooleanSchema extends Schema {
    constructor(schemaParams?: SchemaParams);
}

// @public
export class ChatSession {
    constructor(apiSettings: ApiSettings, model: string, params?: StartChatParams | undefined, requestOptions?: RequestOptions | undefined);
    getHistory(): Promise<Content[]>;
    // (undocumented)
    model: string;
    // (undocumented)
    params?: StartChatParams | undefined;
    // (undocumented)
    requestOptions?: RequestOptions | undefined;
    sendMessage(request: string | Array<string | Part>): Promise<GenerateContentResult>;
    sendMessageStream(request: string | Array<string | Part>): Promise<GenerateContentStreamResult>;
    }

// @public
export interface Citation {
    // (undocumented)
    endIndex?: number;
    // (undocumented)
    license?: string;
    publicationDate?: Date_2;
    // (undocumented)
    startIndex?: number;
    title?: string;
    // (undocumented)
    uri?: string;
}

// @public
export interface CitationMetadata {
    // (undocumented)
    citations: Citation[];
}

// @public
export interface Content {
    // (undocumented)
    parts: Part[];
    // (undocumented)
    role: Role;
}

// @public
export interface CountTokensRequest {
    // (undocumented)
    contents: Content[];
    generationConfig?: GenerationConfig;
    systemInstruction?: string | Part | Content;
    tools?: Tool[];
}

// @public
export interface CountTokensResponse {
    promptTokensDetails?: ModalityTokenCount[];
    // @deprecated (undocumented)
    totalBillableCharacters?: number;
    totalTokens: number;
}

// @public
export interface CustomErrorData {
    errorDetails?: ErrorDetails[];
    response?: GenerateContentResponse;
    status?: number;
    statusText?: string;
}

// @public
interface Date_2 {
    // (undocumented)
    day: number;
    // (undocumented)
    month: number;
    // (undocumented)
    year: number;
}

export { Date_2 as Date }

// @public
export interface EnhancedGenerateContentResponse extends GenerateContentResponse {
    // (undocumented)
    functionCalls: () => FunctionCall[] | undefined;
    inlineDataParts: () => InlineDataPart[] | undefined;
    text: () => string;
}

// @public
export interface ErrorDetails {
    // (undocumented)
    '@type'?: string;
    [key: string]: unknown;
    domain?: string;
    metadata?: Record<string, unknown>;
    reason?: string;
}

// @public
export interface FileData {
    // (undocumented)
    fileUri: string;
    // (undocumented)
    mimeType: string;
}

// @public
export interface FileDataPart {
    // (undocumented)
    fileData: FileData;
    // (undocumented)
    functionCall?: never;
    // (undocumented)
    functionResponse?: never;
    // (undocumented)
    inlineData?: never;
    // (undocumented)
    text?: never;
}

// @public
export const FinishReason: {
    readonly STOP: "STOP";
    readonly MAX_TOKENS: "MAX_TOKENS";
    readonly SAFETY: "SAFETY";
    readonly RECITATION: "RECITATION";
    readonly OTHER: "OTHER";
    readonly BLOCKLIST: "BLOCKLIST";
    readonly PROHIBITED_CONTENT: "PROHIBITED_CONTENT";
    readonly SPII: "SPII";
    readonly MALFORMED_FUNCTION_CALL: "MALFORMED_FUNCTION_CALL";
};

// @public
export type FinishReason = (typeof FinishReason)[keyof typeof FinishReason];

// @public
export interface FunctionCall {
    // (undocumented)
    args: object;
    // (undocumented)
    name: string;
}

// @public (undocumented)
export interface FunctionCallingConfig {
    // (undocumented)
    allowedFunctionNames?: string[];
    // (undocumented)
    mode?: FunctionCallingMode;
}

// @public (undocumented)
export const FunctionCallingMode: {
    readonly AUTO: "AUTO";
    readonly ANY: "ANY";
    readonly NONE: "NONE";
};

// @public (undocumented)
export type FunctionCallingMode = (typeof FunctionCallingMode)[keyof typeof FunctionCallingMode];

// @public
export interface FunctionCallPart {
    // (undocumented)
    functionCall: FunctionCall;
    // (undocumented)
    functionResponse?: never;
    // (undocumented)
    inlineData?: never;
    // (undocumented)
    text?: never;
}

// @public
export interface FunctionDeclaration {
    description: string;
    name: string;
    parameters?: ObjectSchema | ObjectSchemaRequest;
}

// @public
export interface FunctionDeclarationsTool {
    functionDeclarations?: FunctionDeclaration[];
}

// @public
export interface FunctionResponse {
    // (undocumented)
    name: string;
    // (undocumented)
    response: object;
}

// @public
export interface FunctionResponsePart {
    // (undocumented)
    functionCall?: never;
    // (undocumented)
    functionResponse: FunctionResponse;
    // (undocumented)
    inlineData?: never;
    // (undocumented)
    text?: never;
}

// @public
export interface GenerateContentCandidate {
    // (undocumented)
    citationMetadata?: CitationMetadata;
    // (undocumented)
    content: Content;
    // (undocumented)
    finishMessage?: string;
    // (undocumented)
    finishReason?: FinishReason;
    // (undocumented)
    groundingMetadata?: GroundingMetadata;
    // (undocumented)
    index: number;
    // (undocumented)
    safetyRatings?: SafetyRating[];
}

// @public
export interface GenerateContentRequest extends BaseParams {
    // (undocumented)
    contents: Content[];
    // (undocumented)
    systemInstruction?: string | Part | Content;
    // (undocumented)
    toolConfig?: ToolConfig;
    // (undocumented)
    tools?: Tool[];
}

// @public
export interface GenerateContentResponse {
    // (undocumented)
    candidates?: GenerateContentCandidate[];
    // (undocumented)
    promptFeedback?: PromptFeedback;
    // (undocumented)
    usageMetadata?: UsageMetadata;
}

// @public
export interface GenerateContentResult {
    // (undocumented)
    response: EnhancedGenerateContentResponse;
}

// @public
export interface GenerateContentStreamResult {
    // (undocumented)
    response: Promise<EnhancedGenerateContentResponse>;
    // (undocumented)
    stream: AsyncGenerator<EnhancedGenerateContentResponse>;
}

// @public
export interface GenerationConfig {
    // (undocumented)
    candidateCount?: number;
    // (undocumented)
    frequencyPenalty?: number;
    // (undocumented)
    maxOutputTokens?: number;
    // (undocumented)
    presencePenalty?: number;
    responseMimeType?: string;
    // @beta
    responseModalities?: ResponseModality[];
    responseSchema?: TypedSchema | SchemaRequest;
    // (undocumented)
    stopSequences?: string[];
    // (undocumented)
    temperature?: number;
    thinkingConfig?: ThinkingConfig;
    // (undocumented)
    topK?: number;
    // (undocumented)
    topP?: number;
}

// @public
export interface GenerativeContentBlob {
    data: string;
    // (undocumented)
    mimeType: string;
}

// @public
export class GenerativeModel extends AIModel {
    constructor(ai: AI, modelParams: ModelParams, requestOptions?: RequestOptions);
    countTokens(request: CountTokensRequest | string | Array<string | Part>): Promise<CountTokensResponse>;
    generateContent(request: GenerateContentRequest | string | Array<string | Part>): Promise<GenerateContentResult>;
    generateContentStream(request: GenerateContentRequest | string | Array<string | Part>): Promise<GenerateContentStreamResult>;
    // (undocumented)
    generationConfig: GenerationConfig;
    // (undocumented)
    requestOptions?: RequestOptions;
    // (undocumented)
    safetySettings: SafetySetting[];
    startChat(startChatParams?: StartChatParams): ChatSession;
    // (undocumented)
    systemInstruction?: Content;
    // (undocumented)
    toolConfig?: ToolConfig;
    // (undocumented)
    tools?: Tool[];
}

// @public
export function getAI(app?: FirebaseApp, options?: AIOptions): AI;

// @public
export function getGenerativeModel(ai: AI, modelParams: ModelParams, requestOptions?: RequestOptions): GenerativeModel;

// @beta
export function getImagenModel(ai: AI, modelParams: ImagenModelParams, requestOptions?: RequestOptions): ImagenModel;

// @public
export class GoogleAIBackend extends Backend {
    constructor();
}

// Warning: (ae-internal-missing-underscore) The name "GoogleAICitationMetadata" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export interface GoogleAICitationMetadata {
    // (undocumented)
    citationSources: Citation[];
}

// Warning: (ae-internal-missing-underscore) The name "GoogleAICountTokensRequest" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export interface GoogleAICountTokensRequest {
    // (undocumented)
    generateContentRequest: {
        model: string;
        contents: Content[];
        systemInstruction?: string | Part | Content;
        tools?: Tool[];
        generationConfig?: GenerationConfig;
    };
}

// Warning: (ae-internal-missing-underscore) The name "GoogleAIGenerateContentCandidate" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export interface GoogleAIGenerateContentCandidate {
    // (undocumented)
    citationMetadata?: GoogleAICitationMetadata;
    // (undocumented)
    content: Content;
    // (undocumented)
    finishMessage?: string;
    // (undocumented)
    finishReason?: FinishReason;
    // (undocumented)
    groundingMetadata?: GroundingMetadata;
    // (undocumented)
    index: number;
    // (undocumented)
    safetyRatings?: SafetyRating[];
}

// Warning: (ae-internal-missing-underscore) The name "GoogleAIGenerateContentResponse" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export interface GoogleAIGenerateContentResponse {
    // (undocumented)
    candidates?: GoogleAIGenerateContentCandidate[];
    // (undocumented)
    promptFeedback?: PromptFeedback;
    // (undocumented)
    usageMetadata?: UsageMetadata;
}

// @public
export interface GoogleSearch {
}

// @public
export interface GoogleSearchTool {
    googleSearch: GoogleSearch;
}

// @public
export interface GroundingChunk {
    web?: WebGroundingChunk;
}

// @public
export interface GroundingMetadata {
    groundingChunks?: GroundingChunk[];
    groundingSupports?: GroundingSupport[];
    // @deprecated (undocumented)
    retrievalQueries?: string[];
    searchEntryPoint?: SearchEntrypoint;
    webSearchQueries?: string[];
}

// @public
export interface GroundingSupport {
    groundingChunkIndices?: number[];
    segment?: Segment;
}

// @public
export const HarmBlockMethod: {
    readonly SEVERITY: "SEVERITY";
    readonly PROBABILITY: "PROBABILITY";
};

// @public
export type HarmBlockMethod = (typeof HarmBlockMethod)[keyof typeof HarmBlockMethod];

// @public
export const HarmBlockThreshold: {
    readonly BLOCK_LOW_AND_ABOVE: "BLOCK_LOW_AND_ABOVE";
    readonly BLOCK_MEDIUM_AND_ABOVE: "BLOCK_MEDIUM_AND_ABOVE";
    readonly BLOCK_ONLY_HIGH: "BLOCK_ONLY_HIGH";
    readonly BLOCK_NONE: "BLOCK_NONE";
    readonly OFF: "OFF";
};

// @public
export type HarmBlockThreshold = (typeof HarmBlockThreshold)[keyof typeof HarmBlockThreshold];

// @public
export const HarmCategory: {
    readonly HARM_CATEGORY_HATE_SPEECH: "HARM_CATEGORY_HATE_SPEECH";
    readonly HARM_CATEGORY_SEXUALLY_EXPLICIT: "HARM_CATEGORY_SEXUALLY_EXPLICIT";
    readonly HARM_CATEGORY_HARASSMENT: "HARM_CATEGORY_HARASSMENT";
    readonly HARM_CATEGORY_DANGEROUS_CONTENT: "HARM_CATEGORY_DANGEROUS_CONTENT";
};

// @public
export type HarmCategory = (typeof HarmCategory)[keyof typeof HarmCategory];

// @public
export const HarmProbability: {
    readonly NEGLIGIBLE: "NEGLIGIBLE";
    readonly LOW: "LOW";
    readonly MEDIUM: "MEDIUM";
    readonly HIGH: "HIGH";
};

// @public
export type HarmProbability = (typeof HarmProbability)[keyof typeof HarmProbability];

// @public
export const HarmSeverity: {
    readonly HARM_SEVERITY_NEGLIGIBLE: "HARM_SEVERITY_NEGLIGIBLE";
    readonly HARM_SEVERITY_LOW: "HARM_SEVERITY_LOW";
    readonly HARM_SEVERITY_MEDIUM: "HARM_SEVERITY_MEDIUM";
    readonly HARM_SEVERITY_HIGH: "HARM_SEVERITY_HIGH";
    readonly HARM_SEVERITY_UNSUPPORTED: "HARM_SEVERITY_UNSUPPORTED";
};

// @public
export type HarmSeverity = (typeof HarmSeverity)[keyof typeof HarmSeverity];

// @beta
export const ImagenAspectRatio: {
    readonly SQUARE: "1:1";
    readonly LANDSCAPE_3x4: "3:4";
    readonly PORTRAIT_4x3: "4:3";
    readonly LANDSCAPE_16x9: "16:9";
    readonly PORTRAIT_9x16: "9:16";
};

// @beta
export type ImagenAspectRatio = (typeof ImagenAspectRatio)[keyof typeof ImagenAspectRatio];

// @public
export interface ImagenGCSImage {
    gcsURI: string;
    mimeType: string;
}

// @beta
export interface ImagenGenerationConfig {
    addWatermark?: boolean;
    aspectRatio?: ImagenAspectRatio;
    imageFormat?: ImagenImageFormat;
    negativePrompt?: string;
    numberOfImages?: number;
}

// @beta
export interface ImagenGenerationResponse<T extends ImagenInlineImage | ImagenGCSImage> {
    filteredReason?: string;
    images: T[];
}

// @beta
export class ImagenImageFormat {
    compressionQuality?: number;
    static jpeg(compressionQuality?: number): ImagenImageFormat;
    mimeType: string;
    static png(): ImagenImageFormat;
}

// @beta
export interface ImagenInlineImage {
    bytesBase64Encoded: string;
    mimeType: string;
}

// @beta
export class ImagenModel extends AIModel {
    constructor(ai: AI, modelParams: ImagenModelParams, requestOptions?: RequestOptions | undefined);
    generateImages(prompt: string): Promise<ImagenGenerationResponse<ImagenInlineImage>>;
    // @internal
    generateImagesGCS(prompt: string, gcsURI: string): Promise<ImagenGenerationResponse<ImagenGCSImage>>;
    generationConfig?: ImagenGenerationConfig;
    // (undocumented)
    requestOptions?: RequestOptions | undefined;
    safetySettings?: ImagenSafetySettings;
}

// @beta
export interface ImagenModelParams {
    generationConfig?: ImagenGenerationConfig;
    model: string;
    safetySettings?: ImagenSafetySettings;
}

// @beta
export const ImagenPersonFilterLevel: {
    readonly BLOCK_ALL: "dont_allow";
    readonly ALLOW_ADULT: "allow_adult";
    readonly ALLOW_ALL: "allow_all";
};

// @beta
export type ImagenPersonFilterLevel = (typeof ImagenPersonFilterLevel)[keyof typeof ImagenPersonFilterLevel];

// @beta
export const ImagenSafetyFilterLevel: {
    readonly BLOCK_LOW_AND_ABOVE: "block_low_and_above";
    readonly BLOCK_MEDIUM_AND_ABOVE: "block_medium_and_above";
    readonly BLOCK_ONLY_HIGH: "block_only_high";
    readonly BLOCK_NONE: "block_none";
};

// @beta
export type ImagenSafetyFilterLevel = (typeof ImagenSafetyFilterLevel)[keyof typeof ImagenSafetyFilterLevel];

// @beta
export interface ImagenSafetySettings {
    personFilterLevel?: ImagenPersonFilterLevel;
    safetyFilterLevel?: ImagenSafetyFilterLevel;
}

// @public
export interface InlineDataPart {
    // (undocumented)
    functionCall?: never;
    // (undocumented)
    functionResponse?: never;
    // (undocumented)
    inlineData: GenerativeContentBlob;
    // (undocumented)
    text?: never;
    videoMetadata?: VideoMetadata;
}

// @public
export class IntegerSchema extends Schema {
    constructor(schemaParams?: SchemaParams);
}

// @public
export const Modality: {
    readonly MODALITY_UNSPECIFIED: "MODALITY_UNSPECIFIED";
    readonly TEXT: "TEXT";
    readonly IMAGE: "IMAGE";
    readonly VIDEO: "VIDEO";
    readonly AUDIO: "AUDIO";
    readonly DOCUMENT: "DOCUMENT";
};

// @public
export type Modality = (typeof Modality)[keyof typeof Modality];

// @public
export interface ModalityTokenCount {
    modality: Modality;
    tokenCount: number;
}

// @public
export interface ModelParams extends BaseParams {
    // (undocumented)
    model: string;
    // (undocumented)
    systemInstruction?: string | Part | Content;
    // (undocumented)
    toolConfig?: ToolConfig;
    // (undocumented)
    tools?: Tool[];
}

// @public
export class NumberSchema extends Schema {
    constructor(schemaParams?: SchemaParams);
}

// @public
export class ObjectSchema extends Schema {
    constructor(schemaParams: SchemaParams, properties: {
        [k: string]: TypedSchema;
    }, optionalProperties?: string[]);
    // (undocumented)
    optionalProperties: string[];
    // (undocumented)
    properties: {
        [k: string]: TypedSchema;
    };
    // @internal (undocumented)
    toJSON(): SchemaRequest;
}

// @public
export interface ObjectSchemaRequest extends SchemaRequest {
    optionalProperties?: never;
    // (undocumented)
    type: 'object';
}

// @public
export type Part = TextPart | InlineDataPart | FunctionCallPart | FunctionResponsePart | FileDataPart;

// @public
export const POSSIBLE_ROLES: readonly ["user", "model", "function", "system"];

// @public
export interface PromptFeedback {
    // (undocumented)
    blockReason?: BlockReason;
    blockReasonMessage?: string;
    // (undocumented)
    safetyRatings: SafetyRating[];
}

// @public
export interface RequestOptions {
    baseUrl?: string;
    timeout?: number;
}

// @beta
export const ResponseModality: {
    readonly TEXT: "TEXT";
    readonly IMAGE: "IMAGE";
};

// @beta
export type ResponseModality = (typeof ResponseModality)[keyof typeof ResponseModality];

// @public (undocumented)
export interface RetrievedContextAttribution {
    // (undocumented)
    title: string;
    // (undocumented)
    uri: string;
}

// @public
export type Role = (typeof POSSIBLE_ROLES)[number];

// @public
export interface SafetyRating {
    // (undocumented)
    blocked: boolean;
    // (undocumented)
    category: HarmCategory;
    // (undocumented)
    probability: HarmProbability;
    probabilityScore: number;
    severity: HarmSeverity;
    severityScore: number;
}

// @public
export interface SafetySetting {
    // (undocumented)
    category: HarmCategory;
    method?: HarmBlockMethod;
    // (undocumented)
    threshold: HarmBlockThreshold;
}

// @public
export abstract class Schema implements SchemaInterface {
    constructor(schemaParams: SchemaInterface);
    [key: string]: unknown;
    // (undocumented)
    static anyOf(anyOfParams: SchemaParams & {
        anyOf: TypedSchema[];
    }): AnyOfSchema;
    // (undocumented)
    static array(arrayParams: SchemaParams & {
        items: Schema;
    }): ArraySchema;
    // (undocumented)
    static boolean(booleanParams?: SchemaParams): BooleanSchema;
    description?: string;
    // (undocumented)
    static enumString(stringParams: SchemaParams & {
        enum: string[];
    }): StringSchema;
    example?: unknown;
    format?: string;
    // (undocumented)
    static integer(integerParams?: SchemaParams): IntegerSchema;
    items?: SchemaInterface;
    maxItems?: number;
    minItems?: number;
    nullable: boolean;
    // (undocumented)
    static number(numberParams?: SchemaParams): NumberSchema;
    // (undocumented)
    static object(objectParams: SchemaParams & {
        properties: {
            [k: string]: Schema;
        };
        optionalProperties?: string[];
    }): ObjectSchema;
    // (undocumented)
    static string(stringParams?: SchemaParams): StringSchema;
    // @internal
    toJSON(): SchemaRequest;
    type?: SchemaType;
}

// @public
export interface SchemaInterface extends SchemaShared<SchemaInterface> {
    type?: SchemaType;
}

// @public
export interface SchemaParams extends SchemaShared<SchemaInterface> {
}

// @public
export interface SchemaRequest extends SchemaShared<SchemaRequest> {
    required?: string[];
    type?: SchemaType;
}

// @public
export interface SchemaShared<T> {
    // (undocumented)
    [key: string]: unknown;
    anyOf?: T[];
    description?: string;
    enum?: string[];
    example?: unknown;
    format?: string;
    items?: T;
    maximum?: number;
    maxItems?: number;
    minimum?: number;
    minItems?: number;
    nullable?: boolean;
    properties?: {
        [k: string]: T;
    };
    propertyOrdering?: string[];
    title?: string;
}

// @public
export const SchemaType: {
    readonly STRING: "string";
    readonly NUMBER: "number";
    readonly INTEGER: "integer";
    readonly BOOLEAN: "boolean";
    readonly ARRAY: "array";
    readonly OBJECT: "object";
};

// @public
export type SchemaType = (typeof SchemaType)[keyof typeof SchemaType];

// @public
export interface SearchEntrypoint {
    renderedContent?: string;
}

// @public
export interface Segment {
    endIndex: number;
    partIndex: number;
    startIndex: number;
    text: string;
}

// @public
export interface StartChatParams extends BaseParams {
    // (undocumented)
    history?: Content[];
    // (undocumented)
    systemInstruction?: string | Part | Content;
    // (undocumented)
    toolConfig?: ToolConfig;
    // (undocumented)
    tools?: Tool[];
}

// @public
export class StringSchema extends Schema {
    constructor(schemaParams?: SchemaParams, enumValues?: string[]);
    // (undocumented)
    enum?: string[];
    // @internal (undocumented)
    toJSON(): SchemaRequest;
}

// @public
export interface TextPart {
    // (undocumented)
    functionCall?: never;
    // (undocumented)
    functionResponse?: never;
    // (undocumented)
    inlineData?: never;
    // (undocumented)
    text: string;
}

// @public
export interface ThinkingConfig {
    thinkingBudget?: number;
}

// @public
export type Tool = FunctionDeclarationsTool | GoogleSearchTool;

// @public
export interface ToolConfig {
    // (undocumented)
    functionCallingConfig?: FunctionCallingConfig;
}

// @public
export type TypedSchema = IntegerSchema | NumberSchema | StringSchema | BooleanSchema | ObjectSchema | ArraySchema | AnyOfSchema;

// @public
export interface UsageMetadata {
    // (undocumented)
    candidatesTokenCount: number;
    // (undocumented)
    candidatesTokensDetails?: ModalityTokenCount[];
    // (undocumented)
    promptTokenCount: number;
    // (undocumented)
    promptTokensDetails?: ModalityTokenCount[];
    thoughtsTokenCount?: number;
    // (undocumented)
    totalTokenCount: number;
}

// @public
export class VertexAIBackend extends Backend {
    constructor(location?: string);
    readonly location: string;
}

// @public
export interface VideoMetadata {
    endOffset: string;
    startOffset: string;
}

// @public (undocumented)
export interface WebAttribution {
    // (undocumented)
    title: string;
    // (undocumented)
    uri: string;
}

// @public
export interface WebGroundingChunk {
    domain?: string;
    title?: string;
    uri?: string;
}


```
