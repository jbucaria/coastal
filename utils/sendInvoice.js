import { Alert } from 'react-native'
import useAuthStore from '@/store/useAuthStore'

const sendInvoiceToQuickBooks = async (invoiceData, accessToken) => {
  const { quickBooksCompanyId } = useAuthStore.getState() // Retrieve stored company ID

  if (!quickBooksCompanyId || !accessToken) {
    Alert.alert('Error', 'Missing QuickBooks credentials.')
    console.error('QuickBooks Error: Missing access token or company ID')
    return null
  }

  const url = `https://quickbooks.api.intuit.com/v3/company/${quickBooksCompanyId}/invoice?minorversion=65`

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }

  // Grouping: Use invoiceData.rooms if available; otherwise, group flat lineItems by room.
  let rooms = []
  if (invoiceData.rooms && Array.isArray(invoiceData.rooms)) {
    rooms = invoiceData.rooms
  } else if (invoiceData.lineItems && Array.isArray(invoiceData.lineItems)) {
    const grouped = {}
    invoiceData.lineItems.forEach(item => {
      const roomName = item.room || 'Default Room'
      if (!grouped[roomName]) {
        grouped[roomName] = []
      }
      grouped[roomName].push(item)
    })
    rooms = Object.keys(grouped).map(roomName => ({
      roomTitle: roomName,
      items: grouped[roomName],
    }))
  } else {
    console.error(
      'invoiceData has neither "rooms" nor "lineItems" as an array.'
    )
    Alert.alert('Error', 'Invalid invoice data structure.')
    return null
  }

  // Build the "Line" array:
  const lines = []
  rooms.forEach(room => {
    // Add a header line for the room using the nested DescriptionOnlyLineDetail object.
    lines.push({
      DetailType: 'DescriptionOnlyLineDetail',
      Amount: 0, // Header lines don't affect the total.
      DescriptionOnlyLineDetail: {
        Description: room.roomTitle, // Room header text
      },
    })
    // Then add each item in this room as a SalesItemLineDetail.
    room.items.forEach(item => {
      if (
        typeof item.amount === 'undefined' ||
        !item.itemId ||
        typeof item.unitPrice === 'undefined' ||
        typeof item.quantity === 'undefined'
      ) {
        console.warn(
          'Skipping item due to missing required fields:',
          item,
          'in room:',
          room.roomTitle
        )
        return
      }
      lines.push({
        DetailType: 'SalesItemLineDetail',
        Amount: item.amount, // The computed or overridden line total.
        Description: item.description || '',
        SalesItemLineDetail: {
          ItemRef: { value: item.itemId },
          UnitPrice: item.unitPrice,
          Qty: item.quantity,
        },
      })
    })
  })

  // Calculate the total from only SalesItemLineDetail lines.
  const totalAmt = lines
    .filter(line => line.DetailType === 'SalesItemLineDetail')
    .reduce((sum, line) => sum + (line.Amount || 0), 0)

  const requestBody = {
    AutoDocNumber: true,
    CustomerRef: { value: invoiceData.customerId },

    EmailStatus: 'NeedToSend',
    AllowOnlinePayment: true,
    AllowOnlineCreditCardPayment: true,
    AllowOnlineACHPayment: true,
    // Omitting BillAddr so that QBO uses the customer's default billing address.
    TxnDate: invoiceData.invoiceDate, // Ensure this is a string in "YYYY-MM-DD" format.
    CurrencyRef: { value: 'USD' },
    Line: lines,
    TotalAmt: totalAmt,
  }

  console.log('🚀 Sending Invoice Data:', JSON.stringify(requestBody, null, 2))

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    })

    const responseText = await response.text()
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch (error) {
      console.error('🛑 Failed to parse JSON response:', responseText)
      Alert.alert('Error', 'Invalid JSON response from QuickBooks.')
      return null
    }

    console.log(
      '🔍 QuickBooks Response:',
      JSON.stringify(responseData, null, 2)
    )

    if (response.ok) {
      Alert.alert('Success', 'Invoice sent to QuickBooks!')
      console.log('✅ Invoice Created:', responseData)
      return responseData
    } else {
      const errorDetails = responseData.fault?.error || []
      let errorMessage = `QuickBooks API Error: ${response.status} ${response.statusText}`
      if (errorDetails.length > 0) {
        errorMessage += `\nDetails: ${
          errorDetails[0]?.message || 'Unknown Error'
        }`
      }
      Alert.alert('Error', errorMessage)
      console.error('❌ QuickBooks Error Details:', errorDetails)
      return null
    }
  } catch (networkError) {
    Alert.alert('Error', 'Failed to connect to QuickBooks API.')
    console.error('❌ Network or Unexpected Error:', networkError)
    return null
  }
}

export { sendInvoiceToQuickBooks }
