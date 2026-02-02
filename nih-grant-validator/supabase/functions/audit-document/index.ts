Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { documentType, documentContent, fileName, mechanism } = await req.json();

    if (!documentContent || !documentType) {
      throw new Error('Document content and type are required');
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Document-specific audit prompts
    const auditPrompts: Record<string, string> = {
      'specific_aims': `Audit this NIH Specific Aims page. Check for:
- Clear statement of the long-term goal and objective
- Concise central hypothesis
- Well-defined specific aims (typically 2-3)
- Logical flow from problem to solution
- One-page limit compliance
- Proper NIH formatting

Return JSON:
{
  "score": 0-100,
  "formatCompliance": { "withinPageLimit": true/false, "properStructure": true/false },
  "contentQuality": {
    "goalClarity": 0-100,
    "hypothesisStrength": 0-100,
    "aimsClarity": 0-100,
    "logicalFlow": 0-100
  },
  "extractedContent": {
    "title": "project title",
    "goal": "long-term goal",
    "hypothesis": "central hypothesis",
    "aims": ["aim 1", "aim 2", "aim 3"]
  },
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "suggestions": ["suggestion 1", "suggestion 2"]
}`,

      'research_strategy': `Audit this NIH Research Strategy document. Check for:
- Significance section (importance, impact)
- Innovation section (novelty, advancement)
- Approach section (methodology, rigor)
- Preliminary data (if applicable)
- Page limit compliance (typically 6-12 pages depending on mechanism)
- Scientific rigor and reproducibility

Return JSON:
{
  "score": 0-100,
  "sections": {
    "significance": { "present": true/false, "score": 0-100, "issues": [] },
    "innovation": { "present": true/false, "score": 0-100, "issues": [] },
    "approach": { "present": true/false, "score": 0-100, "issues": [] },
    "preliminaryData": { "present": true/false, "adequate": true/false }
  },
  "scientificRigor": {
    "methodology": 0-100,
    "statisticalPlan": 0-100,
    "reproducibility": 0-100,
    "alternativeApproaches": true/false
  },
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "suggestions": ["suggestion 1", "suggestion 2"]
}`,

      'budget': `Audit this NIH Budget document. Check for:
- Detailed cost breakdown
- Personnel costs and effort justification
- Equipment justification
- Supplies and other costs
- Subaward/consortium costs if applicable
- Budget narrative/justification quality
- Compliance with budget caps

Return JSON:
{
  "score": 0-100,
  "components": {
    "personnel": { "present": true/false, "justified": true/false, "issues": [] },
    "equipment": { "present": true/false, "justified": true/false, "issues": [] },
    "supplies": { "present": true/false, "reasonable": true/false },
    "travel": { "present": true/false, "justified": true/false },
    "other": { "present": true/false, "justified": true/false }
  },
  "totals": {
    "directCosts": "amount if found",
    "indirectCosts": "amount if found",
    "total": "amount if found"
  },
  "justificationQuality": 0-100,
  "strengths": ["strength 1"],
  "weaknesses": ["weakness 1"],
  "suggestions": ["suggestion 1"]
}`,

      'commercialization_plan': `Audit this NIH Commercialization Plan. Check for all 6 required sections:
1. Value of SBIR/STTR, Expected Outcomes, Impact
2. Company (management, expertise, experience)
3. Market, Customer, Competition
4. Intellectual Property Protection
5. Finance Plan
6. Revenue Stream

Return JSON:
{
  "score": 0-100,
  "sections": {
    "value_outcomes": { "present": true/false, "score": 0-100, "issues": [] },
    "company": { "present": true/false, "score": 0-100, "issues": [] },
    "market": { "present": true/false, "score": 0-100, "issues": [] },
    "ip": { "present": true/false, "score": 0-100, "issues": [] },
    "finance": { "present": true/false, "score": 0-100, "issues": [] },
    "revenue": { "present": true/false, "score": 0-100, "issues": [] }
  },
  "pageCompliance": { "within12Pages": true/false, "estimatedPages": number },
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "suggestions": ["suggestion 1", "suggestion 2"]
}`,

      'biosketch': `Audit this NIH Biosketch. Check for:
- Personal Statement (relevance to project)
- Positions, Scientific Appointments, and Honors
- Contribution to Science (up to 5 contributions)
- Research Support (current and completed)
- NIH biosketch format compliance (5-page limit)
- eRA Commons ID presence

Return JSON:
{
  "score": 0-100,
  "personName": "extracted name",
  "role": "PI/Co-I/Key Personnel (if determinable)",
  "sections": {
    "personalStatement": { "present": true/false, "relevant": true/false, "score": 0-100 },
    "positions": { "present": true/false, "complete": true/false },
    "contributions": { "present": true/false, "count": number, "quality": 0-100 },
    "researchSupport": { "present": true/false, "current": true/false, "completed": true/false }
  },
  "formatCompliance": {
    "nihFormat": true/false,
    "withinPageLimit": true/false,
    "eraCommonsId": true/false
  },
  "expertise": ["area 1", "area 2"],
  "strengths": ["strength 1"],
  "weaknesses": ["weakness 1"],
  "suggestions": ["suggestion 1"]
}`,

      'letter_of_support': `Audit this Letter of Support. Check for:
- Clear identification of the writer and their organization
- Specific commitment or support statement
- Relevance to the project
- Concrete contributions described
- Appropriate level of enthusiasm
- Official letterhead indicators

Return JSON:
{
  "score": 0-100,
  "letterFrom": "person/organization name",
  "letterType": "collaborator|consultant|institutional|customer|partner|other",
  "content": {
    "specificCommitment": true/false,
    "commitmentDetails": "what they commit to",
    "relevanceToProject": 0-100,
    "concreteContributions": true/false
  },
  "quality": {
    "specificity": 0-100,
    "enthusiasm": 0-100,
    "credibility": 0-100
  },
  "strengths": ["strength 1"],
  "weaknesses": ["weakness 1"],
  "suggestions": ["suggestion 1"]
}`,

      'milestones': `Audit this Milestones document. Check for:
- Clear milestone definitions
- Measurable success criteria
- Realistic timeline
- Go/No-Go decision points
- Alignment with specific aims

Return JSON:
{
  "score": 0-100,
  "milestones": [
    { "name": "milestone name", "timeline": "when", "measurable": true/false, "realistic": true/false }
  ],
  "goNoGoPoints": { "present": true/false, "clear": true/false },
  "alignmentWithAims": 0-100,
  "strengths": ["strength 1"],
  "weaknesses": ["weakness 1"],
  "suggestions": ["suggestion 1"]
}`
    };

    // Get appropriate prompt based on document type
    let promptKey = documentType;
    if (documentType === 'biosketches') promptKey = 'biosketch';
    if (documentType === 'letters_of_support') promptKey = 'letter_of_support';
    
    const specificPrompt = auditPrompts[promptKey] || auditPrompts['specific_aims'];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: `You are an expert NIH grant reviewer auditing individual grant documents for a ${mechanism || 'SBIR/STTR'} application. Provide thorough, constructive feedback.` 
          },
          { 
            role: 'user', 
            content: `${specificPrompt}\n\nDocument to audit (${fileName || documentType}):\n\n${documentContent}` 
          }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const result = await response.json();
    const auditResult = JSON.parse(result.choices[0].message.content);

    return new Response(JSON.stringify({
      success: true,
      documentType,
      fileName,
      audit: auditResult,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Audit document error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
