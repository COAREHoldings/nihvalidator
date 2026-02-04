// CORS headers for edge functions
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

// Layer 2: NIH Compliance System Prompt
const NIH_COMPLIANCE_SYSTEM_PROMPT = `
=== NIH SBIR/STTR COMPLIANCE ENFORCEMENT DIRECTIVE ===

You are generating text for an NIH SBIR/STTR grant application. You MUST operate as a regulatory-constrained generation engine, NOT a free-form writing assistant.

ALL outputs must strictly adhere to the following compliance rules:

1. **NO SPECULATIVE OR EXAGGERATED CLAIMS**
   - Never use definitive language for unproven outcomes
   - Never promise therapeutic effects without evidence
   - Never overstate the significance of preliminary data
   - Use conditional language: "may," "could potentially," "is expected to"

2. **NO PROMOTIONAL LANGUAGE**
   - FORBIDDEN TERMS: revolutionary, groundbreaking, game-changing, cure, guaranteed, breakthrough, transformative, unprecedented, paradigm-shifting, cutting-edge, best-in-class, world-class, unique, first-ever, miracle
   - Use neutral scientific terminology only
   - Avoid marketing-style enthusiasm

3. **QUANTITATIVE CRITERIA REQUIRED**
   - All aims must include measurable endpoints
   - Include statistical language: n=, p-value, power calculation, effect size
   - Specify success thresholds numerically (e.g., ">20% improvement", "p<0.05")
   - Include timeline with specific milestones

4. **STATISTICAL LANGUAGE REQUIRED**
   - Every experiment must specify: sample size (n=), statistical test, power (>=80%), alpha level
   - Include biological replicates count
   - State randomization and blinding approach

5. **NO PLACEHOLDERS IN FINAL OUTPUT**
   - Never output "TBD", "[to be determined]", "[insert here]"
   - If information is missing, state: "This information requires input from the investigator"
   - Do not fabricate data, citations, or statistics

6. **REGULATORY AWARENESS REQUIRED**
   - Reference appropriate regulatory pathway (IND, 510(k), PMA, De Novo)
   - Acknowledge clinical trial requirements where applicable
   - Do not imply clinical efficacy prior to IND approval
   - Include GLP/GMP considerations where relevant

7. **FEASIBILITY CONSTRAINTS**
   - All proposed work must be achievable within stated budget
   - Timeline must be realistic for the scope
   - Resources must be justified and available

8. **NEUTRAL SCIENTIFIC TONE**
   - Write as an experienced investigator, not marketing copywriter
   - Acknowledge limitations and potential challenges
   - Include risk mitigation strategies
   - Balance confidence with appropriate caveats

9. **GO/NO-GO CRITERIA (Phase I)**
   - Phase I applications MUST include explicit Go/No-Go decision points
   - Define quantitative thresholds for proceeding to Phase II
   - Specify failure modes and contingency plans

10. **COMMERCIALIZATION COMPLETENESS (Phase II)**
    - Phase II must include all 6 NIH commercialization sections
    - TAM/SAM/SOM with cited sources
    - Named competitors (or category placeholders)
    - Specific regulatory pathway with timeline
    - Manufacturing plan with cost estimates
    - 5-year revenue projections with assumptions

=== COMPLIANCE FAILURE HANDLING ===

If you cannot generate compliant content due to missing information, you MUST output:
"COMPLIANCE ELEMENT MISSING: [specific element]. Please provide [what is needed]."

DO NOT generate non-compliant content under any circumstances.
`

