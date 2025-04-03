import {
  Content,
  CountTokensResponse,
  GenerateContentRequest,
  GenerateContentResult,
  GenerateContentStreamResult,
  Part,
  TextPart
} from '../types';
import { GenerativeModel } from './generative-model';
import { ChatSession } from '../methods/chat-session';
// The intersection of Vertex's Role and Chrome's AILanguageModelPromptRole
type LocalRole = 'user' | 'model';
type LocalPart = TextPart;
// The intersection of Vertex's Content and Chrome's AILanguageModelPrompt
interface LocalContent {
  role: LocalRole;
  parts: LocalPart[];
}
// The intersection of Vertex's GenerateContentRequest and Chrome's AILanguageModelPromptInput
interface LocalGenerateContentRequest {
  contents: LocalContent[];
}
type HybridPart = Part & LocalPart;
type HybridContent = Content & LocalContent;
type HybridGenerateContentRequest = GenerateContentRequest &
  LocalGenerateContentRequest;
const r = {} as HybridGenerateContentRequest;
r.contents.map((c: Content & LocalContent) => c.role);
// TODO: consider other names
export interface GenerativeModelMethods {
  generateContent(
    request: HybridGenerateContentRequest | string | Array<string | HybridPart>
  ): Promise<GenerateContentResult>;
  generateContentStream(
    request: HybridGenerateContentRequest | string | Array<string | HybridPart>
  ): Promise<GenerateContentStreamResult>;
  startChat(): ChatSession;
  countTokens(
    request: HybridGenerateContentRequest | string | Array<string | HybridPart>
  ): Promise<CountTokensResponse>;
}
export class LocalModel implements GenerativeModelMethods {
  oldSession: AILanguageModel | undefined;
  constructor(private aiProvider: AI) {}
  async generateContent(
    request: HybridGenerateContentRequest | string | Array<string | HybridPart>
  ): Promise<GenerateContentResult> {
    // HACK: splitting input contents into a single prompt and an array of initial prompts,
    // works around the Prompt API only accepting a string, using the fact we create a new
    // single-turn session for each call.
    const [head, ...tail] = LocalModel.toAILanguageModelPromptArray(request);
    const session = await this.session({
      initialPrompts: tail
    });
    const result = await session.prompt(head.content);
    return {
      response: {
        text: () => result,
        functionCalls: () => {
          throw new Error('Function not implemented.');
        }
      }
    };
  }
  generateContentStream(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    request: HybridGenerateContentRequest
  ): Promise<GenerateContentStreamResult> {
    throw new Error('Method not implemented.');
  }
  startChat(): ChatSession {
    throw new Error('Method not implemented.');
  }
  countTokens(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    request: HybridGenerateContentRequest
  ): Promise<CountTokensResponse> {
    throw new Error('Method not implemented.');
  }
  async isSupported(): Promise<boolean> {
    // TODO: return true if Chrome API exists and model is available.
    return true;
  }
  static toAILanguageModelPromptRole(
    role: LocalRole
  ): AILanguageModelPromptRole {
    if (role === 'model') {
      return 'assistant';
    }
    return 'user';
  }
  static toAILanguageModelPromptArray(
    request: HybridGenerateContentRequest | string | Array<string | HybridPart>
  ): AILanguageModelPrompt[] {
    return [{ role: 'user', content: '' }];
    // const hybridGenerateContentRequest =
    //   request as HybridGenerateContentRequest;
    // if (hybridGenerateContentRequest.contents) {
    //   return hybridGenerateContentRequest.contents.map((c: HybridContent) => {
    //     const role = LocalModel.toAILanguageModelPromptRole(c.role);
    //     const content = c.parts.map(p => p.text).join();
    //     return {
    //       role,
    //       content
    //     };
    //   });
    // }
    // if (typeof request === 'string') {
    //   return [
    //     {
    //       role: 'user',
    //       content: request
    //     }
    //   ];
    // }
    // const arrayRequest = request as Array<string | HybridPart>;
    // return arrayRequest.map(part => {
    //   if (typeof part === 'string') {
    //     return {
    //       role: 'user',
    //       content: part
    //     };
    //   }
    //   return {
    //     role: 'user',
    //     content: part.text
    //   };
    // });
  }
  async session(
    opts: AILanguageModelCreateOptionsWithSystemPrompt = {}
  ): Promise<AILanguageModel> {
    // Creates new session before destroying old one, to avoid unloading model.
    const newSession = await this.aiProvider.languageModel.create(opts);
    if (this.oldSession) {
      this.oldSession.destroy();
    }
    this.oldSession = newSession;
    return newSession;
  }
}
interface ChatSessionMethods {
  sendMessage(request: string): Promise<GenerateContentResult>;
}
export class HybridChatSession implements ChatSessionMethods {
  sendMessage(request: string): Promise<GenerateContentResult> {
    throw new Error('Method not implemented.');
  }
}
export class HybridModel implements GenerativeModelMethods {
  constructor(
    private localModel: LocalModel,
    private remoteModel?: GenerativeModel
  ) {}
  async generateContent(
    request: HybridGenerateContentRequest
  ): Promise<GenerateContentResult> {
    // if (await this.localModel.isSupported()) {
    //   return this.localModel.generateContent(request);
    // } else if (this.remoteModel) {
    //   return this.remoteModel.generateContent(request);
    // }
    throw new Error('TODO: throw Vertex error');
  }
  async generateContentStream(
    request: HybridGenerateContentRequest
  ): Promise<GenerateContentStreamResult> {
    if (await this.localModel.isSupported()) {
      return this.localModel.generateContentStream(request);
    } else if (this.remoteModel) {
      return this.remoteModel.generateContentStream(request);
    }
    throw new Error('TODO: throw Vertex error');
  }
  startChat(): ChatSession {
    throw new Error('Method not implemented.');
  }
  countTokens(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    request: HybridGenerateContentRequest
  ): Promise<CountTokensResponse> {
    throw new Error('Method not implemented.');
  }
}
export interface LocalModelParams
  extends AILanguageModelCreateOptionsWithSystemPrompt {
  fallback?: GenerativeModel;
}
