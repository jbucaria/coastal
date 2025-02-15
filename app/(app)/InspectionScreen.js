'use client'

import React, { useState, useEffect } from 'react'
import { Alert } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { onSnapshot, collection } from 'firebase/firestore'

import { InspectionForm } from '@/components/InspectionForm'
import { firestore } from '@/firebaseConfig'

const InspectionScreen = () => {
  const params = useLocalSearchParams()
  const { projectId } = params
  const [project, setProject] = useState({})

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(firestore, 'tickets'),
      snapshot => {
        const projectsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date ? new Date(doc.data().date) : null, // Convert timestamp if necessary
        }))

        // Find the specific project by projectId
        const selectedProject = projectsData.find(p => p.id === projectId)

        if (selectedProject) {
          setProject(selectedProject) // Update project with selected data
        } else {
          Alert.alert('Error', 'Project not found.')
        }
      },
      error => {
        console.error('Error fetching projects:', error)
        Alert.alert(
          'Error',
          'Could not fetch projects. Please try again later.'
        )
      }
    )

    return () => unsubscribe()
  }, [projectId]) // Ensure this runs when projectId changes

  return (
    <InspectionForm
      project={project}
      setProject={setProject}
      projectId={projectId}
    />
  )
}

export default InspectionScreen
