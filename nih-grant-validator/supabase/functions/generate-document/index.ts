const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const { documentType, grantType, modules } = await req.json()
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Build context from modules
    const moduleContext = `
Grant Type: ${grantType || 'Not specified'}

Module 1 - Title & Concept:
- Project Title: ${modules.m1?.project_title || 'Not provided'}
- Problem Statement: ${modules.m1?.problem_statement || 'Not provided'}
- Proposed Solution: ${modules.m1?.proposed_solution || 'Not provided'}
- Target Population: ${modules.m1?.target_population || 'Not provided'}
- Therapeutic Area: ${modules.m1?.therapeutic_area || 'Not provided'}
- Technology Type: ${modules.m1?.technology_type || 'Not provided'}

Module 2 - Hypothesis:
- Central Hypothesis: ${modules.m2?.central_hypothesis || 'Not provided'}
- Supporting Rationale: ${modules.m2?.supporting_rationale || 'Not provided'}
- Preliminary Data: ${modules.m2?.preliminary_data_summary || 'Not provided'}
- Success Criteria: ${modules.m2?.success_criteria || 'Not provided'}

Module 3 - Specific Aims:
- Aim 1: ${modules.m3?.aim1_statement || 'Not provided'}
- Aim 2: ${modules.m3?.aim2_statement || 'Not provided'}
- Aim 3: ${modules.m3?.aim3_statement || 'Not provided'}

Module 4 - Team:
- PI: ${modules.m4?.pi_name || 'Not provided'}
- Qualifications: ${modules.m4?.pi_qualifications || 'Not provided'}

Module 5 - Experimental Approach:
- Methodology: ${modules.m5?.methodology_overview || 'Not provided'}
- Experimental Design: ${modules.m5?.experimental_design || 'Not provided'}
- Analysis Plan: ${modules.m5?.analysis_plan || 'Not provided'}
- Statistical Approach: ${modules.m5?.statistical_approach || 'Not provided'}
- Potential Pitfalls: ${modules.m5?.potential_pitfalls || 'Not provided'}
- Alternative Approaches: ${modules.m5?.alternative_approaches || 'Not provided'}

Module 9 - Commercialization (if applicable):
${modules.m9 ? JSON.stringify(modules.m9, null, 2) : 'Not provided'}
`

    let systemPrompt = ''
    let userPrompt = ''

    switch (documentType) {
      case 'titles':
        systemPrompt = `You are an expert NIH grant writing consultant specializing in SBIR/STTR applications. Generate compelling, descriptive project titles that clearly communicate scientific merit and commercial potential.`
        userPrompt = `Based on the following grant application content, generate exactly 3 distinct project title options. Each title should:
1. Be concise (under 81 characters for NIH requirements)
2. Clearly communicate the innovation
3. Include the therapeutic/technology area
4. Be compelling for reviewers

Format your response as:
TITLE 1: [title]
[Brief explanation of why this title works]

TITLE 2: [title]
[Brief explanation of why this title works]

TITLE 3: [title]
[Brief explanation of why this title works]

Grant Content:
${moduleContext}`
        break

      case 'research':
        systemPrompt = `You are an expert NIH grant writing consultant with extensive experience writing successful SBIR/STTR Research Strategy sections. Write in clear, scientific prose suitable for NIH review panels.`
        userPrompt = `Based on the following grant application content, generate a complete NIH Research Strategy section with these parts:

A. SIGNIFICANCE (approximately 1-2 pages)
- Explain the importance of the problem
- Describe existing knowledge gaps
- Explain how your project addresses unmet needs
- Discuss potential impact on the field

B. INNOVATION (approximately 0.5-1 page)
- Highlight novel concepts, approaches, methodologies
- Explain what makes this project unique
- Describe advantages over existing solutions

C. APPROACH (approximately 3-4 pages)
- Detail your research methodology
- Describe experimental design for each aim
- Include timeline and milestones
- Address potential problems and alternative approaches
- Describe how results will be analyzed

Write in formal scientific prose with proper paragraph structure.

Grant Content:
${moduleContext}`
        break

      case 'references':
        systemPrompt = `You are a scientific literature expert. Generate realistic, properly formatted scientific references that would support an NIH SBIR/STTR grant application.`
        userPrompt = `Based on the following grant application content, generate a comprehensive reference list (20-30 references) that would support the Research Strategy. Include:

1. Foundational papers establishing the scientific premise
2. Recent papers showing the state of the field
3. Papers supporting the methodology/approach
4. Papers demonstrating preliminary data relevance
5. Papers on the target population/disease area

Format each reference in NIH/MEDLINE style:
Author AA, Author BB. Title of article. Journal Name. Year;Volume(Issue):Pages. PMID: XXXXXXXX

Organize references by topic area with brief annotations explaining relevance.

Grant Content:
${moduleContext}`
        break

      case 'commercialization':
        systemPrompt = `You are an expert NIH SBIR/STTR commercialization consultant who has helped companies secure Phase II funding. Write compelling commercialization plans that demonstrate market understanding and clear pathways to commercial success.`
        userPrompt = `Based on the following grant application content, generate a comprehensive NIH Commercialization Plan covering all 6 required sections:

SECTION 1: COMPANY AND VALUE CREATED (2 pages)
- Company background and capabilities
- Product/service value proposition
- Competitive advantages
- IP strategy

SECTION 2: MARKET OPPORTUNITY (2 pages)
- Target market size and characteristics
- Market trends and growth projections
- Unmet needs analysis
- Customer segments

SECTION 3: COMPETITION (2 pages)
- Competitive landscape analysis
- Direct and indirect competitors
- Competitive positioning
- Barriers to entry

SECTION 4: INTELLECTUAL PROPERTY (2 pages)
- Current IP position
- Patent strategy
- Freedom to operate considerations
- Trade secrets and know-how

SECTION 5: FINANCING AND REVENUE (2 pages)
- Revenue model
- Pricing strategy
- Funding history and future needs
- Financial projections

SECTION 6: COMMERCIALIZATION STRATEGY AND MILESTONES (2 pages)
- Go-to-market strategy
- Regulatory pathway
- Partnership strategy
- Key milestones and timeline

Write in professional business prose suitable for NIH review.

Grant Content:
${moduleContext}`
        break

      default:
        throw new Error(`Unknown document type: ${documentType}`)
    }

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
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 8000,
      }),
    })

    const data = await response.json()
    
    if (data.error) {
      throw new Error(data.error.message || 'OpenAI API error')
    }

    const content = data.choices?.[0]?.message?.content || ''

    return new Response(
      JSON.stringify({ success: true, content, documentType }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Generation error:', error)
    return new Response(
      JSON.stringify({ error: { message: error.message || 'Generation failed' } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