// Section-specific compliance additions
const SECTION_PROMPTS: Record<string, string> = {
  'specific_aims': `
=== SPECIFIC AIMS COMPLIANCE REQUIREMENTS ===
The Specific Aims section MUST include:
1. EXPLICIT HYPOTHESIS - State as testable, falsifiable hypothesis
2. DEFINED ENDPOINTS - Primary endpoint with measurement method
3. QUANTITATIVE SUCCESS THRESHOLDS - Numerical criteria for each aim
4. STATISTICAL METHOD - Name the statistical test and justify selection
5. BIOLOGICAL REPLICATES - Specify n= for each experiment
6. GO/NO-GO CRITERIA (Phase I) - Define decision points with thresholds
`,

  'research_strategy': `
=== RESEARCH STRATEGY / EXPERIMENTAL PLAN COMPLIANCE ===
Required elements:
1. EXPERIMENTAL DESIGN - Clear methodology with controls
2. STATISTICAL JUSTIFICATION - Power analysis for sample sizes
3. TIMELINE - Milestones with specific dates
4. PITFALLS AND ALTERNATIVES - Risk mitigation strategies
5. GO/NO-GO CRITERIA (Phase I) - Decision points with thresholds
`,

  'rigor': `
=== RIGOR AND REPRODUCIBILITY COMPLIANCE ===
MANDATORY elements (all must be present with SPECIFIC DETAILS):

1. **SAMPLE SIZE JUSTIFICATION**
   - For EACH experiment: state n=, power (≥80%), α-level (typically 0.05)
   - Provide effect size used in calculation with source (preliminary data or literature)
   - Example: "n=8 mice/group based on preliminary data (effect size d=1.2, SD=0.3) with 80% power and α=0.05"

2. **STATISTICAL TEST SPECIFICATION**
   - Name exact test for each experiment type (not generic "appropriate statistical tests")
   - For comparisons: t-test (paired/unpaired), ANOVA with post-hoc (specify which: Tukey, Dunnett, Bonferroni)
   - For dose-response: regression model type (linear, loglinear, Hill equation)
   - For survival/time-to-event: Kaplan-Meier with log-rank test

3. **MULTIPLE COMPARISON CORRECTION**
   - If multiple comparisons within experiment: specify correction method
   - State adjusted α-level (e.g., "Bonferroni-corrected α = 0.017 for 3 comparisons")
   - OR justify no correction (planned contrasts, orthogonal comparisons)

4. **BIOLOGICAL VS TECHNICAL REPLICATES**
   - Define what constitutes a biological replicate (independent experiments, different animals, different patient samples)
   - Distinguish from technical replicates (same sample measured multiple times)
   - Minimum n=3 biological replicates for all key experiments

5. **AUTHENTICATION & QUALITY CONTROL**
   - Cell lines: STR profiling (source, frequency)
   - Mycoplasma: testing method and frequency
   - Antibodies: validation method (knockdown, knockout, peptide block)
   - Key reagents: source, lot tracking

6. **RANDOMIZATION APPROACH**
   - Method: simple, block, stratified randomization
   - Who performs randomization (separate from experimenter if possible)
   - When performed (before treatment assignment)

7. **BLINDING STATEMENT**
   - Who is blinded: experimenter, analyst, outcome assessor
   - If not blinded, justify why
   - Method to maintain blinding (coded samples, separate personnel)

8. **DATA HANDLING**
   - Pre-specified inclusion/exclusion criteria
   - Outlier handling (Grubbs test, ROUT method) - must be pre-specified, not post-hoc
   - Missing data strategy (if applicable)
`,

  'vertebrate_animals': `
=== VERTEBRATE ANIMALS - NIH 5 REQUIRED POINTS ===
ALL FIVE points are mandatory:
1. DESCRIPTION OF PROCEDURES - Species, strain, number, procedures
2. JUSTIFICATION OF SPECIES AND NUMBERS - Statistical justification
3. MINIMIZATION OF PAIN AND DISTRESS - Anesthesia/analgesia protocols
4. EUTHANASIA METHOD - AVMA-consistent method
5. STATISTICAL JUSTIFICATION OF GROUP SIZE - Power analysis
`,

  'human_subjects': `
=== HUMAN SUBJECTS COMPLIANCE ===
Required elements:
1. CLASSIFICATION - Human Subjects Research: Yes/No, Clinical Trial: Yes/No
2. IRB STATUS - Current status with timeline
3. RISK LEVEL - Minimal risk or greater than minimal
4. DE-IDENTIFICATION - How PHI will be protected
`,

  'commercialization': `
=== PHASE II COMMERCIALIZATION PLAN REQUIREMENTS ===
All 10 elements required for Phase II:
1. COMPANY OVERVIEW - Legal structure, experience, management
2. MARKET SIZE (TAM/SAM/SOM) - With cited sources
3. COMPETITIVE LANDSCAPE - Named competitors (minimum 3)
4. IP POSITION - Patents filed/issued
5. FREEDOM TO OPERATE - Analysis of blocking patents
6. REGULATORY PATHWAY - Specific pathway with timeline
7. MANUFACTURING PLAN - Scale-up strategy, GMP considerations
8. REVENUE MODEL (5-YEAR) - Pricing and projections
9. REIMBURSEMENT STRATEGY - CPT codes, payer landscape
10. EXIT STRATEGY - Potential acquirers/partners
`
}

