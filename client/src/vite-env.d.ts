/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_MONGODB_URI: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
