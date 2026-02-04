// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

// NIH Compliance System Prompt (inlined from shared module)
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

// Generate compliance prompt for AI calls
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

  return prompt
}

// Human-like scientific authorship directive - applied to all document types
const AUTHORSHIP_DIRECTIVE = `
=== HUMAN-LIKE SCIENTIFIC AUTHORSHIP RULES (MANDATORY) ===

**SUPPRESS LLM ARTIFACTS:**
- NEVER use: transformative, groundbreaking, paradigm-shifting, revolutionary, unprecedented, game-changing, cutting-edge, novel (overuse)
- NEVER use generic transitions more than once per 3 pages: "Importantly," "Notably," "Collectively," "Taken together," "Critically"
- AVOID rhythmic triads (X, Y, and Z patterns). Use natural asymmetric phrasing.
- VARY sentence length naturally (mix short punchy sentences with complex ones)
- Avoid uniform corporate/marketing tone

**MECHANISTIC ANCHORING (REQUIRED):**
Every claim MUST reference at least one of:
- Specific biological pathway, molecular target, or mechanism
- Experimental variable with units
- Quantifiable metric (%, fold-change, n=, p-value placeholder)
- Prior published evidence (cite as "Author et al., Year" or "[ref]")
- Preliminary data reference ("Our preliminary studies demonstrate..." with figure placeholder)

NO abstract benefit statements without mechanistic anchor.

**FEASIBILITY EVIDENCE:**
Any feasibility claim must include:
- Data type (in vitro, in vivo, clinical, computational)
- Sample size or n= placeholder
- Effect size or expected outcome
- Timepoint reference
- Figure/table placeholder when referencing unpublished data

**RISK & MITIGATION (REQUIRED):**
Each major claim or aim must acknowledge:
- Potential failure mode or technical challenge
- Mitigation strategy or alternative approach
- Contingency plan

**NO FABRICATION:**
- Do NOT invent specific citations, data values, collaborator names, or statistics
- Use placeholders: "[ref]", "Figure X", "n=TBD", "[Investigator, Institution]"
- If information missing, acknowledge or use "to be determined"
- Do NOT generate fake PMIDs or DOIs

**STYLE VARIATION:**
- Introduce controlled variability in sentence structure
- Use domain-specific terminology appropriate to field
- Non-uniform paragraph density
- Occasional parenthetical clarifications
- Write as experienced investigator, not marketing copywriter
`

function countWords(text: string): number {
  return text?.trim().split(/\s+/).filter(w => w.length > 0).length || 0
}

