import { getCompliancePrompt, corsHeaders } from '../_shared/compliancePrompt.ts'

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

**COMMERCIALIZATION SPECIFICITY:**
Commercial sections MUST include:
- Named competitors (real or placeholder "[Competitor A]")
- Specific regulatory pathway (IND, 510(k), PMA, De Novo, etc.)
- Cost-to-completion estimate or range
- Reimbursement landscape (CPT codes, payer considerations)
- Differentiation statement grounded in mechanism, not just "better"

NO TAM-only logic. No unsupported market claims.

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const { documentType, grantType, modules, institute, clinicalTrialAllowed } = await req.json()
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Layer 2: Inject compliance system prompt based on document type
    const compliancePrompt = getCompliancePrompt(
      documentType === 'commercialization' ? 'commercialization' : 'research_strategy',
      grantType || 'Phase I',
      institute,
      clinicalTrialAllowed
    )

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
        systemPrompt = `${compliancePrompt}

=== TASK: GENERATE PROJECT TITLES ===
You are an experienced NIH-funded principal investigator helping a colleague craft project titles. Write titles that experienced NIH reviewers would find credible and compelling.

${AUTHORSHIP_DIRECTIVE}

For titles specifically:
- Avoid buzzwords and hype
- Be mechanistically specific
- Include disease/condition and approach
- Stay under 81 characters (NIH requirement)
- Sound like a working scientist wrote them, not marketing`

        userPrompt = `Based on the following grant application content, generate exactly 3 distinct project title options.

Each title should:
1. Be concise (under 81 characters)
2. Specify the mechanism or approach
3. Name the target condition/population
4. Avoid hyperbolic adjectives

Format:
TITLE 1: [title] ([character count])
Rationale: [1-2 sentences on why this framing works for reviewers]

TITLE 2: [title] ([character count])
Rationale: [1-2 sentences]

TITLE 3: [title] ([character count])
Rationale: [1-2 sentences]

Grant Content:
${moduleContext}`
        break

      case 'research':
        systemPrompt = `${compliancePrompt}

=== TASK: GENERATE RESEARCH STRATEGY ===
You are an experienced NIH-funded principal investigator writing a Research Strategy section. Write as a domain expert presenting to a study section of peers.

${AUTHORSHIP_DIRECTIVE}

For Research Strategy specifically:
- SIGNIFICANCE: Ground in epidemiological data and mechanistic gaps. Cite specific limitations of current approaches.
- INNOVATION: Be specific about what is new. Avoid claiming everything is "novel." Compare directly to existing methods.
- APPROACH: Include experimental details, sample sizes, controls, statistical analysis plans. Address rigor and reproducibility. Include potential pitfalls and alternatives for EACH aim.
- MANDATORY FOR PHASE I: Include explicit Go/No-Go criteria with quantitative thresholds`

        userPrompt = `Generate a complete NIH Research Strategy section based on the following content.

REQUIRED STRUCTURE:

A. SIGNIFICANCE (1.5-2 pages)
- Open with disease burden (specific statistics with [ref] placeholders)
- Current standard of care and its mechanistic limitations
- Knowledge gap this project addresses
- Why this gap persists (technical/biological barriers)
- Significance of addressing this gap (patient outcomes, not hype)

B. INNOVATION (0.5-1 page)
- What specifically is new (compare to existing approaches)
- Technical innovation (methodology, not just "first to do X")
- Conceptual innovation (if applicable)
- Be honest about what is incremental vs. truly innovative

C. APPROACH (3-4 pages)
For EACH Specific Aim:
- Rationale and hypothesis for this aim
- Experimental design with specifics (n=, timepoints, controls)
- Methods with enough detail for reproducibility
- Expected outcomes with quantitative success criteria
- **Go/No-Go criteria (REQUIRED FOR PHASE I): Define quantitative threshold for proceeding**
- Potential problems and alternative approaches
- How aim results feed into subsequent aims

Include:
- Timeline (Gantt-style description or table placeholder)
- Rigor and reproducibility statement
- Statistical analysis plan with power calculations (or placeholders)

Write in scientific prose. Vary paragraph length. Include figure/table placeholders where data would be referenced.

Grant Content:
${moduleContext}`
        break

      case 'references':
        systemPrompt = `${compliancePrompt}

=== TASK: GENERATE REFERENCE FRAMEWORK ===
You are a scientific literature expert helping structure a reference section. Generate PLACEHOLDER references that indicate what types of citations are needed - do NOT fabricate specific papers with fake PMIDs.

${AUTHORSHIP_DIRECTIVE}

For references:
- Indicate topic areas that need citations
- Suggest author name patterns like "[First author] et al., [Year range]"
- Organize by topic relevance to the grant
- Include annotation explaining why each reference type is needed`

        userPrompt = `Based on the grant content below, generate a REFERENCE FRAMEWORK (not fabricated citations).

Structure as:

FOUNDATIONAL REFERENCES (5-8 needed)
[Topic area 1]: "[Author] et al., [year range]" - supports [specific claim]
[Topic area 2]: "[Author] et al., [year range]" - establishes [premise]
...

METHODOLOGICAL REFERENCES (5-8 needed)
[Method 1]: Cite original method paper and recent optimization
[Method 2]: Statistical approach reference
...

PRELIMINARY DATA SUPPORT (3-5 needed)
References that support the feasibility based on similar approaches
...

DISEASE/TARGET REFERENCES (5-8 needed)
Epidemiology, pathophysiology, current treatments
...

COMPETITIVE LANDSCAPE (3-5 needed)
Papers on competing approaches to cite and differentiate from
...

For each placeholder, explain:
- What type of paper to find
- What it should support in the grant
- Suggested search terms for PubMed

DO NOT generate fake PMIDs, DOIs, or specific paper titles. This is a framework for the investigator to populate.

Grant Content:
${moduleContext}`
        break

      case 'commercialization':
        systemPrompt = `${compliancePrompt}

=== TASK: GENERATE COMMERCIALIZATION PLAN ===
You are an experienced SBIR/STTR commercialization consultant and former NIH program officer. Write commercialization plans that demonstrate genuine market understanding, not just TAM slides.

${AUTHORSHIP_DIRECTIVE}

For Commercialization Plans specifically:
- Name real competitor categories (use [Competitor A, B] if specific names unknown)
- Specify regulatory pathway with rationale (IND, 510(k), PMA, De Novo)
- Include realistic cost and timeline estimates (ranges acceptable)
- Address reimbursement (CPT codes, coverage considerations)
- Differentiate on mechanism, not vague "better" claims
- Acknowledge market risks and mitigation strategies
- Include specific partnership types needed, not just "seek partners"
- THIS IS REQUIRED FOR PHASE II: Must include all 6 NIH commercialization sections`

        userPrompt = `Generate a comprehensive NIH Commercialization Plan based on the following content.

REQUIRED SECTIONS (All 6 NIH sections required for Phase II):

1. COMPANY AND VALUE PROPOSITION (1.5-2 pages)
- Company background (or placeholder for new company)
- Specific technical capabilities relevant to this project
- Product/service value proposition with mechanistic basis
- IP position (existing patents, freedom-to-operate considerations)
- Key personnel commercial experience

2. MARKET OPPORTUNITY (1.5-2 pages)
- Target market with specific size estimates and sources
- Market segmentation (which customers first, expansion path)
- Unmet need with quantification (cost of current care, outcomes gaps)
- Market trends affecting adoption
- Pricing rationale based on value and comparables

3. COMPETITIVE ANALYSIS (1.5-2 pages)
- Direct competitors by category (name or [Competitor A] format)
- Indirect competitors and substitute solutions
- Competitive positioning matrix (placeholder for table)
- Sustainable competitive advantages (be specific, not "better")
- Barriers to entry you will establish

4. REGULATORY AND REIMBURSEMENT PATHWAY (1.5 pages)
- Specific regulatory pathway with rationale
- Predicate devices or comparable approvals (if applicable)
- Clinical data requirements for approval
- Estimated timeline and cost to regulatory clearance
- Reimbursement strategy (CPT codes, payer considerations)

5. FINANCIAL PROJECTIONS AND FUNDING (1.5 pages)
- Revenue model (direct sales, licensing, partnership)
- Pricing strategy with justification
- Cost structure overview
- Funding requirements to key milestones
- Funding sources beyond SBIR (identify specific types)

6. GO-TO-MARKET STRATEGY AND MILESTONES (1.5 pages)
- Launch strategy (geography, customer segment, channel)
- Partnership needs (type of partner, what they provide)
- Key commercialization milestones with dates
- Risk factors and mitigation strategies
- Success metrics for Phase II commercialization

Write in professional business prose. Acknowledge uncertainties. Use [placeholder] format for unknown specifics.

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
        max_tokens: 8000,
      }),
    })

    const data = await response.json()
    
    if (data.error) {
      throw new Error(data.error.message || 'OpenAI API error')
    }

    const content = data.choices?.[0]?.message?.content || ''

    return new Response(
      JSON.stringify({ 
        success: true, 
        content, 
        documentType,
        complianceEnforced: true // Layer 2 indicator
      }),
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
