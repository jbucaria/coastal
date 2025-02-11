// PhotoGallery.js
import React from 'react'
import {
  ScrollView,
  View,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native'

const PhotoGallery = ({ photos, onRemovePhoto }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    style={styles.photosContainer}
  >
    {photos.map((uri, index) => (
      <View key={index} style={styles.photoWrapper}>
        <Image source={{ uri }} style={styles.photo} />
        <TouchableOpacity
          style={styles.removePhotoButton}
          onPress={() => onRemovePhoto(index)}
        >
          <Text style={styles.removePhotoText}>X</Text>
        </TouchableOpacity>
      </View>
    ))}
  </ScrollView>
)

const styles = StyleSheet.create({
  photosContainer: {
    marginVertical: 5,
  },
  photoWrapper: {
    marginRight: 5,
    position: 'relative',
  },
  photo: {
    borderRadius: 5,
    height: 100,
    width: 100,
    marginBottom: 5,
  },
  removePhotoButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
    height: 24,
    width: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: 5,
    top: 5,
  },
  removePhotoText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'red',
  },
})

export default PhotoGallery
