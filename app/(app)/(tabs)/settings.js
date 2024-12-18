import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { auth } from '../../../firebaseConfig' // Adjust this import based on your firebase setup
import { signOut } from 'firebase/auth'
import { useRouter } from 'expo-router'
import { IconSymbol } from '@/components/ui/IconSymbol' // Adjust the import path as needed

const settings = () => {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.replace('/loginScreen') // Redirect to login screen after logout
    } catch (error) {
      console.error('Error signing out: ', error)
    }
  }

  const user = auth.currentUser

  return (
    <View className="flex-1 justify-center items-center">
      {user && (
        <View className="mb-4">
          <Text className="text-base text-gray-700 mb-1">
            Logged in as: {user.email || 'No email found'}
          </Text>
        </View>
      )}

      {user && (
        <TouchableOpacity onPress={handleLogout}>
          <View className="px-4 py-2 bg-[#2C3E50] rounded-full flex-row items-center">
            <IconSymbol
              name="folder.badge.plus"
              size={24}
              color="white"
              className="mr-2"
            />
            <Text className="mx-2 text-lg text-white">Logout</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  )
}

export default settings
