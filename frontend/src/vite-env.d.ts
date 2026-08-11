/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_COGNITO_USER_POOL_CLIENT_ID: string;
  readonly VITE_COGNITO_REGION: string;
  readonly VITE_TOURNAMENT_NAME: string;
  readonly VITE_TOURNAMENT_TAGLINE: string;
  readonly VITE_TOURNAMENT_START: string;
  readonly VITE_TOURNAMENT_END: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
