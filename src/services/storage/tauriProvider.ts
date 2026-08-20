import type { StorageProvider } from './interface';
import type { LoadSnapshotResponse, SaveSnapshotPayload } from '../../types/ipc';
import { createDefaultSnapshot, DEFAULT_CLASS_ID, DEFAULT_CLASS_NAME } from '../../utils/defaultSnapshot';
import Database from '@tauri-apps/plugin-sql';

const DB_PATH = 'sqlite:smartseat.db';

export class TauriStorageProvider implements StorageProvider {
    private dbPromise: Promise<Database>;

    constructor() {
        this.dbPromise = Database.load(DB_PATH).then(async (db) => {
            // Initialize the table if it does not exist
            await db.execute(`
        CREATE TABLE IF NOT EXISTS snapshots (
          id TEXT PRIMARY KEY,
          payload TEXT NOT NULL,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
            return db;
        });
    }

    async loadSnapshot(): Promise<LoadSnapshotResponse> {
        console.log('[Storage] Loading snapshot from SQLite...');
        try {
            const db = await this.dbPromise;
            const result = await db.select<Array<{ payload: string }>>('SELECT payload FROM snapshots WHERE id = $1', ['current']);

            if (result && result.length > 0) {
                console.log('[Storage] Snapshot loaded successfully');
                return JSON.parse(result[0].payload) as LoadSnapshotResponse;
            }
            console.log('[Storage] No snapshot found in database, creating default.');
        } catch (error) {
            console.error('[Storage] Load snapshot error:', error);
        }

        // Default snapshot logic if none exists
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

        await this.saveSnapshot(defaultResponse as any);
        return defaultResponse;
    }

    async saveSnapshot(payload: SaveSnapshotPayload): Promise<{ success: boolean }> {
        try {
            const db = await this.dbPromise;
            const jsonString = JSON.stringify(payload);

            // UPSERT polyfill for SQLite
            await db.execute(`
          INSERT INTO snapshots (id, payload, updatedAt)
          VALUES ($1, $2, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET
            payload = excluded.payload,
            updatedAt = CURRENT_TIMESTAMP
        `, ['current', jsonString]);

            console.log('[Storage] Snapshot saved to SQLite');
            return { success: true };
        } catch (error) {
            console.error('[Storage] Save snapshot error:', error);
            return { success: false };
        }
    }

    async clearData(): Promise<{ success: boolean }> {
        try {
            const db = await this.dbPromise;
            await db.execute('DELETE FROM snapshots');
            console.log('[Storage] All snapshot data cleared from SQLite');
            return { success: true };
        } catch (error) {
            console.error('[Storage] Clear data error:', error);
            return { success: false };
        }
    }
}
