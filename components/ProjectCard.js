import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'

const ProjectCard = ({ project, onPress }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.projectCard,
        {
          backgroundColor: project.remediationRequired ? '#FFD700' : '#1ABC9C',
        },
      ]}
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
  projectAddress: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  inspectorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  inspectorName: { color: 'white', fontSize: 14 },
  remediationIndicator: {
    color: 'red',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  jobType: { color: 'white', fontSize: 14, marginTop: 4 },
})

export default ProjectCard
