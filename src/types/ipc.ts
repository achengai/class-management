import type { SmartSeatStateSnapshot, ClassInfo } from './models';

export interface LoadSnapshotResponse {
  classId: string;
  className: string;
  snapshot: SmartSeatStateSnapshot;
  classList?: ClassInfo[];
  pointsLogs?: any[];
  rewards?: any[];
  rewardRedeems?: any[];
}

export interface SaveSnapshotPayload {
  classId: string;
  className: string;
  snapshot: SmartSeatStateSnapshot;
  classList?: ClassInfo[];
}

