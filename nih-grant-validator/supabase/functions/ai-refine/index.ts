import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, text, sectionType, grantType } = await req.json()

    if (!text || !action) {
      return new Response(JSON.stringify({ error: { message: 'Missing required fields: text and action' } }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      return new Response(JSON.stringify({ error: { message: 'OpenAI API key not configured' } }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let systemPrompt: string
    let outputFormat: string

    switch (action) {
      case 'refine':
        systemPrompt = `You are an expert NIH grant writing consultant. Analyze the provided ${sectionType} section for a ${grantType} SBIR/STTR grant application.

Provide constructive feedback to improve the writing quality, scientific rigor, and persuasiveness.`
        outputFormat = `{
  "summary": "Brief overview of the text quality",
  "strengths": ["List of 2-4 strengths"],
  "improvements": [{"issue": "Specific issue", "suggestion": "How to fix it"}],
  "revisedExcerpt": "A revised version of the first paragraph demonstrating improvements"
}`
        break

      case 'compliance':
        systemPrompt = `You are an NIH compliance expert reviewing a ${sectionType} section for a ${grantType} grant.

Check for:
1. Prohibited language (definitive claims without evidence, overpromising)
2. Inappropriate language for NIH (marketing speak, informal tone)
3. Missing required elements
4. Potential reviewer red flags`
        outputFormat = `{
  "compliant": true or false,
  "issues": [{"text": "problematic text excerpt", "problem": "what's wrong", "suggestion": "how to fix"}],
  "overallRisk": "low", "medium", or "high"
}`
        break

      case 'reviewer':
        systemPrompt = `You are simulating an NIH study section reviewer evaluating a ${sectionType} section for a ${grantType} grant.

Score on the NIH 1-9 scale (1=Exceptional, 9=Poor). Be critical but fair, mimicking actual reviewer feedback.`
        outputFormat = `{
  "overallImpression": "2-3 sentences on overall quality",
  "significance": {"score": 1-9, "strengths": ["..."], "weaknesses": ["..."]},
  "innovation": {"score": 1-9, "strengths": ["..."], "weaknesses": ["..."]},
  "approach": {"score": 1-9, "strengths": ["..."], "weaknesses": ["..."]},
  "additionalComments": "Any other feedback"
}`
        break

      case 'score':
        systemPrompt = `You are an expert at predicting NIH grant scores based on the quality of writing. Analyze this ${sectionType} section for a ${grantType} grant.

Consider: scientific premise, innovation, feasibility, team qualifications (if mentioned), and writing quality.`
        outputFormat = `{
  "predictedScore": 1-9 (NIH scale),
  "confidence": "low", "medium", or "high",
  "rationale": "Why this score",
  "scoringFactors": {"positive": ["..."], "negative": ["..."]},
  "improvementPotential": "What could improve the score"
}`
        break

      default:
        return new Response(JSON.stringify({ error: { message: `Unknown action: ${action}` } }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `${systemPrompt}\n\nRespond ONLY with valid JSON in this exact format:\n${outputFormat}`
          },
          {
            role: 'user',
            content: `Analyze this ${sectionType} section:\n\n${text}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI error:', errorText)
      return new Response(JSON.stringify({ error: { message: 'AI analysis failed' } }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const aiResponse = await response.json()
    const content = aiResponse.choices?.[0]?.message?.content

    if (!content) {
      return new Response(JSON.stringify({ error: { message: 'No response from AI' } }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Parse JSON from response
    let result
    try {
      // Handle potential markdown code blocks
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      result = JSON.parse(jsonStr)
    } catch (e) {
      console.error('Failed to parse AI response:', content)
      return new Response(JSON.stringify({ error: { message: 'Failed to parse AI response' } }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: { message: error.message || 'Internal server error' } }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
