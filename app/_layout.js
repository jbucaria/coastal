import '../global.css'
import 'react-native-reanimated'
import { getAuth } from 'firebase/auth'
import { auth } from '../firebaseConfig' // Ensure you've imported auth from your Firebase initialization file
import { useColorScheme } from '@/hooks/useColorScheme'
import { useFonts } from 'expo-font'
import { Slot, Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { ActivityIndicator, View, Text } from 'react-native'
import {
  ThemeProvider,
  DarkTheme,
  DefaultTheme,
} from '@react-navigation/native'

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true)
  const [user, setUser] = useState(null)
  const router = useRouter()
  const segments = useSegments()

  const colorScheme = useColorScheme()

  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  })

  const onAuthStateChanged = user => {
    // console.log('onAuthStateChanged', user)
    setUser(user)
    if (initializing) setInitializing(false)
  }

  useEffect(() => {
    const subscriber = auth.onAuthStateChanged(onAuthStateChanged)
    return subscriber // cleanup on unmount
  }, [])

  // Check if we're in the auth group
  const inAuthGroup = segments[0] === '(auth)'

  useEffect(() => {
    if (initializing) return

    // If there's no user and we're not in the auth group, go to login
    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login')
    }
    // If there is a user and we're in the auth group, go to the main app
    else if (user && inAuthGroup) {
      router.replace('/')
    }
  }, [user, initializing, inAuthGroup])

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync()
    }
  }, [loaded])

  // Loading screen while waiting for auth state
  if (initializing)
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    )

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Slot />
    </ThemeProvider>
  )
}
