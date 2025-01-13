import React, { useState, useEffect } from 'react'
import {
  Modal,
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Text,
} from 'react-native'

const PhotoModal = ({ visible, photo, onClose }) => {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (visible) {
      setIsLoading(true) // Reset loading state when modal becomes visible
    }
  }, [visible])

  const onImageLoad = () => {
    setIsLoading(false)
    console.log('Image loaded successfully')
  }

  const onImageLoadError = error => {
    setIsLoading(false)
    console.error('Image failed to load:', error)
  }

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.photoModalBackground}>
        <TouchableOpacity
          style={styles.photoModalTouchable}
          onPress={onClose}
          activeOpacity={1}
        >
          <View style={styles.photoModalContent}>
            {isLoading && (
              <ActivityIndicator
                size="large"
                color="#0000ff"
                style={styles.loadingIndicator}
              />
            )}
            {photo ? (
              <Image
                source={{ uri: photo }}
                style={[styles.fullPhoto, { width: '100%', height: '100%' }]} // explicit dimensions
                resizeMode="cover" // or 'stretch' if 'contain' doesn't work
                onLoad={onImageLoad}
                onError={onImageLoadError}
              />
            ) : (
              <Text style={styles.photoLoadingText}>No Photo Available</Text>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  photoModalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  photoModalTouchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalContent: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '90%',
    height: '90%',
  },
  fullPhoto: {
    width: '100%',
    height: '100%',
  },
  photoLoadingText: {
    color: 'white',
    fontSize: 18,
  },
  loadingIndicator: {
    position: 'absolute',
    zIndex: 1,
  },
})

export default PhotoModal
