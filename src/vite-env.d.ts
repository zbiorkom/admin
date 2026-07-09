/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend origin, e.g. https://api.zbiorkom.live. Empty in dev (proxied). */
  readonly VITE_API_BASE?: string;
  /** WebAuthn Relying Party ID for registration; must equal backend RP_ID. */
  readonly VITE_RP_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
