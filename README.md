# AkuafoPlus Mobile Application

A comprehensive agricultural management mobile application built with React Native and TypeScript. This app provides farmers with tools for livestock management, crop monitoring, financial planning, marketplace, and expert consultation services.

## 🚀 Features

### Core Functionalities
- **User Authentication** - Registration, login, password management
- **Dashboard** - Comprehensive farm overview with real-time insights
- **Livestock Management** - Animal tracking, health records, breeding management
- **Crop Management** - Disease detection, growth monitoring, smart calendar
- **Financial Management** - Budget tracking, profit calculator, expense management
- **Marketplace** - Product buying/selling, cart, wishlist, order management
- **Expert Consultation** - Book consultations, expert dashboard, video calls
- **Knowledge Base** - Educational content, farming guides, community forum
- **Satellite Imaging** - Field monitoring via Google Earth Engine
- **Subscription Management** - Payment processing, subscription plans

### Advanced Features
- **AI Disease Detection** - Plant disease identification using camera
- **Smart Crop Calendar** - Automated farming schedules and reminders
- **Profit Calculator** - ROI analysis and financial projections
- **Real-time Notifications** - Push notifications for important updates
- **Offline Support** - Local data storage with sync capabilities
- **Multi-language Support** - Localization for different regions
- **Dark/Light Theme** - User preference theming

