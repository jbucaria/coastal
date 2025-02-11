import React, { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { signOut, updateEmail as authUpdateEmail } from 'firebase/auth'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { auth, firestore } from '@/firebaseConfig'
import { IconSymbol } from '@/components/ui/IconSymbol'
import { useUserStore } from '@/store/useUserStore'

const Settings = () => {
  const router = useRouter()
  const { user, setUser } = useUserStore()

  // Local state for editable fields:
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    zip: '',
    full: '',
  })

  // Local flag to toggle edit mode
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    const fetchUserData = async () => {
      const currentUser = auth.currentUser
      if (currentUser) {
        const userDoc = await getDoc(doc(firestore, 'users', currentUser.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setName(userData.name || '')
          setEmail(userData.email || currentUser.email || '')
          setPhone(userData.phone || '')
          setAddress(
            userData.address || {
              street: '',
              city: '',
              state: '',
              zip: '',
              full: '',
            }
          )
        } else {
          setEmail(currentUser.email || '')
        }
      }
    }
    fetchUserData()
  }, [])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.replace('/login')
    } catch (error) {
      console.error('Error signing out: ', error)
    }
  }

  const handleSaveInfo = async () => {
    const currentUser = auth.currentUser
    if (currentUser) {
      try {
        if (email !== currentUser.email) {
          await authUpdateEmail(currentUser, email)
        }
        await updateDoc(doc(firestore, 'users', currentUser.uid), {
          name: name,
          email: email,
          phone: phone,
          address: address,
        })
        Alert.alert('Success', 'Your information has been updated.')
        setUser({ ...user, name, email, phone, address })
        setEditing(false)
      } catch (error) {
        console.error('Error updating user info:', error)
        Alert.alert(
          'Error',
          'Failed to update user information. Please try again.'
        )
      }
    }
  }

  const handleCancel = () => {
    // Reset to previous values
    setEditing(false)
    setName(user.name || '')
    setEmail(user.email || '')
    setPhone(user.phone || '')
    setAddress(
      user.address || {
        street: '',
        city: '',
        state: '',
        zip: '',
        full: '',
      }
    )
  }

  return (
    <SafeAreaView>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={100}
      >
        <ScrollView>
          <View style={styles.container}>
            <Text style={styles.title}>Settings</Text>

            {user && (
              <View style={styles.userInfoContainer}>
                <Text style={styles.userInfoText}>
                  Welcome, {user.displayName || user.email}!
                </Text>
              </View>
            )}

            {editing ? (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Name</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your Name"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="Enter your email"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Phone</Text>
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    placeholder="Enter your phone number"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Street</Text>
                  <TextInput
                    style={styles.input}
                    value={address.street}
                    onChangeText={text =>
                      setAddress(prev => ({ ...prev, street: text }))
                    }
                    placeholder="Enter your street"
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>City</Text>
                  <TextInput
                    style={styles.input}
                    value={address.city}
                    onChangeText={text =>
                      setAddress(prev => ({ ...prev, city: text }))
                    }
                    placeholder="Enter your city"
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>State</Text>
                  <TextInput
                    style={styles.input}
                    value={address.state}
                    onChangeText={text =>
                      setAddress(prev => ({ ...prev, state: text }))
                    }
                    placeholder="Enter your state"
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>ZIP</Text>
                  <TextInput
                    style={styles.input}
                    value={address.zip}
                    onChangeText={text =>
                      setAddress(prev => ({ ...prev, zip: text }))
                    }
                    placeholder="Enter your zip code"
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Full Address</Text>
                  <TextInput
                    style={styles.input}
                    value={address.full}
                    onChangeText={text =>
                      setAddress(prev => ({ ...prev, full: text }))
                    }
                    placeholder="Enter your full address"
                  />
                </View>

                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    onPress={handleSaveInfo}
                    style={styles.button}
                  >
                    <Text style={styles.buttonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleCancel}
                    style={[styles.button, styles.cancelButton]}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={styles.infoDisplayContainer}>
                  <Text style={styles.infoDisplayText}>Name: {name}</Text>
                  <Text style={styles.infoDisplayText}>Email: {email}</Text>
                  <Text style={styles.infoDisplayText}>Phone: {phone}</Text>
                  {address.full ? (
                    <Text style={styles.infoDisplayText}>
                      Address: {address.full}
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  onPress={() => setEditing(true)}
                  style={styles.editButton}
                >
                  <Text style={styles.editButtonText}>Update Profile</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              onPress={handleLogout}
              style={styles.logoutButton}
            >
              <IconSymbol
                name="arrow.left.square"
                size={24}
                color="white"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default Settings

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f3f3f3',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  userInfoContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
  },
  userInfoText: {
    fontSize: 18,
    color: '#333',
  },
  infoDisplayContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  infoDisplayText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: '#555',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    backgroundColor: '#2C3E50',
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
  },
  editButton: {
    backgroundColor: '#2980B9',
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 16,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e74c3c',
    padding: 12,
    borderRadius: 25,
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 18,
    color: '#fff',
  },
})
