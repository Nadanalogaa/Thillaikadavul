# React Native Setup Guide - Native Mobile Apps

## Overview
Create production-ready Android and iOS apps using your existing backend API.

**Timeline:** 2 months
**Code Reuse:** 60% from web app
**Result:** Native apps on App Store and Play Store

---

## Prerequisites

```bash
# macOS (for iOS development)
brew install node watchman
brew install --cask android-studio

# Install Xcode from App Store (iOS only)

# Install CocoaPods (iOS only)
sudo gem install cocoapods
```

---

## Quick Start with Expo (Recommended)

### Step 1: Initialize Project

```bash
# Create new React Native project with TypeScript
npx create-expo-app@latest nadanaloga-mobile --template

cd nadanaloga-mobile
```

### Step 2: Install Dependencies

```bash
# Navigation
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context

# UI Components
npm install react-native-paper
npm install react-native-vector-icons

# API & Storage
npm install axios
npm install @react-native-async-storage/async-storage

# Cookie handling
npm install @react-native-cookies/cookies

# Forms
npm install react-hook-form

# State management (reuse from web)
# Already have React Context, will work as-is
```

---

## Project Structure

```
nadanaloga-mobile/
├── src/
│   ├── api/              # ← Copy from web app
│   │   └── api.ts       # Reuse with minor changes
│   ├── components/
│   │   ├── common/      # Shared components
│   │   ├── admin/       # Admin screens
│   │   ├── parent/      # Parent/Student screens
│   │   └── teacher/     # Teacher screens
│   ├── navigation/
│   │   ├── AdminNavigator.tsx
│   │   ├── ParentNavigator.tsx
│   │   ├── TeacherNavigator.tsx
│   │   └── AuthNavigator.tsx
│   ├── screens/
│   │   ├── admin/
│   │   ├── parent/
│   │   └── teacher/
│   ├── services/        # ← Copy from web app
│   │   └── notificationService.ts
│   ├── types/           # ← Copy from web app
│   │   └── index.ts
│   ├── hooks/           # Custom hooks
│   ├── utils/           # Helper functions
│   └── constants/       # Constants
├── app.json
├── package.json
└── tsconfig.json
```

---

## Reuse Code from Web App

### 1. Copy API Layer

```bash
# From your web app
cp /Users/ayyappanp/Documents/tk/Thillaikadavul/api.ts nadanaloga-mobile/src/api/
```

**Modify for React Native:**

```typescript
// src/api/api.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

// Change localStorage to AsyncStorage
// OLD (Web):
// localStorage.setItem('currentUser', JSON.stringify(user));

// NEW (React Native):
await AsyncStorage.setItem('currentUser', JSON.stringify(user));

// OLD (Web):
// const user = localStorage.getItem('currentUser');

// NEW (React Native):
const user = await AsyncStorage.getItem('currentUser');
```

### 2. Copy Types

```bash
cp -r /Users/ayyappanp/Documents/tk/Thillaikadavul/src/types nadanaloga-mobile/src/
```

No changes needed! TypeScript types work as-is.

### 3. Adapt NotificationService

```bash
cp /Users/ayyappanp/Documents/tk/Thillaikadavul/services/notificationService.ts nadanaloga-mobile/src/services/
```

---

## Authentication Setup

### Create Auth Context (similar to web)

