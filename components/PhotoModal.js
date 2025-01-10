import React from 'react'
import {
  Modal,
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Text,
} from 'react-native'

const PhotoModal = ({ visible, photo, onClose, setModalOptionsVisible }) => {
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
          onPress={() => {
            onClose()
            setModalOptionsVisible(true)
          }}
          activeOpacity={1}
        >
          {photo ? (
            <View style={styles.photoModalContent}>
              <ActivityIndicator size="large" color="#0000ff" />
              <Image
                source={{ uri: photo }}
                style={styles.fullPhoto}
                resizeMode="contain"
              />
            </View>
          ) : (
            <Text style={styles.photoLoadingText}>Loading...</Text>
          )}
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
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  photoModalTouchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullPhoto: {
    width: '90%',
    height: '90%',
  },
  photoLoadingText: {
    color: 'white',
    fontSize: 18,
  },
})

export default PhotoModal
