'use client'

import React, { useState, useEffect } from 'react'
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Modal,
  Platform, // Added for platform-specific adjustments
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { BlurView } from 'expo-blur'
import Constants from 'expo-constants'
import { IconSymbol } from '@/components/ui/IconSymbol'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const TicketsHeader = ({
  searchQuery,
  setSearchQuery,
  selectedDate,
  showDatePicker,
  setShowDatePicker,
  onDatePickerChange,
  sortOption,
  setSortOption,
  clearFilter,
  isClearDisabled,
  onHeightChange,
}) => {
  const [isSortModalVisible, setSortModalVisible] = useState(false)
  const insets = useSafeAreaInsets()
  const baseHeaderHeight = 120 // Base height for content
  const headerHeight = insets.top + baseHeaderHeight + 8 // Dynamic height

  useEffect(() => {
    if (onHeightChange) {
      onHeightChange(headerHeight)
    }
  }, [headerHeight, onHeightChange])

  const openSortModal = () => {
    setSortModalVisible(true)
  }

  const closeSortModal = () => {
    setSortModalVisible(false)
  }

  const renderSortOption = (optionValue, label) => {
    const isSelected = sortOption === optionValue
    return (
      <TouchableOpacity
        style={[styles.optionButton, isSelected && styles.selectedOption]}
        onPress={() => {
          setSortOption(optionValue)
        }}
      >
        <Text
          style={[styles.optionText, isSelected && styles.selectedOptionText]}
        >
          {label}
        </Text>
        {isSelected && (
          <IconSymbol
            name="checkmark"
            size={18}
            color="green"
            style={{ marginLeft: 8 }}
          />
        )}
      </TouchableOpacity>
    )
  }

  return (
    <View style={[styles.absoluteHeader, { height: headerHeight }]}>
      <BlurView
        intensity={80} // Blur intensity (0-100)
        tint="default" // Changed to "default" for consistency across platforms
        style={styles.headerBlur}
        experimentalBlurMethod={
          Platform.OS === 'android' ? 'dither' : undefined
        } // Optional: improve Android blur
      >
        <View style={[styles.headerContent, { paddingTop: insets.top + 8 }]}>
          {/* Search Bar */}
          <View style={styles.searchBarContainer}>
            <View style={styles.searchBar}>
              <IconSymbol name="magnifyingglass" size={20} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search address (all tickets)"
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>
          {/* Top Row: Date Picker & Sort Controls */}
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.datePicker}
              onPress={() => setShowDatePicker(true)}
            >
              <IconSymbol name="calendar" size={20} color="#999" />
              <Text style={styles.dateText}>
                {searchQuery
                  ? 'Date ignored (search active)'
                  : selectedDate.toDateString()}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                onChange={onDatePickerChange}
              />
            )}
            <View style={styles.sortControls}>
              <TouchableOpacity
                style={styles.sortButton}
                onPress={openSortModal}
              >
                <IconSymbol name="slider.horizontal.3" size={24} color="#333" />
              </TouchableOpacity>
              {!isClearDisabled && (
                <TouchableOpacity
                  style={styles.clearSortButton}
                  onPress={clearFilter}
                  disabled={isClearDisabled}
                >
                  <IconSymbol name="xmark.circle" size={24} color="#333" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </BlurView>

      {/* Sort Modal */}
      <Modal
        visible={isSortModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeSortModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>Filter / Sort Criteria</Text>
            {renderSortOption(
              'remediationRequired',
              'Show Only Remediation Required'
            )}
            {renderSortOption('equipmentOnSite', 'Show Only Equipment On Site')}
            {renderSortOption(null, 'Show All (No Filter)')}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={closeSortModal}
            >
              <Text style={styles.closeButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  absoluteHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  headerBlur: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchBarContainer: {
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
  },
  searchBar: {
    flexDirection: 'row',
    backgroundColor: '#F2F3F5',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 8,
    width: '100%',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
    color: '#333',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F3F5',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 8,
    flex: 1,
    marginRight: 10,
  },
  dateText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },
  sortControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortButton: {
    backgroundColor: '#F2F3F5',
    borderRadius: 25,
    padding: 8,
  },
  clearSortButton: {
    marginLeft: 6,
    backgroundColor: '#F2F3F5',
    borderRadius: 25,
    padding: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    width: '80%',
    borderRadius: 10,
  },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 4,
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedOption: {
    backgroundColor: '#E6F4EA',
  },
  selectedOptionText: {
    fontWeight: '600',
    color: '#2B7E2C',
  },
  closeButton: {
    backgroundColor: '#F39C12',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: '600',
  },
})

export { TicketsHeader }
