import { Alert } from 'react-native'
import useAuthStore from '@/store/useAuthStore'

const sendInvoiceToQuickBooks = async (invoiceData, accessToken) => {
  console.log('invoiceData:', invoiceData)
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

  // Build a flattened array with a header line for each room.
  const lines = []
  invoiceData.rooms.forEach(room => {
    // Add a header line for the room (Description Only)
    lines.push({
      DetailType: 'DescriptionOnlyLineDetail',
      Amount: 0, // No charge for the header
      Description: room.roomName, // Room name as header
    })
    // Then add each item for that room.
    room.items.forEach(item => {
      lines.push({
        DetailType: 'SalesItemLineDetail',
        Amount: item.amount,
        Description: item.description,
        SalesItemLineDetail: {
          ItemRef: { value: item.itemId },
          UnitPrice: item.unitPrice,
          Qty: item.quantity,
        },
      })
    })
  })

  const requestBody = {
    AutoDocNumber: true,
    CustomerRef: { value: invoiceData.customerId },
    BillEmail: { Address: invoiceData.customerEmail },
    EmailStatus: 'NeedToSend',
    AllowOnlinePayment: true,
    AllowOnlineCreditCardPayment: true,
    AllowOnlineACHPayment: true,
    // Since you're using the customer's default billing address, you can omit BillAddr.
    TxnDate: invoiceData.invoiceDate, // Should be in "YYYY-MM-DD" format
    CurrencyRef: { value: 'USD' },
    Line: lines,
    // Compute the total only from the sales item lines
    TotalAmt: lines
      .filter(line => line.DetailType === 'SalesItemLineDetail')
      .reduce((sum, line) => sum + (line.Amount || 0), 0),
  }

  try {
    console.log(
      '🚀 Sending Invoice Data:',
      JSON.stringify(requestBody, null, 2)
    )

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    })

    // Capture raw response for debugging
    const responseText = await response.text()
    let responseData

    // Parse JSON if possible
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
      // Use QuickBooks error details if available
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
