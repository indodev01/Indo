#!/usr/bin/env node
import fs from 'node:fs';

const files = {
  gradle: 'android-wrapper/app/build.gradle.kts',
  manifest: 'android-wrapper/app/src/main/AndroidManifest.xml',
  mainActivity: 'android-wrapper/app/src/main/java/com/indodev01/generated/MainActivity.kt',
  icon: 'android-wrapper/app/src/main/res/drawable/indo_icon.xml',
  splash: 'android-wrapper/app/src/main/res/drawable/indo_splash.xml',
};

const checks = [
  [files.gradle, 'applicationId = buildApplicationId'],
  [files.gradle, 'signingConfig = signingConfigs.getByName("release")'],
  [files.gradle, 'RELEASE_KEYSTORE_PATH'],
  [files.gradle, 'APP_ICON_FILE'],
  [files.gradle, 'SPLASH_FILE'],
  [files.manifest, 'com.indodev01.generated.MainActivity'],
  [files.mainActivity, 'BuildConfig.LIVE_URL'],
  [files.icon, '<vector'],
  [files.splash, '<layer-list'],
];

for (const [file, needle] of checks) {
  if (!fs.existsSync(file)) {
    console.error(`FAIL: missing ${file}`);
    process.exit(1);
  }
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes(needle)) {
    console.error(`FAIL: ${file} missing expected reference: ${needle}`);
    process.exit(1);
  }
  console.log(`PASS: ${file} -> ${needle}`);
}

console.log('APK wiring check passed.');