```typescript
// src/context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginUser } from '../api/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const userData = await AsyncStorage.getItem('currentUser');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const userData = await loginUser(email, password);
    setUser(userData);
    await AsyncStorage.setItem('currentUser', JSON.stringify(userData));
  };

  const logout = async () => {
    await AsyncStorage.removeItem('currentUser');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

---

## Role-Based Navigation

### Main App Navigator

```typescript
// App.tsx
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AdminNavigator } from './src/navigation/AdminNavigator';
import { ParentNavigator } from './src/navigation/ParentNavigator';
import { TeacherNavigator } from './src/navigation/TeacherNavigator';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { ActivityIndicator, View } from 'react-native';

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return <AuthNavigator />;
  }

  switch (user.role) {
    case 'Admin':
      return <AdminNavigator />;
    case 'Teacher':
      return <TeacherNavigator />;
    case 'Student':
      return <ParentNavigator />;
    default:
      return <AuthNavigator />;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
```

---

## Example Screen - Parent Dashboard

```typescript
// src/screens/parent/DashboardScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Button } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { getBatches, getEvents } from '../../api/api';

export const ParentDashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [events, setEvents] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setRefreshing(true);
    try {
      const [batchesData, eventsData] = await Promise.all([
        getBatches(),
        getEvents()
      ]);
      setBatches(batchesData);
      setEvents(eventsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadData} />
      }
    >
      <Text style={styles.greeting}>Welcome, {user?.name}!</Text>

      <Card style={styles.card}>
        <Card.Title title="My Batches" />
        <Card.Content>
          {batches.map(batch => (
            <Text key={batch.id}>{batch.batch_name}</Text>
          ))}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Upcoming Events" />
        <Card.Content>
          {events.map(event => (
            <Text key={event.id}>{event.title}</Text>
          ))}
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={() => navigation.navigate('Schedule')}
        style={styles.button}
      >
        View Full Schedule
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5'
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20
  },
  card: {
    marginBottom: 16
  },
  button: {
    marginVertical: 8
  }
});
```

---

## Example Screen - Login

```typescript
// src/screens/auth/LoginScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';

export const LoginScreen = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.form}>
        <Text style={styles.title}>Nadanaloga</Text>
        <Text style={styles.subtitle}>Fine Arts Academy</Text>

        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />

        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />

        {error ? (
          <HelperText type="error" visible={!!error}>
            {error}
          </HelperText>
        ) : null}

        <Button
          mode="contained"
          onPress={handleLogin}
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          Login
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff'
  },
  form: {
    width: '100%'
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#4F46E5'
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#666'
  },
  input: {
    marginBottom: 16
  },
  button: {
    marginTop: 16
  }
});
```

---

## Run the App

### iOS Simulator
```bash
npm run ios
```

### Android Emulator
```bash
npm run android
```

### Physical Device
```bash
# Install Expo Go app from App Store/Play Store
npm start
# Scan QR code with Expo Go
```

---

## Build for Production

### Using EAS (Expo Application Services)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

### Submit to App Stores

```bash
# iOS App Store
eas submit --platform ios

# Google Play Store
eas submit --platform android
```

---

## Features to Implement

### Phase 1 (Week 1-2)
- [x] Authentication (login/logout)
- [x] Role-based navigation
- [x] Dashboard screens
- [x] API integration

### Phase 2 (Week 3-4)
- [ ] Push notifications
- [ ] Offline support
- [ ] Image upload (camera)
- [ ] PDF viewer

### Phase 3 (Week 5-6)
- [ ] Attendance marking
- [ ] Payment integration
- [ ] Chat functionality
- [ ] Video lessons

### Phase 4 (Week 7-8)
- [ ] Beta testing
- [ ] Bug fixes
- [ ] Performance optimization
- [ ] App store submission

---

## Cost Breakdown

| Item | Cost |
|------|------|
| Development | Free (DIY) |
| iOS Developer Account | $99/year |
| Google Play Store | $25 one-time |
| EAS Build (optional) | Free for 30 builds/month |
| **Total Year 1** | **$124** |

---

## Comparison: Expo vs React Native CLI

| Feature | Expo (Recommended) | React Native CLI |
|---------|-------------------|------------------|
| **Setup Time** | 5 minutes | 1-2 hours |
| **Build System** | Cloud (EAS) | Local (Xcode/Android Studio) |
| **Native Modules** | Limited | Full access |
| **OTA Updates** | ✅ Yes | ❌ No |
| **Learning Curve** | Easy | Medium |
| **Best For** | Most apps | Complex native features |

**Recommendation:** Start with Expo, eject if needed later.

---

## Next Steps

1. **Week 1:** Setup project, implement auth
2. **Week 2:** Build navigation and basic screens
3. **Week 3:** Implement API integration
4. **Week 4:** Add push notifications
5. **Week 5-6:** Polish UI and add features
6. **Week 7:** Beta testing
7. **Week 8:** App store submission

---

## Resources

- [React Native Docs](https://reactnative.dev/)
- [Expo Docs](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [React Native Paper](https://callstack.github.io/react-native-paper/)

---

## Support

Your backend is already perfect for mobile apps. All API endpoints work out of the box!

Just need to:
1. Copy API layer from web app
2. Replace localStorage with AsyncStorage
3. Build mobile UI
4. Deploy!
