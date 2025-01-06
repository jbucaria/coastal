const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const admin = require('firebase-admin')
admin.initializeApp()

exports.sendNotification = onDocumentCreated(
  'inspectionReports/{reportId}',
  event => {
    const report = event.data.after.data() // Access the new document data
    const payload = {
      notification: {
        title: 'New Inspection Report',
        body: `New report added for ${report.address}`,
      },
      data: {
        reportId: event.params.reportId,
        address: report.address,
      },
    }

    // Using the new send method
    return admin.messaging().send({
      ...payload,
      topic: 'newReports',
    })
  }
)
