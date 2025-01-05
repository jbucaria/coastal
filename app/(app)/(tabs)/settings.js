import React, { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, TextInput, Alert } from 'react-native'
import { auth, firestore } from '../../../firebaseConfig' // Adjust this import based on your firebase setup
import { signOut } from 'firebase/auth'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { useRouter } from 'expo-router'
import { IconSymbol } from '@/components/ui/IconSymbol' // Adjust the import path as needed

const Settings = () => {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser
      if (user) {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setUsername(userData.username || '')
          setEmail(userData.email || user.email || '')
        } else {
          setEmail(user.email || '')
        }
      }
    }
    fetchUserData()
  }, [])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.replace('/loginScreen') // Redirect to login screen after logout
    } catch (error) {
      console.error('Error signing out: ', error)
    }
  }

  const handleUpdateInfo = async () => {
    const user = auth.currentUser
    if (user) {
      try {
        // Update user details in Firebase Auth if email is changed
        if (email !== user.email) {
          await user.updateEmail(email)
        }

        // Update user details in Firestore
        await updateDoc(doc(firestore, 'users', user.uid), {
          username: username,
          email: email,
        })

        Alert.alert('Success', 'Your information has been updated.')
      } catch (error) {
        console.error('Error updating user info:', error)
        Alert.alert(
          'Error',
          'Failed to update user information. Please try again.'
        )
      }
    }
  }

  return (
    <View className="flex-1 bg-gray-100 p-4">
      <Text className="text-xl font-bold mb-4">Settings</Text>

      <View className="mb-4">
        <Text className="text-base text-gray-700 mb-1">Username</Text>
        <TextInput
          className="border border-gray-300 rounded p-2 bg-white"
          value={username}
          onChangeText={setUsername}
          placeholder="Enter your username"
        />
      </View>

      <View className="mb-4">
        <Text className="text-base text-gray-700 mb-1">Email</Text>
        <TextInput
          className="border border-gray-300 rounded p-2 bg-white"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="Enter your email"
        />
      </View>

      <TouchableOpacity onPress={handleUpdateInfo}>
        <View className="bg-[#2C3E50] rounded-full py-3 mb-4">
          <Text className="text-center text-white text-lg">Update Info</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleLogout}>
        <View className="px-4 py-2 bg-[#e74c3c] rounded-full flex-row items-center">
          <IconSymbol
            name="arrow.left.square"
            size={24}
            color="white"
            className="mr-2"
          />
          <Text className="mx-2 text-lg text-white">Logout</Text>
        </View>
      </TouchableOpacity>
    </View>
  )
}

export default Settings
