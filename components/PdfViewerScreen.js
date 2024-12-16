// PdfViewerScreen.js
import React, { useEffect, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { PDFView } from 'react-native-pdf'
import { ThemedView } from '@/components/ThemedView'

const PdfViewerScreen = ({ route }) => {
  const { fileUri } = route.params
  const [source, setSource] = useState(null)

  useEffect(() => {
    setSource({ uri: fileUri, cache: false }) // Do not use cache for this example
  }, [fileUri])

  return (
    <ThemedView style={styles.container}>
      {source && <PDFView source={source} style={styles.pdf} />}
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pdf: {
    flex: 1,
  },
})

export default PdfViewerScreen