// Generate full compliance prompt for AI calls
function getCompliancePrompt(
  sectionType?: string,
  grantType?: string,
  institute?: string,
  clinicalTrialAllowed?: boolean
): string {
  let prompt = NIH_COMPLIANCE_SYSTEM_PROMPT

  // Add context if provided
  if (grantType || institute) {
    prompt += `
=== APPLICATION CONTEXT ===
${grantType ? `Grant Type: ${grantType}` : ''}
${institute ? `Institute: ${institute}` : ''}
${clinicalTrialAllowed !== undefined ? `Clinical Trial Allowed: ${clinicalTrialAllowed ? 'Yes' : 'No'}` : ''}

${grantType === 'Phase I' || grantType === 'Fast Track' ? 'CRITICAL: This is a Phase I/Fast Track application. Go/No-Go criteria are MANDATORY.' : ''}
${grantType === 'Phase II' || grantType === 'Direct to Phase II' || grantType === 'Phase IIB' ? 'CRITICAL: This requires a complete 12-page commercialization plan.' : ''}
`
  }

  // Add section-specific prompt if applicable
  if (sectionType && SECTION_PROMPTS[sectionType]) {
    prompt += '\n' + SECTION_PROMPTS[sectionType]
  }

  return prompt
}

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

**SECTION: STATISTICAL CONSIDERATIONS** (3-4 paragraphs, DETAILED)

This section is CRITICAL for NIH reviewers. Generic statements will result in poor scores. Include ALL of the following with SPECIFIC details:

