// HeaderWithOptions.jsx
'use client'

import React, { useState, useRef } from 'react'
import { router } from 'expo-router'
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Modal,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import Constants from 'expo-constants'
import { BlurView } from 'expo-blur'
import { IconSymbol } from '@/components/ui/IconSymbol'

const HEADER_HEIGHT = 120

const HeaderWithOptions = ({ title, onBack, options }) => {
  const [modalVisible, setModalVisible] = useState(false)

  // Optional scroll-based animation—remove if you want a static header.
  const scrollY = useRef(new Animated.Value(0)).current
  const translateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -100],
    extrapolate: 'clamp',
  })

  const handleOptionPress = option => {
    setModalVisible(false)
    if (option.onPress) {
      option.onPress()
    }
  }

  return (
    <>
      <Animated.View
        style={[styles.headerContainer, { transform: [{ translateY }] }]}
      >
        <BlurView intensity={90} tint="default" style={styles.blurBackground}>
          <View style={styles.topBar}>
            {/* Left side container for back + home */}
            <View style={styles.leftContainer}>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                  onBack()
                }}
                style={styles.headerButton}
              >
                <IconSymbol
                  name="arrow.backward.circle"
                  color="black"
                  size={28}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                  router.push('/(tabs)')
                }}
                style={styles.headerButton}
              >
                <IconSymbol name="house.circle" color="black" size={28} />
              </TouchableOpacity>
            </View>

            {/* Center container for title */}
            <View style={styles.centerContainer}>
              <Text style={styles.topBarTitle}>{title}</Text>
            </View>

            {/* Right side container for ellipsis */}
            <View style={styles.rightContainer}>
              <TouchableOpacity
                onPress={() => setModalVisible(true)}
                style={styles.headerButton}
              >
                <IconSymbol name="ellipsis" color="black" size={28} />
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Animated.View>

      {/* Modal for Options */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.optionsModal}>
              {options &&
                options.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.optionItem}
                    onPress={() => handleOptionPress(option)}
                  >
                    <Text style={styles.optionText}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              <TouchableOpacity
                style={[styles.optionItem, styles.optionCancel]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.optionText, styles.optionCancelText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    zIndex: 1000,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  topBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    // Extra top padding so content sits below the status bar
    paddingTop: Constants.statusBarHeight + 8,
    // Horizontal padding for the entire bar
    paddingHorizontal: 16,
    // If you want the three containers to distribute horizontally:
    justifyContent: 'space-between',
  },
  // We give leftContainer and rightContainer the same width so the title is truly centered
  leftContainer: {
    width: 100, // Adjust as needed
    flexDirection: 'row',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightContainer: {
    width: 100, // Must match leftContainer's width
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  headerButton: {
    marginRight: 10,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'black',
    flex: 1,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 16,
  },
  optionsModal: {
    width: 240,
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingVertical: 8,
    elevation: 5,
  },
  optionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  optionText: {
    fontSize: 16,
    color: '#14171A',
  },
  optionCancel: {
    borderBottomWidth: 0,
  },
  optionCancelText: {
    fontWeight: '700',
    color: '#E0245E',
  },
})

export { HeaderWithOptions }
