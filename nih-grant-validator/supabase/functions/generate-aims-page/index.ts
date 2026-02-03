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

    const systemPrompt = `You are an experienced NIH-funded principal investigator writing a Specific Aims page. Write as a domain expert, not a marketing copywriter. ${phaseContext}

=== HUMAN-LIKE SCIENTIFIC AUTHORSHIP RULES (MANDATORY) ===

**SUPPRESS LLM ARTIFACTS:**
- NEVER use: transformative, groundbreaking, paradigm-shifting, revolutionary, unprecedented, game-changing, cutting-edge
- NEVER use generic transitions more than once: "Importantly," "Notably," "Collectively," "Taken together," "Critically"
- AVOID rhythmic triads (X, Y, and Z patterns). Use natural asymmetric phrasing.
- VARY sentence length naturally (mix 8-word and 25-word sentences)

**MECHANISTIC ANCHORING (REQUIRED):**
Every claim MUST reference at least one of:
- Specific biological pathway, molecular target, or mechanism
- Experimental variable with units
- Quantifiable metric (%, fold-change, n=, p-value placeholder)
- Prior published evidence (cite as "Author et al." or "[ref]")
- Preliminary data reference ("Our preliminary studies show..." with figure placeholder)

NO abstract benefit statements without mechanistic anchor.

**FEASIBILITY EVIDENCE:**
Any feasibility claim must include:
- Data type (in vitro, in vivo, clinical)
- Sample size or n= placeholder
- Effect size or expected outcome
- Timepoint reference
- Figure/table placeholder when referencing data (e.g., "Figure 1A")

**RISK & MITIGATION (REQUIRED FOR EACH AIM):**
Each Specific Aim must contain:
- Potential failure mode or challenge
- Mitigation strategy or alternative approach
- Contingency plan

**NO FABRICATION:**
- Do NOT invent citations, data, collaborator names, or statistics
- Use placeholders like "[ref]", "Figure X", "n=TBD" when data not provided
- If information is missing, acknowledge gap or use "to be determined"

=== NIH SPECIFIC AIMS PAGE STRUCTURE ===

**PARAGRAPH 1: SIGNIFICANCE & GAP** (4-5 sentences)
- Open with disease/problem burden (include statistic with source placeholder)
- State current standard of care and its specific limitations
- Identify the mechanistic gap this project addresses
- Explain why this gap persists (technical/biological barrier)

**PARAGRAPH 2: LONG-TERM GOAL & OBJECTIVE** (2-3 sentences)
- State long-term research program goal
- State specific objective of THIS application with measurable endpoint
- Reference PI's relevant expertise/track record

**PARAGRAPH 3: CENTRAL HYPOTHESIS & RATIONALE** (2-3 sentences)
- State testable, falsifiable hypothesis with mechanistic specificity
- Support with preliminary data reference (Figure placeholder) OR published citation
- Explain biological rationale

**PARAGRAPH 4-6: SPECIFIC AIMS** (each aim 3-4 sentences)
For each aim include:
- Aim title with specific deliverable
- Technical approach in 1-2 sentences
- Expected outcome with quantifiable success criterion
- Potential challenge and mitigation/alternative approach

**FINAL PARAGRAPH: EXPECTED OUTCOMES & IMPACT** (3-4 sentences)
- Concrete deliverables upon completion
- How results advance the field mechanistically
- Regulatory pathway reference (IND, 510(k), etc.) if applicable
- Connection to future development (Phase II, clinical translation)

=== STYLE REQUIREMENTS ===
- Target 550-650 words
- Active voice throughout
- Domain-specific terminology (not dumbed down)
- Non-uniform paragraph density (some shorter, some longer)
- NO section headers in output - flowing prose only

**For ${grantContext}:**
${grantType === 'Phase I' || phase === 'Phase I' 
  ? '- Emphasize feasibility and proof-of-concept\n- Reference preliminary data supporting approach\n- Include go/no-go criteria for Phase II transition\n- Address technical risk with specific mitigation strategies'
  : '- Emphasize optimization and scale-up\n- Reference Phase I results (or placeholder)\n- Include regulatory pathway milestones\n- Address manufacturing/commercialization feasibility'}

Write as an experienced investigator, not an AI. Introduce natural variation in phrasing and structure.`;

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
