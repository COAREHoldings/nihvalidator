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
    const { moduleContent, grantType, phase, programType } = await req.json();

    if (!moduleContent) {
      throw new Error('Module content is required');
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Build the phase context for Fast Track grants
    const phaseContext = phase ? `This is for ${phase} of a Fast Track application.` : '';
    const grantContext = grantType || 'SBIR/STTR';

    const systemPrompt = `You are an expert NIH grant writer specializing in SBIR/STTR Specific Aims pages. Your task is to compile the provided module content into a properly formatted, one-page NIH Specific Aims document.

${phaseContext}

**NIH Specific Aims Page Structure (MUST follow this exact format):**

1. **Opening Paragraph** (3-5 sentences)
   - Start with the significance of the problem
   - Identify the critical gap in current knowledge/technology
   - State the critical need that this project addresses
   - End with a clear statement of how this project will address the need

2. **Long-term Goal and Objective** (1-2 sentences)
   - State the long-term goal of the research program
   - State the specific objective of THIS application

3. **Central Hypothesis** (1-2 sentences)
   - State the central hypothesis clearly
   - Include the rationale (based on preliminary data or published studies)

4. **Specific Aims** (numbered, each 2-3 sentences)
   - Format as "Specific Aim 1: [Title]. [Description of what will be done and expected outcome]"
   - Include milestones/deliverables for each aim
   - Show logical progression between aims

5. **Impact Statement** (Final paragraph, 2-4 sentences)
   - Describe the expected outcomes
   - State the positive impact on the field
   - Connect to commercialization potential (for SBIR/STTR)
   - End with a strong statement about transformative potential

**Writing Guidelines:**
- Use active voice and strong, confident language
- Be specific and quantitative where possible
- Avoid jargon; make it accessible to a broad NIH reviewer audience
- Keep to approximately 500-600 words (one page when formatted)
- Use clear transitions between sections
- Emphasize innovation and significance throughout

**For ${grantContext} applications:**
${grantType === 'Phase I' || phase === 'Phase I' 
  ? '- Focus on feasibility, proof-of-concept, and establishing technical foundation\n- Emphasize preliminary data and scientific rationale\n- Connect aims to Phase II commercialization pathway'
  : '- Focus on development, optimization, and commercialization readiness\n- Emphasize results from prior work (if applicable)\n- Include clear milestones toward market entry'}

Generate a complete, polished Specific Aims page ready for NIH submission. Do not include headers like "Opening Paragraph" - write it as flowing prose with clear paragraph breaks.`;

    const userPrompt = `Generate a complete NIH Specific Aims page using the following content from the completed modules:

**Project Title:** ${moduleContent.m1?.project_title || 'Not provided'}

**Problem Statement:** ${moduleContent.m1?.problem_statement || 'Not provided'}

**Proposed Solution:** ${moduleContent.m1?.proposed_solution || 'Not provided'}

**Target Population:** ${moduleContent.m1?.target_population || 'Not provided'}

**Therapeutic Area:** ${moduleContent.m1?.therapeutic_area || 'Not provided'}

**Central Hypothesis:** ${moduleContent.m2?.central_hypothesis || 'Not provided'}

**Supporting Rationale:** ${moduleContent.m2?.supporting_rationale || 'Not provided'}

**Preliminary Data:** ${moduleContent.m2?.preliminary_data_summary || 'Not provided'}

**Expected Outcomes:** ${moduleContent.m2?.expected_outcomes || 'Not provided'}

**Success Criteria:** ${moduleContent.m2?.success_criteria || 'Not provided'}

**Specific Aims:**
- Aim 1: ${moduleContent.m3?.aim1_statement || 'Not provided'}
  Milestones: ${Array.isArray(moduleContent.m3?.aim1_milestones) ? moduleContent.m3.aim1_milestones.join(', ') : moduleContent.m3?.aim1_milestones || 'Not provided'}

- Aim 2: ${moduleContent.m3?.aim2_statement || 'Not provided'}
  Milestones: ${Array.isArray(moduleContent.m3?.aim2_milestones) ? moduleContent.m3.aim2_milestones.join(', ') : moduleContent.m3?.aim2_milestones || 'Not provided'}

${moduleContent.m3?.aim3_statement ? `- Aim 3: ${moduleContent.m3.aim3_statement}
  Milestones: ${Array.isArray(moduleContent.m3?.aim3_milestones) ? moduleContent.m3.aim3_milestones.join(', ') : moduleContent.m3?.aim3_milestones || 'Not provided'}` : ''}

**Timeline:** ${moduleContent.m3?.timeline_summary || 'Not provided'}

**Aim Interdependencies:** ${moduleContent.m3?.interdependencies || 'Not provided'}

**PI Name:** ${moduleContent.m4?.pi_name || 'Not provided'}

**PI Qualifications:** ${moduleContent.m4?.pi_qualifications || 'Not provided'}

**Program Type:** ${programType || 'SBIR'}
**Grant Type:** ${grantType || 'Phase I'}
${phase ? `**Phase:** ${phase}` : ''}

Generate the complete Specific Aims page now:`;

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
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const result = await response.json();
    const generatedContent = result.choices[0].message.content;

    // Calculate word count
    const wordCount = generatedContent.split(/\s+/).filter((word: string) => word.length > 0).length;

    return new Response(JSON.stringify({
      success: true,
      data: {
        content: generatedContent,
        wordCount,
        phase: phase || null,
        grantType: grantType || 'Phase I',
        generatedAt: new Date().toISOString(),
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Generate aims page error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: {
        code: 'AIMS_GENERATION_FAILED',
        message: error.message,
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
