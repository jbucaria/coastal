// utils/rephraseText.js
import Constants from 'expo-constants'

const apiKey = ''

export const rephraseText = async inputText => {
  const messages = [
    {
      role: 'system',
      content: `You are a professional mold remediation consultant. Please format this in a nested list. 
      
      Now rephrase the following text:
"${inputText}"
Rephrased:`,
    },
  ]

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // Using a chat model
        messages,
        max_tokens: 2000, // Increase if necessary
        temperature: 0.7, // Increased freedom while still controlled
        top_p: 1.0,
        frequency_penalty: 0.2,
        presence_penalty: 0.0,
      }),
    })

    if (!response.ok) {
      const errorDetails = await response.json()
      throw new Error(
        `OpenAI API error: ${errorDetails.error?.message || errorDetails}`
      )
    }

    const data = await response.json()
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content.trim()
    } else {
      throw new Error('Unexpected API response format')
    }
  } catch (error) {
    console.error('Error in rephraseText:', error)
    throw error
  }
}
