const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withFileProviderManifest(config) {
  return withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application[0];
    if (!app.provider) app.provider = [];

    const alreadyExists = app.provider.some(
      (p) => p['$']['android:name'] === 'androidx.core.content.FileProvider'
    );

    if (!alreadyExists) {
      app.provider.push({
        $: {
          'android:name': 'androidx.core.content.FileProvider',
          'android:authorities': `${config.android.package}.fileprovider`,
          'android:exported': 'false',
          'android:grantUriPermissions': 'true',
        },
        'meta-data': [
          {
            $: {
              'android:name': 'android.support.FILE_PROVIDER_PATHS',
              'android:resource': '@xml/file_paths_custom',
            },
          },
        ],
      });
    }
    return config;
  });
}

function withFileProviderPaths(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const xmlDir = path.join(config.modRequest.platformProjectRoot, 'app/src/main/res/xml');
      fs.mkdirSync(xmlDir, { recursive: true });
      const filePath = path.join(xmlDir, 'file_paths_custom.xml');
      const contents =
        '<?xml version="1.0" encoding="utf-8"?>\n' +
        '<paths xmlns:android="http://schemas.android.com/apk/res/android">\n' +
        '  <external-path name="external_storage_root" path="." />\n' +
        '</paths>\n';
      fs.writeFileSync(filePath, contents);
      return config;
    },
  ]);
}

module.exports = function withFileProvider(config) {
  config = withFileProviderManifest(config);
  config = withFileProviderPaths(config);
  return config;
};
