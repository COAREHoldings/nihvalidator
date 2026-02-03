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

**NIH Specific Aims Page REQUIRED Structure (MUST include ALL 5 sections):**

**SECTION 1: OPENING/SIGNIFICANCE PARAGRAPH** (4-6 sentences)
- Hook with a compelling statement about the problem's importance and public health significance
- State specific statistics or facts demonstrating the problem's scope
- Identify the CRITICAL GAP in current knowledge, technology, or treatment
- Explain why existing solutions are inadequate
- Conclude with how THIS project will address the gap

**SECTION 2: LONG-TERM GOAL & OBJECTIVE** (2-3 sentences)
- "The long-term goal is to [broad research program goal]."
- "The objective of this [Phase I/II] application is to [specific project objective]."
- Connect to the PI's broader research agenda

**SECTION 3: CENTRAL HYPOTHESIS & RATIONALE** (2-3 sentences)
- "Our central hypothesis is that [testable hypothesis]."
- "This hypothesis is supported by [preliminary data/published evidence]."
- Include specific evidence citations if available

**SECTION 4: SPECIFIC AIMS** (3-4 aims, each 2-3 sentences)
Format each aim as:
"**Specific Aim 1: [Concise Title].** We will [action verb + specific task]. [Expected outcome/deliverable]. [Key milestone or success metric]."

Ensure aims show:
- Logical progression (each aim builds on the previous)
- Clear deliverables and milestones
- Independence (project can still succeed if one aim partially fails)

**SECTION 5: IMPACT/PAYOFF STATEMENT** (REQUIRED - 3-5 sentences)
This is CRITICAL - do NOT omit this section. Must include:
- "Upon completion of these aims, we expect to [concrete outcomes]."
- Scientific/technological innovation that will result
- How this advances the field beyond current state
- Commercial/translational potential and pathway
- Patient/public health impact
- Final sentence: strong, confident statement about transformative potential

**Writing Guidelines:**
- Use active voice and strong, confident language
- Be specific and quantitative (include numbers, percentages, timeframes)
- Avoid jargon; accessible to a broad NIH reviewer audience
- Target 550-650 words (fits one page when formatted in 11pt Arial)
- Use clear paragraph breaks between sections (no section headers in final output)
- Emphasize INNOVATION and SIGNIFICANCE throughout
- End with a powerful impact statement that reviewers will remember

**For ${grantContext} applications:**
${grantType === 'Phase I' || phase === 'Phase I' 
  ? '- Focus on feasibility, proof-of-concept, and establishing technical foundation\n- Emphasize preliminary data and scientific rationale\n- Connect aims to Phase II commercialization pathway\n- Highlight risk mitigation and alternative approaches'
  : '- Focus on development, optimization, and commercialization readiness\n- Emphasize results from Phase I (if applicable)\n- Include clear milestones toward IND/510k/market entry\n- Address manufacturing, scale-up, and regulatory pathway'}

Generate a complete, publication-ready Specific Aims page. Write as flowing prose with paragraph breaks between sections. Do NOT include section headers in the output - the structure should be implicit.`;

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
