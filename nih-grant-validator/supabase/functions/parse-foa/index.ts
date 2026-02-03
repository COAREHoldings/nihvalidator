// Layer 5: FOA Parsing Edge Function
// Extracts page limits, budget caps, clinical trial policy, and other requirements from NIH FOA documents

import { corsHeaders } from '../_shared/compliancePrompt.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const { foaText, foaNumber } = await req.json()

    if (!foaText) {
      throw new Error('FOA text content is required')
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const systemPrompt = `You are an NIH FOA (Funding Opportunity Announcement) parser. Your job is to extract ONLY information that is EXPLICITLY stated in the FOA document provided.

CRITICAL RULES:
1. ONLY extract values that appear EXPLICITLY in the document
2. If a value is NOT specified, use null for that field
3. NEVER invent or guess values
4. Budget caps must be exact numbers from the document
5. Page limits must be exact numbers from the document

Extract the following information and return as JSON:

{
  "foaNumber": "The FOA number (e.g., PA-23-199, PAR-24-001)",
  "title": "Full title of the FOA",
  "activityCode": "Activity code (R41, R42, R43, R44, etc.)",
  "organization": "NIH Institute/Center (e.g., NCI, NHLBI)",
  
  "pageLimits": {
    "specificAims": number or null,
    "researchStrategy": number or null,
    "bibliography": number or null,
    "facilitiesAndEquipment": number or null,
    "equipmentList": number or null,
    "humanSubjectsAttachment": number or null,
    "vertebrateAnimalsAttachment": number or null,
    "resourceSharingPlan": number or null,
    "authenticationOfKeyBiologicalResources": number or null,
    "letters": number or null,
    "commercializationPlan": number or null
  },
  
  "budgetCaps": {
    "phase1TotalCost": number or null (total across all years),
    "phase1DirectCostPerYear": number or null,
    "phase2TotalCost": number or null,
    "phase2DirectCostPerYear": number or null,
    "fastTrackTotalCost": number or null
  },
  
  "eligibility": {
    "smallBusinessRequired": true/false,
    "forProfitAllowed": true/false,
    "nonProfitAllowed": true/false,
    "foreignComponentsAllowed": true/false or null if not specified,
    "sbir": true/false (is this SBIR eligible),
    "sttr": true/false (is this STTR eligible)
  },
  
  "allocationRequirements": {
    "smallBusinessMinPercent": number or null (e.g., 67 for 67%),
    "researchInstitutionMaxPercent": number or null (for STTR),
    "researchInstitutionMinPercent": number or null (for STTR, typically 30),
    "primaryAwardeeMinEffort": number or null
  },
  
  "clinicalTrial": {
    "clinicalTrialRequired": true/false/null,
    "clinicalTrialAllowed": true/false/null,
    "clinicalTrialDesignation": "Required", "Allowed", "Not Allowed", or null
  },
  
  "phases": {
    "phase1Allowed": true/false,
    "phase2Allowed": true/false,
    "fastTrackAllowed": true/false,
    "directToPhase2Allowed": true/false
  },
  
  "dueDates": {
    "standardDates": true/false,
    "specificDates": ["YYYY-MM-DD", ...] or null,
    "expirationDate": "YYYY-MM-DD" or null
  },
  
  "specialRequirements": [
    "List any special requirements, restrictions, or unique aspects of this FOA"
  ],
  
  "commercializationPlanRequired": true/false (typically true for Phase II),
  
  "resubmissionPolicy": "Standard" or specific policy if different
}

If you cannot find explicit information for a field, set it to null. Do NOT guess values based on typical NIH guidelines.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Parse the following NIH FOA document and extract all relevant requirements. Only include information that is EXPLICITLY stated:\n\n---FOA DOCUMENT START---\n${foaText}\n---FOA DOCUMENT END---` }
        ],
        temperature: 0,
        response_format: { type: 'json_object' }
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenAI API error: ${errorText}`)
    }

    const result = await response.json()
    const parsedFOA = JSON.parse(result.choices[0].message.content)

    // Add the provided FOA number if not extracted
    if (!parsedFOA.foaNumber && foaNumber) {
      parsedFOA.foaNumber = foaNumber
    }

    // Generate a summary of what was extracted
    const summary = {
      pageLimitsFound: Object.values(parsedFOA.pageLimits || {}).filter(v => v !== null).length,
      budgetCapsFound: Object.values(parsedFOA.budgetCaps || {}).filter(v => v !== null).length,
      hasEligibilityInfo: parsedFOA.eligibility && Object.values(parsedFOA.eligibility).some(v => v !== null),
      hasClinicalTrialInfo: parsedFOA.clinicalTrial && Object.values(parsedFOA.clinicalTrial).some(v => v !== null),
      specialRequirementsCount: (parsedFOA.specialRequirements || []).length
    }

    return new Response(JSON.stringify({
      success: true,
      data: parsedFOA,
      summary,
      extractedAt: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Parse FOA error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
