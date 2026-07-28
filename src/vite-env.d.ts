/// <reference types="vite/client" />

import type { VisualFixtureStatus } from "./testing/visualFixture";

declare global {
  interface Window {
    __FUN_SATIRE_VISUAL__?: VisualFixtureStatus;
  }
}

export {};
