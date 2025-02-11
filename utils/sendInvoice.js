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
      value: '188',
    },
    BillEmail: {
      Address: invoiceData.customerEmail,
    },
    EmailStatus: 'NeedToSend',
    AllowOnlinePayment: true,
    AllowOnlineCreditCardPayment: true,
    AllowOnlineACHPayment: true,
    Line: invoiceData.lineItems.map(item => ({
      DetailType: 'SalesItemLineDetail',
      // The Amount is the final line total (computed or overridden)
      Amount: item.amount,
      // Optionally, you can leave Description empty or set it if needed
      Description: item.description,
      SalesItemLineDetail: {
        ItemRef: {
          value: item.itemId,
        },
        // Use the actual unitPrice and quantity
        UnitPrice: item.unitPrice,
        Qty: item.quantity,
      },
    })),
    TxnDate: invoiceData.invoiceDate,
    CurrencyRef: {
      value: 'USD',
    },
    // Sum the amounts from each line item for the overall total
    TotalAmt: invoiceData.lineItems.reduce(
      (total, item) => total + item.amount,
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
