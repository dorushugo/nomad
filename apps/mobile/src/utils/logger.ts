// Tiny `__DEV__`-gated logger for client-side debugging. Strips messages
// in production builds. Use sparingly — non-debug user-facing failures
// should surface via the API client's ApiError + a toast.
type LogArgs = unknown[];

function noop() {}

export const debug = (...args: LogArgs) => {
  if (__DEV__) {
    // biome-ignore lint/suspicious/noConsoleLog: dev-only debug helper
    console.log(...args);
  }
};

export const debugError = __DEV__ ? console.error.bind(console) : (noop as typeof console.error);
