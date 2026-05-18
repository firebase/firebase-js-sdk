/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VAPID_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
