# React Native Project Setup and Build Guide (for more details visit: https://reactnative.dev/docs/getting-started)

This guide provides instructions to set up, run, and compile this React Native project into a release version.

---

## **Prerequisites**

1. **Node.js and npm/yarn**
   - Install Node.js (recommended version 16 or later).
   - Ensure npm is installed with Node.js


2. **Java Development Kit (JDK)**
   - Install JDK 16 or later.

3. **Android Studio**
   - Install Android Studio for Android development.
   - Ensure Android SDK and required tools are installed.


## **Project Setup**

1. **Install Dependencies**
   ```bash
   pnpm install or npm install
   ```

3. **Link Native Dependencies** (React Native 0.60 and later uses auto-linking)
   ```bash
   npx react-native-asset
   ```
---

## **Run the Application**

### Android:
```bash
pnpm react-native run-android

# Run fast
pnpm react-native run-android --active-arch-only 
```

---

## **Build and Generate Release APK**

1. **Generate a Keystore** (if not available):
   ```bash
   keytool -genkeypair -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Add Keystore Configuration**
   - Place the generated `my-release-key.keystore` file under `android/app/`.
   - Update `android/gradle.properties`:
     ```properties
     MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
     MYAPP_RELEASE_KEY_ALIAS=my-key-alias
     MYAPP_RELEASE_STORE_PASSWORD=your-password
     MYAPP_RELEASE_KEY_PASSWORD=your-password
     ```

3. **Build APK**
   ```bash
   cd android
   ./gradlew clean
   ./gradlew assembleRelease
   ```
   - Output APK is located at:
     ```
     android/app/build/outputs/apk/release/app-release.apk
     ```
   pnpm run android -- --mode="release"
---

## **Troubleshooting**

1. **Clear Cache**
   ```bash
   npx react-native start --reset-cache
   ```

2. **Reinstall Modules**
   ```bash
   delete node_modules
   pnpm install or npm install
   ```

3. **Gradle Issues (Android)**
   ```bash
   cd android
   ./gradlew clean
   ```

4. **Uninstall current app**
adb uninstall com.tdaapp_portal

---


