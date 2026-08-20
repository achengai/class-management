import { TauriStorageProvider } from './tauriProvider';
import { WebStorageProvider } from './webProvider';
import type { StorageProvider } from './interface';

let provider: StorageProvider | null = null;

export const getStorageProvider = (): StorageProvider => {
    if (provider) return provider;

    // @ts-ignore
    if (window.__TAURI_INTERNALS__) {
        console.log('[Storage] Using Tauri storage provider');
        provider = new TauriStorageProvider();
    } else {
        console.log('[Storage] Using Web storage provider (IndexedDB)');
        provider = new WebStorageProvider();
    }

    return provider;
};
