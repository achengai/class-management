import type { LoadSnapshotResponse, SaveSnapshotPayload } from '../../types/ipc';

export interface StorageProvider {
  loadSnapshot: () => Promise<LoadSnapshotResponse>;
  saveSnapshot: (payload: SaveSnapshotPayload) => Promise<{ success: boolean }>;
  clearData: () => Promise<{ success: boolean }>;
}
