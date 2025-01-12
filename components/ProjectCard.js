import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'

const ProjectCard = ({ project, onPress }) => {
  // Determine background color based on project status
  let backgroundColor = 'rgba(200, 200, 200, .9)' // Default translucent gray

  if (project.siteComplete) {
    backgroundColor = '#8BC34A' // A finished type of green
  } else if (project.remediationRequired) {
    backgroundColor = '#FFD700' // Yellow for remediation required
  } else if (project.equipmentOnSite) {
    backgroundColor = '#007BFF' // Blue for equipment on site
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.projectCard, { backgroundColor: backgroundColor }]}
    >
      <View style={styles.cardContent}>
        <Text style={styles.projectAddress}>{project.address}</Text>
        <View style={styles.inspectorRow}>
          <Text style={styles.inspectorName}>
            Inspector: {project.inspectorName || 'N/A'}
          </Text>
          {project.remediationRequired && (
            <Text style={styles.remediationIndicator}> R</Text>
          )}
          {project.equipmentOnSite && (
            <Text style={styles.remediationIndicator}> E</Text>
          )}
          {project.siteComplete && (
            <Text style={styles.remediationIndicator}> C</Text>
          )}
        </View>
        <Text style={styles.jobType}>Job Type: {project.jobType || 'N/A'}</Text>
        <Text style={styles.jobType}>ID: {project.projectId || 'N/A'}</Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  projectCard: {
    borderRadius: 10,
    padding: 16,
    marginBottom: 8,
    marginTop: 3,
  },
  cardContent: {},
  projectAddress: { color: 'black', fontSize: 16, fontWeight: 'bold' },
  inspectorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  inspectorName: { color: 'black', fontSize: 14 },
  remediationIndicator: {
    color: 'red',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  jobType: { color: 'black', fontSize: 14, marginTop: 4 },
})

export default ProjectCard
