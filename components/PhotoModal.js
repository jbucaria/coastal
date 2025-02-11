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
      setIsLoading(true)
      console.log('Photo URI in modal:', photo) // Log the photo URI when modal opens
      Image.getSize(
        photo,
        (width, height) => {
          console.log(`Image dimensions: ${width} x ${height}`)
          setIsLoading(false)
        },
        error => {
          console.error('Error getting image size:', error)
          setIsLoading(false)
        }
      )
    }
  }, [visible, photo])

  const onImageLoad = event => {
    console.log('Image loaded successfully', event.nativeEvent)
    if (event.nativeEvent && event.nativeEvent.source) {
      console.log(
        'Image dimensions from nativeEvent:',
        event.nativeEvent.source.width,
        event.nativeEvent.source.height
      )
    }
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
              <>
                <Image
                  source={{ uri: photo }}
                  style={[styles.fullPhoto, { width: 300, height: 400 }]}
                  resizeMode="contain" // or 'cover' based on your preference
                  onLoad={onImageLoad}
                  onError={onImageLoadError}
                />
              </>
            ) : (
              <Text style={styles.photoLoadingText}>No Photo Available</Text>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

export { PhotoModal }

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
    flex: 1, // This will make the image take up all available space within photoModalContent
    resizeMode: 'contain', // Ensure the image fits within its container without distortion
  },
  photoLoadingText: {
    color: 'white',
    fontSize: 18,
  },
  loadingIndicator: {
    position: 'absolute',
    zIndex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 10,
    borderRadius: 5,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
  },
  imageSourceText: {
    position: 'absolute',
    bottom: 10,
    color: 'white',
    fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 5,
  },
})
