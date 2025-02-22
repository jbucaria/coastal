import * as Print from 'expo-print'

// Function to generate the HTML for the report with hard-coded placeholder data
const generateReportHTML = () => {
  // Hard-coded report text – replace this with your actual report details later
  const reportText = `Inspection Report

Project: Coastal Restoration Services
Date: August 14, 2024

Summary:
- Technician assessed water intrusion in multiple areas.
- Affected rooms: Living Room, Bedroom.
- Moisture readings were taken and proper mitigation performed.
- Areas were treated with an antimicrobial agent and monitored until dry.

Recommendations:
- Continue monitoring moisture levels.
- Schedule follow-up inspection if necessary.

Thank you for choosing Coastal Restoration Services.`

  // Hard-coded photo URLs (you can also use Base64 strings if desired)
  const photos = [
    'https://via.placeholder.com/200',
    'https://via.placeholder.com/200',
  ]

  // Hard-coded logo Base64 string (this is a 1x1 transparent PNG as a placeholder)
  // Replace this with your actual Base64 encoded logo (from assets/images/logo.png)
  const logoBase64 = '/assets/images/logo.png'

  // Build the HTML for photos
  const photosHTML = photos
    .map(photo => `<img src="${photo}" style="width:200px; margin:10px;" />`)
    .join('')

  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { text-align: center; color: #0073BC; }
          .report-section { margin-bottom: 20px; }
          .photos { display: flex; flex-wrap: wrap; justify-content: center; }
          .photos img { border: 1px solid #ccc; border-radius: 4px; }
          .logo { display: block; margin: 0 auto 20px auto; max-width: 150px; }
          pre { white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <img class="logo" src="data:image/png;base64,${logoBase64}" alt="Logo" />
        <h1>Inspection Report</h1>
        <div class="report-section">
          <h2>Report Details</h2>
          <pre>${reportText}</pre>
        </div>
        <div class="report-section photos">
          ${photosHTML}
        </div>
      </body>
    </html>
  `
}

// Function to generate a PDF from the HTML template
export const generatePDF = async () => {
  try {
    const html = generateReportHTML()
    const { uri } = await Print.printToFileAsync({ html })
    console.log('PDF generated at:', uri)
    return uri
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw error
  }
}

// Example usage: you can call generatePDF() on a button press in your React component.
// For instance:
//
// <TouchableOpacity onPress={async () => {
//   const pdfUri = await generatePDF();
//   Linking.openURL(pdfUri);
// }}>
//   <Text>Generate Report</Text>
// </TouchableOpacity>
