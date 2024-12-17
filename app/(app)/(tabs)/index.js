import React from 'react'
import { Link } from 'expo-router'
import { View, Text } from 'react-native'

const Index = () => {
  return (
    <View className="flex-1 justify-center items-center">
      <Link href={'/inspection'}>
        <Text className="text-lg text-red-500 mb-2">Inspection Report</Text>
      </Link>
      <Link href={'/remediation'}>
        <Text className="text-lg text-red-500 mb-2">Remediation Report</Text>
      </Link>
    </View>
  )
}

export default Index