---

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [Development](#development)
- [Building for Production](#building-for-production)
- [Testing](#testing)
- [Features Guide](#features-guide)
- [API Integration](#api-integration)
- [State Management](#state-management)
- [Navigation](#navigation)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## 🛠 Prerequisites

### Required Software
- **Node.js** (v18 or later)
- **npm** or **pnpm** package manager
- **React Native CLI** (`npm install -g @react-native-community/cli`)
- **Java Development Kit (JDK)** 17 or later
- **Android Studio** (for Android development)
- **Xcode** (for iOS development - macOS only)

### Android Development
- Android SDK (API level 34 or later)
- Android Virtual Device (AVD) or physical device
- Enable Developer Options and USB Debugging on device

### iOS Development (macOS only)
- Xcode 14 or later
- iOS Simulator or physical device
- Apple Developer Account (for physical device testing)

---

## ⚙️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd AkuafoPlus
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Install iOS dependencies** (macOS only)
   ```bash
   cd ios && pod install && cd ..
   ```

4. **Link native assets**
   ```bash
   npx react-native-asset
   ```

5. **Configure environment**
   ```bash
   # Copy and edit configuration
   cp src/Config/config.example.ts src/Config/config.ts
   ```

---

## 🔧 Configuration

### API Configuration

Edit `src/Config/config.ts`:

```typescript
const Config = {
  API_BASE_URL: 'https://your-api-domain.com/api',
  // For local development
  // API_BASE_URL: 'http://localhost:5001/api',
  
  // OneSignal App ID
  ONESIGNAL_APP_ID: 'your-onesignal-app-id',
  
  // Google Maps API Key (for maps functionality)
  GOOGLE_MAPS_API_KEY: 'your-google-maps-api-key',
};

export default Config;
```

### Android Configuration

1. **Google Services** (for notifications)
   - Place `google-services.json` in `android/app/`

2. **App Signing** (for release builds)
   ```bash
   # Generate keystore
   keytool -genkeypair -v -keystore my-upload-key.keystore \
     -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```

3. **Update `android/gradle.properties`**
   ```properties
   MYAPP_UPLOAD_STORE_FILE=my-upload-key.keystore
   MYAPP_UPLOAD_KEY_ALIAS=my-key-alias
   MYAPP_UPLOAD_STORE_PASSWORD=****
   MYAPP_UPLOAD_KEY_PASSWORD=****
   ```

### iOS Configuration

1. **Bundle Identifier**: Update in `ios/AkuafoPlus/Info.plist`
2. **App Transport Security**: Configure for API endpoints
3. **Permissions**: Camera, Location, Notifications in `Info.plist`

---

## 📁 Project Structure

```
AkuafoPlus/
├── android/                    # Android-specific code and configuration
├── ios/                       # iOS-specific code and configuration
├── src/                       # Main application source code
│   ├── assets/               # Images, fonts, and static resources
│   ├── components/           # Reusable UI components
│   │   ├── FarmlandCard.tsx
│   │   ├── FilterModal.tsx
│   │   └── InquiryCard.tsx
│   ├── Config/              # App configuration
│   │   └── config.ts        # API endpoints and app settings
│   ├── navigation/          # Navigation configuration
│   │   ├── AppNavigator.tsx
│   │   └── SmartToolsNavigator.tsx
│   ├── screens/            # Application screens
│   │   ├── auth/           # Authentication screens
│   │   ├── livestock/      # Livestock management
│   │   ├── marketplace/    # E-commerce functionality
│   │   ├── expert/         # Expert consultation
│   │   └── ...
│   ├── services/           # API services and utilities
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Helper functions and utilities
├── specs/                  # Native module specifications
├── __tests__/             # Test files
├── App.tsx                # Main application component
├── index.js              # Application entry point
└── package.json          # Dependencies and scripts
```

### Key Directories

#### `src/screens/`
Application screens organized by functionality:
- **Authentication**: Login, Register, ForgotPassword
- **Dashboard**: HomeScreen, Dashboard overview
- **Livestock**: LivestockManagementScreen, animal records
- **Marketplace**: TradeScreen, CartScreen, OrderScreen
- **Expert**: ExpertScreen, BookingScreen, consultation
- **Knowledge**: KnowledgeScreen, ForumScreen, educational content
- **Profile**: ProfileScreen, SettingsScreen, subscription management

#### `src/components/`
Reusable UI components:
- **Cards**: Data display components
- **Modals**: Pop-up interfaces
- **Forms**: Input and validation components
- **Navigation**: Custom navigation elements

#### `src/services/`
API integration and external services:
- Authentication API calls
- Livestock management APIs
- Payment processing
- File upload services

---

## 🔨 Development

### Start the Development Server

```bash
# Start Metro bundler
npm start
# or
pnpm start
```

### Run on Android

```bash
# Debug build
npm run android
# or
pnpm android

# Fast development (active architecture only)
npx react-native run-android --active-arch-only
```

### Run on iOS (macOS only)

```bash
# Debug build
npm run ios
# or
pnpm ios

# Specific simulator
npx react-native run-ios --simulator="iPhone 15 Pro"
```

### Development Commands

```bash
# Reset cache
npx react-native start --reset-cache

# Clean and rebuild
cd android && ./gradlew clean && cd ..
npm run android

# Run linter
npm run lint

# Run tests
npm test
```

---

## 📱 Building for Production

### Android Release Build

1. **Clean and build**
   ```bash
   cd android
   ./gradlew clean
   ./gradlew bundleRelease    # For Play Store (AAB)
   ./gradlew assembleRelease  # For APK
   ```

2. **Output locations**
   - **AAB**: `android/app/build/outputs/bundle/release/app-release.aab`
   - **APK**: `android/app/build/outputs/apk/release/app-release.apk`

### iOS Release Build

1. **Archive in Xcode**
   ```bash
   cd ios
   xcodebuild -workspace AkuafoPlus.xcworkspace \
              -scheme AkuafoPlus \
              -configuration Release \
              -archivePath ./build/AkuafoPlus.xcarchive \
              archive
   ```

2. **Export for App Store**
   - Use Xcode Organizer
   - Or use `xcodebuild -exportArchive`

---

## 🧪 Testing

### Unit Testing

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage
```

### E2E Testing (Detox)

```bash
# Build for testing
detox build --configuration ios.sim.debug

# Run tests
detox test --configuration ios.sim.debug
```

### Manual Testing Checklist

- [ ] Authentication flow (login, register, logout)
- [ ] Dashboard data loading and display
- [ ] Livestock management (CRUD operations)
- [ ] Disease detection camera functionality
- [ ] Marketplace (product browsing, cart, checkout)
- [ ] Expert consultation booking
- [ ] Push notifications
- [ ] Offline functionality
- [ ] Payment processing

---

## 📚 Features Guide

### Authentication System

#### User Registration
- Email and phone verification
- Role-based registration (Farm owner, Manager, etc.)
- Referral code support
- Trial period activation

#### Login Flow
- JWT token-based authentication
- Biometric authentication support
- Remember device functionality
- Auto-logout on token expiration

### Livestock Management

#### Animal Registration
```typescript
interface Animal {
  tagId: string;
  name: string;
  breed: string;
  sex: 'Male' | 'Female';
  dateOfBirth: Date;
  currentWeight: number;
  healthStatus: string;
}
```

#### Health Records
- Vaccination tracking
- Disease management
- Treatment history
- Veterinary visits

#### Breeding Management
- Mating records
- Pregnancy tracking
- Offspring management
- Genetic lineage

### Disease Detection

#### AI-Powered Detection
```typescript
const detectDisease = async (imageUri: string, cropType: string) => {
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'disease_image.jpg',
  });
  formData.append('crop_type', cropType);
  
  const response = await fetch(`${API_BASE_URL}/diseases/detect`, {
    method: 'POST',
    body: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${token}`,
    },
  });
  
  return response.json();
};
```

### Financial Management

#### Profit Calculator
- ROI analysis
- Cost-benefit calculations
- Market price integration
- Seasonal profit projections

#### Expense Tracking
- Categorized expenses
- Receipt scanning
- Budget planning
- Financial insights

### Marketplace

#### Product Management
- Product listings
- Image uploads
- Inventory tracking
- Price management

#### Order Processing
- Shopping cart
- Checkout flow
- Payment integration
- Order tracking

### Expert Consultation

#### Booking System
- Expert availability
- Time slot selection
- Service categories
- Payment processing

#### Consultation Interface
- Video call integration
- Chat messaging
- File sharing
- Session recording

---

## 🔗 API Integration

### Authentication Service

```typescript
class AuthService {
  static async login(email: string, password: string) {
    const response = await fetch(`${Config.API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return response.json();
  }

  static async register(userData: RegisterData) {
    const response = await fetch(`${Config.API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return response.json();
  }
}
```

### Livestock Service

```typescript
class LivestockService {
  static async getAnimals(token: string) {
    const response = await fetch(`${Config.API_BASE_URL}/livestock`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.json();
  }

  static async createAnimal(animalData: AnimalData, token: string) {
    const response = await fetch(`${Config.API_BASE_URL}/livestock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(animalData),
    });
    return response.json();
  }
}
```

---

## 🗃 State Management

### Redux Toolkit Configuration

```typescript
// store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import livestockSlice from './slices/livestockSlice';
import marketplaceSlice from './slices/marketplaceSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    livestock: livestockSlice,
    marketplace: marketplaceSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Auth Slice Example

```typescript
// store/slices/authSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }: LoginData) => {
    const response = await AuthService.login(email, password);
    return response;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      });
  },
});
```

---

## 🧭 Navigation

### Navigation Structure

```typescript
// navigation/AppNavigator.tsx
const Stack = createStackNavigator();

function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        {/* Auth Stack */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        
        {/* Main App Stack */}
        <Stack.Screen name="Dashboard" component={Dashboard} />
        <Stack.Screen name="Livestock" component={LivestockScreen} />
        <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
        
        {/* Modal Screens */}
        <Stack.Group screenOptions={{ presentation: 'modal' }}>
          <Stack.Screen name="AddAnimal" component={AddAnimalScreen} />
          <Stack.Screen name="DiseaseDetection" component={DiseaseDetectionScreen} />
        </Stack.Group>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### Tab Navigation

```typescript
// navigation/TabNavigator.tsx
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen name="Livestock" component={LivestockScreen} />
      <Tab.Screen name="Marketplace" component={MarketplaceScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
```

---

## 🎨 UI/UX Guidelines

### Design System

#### Colors
```typescript
export const Colors = {
  primary: '#2E7D32',      // Green
  secondary: '#4CAF50',    // Light Green
  accent: '#FF9800',       // Orange
  background: '#F5F5F5',   // Light Gray
  surface: '#FFFFFF',      // White
  error: '#F44336',        // Red
  warning: '#FF9800',      // Orange
  success: '#4CAF50',      // Green
  text: {
    primary: '#212121',    // Dark Gray
    secondary: '#757575',  // Gray
    disabled: '#BDBDBD',   // Light Gray
  },
};
```

#### Typography
```typescript
export const Typography = {
  heading1: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 40,
  },
  heading2: {
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  body1: {
    fontSize: 16,
    lineHeight: 24,
  },
  body2: {
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
  },
};
```

### Component Guidelines

#### Buttons
```tsx
<TouchableOpacity
  style={[styles.button, styles.primaryButton]}
  onPress={onPress}
>
  <Text style={styles.buttonText}>{title}</Text>
</TouchableOpacity>
```

#### Forms
```tsx
<TextInput
  style={styles.input}
  value={value}
  onChangeText={onChange}
  placeholder={placeholder}
  autoCapitalize="none"
  autoCorrect={false}
/>
```

---

## 🔧 Troubleshooting

### Common Issues

#### Metro Bundler Issues
```bash
# Clear Metro cache
npx react-native start --reset-cache

# Clear watchman
watchman watch-del-all

# Clear npm cache
npm cache clean --force
```

#### Android Build Issues
```bash
# Clean Gradle
cd android && ./gradlew clean && cd ..

# Fix permission issues
chmod +x android/gradlew

# Update Android SDK
# Open Android Studio > SDK Manager > Update all
```

#### iOS Build Issues
```bash
# Clean build folder
cd ios && xcodebuild clean && cd ..

# Update pods
cd ios && pod update && cd ..

# Fix signing issues
# Open Xcode > Project Settings > Signing & Capabilities
```

#### Common Errors

1. **"Unable to resolve module"**
   ```bash
   npm install
   npx react-native start --reset-cache
   ```

2. **"Task :app:installDebug FAILED"**
   ```bash
   adb kill-server
   adb start-server
   ```

3. **"Multiple dex files define"**
   - Add to `android/app/build.gradle`:
   ```gradle
   android {
     defaultConfig {
       multiDexEnabled true
     }
   }
   ```

### Performance Optimization

#### Memory Management
- Use `FlatList` for large datasets
- Implement proper image caching
- Remove event listeners in cleanup

#### Bundle Size Optimization
```bash
# Analyze bundle
npx react-native-bundle-visualizer

# Enable Hermes (Android)
# In android/app/build.gradle:
project.ext.react = [
    enableHermes: true
]
```

---

## 📱 Device Testing

### Android Testing
```bash
# List connected devices
adb devices

# Install on specific device
npx react-native run-android --deviceId=<device-id>

# View logs
npx react-native log-android
```

### iOS Testing
```bash
# List simulators
xcrun simctl list devices

# Run on specific simulator
npx react-native run-ios --simulator="iPhone 15 Pro"

# View logs
npx react-native log-ios
```

---

## 🚀 Deployment

### Android Deployment

#### Google Play Store
1. **Create signed AAB**
   ```bash
   cd android
   ./gradlew bundleRelease
   ```

2. **Upload to Play Console**
   - Create app listing
   - Upload AAB file
   - Configure store listing
   - Submit for review

#### Direct Distribution
1. **Create signed APK**
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

2. **Distribute APK**
   - Upload to your server
   - Share download link
   - Enable "Unknown sources" for installation

### iOS Deployment

#### App Store
1. **Archive in Xcode**
   - Product > Archive
   - Distribute App > App Store Connect

2. **App Store Connect**
   - Upload build
   - Configure app information
   - Submit for review

#### TestFlight (Beta)
1. **Upload to TestFlight**
   - Same as App Store process
   - Distribute to internal testers
   - Add external testers

---

## 🔐 Security Considerations

### Data Security
- Store sensitive data in Keychain (iOS) / Keystore (Android)
- Encrypt local database
- Use certificate pinning for API calls
- Implement biometric authentication

### API Security
```typescript
// Token refresh implementation
const refreshToken = async () => {
  const refreshToken = await AsyncStorage.getItem('refreshToken');
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  // Update stored tokens
};
```

### Input Validation
```typescript
const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const sanitizeInput = (input: string) => {
  return input.trim().replace(/[<>]/g, '');
};
```

---

## 📊 Analytics and Monitoring

### Crash Reporting
```typescript
// Integration with crash reporting service
import crashlytics from '@react-native-firebase/crashlytics';

const logError = (error: Error) => {
  crashlytics().recordError(error);
};
```

### User Analytics
```typescript
// Track user events
const trackEvent = (eventName: string, parameters: object) => {
  analytics().logEvent(eventName, parameters);
};
```

---

## 🤝 Contributing

### Development Workflow
1. **Fork** the repository
2. **Create** feature branch (`git checkout -b feature/new-feature`)
3. **Follow** coding standards and guidelines
4. **Write** tests for new functionality
5. **Commit** changes (`git commit -m 'Add new feature'`)
6. **Push** to branch (`git push origin feature/new-feature`)
7. **Create** Pull Request

### Code Standards
- Use **TypeScript** for type safety
- Follow **ESLint** and **Prettier** configurations
- Write **JSDoc** comments for complex functions
- Use **conventional commits** for commit messages

### Testing Requirements
- Write unit tests for utility functions
- Add integration tests for API services
- Test UI components with React Native Testing Library
- Ensure minimum 80% code coverage

---

## 📞 Support and Documentation

### Getting Help
- **GitHub Issues**: Report bugs and request features
- **Documentation**: Check `docs/` folder for detailed guides
- **Community**: Join our Discord/Slack channel
- **Email**: development@akuafoplus.com

### Additional Resources
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [React Navigation Guide](https://reactnavigation.org/docs/getting-started)

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- **React Native Team** for the excellent framework
- **Expo Team** for development tools and libraries
- **Community Contributors** for packages and solutions
- **Beta Testers** for feedback and bug reports

---

*Last updated: October 2025*

## 📋 Development Checklist

### Before Release
- [ ] Test on multiple device sizes
- [ ] Verify all API integrations
- [ ] Test offline functionality
- [ ] Validate push notifications
- [ ] Check payment processing
- [ ] Review security implementations
- [ ] Update app store metadata
- [ ] Prepare marketing materials
- [ ] Document new features
- [ ] Update version numbers


