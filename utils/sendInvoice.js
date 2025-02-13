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

  const requestBody = {
    AutoDocNumber: true,
    CustomerRef: {
      value: invoiceData.customerId, // QBO Customer ID from your screen data
    },
    BillEmail: {
      Address: invoiceData.customerEmail, // Customer email from your screen
    },
    EmailStatus: 'NeedToSend',
    AllowOnlinePayment: true,
    AllowOnlineCreditCardPayment: true,
    AllowOnlineACHPayment: true,

    // Use the invoice date provided by your screen (ensure it's in "YYYY-MM-DD" format)
    TxnDate: invoiceData.invoiceDate,
    CurrencyRef: { value: 'USD' },

    // Build dynamic line items from your screen's data
    Line: invoiceData.lineItems.map(item => ({
      DetailType: 'SalesItemLineDetail',
      Amount: item.amount, // Final computed line total
      Description: item.description,
      SalesItemLineDetail: {
        ItemRef: { value: item.itemId }, // QBO Item/Service ID
        UnitPrice: item.unitPrice,
        Qty: item.quantity,
      },
    })),

    // Optionally, you can also include the overall total
    TotalAmt: invoiceData.lineItems.reduce(
      (sum, item) => sum + (item.amount || 0),
      0
    ),
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
