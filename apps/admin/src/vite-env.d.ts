/// <reference types="vite/client" />

/** The API origin this build talks to — `deploy/environments.mjs`. Empty: the dev proxy. */
declare const __API_ORIGIN__: string;

/** The release this build was deployed as (`1.00.00.01`, `scripts/deploy.mjs`). Empty: built by hand. */
declare const __PANEL_VERSION__: string;
