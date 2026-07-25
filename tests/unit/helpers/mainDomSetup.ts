// tests/unit/helpers/mainDomSetup.ts
//
// src/main.ts is the app's sole side-effect entry point: importing it runs
// the whole boot sequence (DOM lookups, canvas 2D context, Engine.start()).
// mainSubjectWiring.test.ts needs a *static* import of main.ts (to exercise
// the real module identity for `queryNearestEye`/`shouldSpawnSubject`), so
// the required DOM must exist before that import is evaluated. ES module
// evaluation order is depth-first in textual order, so importing this file
// first (for its side effects only) guarantees the stage/hud-root elements
// and a stubbed 2D context exist by the time src/main.ts's top-level code
// runs.
function makeStubCtx(): CanvasRenderingContext2D {
  const store: Record<string, unknown> = {};
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(target, prop) {
      if (prop in target) return target[prop];
      return () => {};
    },
    set(target, prop, value) {
      target[String(prop)] = value;
      return true;
    },
  };
  return new Proxy(store, handler) as unknown as CanvasRenderingContext2D;
}

document.body.innerHTML = '<canvas id="stage"></canvas><div id="hud-root"></div>';

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  configurable: true,
  writable: true,
  value: () => makeStubCtx(),
});
