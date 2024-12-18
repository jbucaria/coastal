import React from 'react'
import { View, Text, SafeAreaView, TouchableOpacity } from 'react-native'

import { Stack } from 'expo-router'

const _layout = () => {
  return (
    <Stack>
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: 'true',
          headerTitle: ' Home',
          headerStyle: {
            backgroundColor: '#2C3E50', // Dark blue for a sleek look
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 4,
            elevation: 3, // For Android
          },
          headerTintColor: '#ECF0F1', // Light gray for contrast
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 24,
            textTransform: 'uppercase', // Makes 'Home' uppercase
            letterSpacing: 1.5, // Adds a bit of space between letters for a modern look
          },
        }}
      />
      <Stack.Screen
        name="inspection"
        options={{
          headerStyle: {
            backgroundColor: '#2C3E50',
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 4,
            elevation: 3, // For Android
          },
          headerTintColor: '#fff',
          headerTitle: 'Inspection Report',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 22,
            fontStyle: 'italic', // Adds an italic style for uniqueness
            textShadowColor: 'rgba(0, 0, 0, 0.3)', // Adds a subtle text shadow for depth
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 2,
          },
        }}
      />
    </Stack>
  )
}

export default _layout
