import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { auth } from '../../../firebaseConfig' // Adjust this import based on your firebase setup
import { signOut } from 'firebase/auth'
import { useRouter } from 'expo-router'

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
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-red-400 border-2 border-red-600 px-4 py-2 rounded"
        >
          <Text className="text-white font-bold text-center">Logout</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

export default settings
