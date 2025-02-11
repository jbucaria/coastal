import { useState, useEffect, useRef } from 'react'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { Platform } from 'react-native'

export const usePushNotifications = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldShowAlert: true,
      shouldSetBadge: false,
    }),
  })

  const [expoPushToken, setExpoPushToken] = useState()
  const [notification, setNotification] = useState()

  const notificationListener = useRef()
  const responseListener = useRef()

  async function registerForPushNotificationsAsync() {
    console.log('Starting registerForPushNotificationsAsync')
    let token
    if (!Device.isDevice) {
      console.log('Not a physical device')
      alert('Must be using a physical device for Push notifications')
      return
    }

    console.log('Checking notification permissions...')
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    console.log('Existing permission status:', existingStatus)

    let finalStatus = existingStatus
    if (existingStatus !== 'granted') {
      console.log('Requesting permissions...')
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    console.log('Final permission status:', finalStatus)
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification')
      return
    }

    console.log('Getting Expo push token...')
    const projectId = Constants.expoConfig?.extra?.eas?.projectId
    console.log('Project ID:', projectId)

    try {
      token = await Notifications.getExpoPushTokenAsync({
        projectId,
      })
      console.log('Got token:', token)
    } catch (e) {
      console.log('Error getting token:', e)
    }

    if (Platform.OS === 'android') {
      console.log('Setting Android notification channel...')
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      })
    }

    console.log('Returning token:', token)
    return token
  }

  useEffect(() => {
    console.log('useEffect: Registering for push notifications...')
    registerForPushNotificationsAsync().then(token => {
      console.log('Token set in state:', token)
      setExpoPushToken(token)
    })

    notificationListener.current =
      Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification received:', notification)
        setNotification(notification)
      })

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Notification response:', response)
      })

    return () => {
      console.log('Cleaning up notification listeners...')
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(
          notificationListener.current
        )
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current)
      }
    }
  }, [])

  console.log('Returning from hook:', { expoPushToken, notification })
  return {
    expoPushToken,
    notification,
  }
}
