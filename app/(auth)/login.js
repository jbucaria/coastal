// app/login.tsx
import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity } from 'react-native'
import { auth } from '../../firebaseConfig' // Adjust the import path
import { signInWithEmailAndPassword } from 'firebase/auth'
import { router } from 'expo-router'

const LoginScreen = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (email === '' || password === '') {
      setError('Email and password are required.')
      return
    }

    try {
      await signInWithEmailAndPassword(auth, email, password)
      // Navigate to the tabs after successful login
      router.replace('/(tabs)')
    } catch (error) {
      setError(error.message)
    }
  }

  return (
    <View className="flex-1 justify-center items-center p-5">
      <Text className="text-2xl font-bold mb-5">Login</Text>
      <TextInput
        className="w-full h-10 border border-gray-300 mb-2 px-2 rounded"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        className="w-full h-10 border border-gray-300 mb-5 px-2 rounded"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {error ? <Text className="text-red-500 mb-2">{error}</Text> : null}
      <TouchableOpacity
        className="bg-blue-500 w-full p-2.5 rounded items-center mb-2"
        onPress={handleLogin}
      >
        <Text className="text-white text-xl">Login</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.replace('/register')}>
        <Text className="text-blue-500 mt-2">
          Don't have an account? Register
        </Text>
      </TouchableOpacity>
    </View>
  )
}

export default LoginScreen
