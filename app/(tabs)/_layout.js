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
        headerShown: false,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: 'absolute',
          },
          default: {},
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inspection',
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={40}
              name="rectangle.and.pencil.and.ellipsis"
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Remediation',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="hammer" color={color} />
          ),
        }}
      />
    </Tabs>
  )
}