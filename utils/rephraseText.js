// utils/rephraseText.js

export const rephraseText = async inputText => {
  // IMPORTANT: Do not hard-code your API key in production!
  // Instead, load it from an environment variable or secure storage.
  const apiKey = '' // Replace with your API key

  // Construct the messages array for the chat API.
  // The system message sets the behavior, and the user message includes your prompt.
  const messages = [
    {
      role: 'system',
      content: `You are a professional mold remediation consultant.
Your task is to rephrase inspection and remediation results into two bullet points:
- The first bullet should start with "Status:" and provide a concise summary of the inspection findings.
- The second bullet should start with "Recommendations:" and then list the steps needed to remediate the issues.

Include mold remediation-specific terminology. Make sure to use terms such as: mold remediation, containment, HEPA filtration, dehumidification, structural drying, hazard mitigation, biocide treatment, ventilation optimization, moisture control, and air purification.

Below is an example of the input and output format:

Input:
"Inspection Results  
The inspection revealed extensive mold growth in the following areas:  
- Foyer Ceiling: Significant mold contamination was identified.  
- Foyer Wall (shared with the garage): Visible mold growth was detected along the surface.  
Remediation Actions  
To address the issues, the following steps were performed:  
1. Drywall Removal: All contaminated drywall in the foyer ceiling and wall was removed to prevent further mold spread.  
2. Surface Treatment: The exposed lumber was thoroughly cleaned and treated using ShockWave® Disinfectant and MMR Mold Remover to eliminate mold spores and inhibit future mold growth.  
3. Containment Measures: Containment barriers were established to minimize cross-contamination during remediation.  
4. Air Quality Management: Equipment such as air scrubbers and dehumidifiers was employed to maintain safe air quality and ensure effective drying of the area."

Output:
- Status: Significant mold contamination detected on the foyer ceiling and wall with visible spread.
- Recommendations: Initiate mold remediation procedures including drywall removal, surface treatment with ShockWave® Disinfectant and MMR Mold Remover, establish containment barriers, and employ air quality management using HEPA filtration, dehumidification, and structural drying.

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
        max_tokens: 200, // Increase if necessary
        temperature: 0.7, // Increased freedom while still controlled
        top_p: 1.0,
        frequency_penalty: 0.2,
        presence_penalty: 0.0,
      }),
    })

    if (!response.ok) {
      const errorDetails = await response.text()
      throw new Error(`OpenAI API error: ${errorDetails}`)
    }

    const data = await response.json()
    return data.choices[0].message.content.trim()
  } catch (error) {
    console.error('Error in rephraseText:', error)
    throw error
  }
}
