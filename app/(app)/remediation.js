import React from 'react'
import { Button, Text, View } from 'react-native'
import pickAndUploadImage from '@/components/imagePicker'

export default function App() {
  const handleUpload = async () => {
    try {
      const url = await pickAndUploadImage()
      if (url) {
        console.log('Uploaded image URL:', url)
      }
    } catch (error) {
      console.error('Error uploading image:', error)
    }
  }

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-bold mb-4">Upload a Photo</Text>
      <Button title="Pick and Upload Image" onPress={handleUpload} />
    </View>
  )
}
