import { requireNativeModule } from 'expo-modules-core';

export type MediaStoreFile = {
  name: string;
  path: string;
  uri: string;
  size: number;
  mimeType: string;
};

type MediaStoreScannerModuleType = {
  queryAllFiles(): Promise<MediaStoreFile[]>;
};

const MediaStoreScannerModule = requireNativeModule<MediaStoreScannerModuleType>('MediaStoreScanner');

export default MediaStoreScannerModule;