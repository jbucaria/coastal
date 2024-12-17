import React, { useState, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { WebView } from 'react-native-webview'

const PdfViewerScreen = ({ route }) => {
  const { fileUri } = route.params
  const [source, setSource] = useState(null)

  useEffect(() => {
    setSource({ uri: fileUri })
  }, [fileUri])

  return (
    <View style={styles.container}>
      {source ? (
        <WebView
          source={source}
          style={styles.pdf}
          // Add additional props if needed, like scalesPageToFit for better user experience
          scalesPageToFit={true}
        />
      ) : (
        <Text>Loading PDF...</Text>
      )}
    </View>
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