**Paragraph 1: Sample Size Justification**
- State sample sizes (n=) for EACH experiment group
- Provide power analysis with specific parameters: α = 0.05, power = 80%, expected effect size (e.g., Cohen's d = 0.8, 2-fold difference, 30% improvement)
- If preliminary data exists, reference the observed variance and effect sizes to justify n
- Example: "Based on our preliminary data showing a mean difference of X ± Y (SD), with α=0.05 and 80% power, we calculated n=Z per group using [formula/software]."

**Paragraph 2: Statistical Tests & Data Analysis**
- Specify EXACT statistical tests for each type of comparison:
  - Continuous data: t-test (paired/unpaired), ANOVA (one-way, two-way, repeated measures), linear regression
  - Categorical data: Chi-square, Fisher's exact, logistic regression
  - Time-to-event: Kaplan-Meier, log-rank test, Cox regression
  - Multiple groups: Tukey's HSD, Dunnett's test, Bonferroni correction
- State data distribution assumptions and how violations will be handled (e.g., "Data will be tested for normality using Shapiro-Wilk. Non-normal data will be analyzed using Mann-Whitney U test or log-transformed.")
- Specify primary vs. secondary endpoints

**Paragraph 3: Multiple Comparisons & Type I Error Control**
- State how multiple comparisons will be handled
- Specify correction method (Bonferroni, Benjamini-Hochberg FDR, Holm-Sidak) with justification
- For complex designs, describe family-wise error rate control strategy
- Example: "For the 4 planned comparisons in Aim 1, Bonferroni-adjusted α = 0.0125 will be used to maintain family-wise error rate at 0.05."

**Paragraph 4: Software, Randomization & Blinding**
- Specify statistical software: R (version X, specific packages), SAS, SPSS, GraphPad Prism, Python (statsmodels, scipy)
- Describe randomization method: simple randomization, block randomization, stratified randomization
- Describe blinding: single-blind, double-blind, who will be blinded (experimenters, analysts, assessors)
- State interim analysis plan if applicable (O'Brien-Fleming boundaries, alpha spending function)
- Handling of missing data: complete case analysis, imputation method (LOCF, multiple imputation)

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

${(() => {
  // Handle new aims array structure
  const aims = moduleContent.m3?.aims;
  if (Array.isArray(aims) && aims.length > 0) {
    return aims.map((aim: { statement?: string; milestones?: string[]; timeline?: string }, idx: number) => `
**Aim ${idx + 1}:** ${aim.statement || 'Not provided'}
- Milestones: ${Array.isArray(aim.milestones) ? aim.milestones.join(', ') : 'Not provided'}
- Timeline: ${aim.timeline || 'Not provided'}
`).join('\n');
  }
  // Fallback to old structure for backwards compatibility
  let aimsText = `**Aim 1:** ${moduleContent.m3?.aim1_statement || 'Not provided'}
- Milestones: ${Array.isArray(moduleContent.m3?.aim1_milestones) ? moduleContent.m3.aim1_milestones.join(', ') : moduleContent.m3?.aim1_milestones || 'Not provided'}

**Aim 2:** ${moduleContent.m3?.aim2_statement || 'Not provided'}
- Milestones: ${Array.isArray(moduleContent.m3?.aim2_milestones) ? moduleContent.m3.aim2_milestones.join(', ') : moduleContent.m3?.aim2_milestones || 'Not provided'}`;
  if (moduleContent.m3?.aim3_statement) {
    aimsText += `

**Aim 3:** ${moduleContent.m3.aim3_statement}
- Milestones: ${Array.isArray(moduleContent.m3?.aim3_milestones) ? moduleContent.m3.aim3_milestones.join(', ') : moduleContent.m3?.aim3_milestones || 'Not provided'}`;
  }
  return aimsText;
})()}

**Timeline Summary:** ${moduleContent.m3?.timeline_summary || 'Not provided'}

**Aim Interdependencies:** ${moduleContent.m3?.interdependencies || 'Not provided'}

**PI Name:** ${moduleContent.m4?.pi_name || 'Not provided'}

**PI Qualifications:** ${moduleContent.m4?.pi_qualifications || 'Not provided'}

**EXISTING EXPERIMENTAL APPROACH (if any):**
- Methodology Overview: ${moduleContent.m5?.methodology_overview || 'Not yet defined'}
- Experimental Design: ${moduleContent.m5?.experimental_design || 'Not yet defined'}
- Data Collection: ${moduleContent.m5?.data_collection_methods || 'Not yet defined'}
- Analysis Plan: ${moduleContent.m5?.analysis_plan || 'Not yet defined'}
- Potential Pitfalls: ${moduleContent.m5?.potential_pitfalls || 'Not yet defined'}
- Alternative Approaches: ${moduleContent.m5?.alternative_approaches || 'Not yet defined'}

**STATISTICAL APPROACH (IMPORTANT - Elaborate on this with specific details):**
User-provided approach: ${moduleContent.m5?.statistical_approach || 'Not yet defined - Generate comprehensive statistical plan'}

For the Statistical Considerations section, you MUST include:
1. Specific sample sizes (n=X) for each experiment with justification
2. Named statistical tests (not generic "appropriate tests"): t-tests, ANOVA (one-way/two-way), Mann-Whitney, Kruskal-Wallis, etc.
3. Power analysis parameters: effect size source (preliminary data or literature), α=0.05, power=80%
4. Multiple comparison correction method (Bonferroni, Tukey, FDR) with calculated adjusted α
5. Randomization method (simple, block, stratified)
6. Blinding approach (single/double, who is blinded)
7. Software with version (R, GraphPad Prism, SAS, SPSS)
8. How non-normal data will be handled (transformations, non-parametric alternatives)

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
