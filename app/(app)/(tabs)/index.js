// TicketsScreen.jsx
'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Animated,
  SafeAreaView,
  ImageBackground,
  View,
  Text,
  StyleSheet,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import { router } from 'expo-router'
import { TicketCard } from '@/components/TicketCard'
import { FloatingButton } from '@/components/FloatingButton'
import useProjectStore from '@/store/useProjectStore'
import { TicketsHeader } from '@/components/TicketHeader'

const TicketsScreen = () => {
  const { setProjectId } = useProjectStore()
  const [allTickets, setAllTickets] = useState([])
  const [displayedTickets, setDisplayedTickets] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOption, setSortOption] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showDatePicker, setShowDatePicker] = useState(false)

  const HEADER_HEIGHT = 180

  const scrollY = useRef(new Animated.Value(0)).current
  const floatingOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  useEffect(() => {
    const baseQuery = query(
      collection(firestore, 'tickets'),
      orderBy('startTime', 'asc')
    )
    const unsubscribe = onSnapshot(
      baseQuery,
      snapshot => {
        const tickets = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
        setAllTickets(tickets)
        setIsLoading(false)
      },
      error => {
        console.error('Error fetching tickets:', error)
      }
    )
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    let filtered = [...allTickets]
    if (searchQuery) {
      const queryLower = searchQuery.toLowerCase()
      filtered = filtered.filter(ticket => {
        const address = ticket.address?.toLowerCase() || ''
        return address.includes(queryLower)
      })
    } else {
      const startOfDay = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        0,
        0,
        0
      )
      const endOfDay = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        23,
        59,
        59,
        999
      )
      filtered = filtered.filter(ticket => {
        if (!ticket.startTime) return false
        const t = ticket.startTime.toDate
          ? ticket.startTime.toDate()
          : new Date(ticket.startTime)
        return t >= startOfDay && t <= endOfDay
      })
    }
    if (sortOption === 'remediationRequired') {
      filtered = filtered.filter(t => t.remediationRequired === true)
    } else if (sortOption === 'equipmentOnSite') {
      filtered = filtered.filter(t => t.equipmentOnSite === true)
    }
    setDisplayedTickets(filtered)
  }, [allTickets, searchQuery, selectedDate, sortOption])

  const onDatePickerChange = (event, date) => {
    setShowDatePicker(false)
    if (date) setSelectedDate(date)
  }

  const clearFilter = () => {
    setSortOption(null)
  }

  const isClearDisabled = !sortOption

  return (
    <ImageBackground
      source={require('@/assets/images/bg-logo.png')}
      style={styles.backgroundImage}
      imageStyle={{
        resizeMode: 'cover',
        opacity: 0.1,
        transform: [{ scale: 1.8 }],
      }}
    >
      <SafeAreaView style={styles.fullSafeArea}>
        {/* Render the TicketsHeader with all functionality */}
        <TicketsHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedDate={selectedDate}
          showDatePicker={showDatePicker}
          setShowDatePicker={setShowDatePicker}
          onDatePickerChange={onDatePickerChange}
          sortOption={sortOption}
          setSortOption={setSortOption}
          clearFilter={clearFilter}
          isClearDisabled={isClearDisabled}
        />
        <Animated.ScrollView
          contentContainerStyle={[
            styles.scrollViewContent,
            { paddingTop: HEADER_HEIGHT },
          ]}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          {isLoading ? (
            <Text>Loading tickets...</Text>
          ) : displayedTickets.length > 0 ? (
            displayedTickets.map((ticket, index) => {
              const ticketKey = ticket.id || `ticket-${index}`
              const containerStyle = index % 2 === 0 ? '#F5F8FA' : '#FFFFFF'
              const timeColor = index % 2 === 0 ? '#0D47A1' : '#1976D2'
              return (
                <View key={ticketKey} style={{ marginBottom: 8 }}>
                  <TicketCard
                    ticket={ticket}
                    onPress={() => {
                      setProjectId(ticket.id)
                      router.push('/TicketDetailsScreen')
                    }}
                    backgroundColor={containerStyle}
                    timeColor={timeColor}
                  />
                </View>
              )
            })
          ) : (
            <Text style={styles.noTicketsText}>
              No tickets match your criteria.
            </Text>
          )}
        </Animated.ScrollView>
        <View style={{ position: 'absolute', right: 24, bottom: 110 }}>
          <FloatingButton
            onPress={() => router.push('/CreateTicketScreen')}
            title="Ticket"
            animatedOpacity={floatingOpacity}
            iconName="plus.circle"
            size={32}
          />
        </View>
      </SafeAreaView>
    </ImageBackground>
  )
}

export default TicketsScreen

const styles = StyleSheet.create({
  fullSafeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backgroundImage: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 100,
  },
  noTicketsText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
    fontSize: 16,
  },
})
