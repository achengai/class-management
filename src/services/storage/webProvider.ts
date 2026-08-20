import { openDB, type IDBPDatabase } from 'idb';
import type { StorageProvider } from './interface';
import type { LoadSnapshotResponse, SaveSnapshotPayload } from '../../types/ipc';
import { createDefaultSnapshot, DEFAULT_CLASS_ID, DEFAULT_CLASS_NAME } from '../../utils/defaultSnapshot';

const DB_NAME = 'smartseat_db';
const STORE_NAME = 'snapshots';
const DB_VERSION = 1;

export class WebStorageProvider implements StorageProvider {
    private db: Promise<IDBPDatabase>;

    constructor() {
        this.db = openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                db.createObjectStore(STORE_NAME);
            },
        });
    }

    async loadSnapshot(): Promise<LoadSnapshotResponse> {
        const db = await this.db;
        const data = await db.get(STORE_NAME, 'current');

        if (data) {
            return data as LoadSnapshotResponse;
        }

        // Default snapshot if none exists
        const snapshot = createDefaultSnapshot();
        const defaultResponse: LoadSnapshotResponse = {
            classId: DEFAULT_CLASS_ID,
            className: DEFAULT_CLASS_NAME,
            snapshot,
            classList: [],
            pointsLogs: [],
            rewards: [],
            rewardRedeems: []
        };

        // Save default immediately to avoid re-initializing on every load
        await this.saveSnapshot(defaultResponse as any);
        return defaultResponse;
    }

    async saveSnapshot(payload: SaveSnapshotPayload): Promise<{ success: boolean }> {
        const db = await this.db;
        await db.put(STORE_NAME, payload, 'current');
        return { success: true };
    }

    async clearData(): Promise<{ success: boolean }> {
        const db = await this.db;
        await db.clear(STORE_NAME);
        return { success: true };
    }
}
