import React from 'react'

import { Stack } from 'expo-router'

const _layout = () => {
  return (
    <Stack>
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="TicketDetailsScreen"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="InspectionScreen"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="CreateTicketScreen"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ViewReport"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="TicketNotesScreen"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="RemediationScreen"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="EditRemediationScreen"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ViewRemediationScreen"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="EditReportScreen"
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
  )
}

export default _layout
