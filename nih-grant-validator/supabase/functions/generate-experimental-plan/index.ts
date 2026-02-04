import { getCompliancePrompt, corsHeaders } from '../_shared/compliancePrompt.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { moduleContent, grantType, phase, programType, institute, clinicalTrialAllowed } = await req.json();

    if (!moduleContent) {
      throw new Error('Module content is required');
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Layer 2: Inject compliance system prompt
    const compliancePrompt = getCompliancePrompt('research_strategy', grantType || 'Phase I', institute, clinicalTrialAllowed);

    // Build the phase context for Fast Track grants
    const phaseContext = phase ? `This is for ${phase} of a Fast Track application.` : '';
    const grantContext = grantType || 'SBIR/STTR';

    const systemPrompt = `${compliancePrompt}

=== TASK: GENERATE EXPERIMENTAL PLAN / RESEARCH STRATEGY ===
You are an experienced NIH-funded principal investigator writing the Research Strategy section (Experimental Plan). Write as a domain expert scientist. ${phaseContext}

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

**FEASIBILITY EVIDENCE:**
Any feasibility claim must include:
- Data type (in vitro, in vivo, clinical)
- Sample size or n= placeholder
- Effect size or expected outcome
- Timepoint reference

**NO FABRICATION:**
- Do NOT invent citations, data, collaborator names, or statistics
- Use placeholders like "[ref]", "Figure X", "n=TBD" when data not provided
- If information is missing, acknowledge gap or use "to be determined"

=== NIH EXPERIMENTAL PLAN / RESEARCH STRATEGY STRUCTURE ===

**SECTION 1: OVERALL STRATEGY** (2-3 paragraphs)
- Restate the central hypothesis and overall approach
- Explain the logical flow from Aim 1 → Aim 2 → Aim 3
- Describe how the aims work together to test the hypothesis
- Reference preliminary data supporting feasibility

**FOR EACH SPECIFIC AIM, INCLUDE:**

**Aim [N]: [Title]** (major section)

**Rationale:** (1 paragraph)
- Why this aim is necessary
- Expected outcomes
- How it connects to other aims

**Experimental Design:** (2-3 paragraphs)
- Study design (in vitro, in vivo, clinical)
- Model systems, cell lines, animal models, or patient populations
- Sample sizes with statistical justification (power analysis placeholder)
- Controls (positive, negative, vehicle)
- Blinding and randomization approach if applicable

**Methods & Protocols:** (1-2 paragraphs)
- Key experimental techniques
- Assays and measurements
- Data collection procedures
- Quality control measures

**Timeline & Milestones:** (1 paragraph)
- Month-by-month or quarter-by-quarter breakdown
- Key decision points
- Deliverables for this aim

**Expected Results & Interpretation:** (1 paragraph)
- Anticipated outcomes
- How results will be interpreted
- Success metrics with quantifiable thresholds

**Potential Pitfalls & Alternative Approaches:** (1 paragraph)
- Identify 2-3 potential challenges
- Provide specific alternative strategies for each
- Contingency plans

${grantType === 'Phase I' || phase === 'Phase I' ? `
**Go/No-Go Criteria:** (REQUIRED FOR PHASE I)
- Explicit quantitative criteria for proceeding to Phase II
- Define success thresholds (e.g., ">50% reduction in X", "p<0.05 for Y")
- State No-Go action if criteria not met
` : ''}

**SECTION: STATISTICAL CONSIDERATIONS** (1-2 paragraphs)
- Overall statistical approach
- Power calculations (80% power standard)
- Multiple comparison corrections if applicable
- Software to be used

**SECTION: RIGOR & REPRODUCIBILITY** (1 paragraph)
- Biological variables accounted for
- Technical replicates vs biological replicates
- Data management and sharing plan reference

=== STYLE REQUIREMENTS ===
- Target 1500-2500 words depending on number of aims
- Use section headers (##) and subheaders (###)
- Active voice throughout
- Domain-specific terminology
- Concrete, specific language (avoid vague statements)
- Include placeholders for figures, references where appropriate

**For ${grantContext}:**
${grantType === 'Phase I' || phase === 'Phase I' 
  ? '- Focus on FEASIBILITY - can it work?\n- Emphasize proof-of-concept experiments\n- Include explicit Go/No-Go decision criteria\n- Risk mitigation is critical\n- 6-12 month timeline typical'
  : '- Focus on DEVELOPMENT and OPTIMIZATION\n- Reference Phase I results (or placeholders)\n- Include scale-up considerations\n- Regulatory pathway milestones (IND, 510(k))\n- Manufacturing feasibility\n- 24 month timeline typical'}

Write as an experienced investigator, not an AI. Introduce natural variation in phrasing and structure.`;

    const userPrompt = `Generate a complete NIH Experimental Plan / Research Strategy using the following content:

**PROJECT CONTEXT:**
- Program Type: ${programType || 'SBIR'}
- Grant Type: ${grantType || 'Phase I'}
${phase ? `- Phase: ${phase}` : ''}
- Institute: ${institute || 'Standard NIH'}

**Project Title:** ${moduleContent.m1?.project_title || 'Not provided'}

**Problem Statement:** ${moduleContent.m1?.problem_statement || 'Not provided'}

**Proposed Solution:** ${moduleContent.m1?.proposed_solution || 'Not provided'}

**Target Population:** ${moduleContent.m1?.target_population || 'Not provided'}

**Therapeutic Area:** ${moduleContent.m1?.therapeutic_area || 'Not provided'}

**Technology Type:** ${moduleContent.m1?.technology_type || 'Not provided'}

**Central Hypothesis:** ${moduleContent.m2?.central_hypothesis || 'Not provided'}

**Supporting Rationale:** ${moduleContent.m2?.supporting_rationale || 'Not provided'}

**Preliminary Data:** ${moduleContent.m2?.preliminary_data_summary || 'Not provided'}

**Expected Outcomes:** ${moduleContent.m2?.expected_outcomes || 'Not provided'}

**Success Criteria:** ${moduleContent.m2?.success_criteria || 'Not provided'}

**SPECIFIC AIMS:**

**Aim 1:** ${moduleContent.m3?.aim1_statement || 'Not provided'}
- Milestones: ${Array.isArray(moduleContent.m3?.aim1_milestones) ? moduleContent.m3.aim1_milestones.join(', ') : moduleContent.m3?.aim1_milestones || 'Not provided'}

**Aim 2:** ${moduleContent.m3?.aim2_statement || 'Not provided'}
- Milestones: ${Array.isArray(moduleContent.m3?.aim2_milestones) ? moduleContent.m3.aim2_milestones.join(', ') : moduleContent.m3?.aim2_milestones || 'Not provided'}

${moduleContent.m3?.aim3_statement ? `**Aim 3:** ${moduleContent.m3.aim3_statement}
- Milestones: ${Array.isArray(moduleContent.m3?.aim3_milestones) ? moduleContent.m3.aim3_milestones.join(', ') : moduleContent.m3?.aim3_milestones || 'Not provided'}` : ''}

**Timeline Summary:** ${moduleContent.m3?.timeline_summary || 'Not provided'}

**Aim Interdependencies:** ${moduleContent.m3?.interdependencies || 'Not provided'}

**PI Name:** ${moduleContent.m4?.pi_name || 'Not provided'}

**PI Qualifications:** ${moduleContent.m4?.pi_qualifications || 'Not provided'}

**EXISTING EXPERIMENTAL APPROACH (if any):**
- Methodology Overview: ${moduleContent.m5?.methodology_overview || 'Not yet defined'}
- Experimental Design: ${moduleContent.m5?.experimental_design || 'Not yet defined'}
- Data Collection: ${moduleContent.m5?.data_collection_methods || 'Not yet defined'}
- Analysis Plan: ${moduleContent.m5?.analysis_plan || 'Not yet defined'}
- Statistical Approach: ${moduleContent.m5?.statistical_approach || 'Not yet defined'}
- Potential Pitfalls: ${moduleContent.m5?.potential_pitfalls || 'Not yet defined'}
- Alternative Approaches: ${moduleContent.m5?.alternative_approaches || 'Not yet defined'}

**REGULATORY CONTEXT:**
- Human Subjects: ${moduleContent.m7?.human_subjects_involved ? 'Yes' : 'No'}
- Vertebrate Animals: ${moduleContent.m7?.vertebrate_animals_involved ? 'Yes' : 'No'}
- Facilities: ${moduleContent.m7?.facilities_description || 'Not provided'}

Generate the complete Experimental Plan / Research Strategy now. Use markdown headers (## and ###) to organize sections. Ensure all content complies with NIH requirements.`;

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
        max_tokens: 4000,
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
        complianceEnforced: true
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Generate experimental plan error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: {
        code: 'EXPERIMENTAL_PLAN_GENERATION_FAILED',
        message: error.message,
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
