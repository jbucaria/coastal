export const generateReportHTML = async formData => {
  return `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            /* Page-break rules for printing */
            @media print {
              .page-break {
                page-break-before: always;
              }
            }
  
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              font-size: 14px;
              line-height: 1.6;
            }
  
            h1, h2 {
              color: #333;
            }
            h1 {
              text-align: center;
              margin-bottom: 10px;
            }
            h2 {
              font-weight: bold;
            }
            .sub-header {
              text-align: center;
              margin-bottom: 40px;
              font-weight: bold;
              font-size: 18px;
              color: #555;
            }
            .section {
              margin-bottom: 30px; /* spacing between sections */
            }
            .section-title {
              font-weight: bold;
              font-size: 16px;
              color: #555;
              margin-bottom: 10px;
              border-bottom: 2px solid #ddd;
              padding-bottom: 5px;
            }
            .info-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .info-table th, .info-table td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            .info-table th {
              background-color: #f4f4f4;
            }
            .bold-label {
              font-weight: bold;
            }
  
            /* Fixed-height sections for Inspection Results and Recommended Actions */
            .fixed-height-section {
              min-height: 175px; /* Adjust as needed for your layout */
              overflow-y: auto;
              border: 1px solid #ddd;
              padding: 10px;
              margin-bottom: 30px;
            }
  
            /* Photos Section */
            .photo-section {
              padding-top: 30px;
            }
          .photo-grid {
  /* Use CSS Grid instead of Flex */
  display: grid;
  /* Exactly 3 columns, each 200px wide */
  grid-template-columns: repeat(3, 200px);
  gap: 20px; /* spacing between columns and rows */
  justify-content: center; /* center the grid in its container */
}

.photo {
  /* Match the column width/height so each cell is uniform */
  width: 200px;
  height: 200px;
  overflow: hidden;
  page-break-inside: avoid; /* Helps keep an entire photo on one page in PDF */
}

.photo img {
  width: 100%;
  height: 100%;
  object-fit: cover; /* Crop the image to fill the 200x200 area */
}

            .photo-label {
              font-style: italic;
              font-weight: bold;
              margin-top: 5px;
            }
  
            @media (max-width: 600px) {
              .photo-grid {
                flex-direction: column;
              }
              .photo {
                flex: 1 0 100%;
              }
            }
          </style>
        </head>
        <body>
          <!-- Header -->
          <h1>Coastal Restoration</h1>
          <div class="sub-header">Inspection Report</div>
  
          <!-- Customer Information -->
          <div class="section">
            <h2 class="section-title">Customer Information</h2>
            <table class="info-table">
              <tr>
                <th>Customer</th>
                <td>${formData.customer}</td>
              </tr>
              <tr>
                <th>Address</th>
                <td>${formData.address}</td>
              </tr>
              <tr>
                <th>Date of Inspection</th>
                <td>${formData.date}</td>
              </tr>
              <tr>
                <th>Reason for Inspection</th>
                <td>${formData.reason}</td>
              </tr>
              <tr>
                <th>Inspector</th>
                <td>${formData.inspectorName}</td>
              </tr>
              <tr>
                <th>Hours</th>
                <td>${formData.hours}</td>
              </tr>
              <tr>
                <th>Homeowner Contact</th>
                <td>${formData.contactName}, ${formData.contactNumber}</td>
              </tr>
              
            </table>
          </div>
  
          <!-- Inspection Results -->
          <div class="section">
            <h2 class="section-title">Inspection Results</h2>
            <div class="fixed-height-section"
            style="white-space: pre-wrap;"
            >${formData.inspectionResults || 'No results provided.'}
            </div>
          </div>
  
          <!-- Recommended Actions -->
          <div class="section">
            <h2 class="section-title">Recommended Actions</h2>
            <div class="fixed-height-section"
            style="white-space: pre-wrap;">${
              formData.recommendedActions || 'No actions provided.'
            }
            </div>
          </div>
  
          <!-- Force page break before the Photos section -->
          <div class="page-break"></div>
  
          <!-- Photos Section -->
        <div class="section photo-section">
  <h2 class="section-title">Photos</h2>
  <div class="photo-grid">
    ${
      formData.photos && formData.photos.length > 0
        ? formData.photos
            .map(
              photo => `
              <div class="photo">
                <img src="${photo.uri}" alt="${photo.label || 'Photo'}" />
                <div class="photo-label bold-label">${photo.label || ''}</div>
              </div>
            `
            )
            .join('')
        : '<p class="bold-label">No photos attached.</p>'
    }
  </div>
          </div>
        </body>
      </html>
    `
}
