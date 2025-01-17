const functions = require('firebase-functions')

exports.getApiKey = functions.https.onCall(async (data, context) => {
  // Validation or auth check could go here
  const keys = {
    google: process.env.GOOGLE_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    firebase: process.env.FIRE_CONFIG_API_KEY,
  }

  if (!keys.google || !keys.openai || !keys.firebase) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'API keys not found'
    )
  }

  return keys
})
