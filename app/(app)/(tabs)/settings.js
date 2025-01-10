import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  ScrollView,
} from 'react-native'
import { auth, firestore } from '../../../firebaseConfig' // Adjust this import based on your firebase setup
import { signOut } from 'firebase/auth'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { useRouter } from 'expo-router'
import { IconSymbol } from '@/components/ui/IconSymbol' // Adjust the import path as needed
import useProjectStore from '@/store/projectStore'
import useInspectionStore from '@/store/inspectionStore'

const Settings = () => {
  const projects = useProjectStore(state => state.projects)
  const reports = useInspectionStore(state => state.reports)
  const inspectionState = useInspectionStore(state => state)

  const handlePress = project => {
    // Handle project selection
    console.log('Selected Project ID:', project.id)
    // You can navigate or perform other actions here
  }

  const ProjectList = () => {
    const projects = useProjectStore(state => state.projects)
    const handlePress = project => {
      console.log('Selected Project ID:', project.id)
    }
  }

  const router = useRouter()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser
      if (user) {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setUsername(userData.username || '')
          setEmail(userData.email || user.email || '')
        } else {
          setEmail(user.email || '')
        }
      }
    }
    fetchUserData()
  }, [])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.replace('/loginScreen') // Redirect to login screen after logout
    } catch (error) {
      console.error('Error signing out: ', error)
    }
  }

  const handleUpdateInfo = async () => {
    const user = auth.currentUser
    if (user) {
      try {
        // Update user details in Firebase Auth if email is changed
        if (email !== user.email) {
          await user.updateEmail(email)
        }

        // Update user details in Firestore
        await updateDoc(doc(firestore, 'users', user.uid), {
          username: username,
          email: email,
        })

        Alert.alert('Success', 'Your information has been updated.')
      } catch (error) {
        console.error('Error updating user info:', error)
        Alert.alert(
          'Error',
          'Failed to update user information. Please try again.'
        )
      }
    }
  }

  return (
    <ScrollView>
      <View className="flex-1 bg-gray-100 p-4">
        <Text className="text-xl font-bold mb-4">Settings</Text>

        <View className="mb-4">
          <Text className="text-base text-gray-700 mb-1">Username</Text>
          <TextInput
            className="border border-gray-300 rounded p-2 bg-white"
            value={username}
            onChangeText={setUsername}
            placeholder="Enter your username"
          />
        </View>

        <View className="mb-4">
          <Text className="text-base text-gray-700 mb-1">Email</Text>
          <TextInput
            className="border border-gray-300 rounded p-2 bg-white"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="Enter your email"
          />
        </View>

        <TouchableOpacity onPress={handleUpdateInfo}>
          <View className="bg-[#2C3E50] rounded-full py-3 mb-4">
            <Text className="text-center text-white text-lg">Update Info</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleLogout}>
          <View className="px-4 py-2 bg-[#e74c3c] rounded-full flex-row items-center">
            <IconSymbol
              name="arrow.left.square"
              size={24}
              color="white"
              className="mr-2"
            />
            <Text className="mx-2 text-lg text-white">Logout</Text>
          </View>
        </TouchableOpacity>
        <View>
          {projects.map(project => (
            <TouchableOpacity
              key={project.id}
              onPress={() => handlePress(project)}
            >
              <Text>Address: {project.address}</Text>
              <Text>ID: {project.id}</Text>
              {/* Add other project details as needed */}
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.container}>
          <ScrollView>
            {reports.map(report => (
              <TouchableOpacity
                key={report.id}
                onPress={() => handleReportPress(report)}
                style={styles.reportCard}
              >
                <Text style={styles.reportTitle}>Inspection Report</Text>
                <Text style={styles.reportAddress}>{report.address}</Text>
                <Text style={styles.reportId}>ID: {report.id}</Text>
                <Text style={styles.reportDetails}>
                  Inspector: {report.inspectorName || 'N/A'}
                  {report.remediationRequired && (
                    <Text style={styles.remediation}> R</Text>
                  )}
                </Text>
                <Text style={styles.reportJobType}>
                  Job Type: {report.jobType || 'N/A'}
                </Text>
                <Text style={styles.reportTimestamp}>
                  Date:{' '}
                  {report.timestamp
                    ? new Date(
                        report.timestamp.seconds * 1000
                      ).toLocaleDateString()
                    : 'N/A'}
                </Text>
                {report.pdfDownloadURL && (
                  <Text style={styles.reportPdf}>
                    PDF:{' '}
                    <Text
                      style={styles.link}
                      onPress={() => Linking.openURL(report.pdfDownloadURL)}
                    >
                      View
                    </Text>
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Optional Debug View */}
          <View style={styles.debugContainer}>
            <Text style={styles.debugTitle}>Inspection Store State:</Text>
            <Text style={styles.debugText}>
              {JSON.stringify(inspectionState, null, 2)}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  )
}

export default Settings

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flex: 1,
  },
  reportCard: {
    backgroundColor: '#3498db',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
  reportTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  reportAddress: {
    color: 'white',
    fontSize: 16,
    marginTop: 4,
  },
  reportId: {
    color: 'white',
    fontSize: 14,
    marginTop: 4,
  },
  reportDetails: {
    color: 'white',
    fontSize: 14,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  remediation: {
    color: 'red',
    fontSize: 14,
    marginLeft: 4,
    fontWeight: 'bold',
  },
  reportJobType: {
    color: 'white',
    fontSize: 14,
    marginTop: 4,
  },
  reportTimestamp: {
    color: 'white',
    fontSize: 14,
    marginTop: 4,
  },
  reportPdf: {
    color: 'white',
    fontSize: 14,
    marginTop: 4,
  },
  link: {
    color: '#2980B9',
    textDecorationLine: 'underline',
  },
  debugContainer: {
    padding: 16,
    backgroundColor: '#ecf0f1',
    borderRadius: 10,
    marginTop: 16,
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2C3E50',
  },
  debugText: {
    fontSize: 12,
    color: '#2C3E50',
  },
})
