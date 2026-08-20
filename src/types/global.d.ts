export {};

declare global {
  interface Window {
    // Tauri internal properties
    __TAURI_INTERNALS__?: any;
  }
}
