
interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
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

