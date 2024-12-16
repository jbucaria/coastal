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
  TextInput,
  Platform,
} from 'react-native'
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore'
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
  const [searchQuery, setSearchQuery] = useState('')
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

  const handleReportPress = report => {
    setSelectedReport(report)
    setModalVisible(true)
  }

  const filteredReports = reports.filter(report =>
    report.address.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleViewReport = async () => {
    try {
      if (!selectedReport) return

      const fileUri = `${FileSystem.cacheDirectory}${selectedReport.pdfFileName}`
      const fileInfo = await FileSystem.getInfoAsync(fileUri)
      if (!fileInfo.exists) {
        Alert.alert('Error', 'File not found in local storage')
        return
      }

      await Linking.openURL(`file://${fileUri}`)
    } catch (error) {
      console.error('Error opening file:', error)
      Alert.alert('Error', 'Failed to open the report')
    }
    setModalVisible(false)
  }

  const handleSaveReport = async () => {
    try {
      if (!selectedReport) return

      // Check if the file exists in cache
      const fileUri = `${FileSystem.cacheDirectory}${selectedReport.pdfFileName}`
      const fileInfo = await FileSystem.getInfoAsync(fileUri)
      if (!fileInfo.exists) {
        Alert.alert('Error', 'File not found in local storage')
        return
      }

      // Define the destination path in document directory
      const documentDir = FileSystem.documentDirectory
      const destinationUri = `${documentDir}${selectedReport.pdfFileName}`

      // Check permissions (Android only)
      if (Platform.OS === 'android') {
        const { status } = await Permissions.askAsync(
          Permissions.MEDIA_LIBRARY_WRITE_ONLY
        )
        if (status !== 'granted') {
          Alert.alert(
            'Permission Denied',
            'We need permission to save files on your device.'
          )
          return
        }
      }

      // Copy file from cache to document directory
      await FileSystem.copyAsync({
        from: fileUri,
        to: destinationUri,
      })

      Alert.alert('Success', 'Report has been saved to your device.')
    } catch (error) {
      console.error('Error saving report:', error)
      Alert.alert('Error', 'Failed to save the report')
    } finally {
      setModalVisible(false)
    }
  }

  const handleDeleteReport = async () => {
    // Show confirmation dialog before deleting
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this report?',
      [
        {
          text: 'Cancel',
          onPress: () => console.log('Deletion cancelled'),
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              if (!selectedReport) return

              await deleteDoc(
                doc(firestore, 'inspectionReports', selectedReport.id)
              )
              Alert.alert('Success', 'Report has been deleted')
              setModalVisible(false)
            } catch (error) {
              console.error('Error deleting report:', error)
              Alert.alert('Error', 'Failed to delete the report')
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: false }
    )
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
        <TextInput
          style={styles.searchBar}
          onChangeText={setSearchQuery}
          value={searchQuery}
          placeholder="Search by address..."
          placeholderTextColor={textColor}
        />
        <FlatList
          data={filteredReports}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => {
            setModalVisible(!modalVisible)
          }}
        >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <TouchableOpacity
                style={styles.button}
                onPress={handleViewReport}
              >
                <ThemedText>View Report</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.button}
                onPress={handleSaveReport}
              >
                <ThemedText>Save Report</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.button}
                onPress={handleDeleteReport}
              >
                <ThemedText>Delete Report</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonClose]}
                onPress={() => setModalVisible(false)}
              >
                <ThemedText>Close</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  button: {
    borderRadius: 10,
    padding: 10,
    elevation: 2,
    marginTop: 10,
    width: '100%',
  },
  buttonClose: {
    backgroundColor: '#2196F3',
  },
  searchBar: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
})

export default ReportsPage
