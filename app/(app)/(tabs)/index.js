import React from 'react'
import { Link, useRouter } from 'expo-router'
import { View, Text, TouchableOpacity } from 'react-native'
import { auth } from '../../../firebaseConfig' // Adjust this import based on your firebase setup
import { signOut } from 'firebase/auth'

const Index = () => {
  const router = useRouter()

  // Function to handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.replace('/loginScreen') // Redirect to login screen after logout
    } catch (error) {
      console.error('Error signing out: ', error)
    }
  }

  // Assuming `auth.currentUser` gives you access to user details
  const user = auth.currentUser

  return (
    <View className="flex-1 justify-center items-center">
      <Link href={'/inspection'}>
        <Text className="text-lg text-red-500 mb-2">Inspection Report</Text>
      </Link>

      {/* Display User Info */}
      {user && (
        <View className="mb-4">
          <Text className="text-base text-gray-700 mb-1">
            Logged in as: {user.email || 'No email found'}
          </Text>
        </View>
      )}

      {/* Logout Button */}
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

export default Index
