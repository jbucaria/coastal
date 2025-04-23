import React from 'react'
import { Stack } from 'expo-router'

const _layout = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // default: hide header for all screens
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="TicketDetailsScreen" />
      <Stack.Screen name="InspectionScreen" />
      <Stack.Screen name="CreateTicketScreen" />
      <Stack.Screen name="ViewReport" />
      <Stack.Screen name="TicketNotesScreen" />
      <Stack.Screen name="RemediationScreen" />
      <Stack.Screen name="FeedBackScreen" />
      {/* <Stack.Screen name="EditRemediationScreen" /> */}
      <Stack.Screen name="ViewRemediationScreen" />
      <Stack.Screen name="ButtonSampleScreen" />
      <Stack.Screen name="AddTicketScreen" />
      <Stack.Screen
        name="EditRemediationScreen"
        options={{ headerShown: true, headerTitle: 'Edit Remediation' }}
      />
      <Stack.Screen
        name="EditReportScreen"
        options={{
          headerShown: true, // override to show header
          headerStyle: {
            backgroundColor: '#2C3E50',
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 4,
            elevation: 3, // Android shadow
          },
          headerTintColor: '#fff',
          headerTitle: 'Edit Inspection Report',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 22,
            fontStyle: 'italic',
            textShadowColor: 'rgba(0, 0, 0, 0.3)',
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 2,
          },
        }}
      />
    </Stack>
  )
}

export default _layout
