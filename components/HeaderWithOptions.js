import React, { useState, useRef } from 'react'

import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Modal,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import { IconSymbol } from '@/components/ui/IconSymbol'

const HeaderWithOptions = ({ title, onBack, options }) => {
  const [modalVisible, setModalVisible] = useState(false)
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
      <Animated.View style={[styles.topBar, { transform: [{ translateY }] }]}>
        <TouchableOpacity onPress={onBack} style={styles.headerButton}>
          <IconSymbol name="arrow.backward" color="black" size={24} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{title}</Text>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={styles.headerButton}
        >
          <IconSymbol name="ellipsis" color="black" size={24} />
        </TouchableOpacity>
      </Animated.View>
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
  headerButton: {
    marginRight: 10,
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
  optionCancel: {
    borderBottomWidth: 0,
  },
  optionCancelText: {
    fontWeight: '700',
    color: '#E0245E',
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  topBarTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: 'black',
    textAlign: 'center',
  },
})

export { HeaderWithOptions }
