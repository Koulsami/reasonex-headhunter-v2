
interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  readonly VITE_API_KEY: string;
  readonly VITE_BACKEND_URL: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
    REACT_APP_BACKEND_URL?: string;
    NODE_ENV?: string;
    [key: string]: string | undefined;
  }
}

