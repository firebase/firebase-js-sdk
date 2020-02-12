declare namespace gapi {
  type LoadCallback = () => void;
  interface LoadConfig {}
  interface LoadOptions {
    callback?: LoadCallback,
    config?: LoadConfig,
    timeout?: number,
    dotimeout?: LoadCallback,
    sync?: boolean,
    ontimeout?: LoadCallback
  }
  function load(features: 'gapi.iframes', options?: LoadOptions | LoadCallback ): void;
}

declare namespace gapi.iframes {
  interface OptionsBag { [key: string]: any }
  interface Message {
    type: string
  }

  type IframesFilter = (iframe: Iframe) => boolean;
  type MessageHandler<T extends Message> = (message: T) => any | Promise<void>;
  type SendCallback = () => void;
  type StyleHandler = (options: OptionsBag) => void;
  type RpcFilter = (iframe: Iframe) => boolean | Promise<boolean>;
  type Callback = (iframe: Iframe) => void;
  type ContextCallback = (iframe: Iframe, done: boolean) => void;
  interface Params { [key: string]: any }
  interface StyleData { [key: string]: any }

  interface IframeOptions {
    iframe: Iframe
    role?: string
    data?: any
    isReady: boolean
  }

  class Context {
    constructor(options?: OptionsBag)
    isDisposed(): boolean
    getFrameName(): string
    getWindow(): Window
    getGlobalParam(key: string): any
    setGlobalParam(key: string, value: any): void
    openChild(options: OptionsBag): Iframe
    open(options: OptionsBag, callback?: Callback): Promise<Iframe>
    getParentIframe(): Iframe
    closeSelf(params?: Params, callback?: ContextCallback): Promise<boolean>
    restyleSelf(style?: StyleData, callback?: ContextCallback): Promise<boolean>
    ready<T extends Message>(params?: Params, methods?: { [key: string]: MessageHandler<T> }, callback?: SendCallback, filter?: IframesFilter): void
    setCloseSelfFilter(filter: RpcFilter): void
    setRestyleSelfFilter(filteR: RpcFilter): void
    connectIframes(iframe1Data: IframeOptions, iframe2Data?: IframeOptions): void
    addOnConnectHandler(optionsOrRole: string | OptionsBag, handler?: (iframe: Iframe, obj: object) => void, apis?: string[], filter?: IframesFilter): void
    removeOnConnectHander(role: string): void
    addOnOpenerHandler(handler: (iframe: Iframe) => void, apis?: string[], filter?: IframesFilter): void
  }

  class Iframe {
    constructor(context: Context, rpcAddr: string, frameName: string, options: OptionsBag)
    isDisposed(): boolean
    getContext(): Context
    getFrameName(): string
    getId(): string
    getParam(key: string): any
    setParam(key: string, value: any): void
    register<T extends Message>(message: string, handler: MessageHandler<T>, filter?: IframesFilter): void
    unregister<T extends Message>(message: string, hander: MessageHandler<T>): void
    send(message: string, data?: any, callback?: SendCallback, filter?: IframesFilter): Promise<any[]>
    ping(callback: SendCallback, data?: any): Promise<any[]>
    applyIframesApi(api: string): void
    getIframeEl(): HTMLIFrameElement
    getSiteEl(): HTMLElement
    setSiteEl(el: HTMLElement): void
    getWindow(): Window
    getOrigin(): string
    close(params?: Params, callback?: SendCallback): Promise<any[]>
    restyle(style: StyleData, callback?: SendCallback): Promise<any[]>
    registerWasRestyled<T extends Message>(handler: MessageHandler<T>, filter?: IframesFilter): void
    registerWasClosed<T extends Message>(handler: MessageHandler<T>, filter?: IframesFilter): void
  }

  const SAME_ORIGIN_IFRAMES_FILTER: IframesFilter;
  const CROSS_ORIGIN_IFRAMES_FILTER: IframesFilter;
  
  let selfContext: Context;

  function create(url: string, where: HTMLElement, options?: OptionsBag): HTMLIFrameElement;
  function getContext(): Context;
  function makeWhiteListIframesFilter(origins: string[]): IframesFilter;
  function registerStyle(style: string, handler: StyleHandler): void;
  function registerBeforeOpenStyle(style: string, handler: StyleHandler): void;
  function getStyle(style: string): StyleHandler;
  function getBeforeOpenStyle(style: string): StyleHandler;
  function registerIframesApi<T extends Message>(api: string, registry: { [key: string]: MessageHandler<T> }, filter?: IframesFilter): void;
  function registerIframesApiHandler<T extends Message>(api: string, message: string, handler: MessageHandler<T>): void;
}