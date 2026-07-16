import { requireNativeModule } from 'expo-modules-core';

export type MediaStoreFile = {
  name: string;
  path: string;
  uri: string;
  size: number;
  mimeType: string;
};

export type StorageStats = { total: number; used: number; free: number };
export type StorageInfo = { internal: StorageStats; sdCard: StorageStats | null };

type MediaStoreScannerModuleType = {
  hasFullAccess(): boolean;
  getStorageInfo(): StorageInfo;
  saveToDownloads(fileName: string, base64Content: string, mimeType: string): Promise<string>;
  convertPdfToImages(pdfPath: string, outputPrefix: string): Promise<string[]>;
  queryAllFiles(): Promise<MediaStoreFile[]>;
};

const MediaStoreScannerModule = requireNativeModule<MediaStoreScannerModuleType>('MediaStoreScanner');

export default MediaStoreScannerModule;