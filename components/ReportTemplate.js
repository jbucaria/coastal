export const generateReportHTML = async formData => {
  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
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
            margin-bottom: 20px;
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
          .photo {
            margin-bottom: 20px;
            text-align: center;
          }
          .photo img {
            max-width: 300px;
            height: auto;
            margin-top: 10px;
          }
          .photo-label {
            font-style: italic;
            font-weight: bold;
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
              <th>Reason</th>
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
          </table>
        </div>

        <!-- Equipment Used -->
        <div class="section">
          <h2 class="section-title">Equipment Used</h2>
          <p class="bold-label">${
            formData.equipment.length > 0
              ? formData.equipment.join(', ')
              : 'No equipment used.'
          }</p>
        </div>

        <!-- Inspection Results -->
        <div class="section">
          <h2 class="section-title">Inspection Results</h2>
          <p class="bold-label">${
            formData.inspectionResults || 'No results provided.'
          }</p>
        </div>

        <!-- Recommended Actions -->
        <div class="section">
          <h2 class="section-title">Recommended Actions</h2>
          <p class="bold-label">${
            formData.recommendedActions || 'No actions provided.'
          }</p>
        </div>

        <!-- Photos -->
        <div class="section">
          <h2 class="section-title">Photos</h2>
          ${
            formData.photos.length > 0
              ? formData.photos
                  .map(
                    photo => `
                  <div class="photo">
                    <img src="data:image/jpeg;base64,${
                      photo.base64
                    }" alt="Photo" />
                    <div class="photo-label bold-label">Label: ${
                      photo.label || 'No label'
                    }</div>
                  </div>
                `
                  )
                  .join('')
              : '<p class="bold-label">No photos attached.</p>'
          }
        </div>
      </body>
    </html>
  `
}
