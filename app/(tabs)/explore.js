import React, { useState, useEffect } from 'react'
import {
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  SafeAreaView,
  Image,
  Modal,
  View,
} from 'react-native'
import { collection, onSnapshot } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import { ThemedText } from '@/components/ThemedText' // Adjust the path to where your components are located
import { ThemedView } from '@/components/ThemedView' // Adjust the path to where your components are located
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { useThemeColor } from '@/hooks/useThemeColor'
import Linking from 'expo-linking'

const ReportsPage = () => {
  const [reports, setReports] = useState([])
  const backgroundColor = useThemeColor({}, 'background')
  const textColor = useThemeColor({}, 'text')
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedReport, setSelectedReport] = useState(null)
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(firestore, 'inspectionReports'),
      snapshot => {
        const allReports = []
        snapshot.forEach(doc => {
          allReports.push({ id: doc.id, ...doc.data() })
        })
        setReports(allReports)
      },
      error => {
        console.error('Error fetching reports:', error)
        Alert.alert('Error', 'Could not fetch reports')
      }
    )

    return () => unsubscribe()
  }, [])

  const handleReportPress = async report => {
    try {
      const fileUri = `${FileSystem.cacheDirectory}${report.pdfFileName}`

      const fileInfo = await FileSystem.getInfoAsync(fileUri)
      if (!fileInfo.exists) {
        Alert.alert('Error', 'File not found in local storage')
        return
      }

      await Sharing.shareAsync(fileUri, {
        dialogTitle: 'Share Inspection Report',
        mimeType: 'application/pdf',
        UTI: 'public.content',
      })
    } catch (error) {
      console.error('Error sharing file:', error)
      Alert.alert('Error', 'Failed to download the report')
    }
  }

  const handleSaveReport = async () => {
    try {
      if (!selectedReport) return

      const fileUri = `${FileSystem.cacheDirectory}${selectedReport.pdfFileName}`
      const fileInfo = await FileSystem.getInfoAsync(fileUri)
      if (!fileInfo.exists) {
        Alert.alert('Error', 'File not found in local storage')
        return
      }

      await Sharing.shareAsync(fileUri, {
        dialogTitle: 'Save Inspection Report',
        mimeType: 'application/pdf',
        UTI: 'public.content',
      })
    } catch (error) {
      console.error('Error saving file:', error)
      Alert.alert('Error', 'Failed to save the report')
    }
    setModalVisible(false)
  }

  const handleDeleteReport = async () => {
    try {
      if (!selectedReport) return

      await deleteDoc(doc(firestore, 'inspectionReports', selectedReport.id))
      Alert.alert('Success', 'Report has been deleted')
    } catch (error) {
      console.error('Error deleting report:', error)
      Alert.alert('Error', 'Failed to delete the report')
    }
    setModalVisible(false)
  }

  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => handleReportPress(item)}
      style={styles.reportContainer}
    >
      <ThemedView style={styles.cardShadow}>
        <ThemedView style={styles.card}>
          {item.photos && item.photos.length > 0 && (
            <Image
              source={{ uri: item.photos[0].uri }}
              style={styles.reportImage}
              resizeMode="cover"
            />
          )}
          <ThemedView style={styles.reportInfo}>
            <ThemedText type="subtitle">{item.address}</ThemedText>
            <ThemedText style={styles.dateText}>{item.date}</ThemedText>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.container}>
        <FlatList
          data={reports}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      </ThemedView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    marginBottom: 20,
  },
  list: {
    paddingBottom: 20,
  },
  reportContainer: {
    marginBottom: 20,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: 'white', // or use a theme color
    borderRadius: 10,
    overflow: 'hidden',
  },
  reportImage: {
    width: 100,
    height: 100,
  },
  reportInfo: {
    flex: 1,
    padding: 15,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    marginBottom: 5,
  },
})

export default ReportsPage
