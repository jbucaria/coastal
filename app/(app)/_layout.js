import React from 'react'
import { KeyboardProvider } from 'react-native-keyboard-controller'

import { Stack } from 'expo-router'

const _layout = () => {
  return (
    <KeyboardProvider>
      <Stack>
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="inspection"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="viewReport"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="editReportScreen"
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
            headerTitle: 'Edit Inspection Report',
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
    </KeyboardProvider>
  )
}

export default _layout
