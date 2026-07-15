import { registerWebModule, NativeModule } from 'expo';

class MediaStoreScannerModule extends NativeModule<{}> {}

export default registerWebModule(MediaStoreScannerModule, 'MediaStoreScannerModule');