function buildModuleContext(data: any): string {
  const m1 = data.m1 || {}
  const m2 = data.m2 || {}
  const m3 = data.m3 || {}
  const m4 = data.m4 || {}
  const m5 = data.m5 || {}
  const m9 = data.m9 || {}

  return `
Grant Type: ${data.grantType || 'Not specified'}
Program Type: ${data.programType || 'Not specified'}
Institute: ${data.institute || 'Standard NIH'}

Module 1 - Title & Concept:
- Project Title: ${m1.project_title || 'Not provided'}
- Lay Summary: ${m1.lay_summary || 'Not provided'}
- Scientific Abstract: ${m1.scientific_abstract || 'Not provided'}
- Problem Statement: ${m1.problem_statement || 'Not provided'}
- Proposed Solution: ${m1.proposed_solution || 'Not provided'}
- Target Population: ${m1.target_population || 'Not provided'}
- Therapeutic Area: ${m1.therapeutic_area || 'Not provided'}
- Technology Type: ${m1.technology_type || 'Not provided'}

Module 2 - Hypothesis:
- Central Hypothesis: ${m2.central_hypothesis || 'Not provided'}
- Supporting Rationale: ${m2.supporting_rationale || 'Not provided'}
- Preliminary Data: ${m2.preliminary_data_summary || 'Not provided'}
- Expected Outcomes: ${m2.expected_outcomes || 'Not provided'}
- Success Criteria: ${m2.success_criteria || 'Not provided'}

Module 3 - Specific Aims:
- Aim 1: ${m3.aim1_statement || 'Not provided'}
  Milestones: ${(m3.aim1_milestones || []).join(', ') || 'Not provided'}
- Aim 2: ${m3.aim2_statement || 'Not provided'}
  Milestones: ${(m3.aim2_milestones || []).join(', ') || 'Not provided'}
- Aim 3: ${m3.aim3_statement || 'Not provided'}
- Timeline: ${m3.timeline_summary || 'Not provided'}
- Interdependencies: ${m3.interdependencies || 'Not provided'}

Module 4 - Team:
- PI: ${m4.pi_name || 'Not provided'}
- Qualifications: ${m4.pi_qualifications || 'Not provided'}
- Relevant Experience: ${m4.relevant_experience || 'Not provided'}
- Key Personnel: ${(m4.key_personnel || []).map((p: any) => `${p.name} (${p.role})`).join(', ') || 'Not provided'}

Module 5 - Experimental Approach:
- Methodology: ${m5.methodology_overview || 'Not provided'}
- Experimental Design: ${m5.experimental_design || 'Not provided'}
- Data Collection: ${m5.data_collection_methods || 'Not provided'}
- Analysis Plan: ${m5.analysis_plan || 'Not provided'}
- Statistical Approach: ${m5.statistical_approach || 'Not provided'}
- Expected Results: ${m5.expected_results || 'Not provided'}
- Potential Pitfalls: ${m5.potential_pitfalls || 'Not provided'}
- Alternative Approaches: ${m5.alternative_approaches || 'Not provided'}

Module 9 - Commercialization (if applicable):
${m9 && Object.keys(m9).length > 0 ? JSON.stringify(m9, null, 2) : 'Not provided'}

Previously Generated Documents:
${data.generatedDocuments ? JSON.stringify(data.generatedDocuments, null, 2) : 'None'}
`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const requestData = await req.json()
    const { documentType, grantType, institute } = requestData
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const moduleContext = buildModuleContext(requestData)
    
    // Get compliance prompt based on document type
    const complianceType = ['commercialization', 'project-narrative'].includes(documentType) 
      ? 'commercialization' 
      : 'research_strategy'
    const compliancePrompt = getCompliancePrompt(complianceType, grantType || 'Phase I', institute, false)

    let systemPrompt = ''
    let userPrompt = ''
    let documentTitle = ''

    switch (documentType) {
      case 'title':
        documentTitle = 'Project Title'
        systemPrompt = `${compliancePrompt}

=== TASK: GENERATE PROJECT TITLE ===
You are an experienced NIH-funded principal investigator. Generate a single optimal project title.

${AUTHORSHIP_DIRECTIVE}

Title requirements:
- Under 81 characters (NIH requirement)
- Mechanistically specific
- Include disease/condition and approach
- Avoid buzzwords and hype
- Sound like a working scientist wrote it`

        userPrompt = `Generate ONE optimal project title based on the grant content.

Output format:
[The title only, no explanation, under 81 characters]

Grant Content:
${moduleContext}`
        break

      case 'project-summary':
        documentTitle = 'Project Summary/Abstract'
        systemPrompt = `${compliancePrompt}

=== TASK: GENERATE PROJECT SUMMARY/ABSTRACT ===
You are an experienced NIH-funded principal investigator writing a Project Summary/Abstract. This is a critical 30-line summary that must be comprehensive yet concise.

${AUTHORSHIP_DIRECTIVE}

Project Summary requirements:
- Maximum 30 lines (approximately 300-350 words)
- Must cover: goals, specific aims, methods, expected outcomes
- No jargon or unexplained acronyms
- Scientific but accessible
- Must be self-contained summary of the entire project`

        userPrompt = `Generate a complete NIH Project Summary/Abstract (max 30 lines).

REQUIRED ELEMENTS:
1. Opening statement of project goal and significance (2-3 lines)
2. Unmet need being addressed (2-3 lines)
3. Central hypothesis (1-2 lines)
4. Specific Aims overview (4-6 lines)
5. Approach/methods summary (4-6 lines)
6. Innovation statement (2-3 lines)
7. Expected outcomes and impact (3-4 lines)
8. Long-term goal (1-2 lines)

Write in scientific prose. No headers or bullet points.

Grant Content:
${moduleContext}`
        break

      case 'project-narrative':
        documentTitle = 'Project Narrative'
        systemPrompt = `${compliancePrompt}

=== TASK: GENERATE PROJECT NARRATIVE ===
You are writing a Project Narrative - the public health relevance statement required by NIH.

${AUTHORSHIP_DIRECTIVE}

Project Narrative requirements:
- Exactly 2-3 sentences
- Plain language (understandable by non-scientists)
- Explain public health relevance
- Describe expected impact on human health
- No technical jargon`

        userPrompt = `Generate a Project Narrative (2-3 sentences explaining public health relevance).

This must be:
- Written in plain language for general public
- Explain why this research matters for human health
- Be 2-3 sentences ONLY

Grant Content:
${moduleContext}`
        break

      case 'specific-aims':
        documentTitle = 'Specific Aims'
        systemPrompt = `${compliancePrompt}

=== TASK: GENERATE SPECIFIC AIMS TEXT ===
You are an experienced NIH-funded investigator writing the aims text. Write clear, testable aims.

${AUTHORSHIP_DIRECTIVE}

Specific Aims requirements:
- Each aim should be testable/achievable
- Include measurable outcomes
- Show logical progression
- Define clear milestones`

        userPrompt = `Generate well-formulated Specific Aims text.

For each aim provide:
- Clear statement of what will be accomplished
- Rationale (1-2 sentences)
- Key milestones
- Measurable success criteria

Format each aim clearly (Aim 1:, Aim 2:, etc.)

Grant Content:
${moduleContext}`
        break

      case 'specific-aims-page':
        documentTitle = 'Specific Aims Page'
        systemPrompt = `${compliancePrompt}

=== TASK: GENERATE COMPLETE SPECIFIC AIMS PAGE ===
You are an experienced NIH-funded principal investigator writing the Specific Aims page - the most important page of any NIH grant.

${AUTHORSHIP_DIRECTIVE}

Specific Aims Page requirements:
- Exactly ONE page (approximately 500-550 words)
- Opening paragraph: Hook, significance, knowledge gap (3-4 sentences)
- Long-term goal and objective statement (2-3 sentences)
- Central hypothesis (1-2 sentences)
- Rationale paragraph (2-3 sentences)
- List of aims (each aim 2-3 sentences)
- Expected outcomes/impact statement (2-3 sentences)
- Payoff paragraph (2-3 sentences)`

        userPrompt = `Generate a complete NIH Specific Aims page (one page, ~500 words).

REQUIRED STRUCTURE:
1. OPENING HOOK (3-4 sentences)
   - Disease burden/unmet need with statistic
   - Why current approaches fail
   - What this project will do differently

2. LONG-TERM GOAL & OBJECTIVE (2-3 sentences)
   - Career-level goal
   - Project-specific objective

3. CENTRAL HYPOTHESIS (1-2 sentences)
   - Testable, specific hypothesis
   - Briefly mention supporting rationale

4. RATIONALE (2-3 sentences)
   - Why approach will work
   - Preliminary data support

5. SPECIFIC AIMS (6-10 lines total)
   Aim 1: [Title]. [What and why - 2-3 sentences]
   Aim 2: [Title]. [What and why - 2-3 sentences]
   [Aim 3 if applicable]

6. EXPECTED OUTCOMES (2-3 sentences)
   - What success looks like
   - Go/No-Go decision points (for Phase I)

7. PAYOFF/IMPACT (2-3 sentences)
   - Broader significance
   - Path to commercialization/clinical impact

Grant Content:
${moduleContext}`
        break

      case 'research-strategy':
        documentTitle = 'Research Strategy'
        systemPrompt = `${compliancePrompt}

=== TASK: GENERATE RESEARCH STRATEGY ===
You are an experienced NIH-funded principal investigator writing a Research Strategy section.

${AUTHORSHIP_DIRECTIVE}

Research Strategy requirements:
- SIGNIFICANCE: Ground in epidemiological data and mechanistic gaps
- INNOVATION: Be specific about what is new
- APPROACH: Include experimental details, sample sizes, controls, statistical plans
- Include Go/No-Go criteria for Phase I
- Address potential pitfalls and alternatives for each aim`

        userPrompt = `Generate a complete NIH Research Strategy section.

REQUIRED STRUCTURE:

A. SIGNIFICANCE (1.5-2 pages, ~750 words)
- Disease burden with statistics [ref]
- Current standard of care limitations
- Knowledge gap being addressed
- Why this matters for patients

B. INNOVATION (0.5-1 page, ~300 words)
- What is technically new
- What is conceptually new
- How this advances the field

C. APPROACH (3-4 pages, ~1500 words)

For EACH Specific Aim:
- Rationale (2-3 sentences)
- Experimental Design
  * Methods with specifics
  * Controls
  * Sample size with justification
  * Timeline
- Expected Outcomes
- Go/No-Go Criteria (quantitative thresholds)
- Potential Problems and Alternatives

Include:
- Rigor and Reproducibility statement
- Timeline overview
- Statistical analysis plan

Write in scientific prose with figure/table placeholders.

Grant Content:
${moduleContext}`
        break

      case 'commercialization':
        documentTitle = 'Commercialization Plan'
        systemPrompt = `${compliancePrompt}

=== TASK: GENERATE COMMERCIALIZATION PLAN ===
You are an experienced SBIR/STTR commercialization consultant writing a commercialization plan.

${AUTHORSHIP_DIRECTIVE}

Commercialization Plan requirements:
- All 6 NIH sections required
- Specific competitor analysis
- Clear regulatory pathway
- Realistic financial projections
- Concrete go-to-market strategy`

        userPrompt = `Generate a comprehensive NIH Commercialization Plan.

REQUIRED SECTIONS (12 pages total):

1. COMPANY AND VALUE PROPOSITION (2 pages)
- Company background
- Technical capabilities
- Value proposition
- IP position

2. MARKET OPPORTUNITY (2 pages)
- Target market size
- Unmet need quantification
- Market trends
- Pricing rationale

3. COMPETITIVE ANALYSIS (2 pages)
- Direct competitors
- Competitive positioning
- Sustainable advantages
- Barriers to entry

4. REGULATORY PATHWAY (2 pages)
- Specific regulatory pathway (IND, 510(k), PMA, etc.)
- Clinical data requirements
- Timeline and cost estimates
- Reimbursement strategy

5. FINANCIAL PROJECTIONS (2 pages)
- Revenue model
- Cost structure
- Funding requirements
- Investment sources

6. GO-TO-MARKET STRATEGY (2 pages)
- Launch strategy
- Partnership needs
- Key milestones
- Risk mitigation

Grant Content:
${moduleContext}`
        break

      case 'references':
        documentTitle = 'References'
        systemPrompt = `${compliancePrompt}

=== TASK: GENERATE REFERENCE FRAMEWORK ===
You are a scientific literature expert. Generate a framework of references needed, with placeholders - do NOT fabricate specific papers.

${AUTHORSHIP_DIRECTIVE}

For references:
- Indicate topics needing citations
- Use placeholder format: "[Author] et al., [Year range]"
- Organize by relevance to grant sections
- Include search guidance for finding real papers`

        userPrompt = `Generate a REFERENCE FRAMEWORK (not fabricated citations).

STRUCTURE:

FOUNDATIONAL REFERENCES (5-8)
For each: Topic area, suggested search terms, what it should support

METHODOLOGICAL REFERENCES (5-8)
For each: Method name, type of paper needed, search guidance

DISEASE/TARGET REFERENCES (5-8)
For each: Aspect of disease/target, type of evidence needed

PRELIMINARY DATA SUPPORT (3-5)
Papers supporting feasibility of similar approaches

COMPETITIVE LANDSCAPE (3-5)
Papers on competing approaches to differentiate from

Format:
[#]. [Topic]: Search "[terms]" for [type of paper]
    Should support: [what claim in grant]
    Suggested: [Author] et al., [estimated year range]

DO NOT generate fake PMIDs, DOIs, or specific paper titles.

Grant Content:
${moduleContext}`
        break

      case 'compiled-grant':
        documentTitle = 'Compiled Grant Application'
        systemPrompt = `${compliancePrompt}

=== TASK: COMPILE COMPLETE GRANT APPLICATION ===
You are compiling all sections of an NIH grant application into a single coherent document. Ensure consistency across sections.

${AUTHORSHIP_DIRECTIVE}

Compilation requirements:
- Maintain consistent terminology throughout
- Ensure aims match between sections
- Cross-reference sections appropriately
- Check for redundancy`

        userPrompt = `Compile a complete NIH grant application document.

REQUIRED SECTIONS IN ORDER:

1. PROJECT TITLE
[Generate if not provided]

2. PROJECT SUMMARY/ABSTRACT (30 lines max)
[Generate comprehensive abstract]

3. PROJECT NARRATIVE (2-3 sentences)
[Plain language public health relevance]

4. SPECIFIC AIMS PAGE (1 page)
[Complete aims page with all elements]

5. RESEARCH STRATEGY
A. Significance (1.5-2 pages)
B. Innovation (0.5-1 page)
C. Approach (3-4 pages)

6. REFERENCES
[Reference framework]

${requestData.grantType && ['Phase II', 'Fast Track', 'Phase IIB'].includes(requestData.grantType) ? `
7. COMMERCIALIZATION PLAN (if Phase II/Fast Track)
[All 6 sections]
` : ''}

Ensure all sections are:
- Internally consistent
- Use same terminology
- Reference each other appropriately
- Formatted for NIH submission

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
        temperature: 0.5,
        max_tokens: documentType === 'compiled-grant' ? 16000 : 8000,
      }),
    })

    const data = await response.json()
    
    if (data.error) {
      throw new Error(data.error.message || 'OpenAI API error')
    }

    const content = data.choices?.[0]?.message?.content || ''
    const wordCount = countWords(content)

    return new Response(
      JSON.stringify({ 
        success: true,
        data: {
          type: documentType,
          content,
          wordCount,
          generatedAt: new Date().toISOString(),
          title: documentTitle
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Generation error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: { 
          code: 'GENERATION_ERROR',
          message: error.message || 'Generation failed' 
        } 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
