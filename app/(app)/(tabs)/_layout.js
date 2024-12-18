import { Tabs } from 'expo-router'
import React from 'react'
import { Platform } from 'react-native'

import { IconSymbol } from '@/components/ui/IconSymbol'
import TabBarBackground from '@/components/ui/TabBarBackground'
import { Colors } from '@/constants/Colors'
import { useColorScheme } from '@/hooks/useColorScheme'

export default function TabLayout() {
  const colorScheme = useColorScheme()

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false, // Keep this if you don't want headers for tabs
        tabBarBackground: TabBarBackground,
        tabBarStyle: {
          backgroundColor: 'rgba(44, 62, 80, 0.8)', // Dark blue with transparency
          borderTopWidth: 0, // Removes the default border
          elevation: 0, // Removes shadow on Android
          position: 'absolute', // Position at the bottom for both platforms
          left: 0,
          right: 0,
          bottom: 0,
          height: Platform.OS === 'ios' ? 83 : 56, // iOS tab bar height, adjust for Android
        },
        tabBarLabelStyle: {
          // Match the styling of the home header bar
          fontWeight: 'bold',
          fontSize: 12,
          textTransform: 'uppercase',
          letterSpacing: 1,
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
        name="explore"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="hammer" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="gear" color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
