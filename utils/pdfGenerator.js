export const generateReportHTML = (logoBase64, ticket) => {
  const {
    ticketNumber,
    street,
    apt,
    city,
    state,
    zip,
    createdAt,
    inspectorName,
    reason,
    inspectionData,
  } = ticket

  let createdAtStr = ''
  if (createdAt && createdAt.seconds) {
    createdAtStr = new Date(createdAt.seconds * 1000).toLocaleString()
  }

  const reportText = `Inspection Report

Ticket Number: ${ticketNumber}
Date: ${createdAtStr}
Address: ${street}${apt ? `, Apt ${apt}` : ''}, ${city}, ${state} ${zip}
Inspector: ${inspectorName}
Reason for Visit:
${reason}`

  let roomsHTML = ''
  if (
    inspectionData &&
    inspectionData.rooms &&
    inspectionData.rooms.length > 0
  ) {
    roomsHTML = inspectionData.rooms
      .map(room => {
        const { roomTitle, inspectionFindings, photos } = room
        const roomPhotosHTML =
          photos && photos.length > 0
            ? photos
                .map(photo =>
                  photo.downloadURL
                    ? `<img src="${photo.downloadURL}" alt="${roomTitle} photo" />`
                    : ''
                )
                .join('')
            : `<p class="no-photos">No photos available for this room.</p>`
        return `
          <div class="room-card">
            <h3>${roomTitle}</h3>
            <div class="findings">
              <p><strong>Findings:</strong></p>
              <p>${inspectionFindings}</p>
            </div>
            <div class="photo-gallery">
              ${roomPhotosHTML}
            </div>
          </div>
        `
      })
      .join('')
  } else {
    roomsHTML = `<p class="no-data">No inspection data available.</p>`
  }

  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            color: #2d3748;
            line-height: 1.6;
          }
          .container {
            max-width: 900px;
            margin: 40px auto;
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          .header {
            background: #2b6cb0;
            color: white;
            padding: 20px;
            text-align: center;
            border-bottom: 4px solid #2c5282;
          }
          .header img {
            max-width: 250px;
            margin-bottom: 10px;
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .report-section {
            padding: 30px;
          }
          .report-section pre {
            background: #edf2f7;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #2b6cb0;
            font-size: 14px;
            white-space: pre-wrap;
            color: #4a5568;
          }
          .room-card {
            background: #f7fafc;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            transition: transform 0.2s ease;
            page-break-inside: avoid;
          }
          .room-card:hover {
            transform: translateY(-5px);
          }
          .room-card h3 {
            color: #2b6cb0;
            font-size: 20px;
            margin: 0 0 10px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 5px;
          }
          .findings p {
            margin: 5px 0;
          }
          .findings strong {
            color: #1a202c;
          }
          .photo-gallery {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            justify-content: center;
            margin-top: 15px;
          }
          .photo-gallery img {
            width: 220px;
            height: 165px;
            object-fit: cover;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            transition: transform 0.2s ease;
          }
          .photo-gallery img:hover {
            transform: scale(1.05);
          }
          .no-photos, .no-data {
            color: #718096;
            font-style: italic;
            text-align: center;
          }
          .footer {
            text-align: center;
            padding: 20px;
            font-size: 12px;
            color: #a0aec0;
            background: #edf2f7;
            border-top: 1px solid #e2e8f0;
          }
          @media print {
            .container {
              box-shadow: none;
              margin: 0;
              width: 100%;
            }
            .room-card:hover {
              transform: none;
            }
            .photo-gallery img:hover {
              transform: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="data:image/png;base64,${logoBase64}" alt="Logo" />
            <h1>Inspection Report</h1>
          </div>
          <div class="report-section">
            <pre>${reportText}</pre>
          </div>
          <div class="report-section">
            ${roomsHTML}
          </div>
          <div class="footer">
            Report generated by Coastal Restoration Services
          </div>
        </div>
      </body>
    </html>
  `
}
