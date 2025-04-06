import { Tabs } from 'expo-router'
import React, { useEffect } from 'react'
import { Platform, StyleSheet, StatusBar, View } from 'react-native'
import HapticTab from '@/components/ui/HapticTab'
import { IconSymbol } from '@/components/ui/IconSymbol'
import { BlurView } from 'expo-blur'
import { Colors } from '@/constants/Colors'
import { useColorScheme } from '@/hooks/useColorScheme'

export default function TabLayout() {
  const colorScheme = useColorScheme()

  useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(true)
      StatusBar.setBackgroundColor('transparent')
    }
  }, [])

  const BlurTabBarBackground = () => (
    <BlurView tint="light" intensity={50} style={StyleSheet.absoluteFill} />
  )

  const SolidTabBarBackground = () => (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#fff' }]} />
  )

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault,
        headerShown: false,
        tabBarButton: props => <HapticTab {...props} />,
        tabBarBackground: Platform.select({
          ios: BlurTabBarBackground,
          android: SolidTabBarBackground,
        }),
        tabBarStyle: {
          position: 'absolute',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="quickBooks"
        options={{
          title: 'Acct.',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="dollarsign.circle" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="maps"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="map.circle" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="gear" color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
