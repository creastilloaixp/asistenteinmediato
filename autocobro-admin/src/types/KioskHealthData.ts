export interface KioskHealthData {
  deviceId: string;
  status: 'ONLINE' | 'OFFLINE' | 'WARNING';
  lastSeen: string;
  cpu: number;
  memory: number;
  temperature: number;
  storage: number;
  printerStatus: string;
  scannerStatus: string;
  activeErrors: string[];
}
