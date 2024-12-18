import React from 'react'
import { Link } from 'expo-router'
import { View, Text, ImageBackground } from 'react-native'
import { IconSymbol } from '@/components/ui/IconSymbol' // Adjust the import path as needed

const Index = () => {
  return (
    <ImageBackground
      source={require('../../../assets/images/logo.png')}
      className="flex-1"
      resizeMode="cover"
    >
      <View className="flex-1 bg-black/50">
        <View className="flex-row justify-center mt-10">
          <Link href={'/inspection'} className="mr-4">
            <View className="px-4 py-2 bg-[#2C3E50] rounded-full flex-row items-center">
              <IconSymbol
                name="folder.badge.plus"
                size={24}
                color="white"
                className="mr-2"
              />
              <Text className="mx-2 text-lg text-white">Inspection</Text>
            </View>
          </Link>
          <Link href={'/remediation'}>
            <View className="px-4 py-2 bg-[#2C3E50] rounded-full flex-row items-center">
              <IconSymbol
                name="folder.badge.plus"
                size={24}
                color="white"
                className="mr-2"
              />
              <Text className="mx-2 text-lg text-white">Remediation</Text>
            </View>
          </Link>
        </View>
      </View>
    </ImageBackground>
  )
}

export default Index
