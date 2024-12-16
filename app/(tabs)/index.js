import React from 'react'
import { Link } from 'expo-router'
import { View, Text } from 'react-native'

const index = () => {
  return (
    <View className="flex-1 justify-center items-center">
      <Link href={'/inspection'}>
        <Text>Inspection Report</Text>
      </Link>
    </View>
  )
}

export default index
