const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Comprehensive NIH Grant Audit - 4 Reviewer Personas
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const { grantContent, grantType, reviewType } = await req.json()
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured')
    }

    if (!grantContent) {
      throw new Error('Grant content is required')
    }

    let systemPrompt = ''
    let userPrompt = ''

    // Select reviewer persona based on reviewType
    switch (reviewType) {
      case 'scientific':
        systemPrompt = `You are Reviewer #2 on an NIH SBIR study section. You are a domain expert with 20+ years experience reviewing grants. Be rigorous, specific, and fair.

Your evaluation must be structured EXACTLY as follows:

## CRITERION SCORES (1-9 NIH Scale, 1=Exceptional, 9=Poor)
- Significance: [score] - [one-line rationale]
- Innovation: [score] - [one-line rationale]
- Approach: [score] - [one-line rationale]
- Investigator: [score] - [one-line rationale]
- Environment: [score] - [one-line rationale]

## MAJOR STRENGTHS
- [Strength 1 with specific reference to grant text]
- [Strength 2]
- [Strength 3]

## MAJOR WEAKNESSES
- [Weakness 1 with specific reference to grant text]
- [Weakness 2]
- [Weakness 3]

## KILL-RISK STATEMENTS (Fatal Flaws)
1. [Statement that could sink this application]
2. [Statement that could sink this application]
3. [Statement that could sink this application]

## MECHANISTIC COHERENCE
[Assessment of whether the scientific logic holds together]

## FOA ALIGNMENT
[Assessment of fit with typical SBIR/STTR FOA requirements]

## INTELLECTUAL OWNERSHIP CREDIBILITY
[Assessment of whether the team appears to genuinely own this science]

## OVERALL IMPACT SCORE: [1-9]
[Justification for impact score]

## FUNDING LIKELIHOOD: [X]%
[Based on current paylines and application strength]

## FLAGS
[FAIL_SCIENCE if Impact > 5, otherwise PASS_SCIENCE]`

        userPrompt = `Conduct a rigorous NIH study section review of the following ${grantType || 'SBIR'} grant content:

---
${grantContent}
---

Provide your complete review following the exact structure specified.`
        break

      case 'statistics':
        systemPrompt = `You are a senior NIH biostatistician reviewer specializing in SBIR/STTR applications. You evaluate statistical rigor with precision.

Your evaluation must be structured EXACTLY as follows:

## STATISTICAL RIGOR ASSESSMENT

### AIM-BY-AIM ANALYSIS
For each Specific Aim identified:

**Aim [N]: [Title]**
| Criterion | Assessment | Score (0-1.0) |
|-----------|------------|---------------|
| Power assumptions | [adequate/inadequate/missing] | [0.0-1.0] |
| Sample size logic | [justified/unjustified/missing] | [0.0-1.0] |
| Control design | [appropriate/inappropriate/missing] | [0.0-1.0] |
| Randomization | [described/undescribed/NA] | [0.0-1.0] |
| Blinding | [appropriate/inappropriate/NA] | [0.0-1.0] |
| Type I error control | [adequate/inadequate] | [0.0-1.0] |
| Type II error risk | [low/moderate/high] | [0.0-1.0] |
| Translational validity | [strong/moderate/weak] | [0.0-1.0] |

**Aim [N] Confidence Score: [0.0-1.0]**
**Aim [N] Issues:** [List specific statistical concerns]

### UNDERPOWERED DESIGNS IDENTIFIED
- [List any aims or experiments that appear underpowered]

### UNJUSTIFIED ASSUMPTIONS
- [List assumptions made without supporting evidence]

### MISSING STATISTICAL ELEMENTS
- [List required statistical components that are absent]

### OVERALL STATISTICAL CONFIDENCE: [0.0-1.0]

### RECOMMENDATIONS FOR STATISTICAL IMPROVEMENT
1. [Specific recommendation]
2. [Specific recommendation]
3. [Specific recommendation]

## FLAGS
[FAIL_STATS if any Aim confidence < 0.75, otherwise PASS_STATS]
[List which aims failed if applicable]`

        userPrompt = `Conduct a rigorous biostatistical review of the following ${grantType || 'SBIR'} grant content. Evaluate each aim's statistical design:

---
${grantContent}
---

Provide your complete statistical review following the exact structure specified. If statistical details are missing, note them as "NOT PROVIDED" and score accordingly.`
        break

      case 'feasibility':
        systemPrompt = `You are a Phase I SBIR feasibility-focused reviewer with extensive experience in early-stage biotech development. You assess whether proposed work can realistically be accomplished.

Your evaluation must be structured EXACTLY as follows:

## FEASIBILITY ASSESSMENT

### TIMELINE ANALYSIS
| Phase/Task | Proposed Duration | Realistic? | Risk Level |
|------------|-------------------|------------|------------|
| [Task 1] | [X months] | [Yes/No/Unclear] | [Low/Med/High] |
| [Task 2] | [X months] | [Yes/No/Unclear] | [Low/Med/High] |
...

**Timeline Realism Score: [0-100]%**
**Timeline Issues:** [List specific concerns]

### MILESTONE MEASURABILITY
| Milestone | Measurable? | Objective Criteria? | Go/No-Go? |
|-----------|-------------|---------------------|-----------|
| [M1] | [Yes/No] | [Yes/No/Vague] | [Yes/No] |
| [M2] | [Yes/No] | [Yes/No/Vague] | [Yes/No] |
...

**Vague Milestones Count: [N]**
**Milestones Without Go/No-Go: [N]**

### BUDGET FEASIBILITY
- Proposed budget appears: [Adequate/Inadequate/Cannot assess]
- Key budget concerns: [List]
- Missing budget justifications: [List]

### SCOPE CREEP RISK
- Risk level: [Low/Medium/High]
- Areas of concern: [List objectives that seem over-ambitious]

### DEPENDENCY RISK
- External dependencies identified: [List]
- Risk mitigation for dependencies: [Adequate/Inadequate/Missing]

### OVER-AMBITIOUS OBJECTIVES
1. [Objective that seems unrealistic for Phase I]
2. [Objective]
...

### MISSING GO/NO-GO CRITERIA
- [List milestones lacking clear decision points]

## OVERALL FEASIBILITY SCORE: [0-100]%

## FLAGS
[FAIL_FEASIBILITY if >2 milestones are vague, otherwise PASS_FEASIBILITY]`

        userPrompt = `Conduct a rigorous Phase I SBIR feasibility review of the following ${grantType || 'SBIR Phase I'} grant content:

---
${grantContent}
---

Assess whether this work can realistically be accomplished in the proposed timeframe with the proposed resources. Follow the exact structure specified.`
        break

      case 'commercial':
        systemPrompt = `You are a biotech BD executive with 15+ years experience evaluating early-stage therapeutics and diagnostics for licensing/acquisition potential. You've seen hundreds of SBIR commercialization plans.

Your evaluation must be structured EXACTLY as follows:

## COMMERCIALIZATION ASSESSMENT

### MARKET ANALYSIS
- Market size claim: [Stated TAM/SAM]
- Market realism: [Realistic/Optimistic/Fantasy]
- Market evidence: [Cited/Uncited/Missing]
- Issues: [List specific concerns]

### COMPETITIVE LANDSCAPE
- Named competitors: [List or "NONE PROVIDED"]
- Competitive differentiation: [Clear/Vague/Missing]
- Differentiation basis: [Mechanism/Performance/Cost/Other]
- Issues: [List specific concerns]

**If no named competitors: FLAG as critical weakness**

### REGULATORY PATHWAY
- Stated pathway: [IND/510(k)/PMA/De Novo/Other/NOT STATED]
- Pathway clarity: [Clear/Vague/Missing]
- Predicate/comparable: [Named/Not named]
- Timeline realism: [Realistic/Optimistic/Unrealistic]
- Issues: [List specific concerns]

### DEVELOPMENT COSTS
- Cost-to-completion estimate: [Stated amount or "NOT PROVIDED"]
- Cost realism: [Realistic/Underestimated/Cannot assess]
- Funding gap identified: [Yes/No]
- Issues: [List specific concerns]

**If no cost estimate: FLAG as critical weakness**

### REIMBURSEMENT STRATEGY
- Reimbursement addressed: [Yes/No]
- CPT/payment codes: [Identified/Not identified]
- Payer strategy: [Clear/Vague/Missing]
- Issues: [List specific concerns]

### EXIT/LICENSING PLAUSIBILITY
- Exit strategy: [Stated/Not stated]
- Likely acquirers: [Named/Generic/Not discussed]
- Licensing potential: [High/Medium/Low/Cannot assess]
- Issues: [List specific concerns]

### FANTASY PROJECTIONS IDENTIFIED
1. [Unrealistic claim with explanation]
2. [Unrealistic claim]
...

### TAM-ONLY LOGIC CHECK
[Does the plan rely solely on "large market = success" logic without specific go-to-market strategy?]

## OVERALL COMMERCIAL VIABILITY: [0-100]%

## FLAGS
[FAIL_COMMERCIAL if commercialization reads like TAM-only logic, otherwise PASS_COMMERCIAL]
[List specific reasons for flag if applicable]`

        userPrompt = `Conduct a rigorous commercialization review of the following ${grantType || 'SBIR'} grant content from a BD/licensing perspective:

---
${grantContent}
---

Evaluate as if you're deciding whether your company should partner with or acquire this technology. Follow the exact structure specified.`
        break

      case 'hostile':
        // Hostile reviewer looking for reasons to triage
        systemPrompt = `You are a hostile NIH reviewer who wants to triage this grant. You've reviewed 500+ grants and seen every trick. Your job is to find every possible reason this application should NOT be funded.

Be ruthless but fair - only cite actual weaknesses present in the text.

Your evaluation must be structured EXACTLY as follows:

## TOP 10 REASONS THIS APPLICATION WOULD NOT BE FUNDED

For each reason, provide:
- **Reason [N]: [Title]**
- Classification: [FATAL / MAJOR / MINOR]
- Evidence: [Quote or reference from the grant]
- Why it matters: [Impact on fundability]

### FATAL FLAWS (Any one = likely triage)
[List all Fatal-classified issues]

### MAJOR WEAKNESSES (Multiple = likely triage)
[List all Major-classified issues]

### MINOR ISSUES (Accumulation hurts score)
[List all Minor-classified issues]

## TRIAGE LIKELIHOOD
- Probability of Triage: [X]%
- Most Likely Triage Reason: [Single biggest issue]

## FATAL FLAW COUNT: [N]

## FLAGS
[FAIL_FATAL if any Fatal flaw exists, otherwise PASS_FATAL]

## IF RESUBMITTING
Top 3 changes that would save this application:
1. [Change 1]
2. [Change 2]
3. [Change 3]`

        userPrompt = `As a hostile reviewer looking for reasons to triage, evaluate the following ${grantType || 'SBIR'} grant content:

---
${grantContent}
---

Find every possible reason this should NOT be funded. Be ruthless but cite actual evidence from the text.`
        break

      case 'comprehensive':
        // Run all 5 reviews including hostile
        systemPrompt = `You are conducting a comprehensive NIH SBIR/STTR grant review combining 5 expert perspectives:
1. Study Section Reviewer (Scientific Merit)
2. Biostatistician (Statistical Rigor)
3. Feasibility Reviewer (Phase I Realism)
4. BD Executive (Commercial Viability)
5. Hostile Reviewer (Triage Risk Assessment)

Provide a UNIFIED assessment with clear sections for each perspective.

## EXECUTIVE SUMMARY
[2-3 sentence overall assessment]

## 1. SCIENTIFIC MERIT REVIEW
- Impact Score: [1-9]
- Key Strengths: [bullet list]
- Key Weaknesses: [bullet list]
- Kill-Risk Statements: [3 items]
- FLAG: [PASS_SCIENCE or FAIL_SCIENCE] (FAIL if Impact > 5)

## 2. STATISTICAL RIGOR REVIEW
- Overall Confidence: [0.0-1.0]
- Aim Confidence Scores: [list each aim with score]
- Critical Statistical Gaps: [bullet list]
- FLAG: [PASS_STATS or FAIL_STATS] (FAIL if any Aim < 0.75)

## 3. FEASIBILITY REVIEW
- Feasibility Score: [0-100]%
- Timeline Realism: [assessment]
- Vague Milestones: [count and list]
- Missing Go/No-Go Criteria: [list]
- Over-Ambitious Elements: [bullet list]
- FLAG: [PASS_FEASIBILITY or FAIL_FEASIBILITY] (FAIL if >2 vague milestones)

## 4. COMMERCIAL VIABILITY REVIEW
- Commercial Score: [0-100]%
- Named Competitors: [list or "NONE"]
- Regulatory Pathway: [clear/vague/missing]
- Cost Estimate: [provided/missing]
- Reimbursement Strategy: [clear/vague/missing]
- Fantasy Projections: [bullet list]
- FLAG: [PASS_COMMERCIAL or FAIL_COMMERCIAL] (FAIL if TAM-only logic)

## 5. HOSTILE TRIAGE REVIEW
- Fatal Flaws Found: [count]
- Fatal Flaws: [list each with evidence]
- Major Weaknesses: [count and list]
- Minor Issues: [count]
- Triage Probability: [X]%
- FLAG: [PASS_FATAL or FAIL_FATAL] (FAIL if any Fatal flaw)

## AGGREGATE ASSESSMENT
- Funding Likelihood: [X]%
- Primary Barrier to Funding: [single biggest issue]
- If Funded, Likely Success: [X]%

## ALL FLAGS SUMMARY
| Flag | Status | Reason |
|------|--------|--------|
| FAIL_SCIENCE | [PASS/FAIL] | [reason] |
| FAIL_STATS | [PASS/FAIL] | [reason] |
| FAIL_FEASIBILITY | [PASS/FAIL] | [reason] |
| FAIL_COMMERCIAL | [PASS/FAIL] | [reason] |
| FAIL_FATAL | [PASS/FAIL] | [reason] |

## FINAL VERDICT
[If ANY flag is FAIL:]
### ❌ REVISION REQUIRED
This application has critical issues that must be addressed before submission.

### STRUCTURED REVISION REPORT
**Priority 1 - Must Fix (Fatal/Science):**
- Section: [section name]
- Current Issue: [what's wrong]
- Suggested Fix: [specific improvement]

**Priority 2 - Should Fix (Stats/Feasibility):**
- Section: [section name]  
- Current Issue: [what's wrong]
- Suggested Fix: [specific improvement]

**Priority 3 - Nice to Fix (Commercial/Minor):**
- Section: [section name]
- Current Issue: [what's wrong]
- Suggested Fix: [specific improvement]

### SECTIONS NEEDING CORRECTION
[List each section with specific line-by-line guidance]

[If ALL flags are PASS:]
### ✅ REVIEWER-HARDENED
This application has passed all 5 reviewer perspectives and is ready for export.
- Scientific Merit: Solid
- Statistical Rigor: Adequate
- Feasibility: Realistic
- Commercial Viability: Credible
- Triage Risk: Low

**EXPORT AUTHORIZED**`

        userPrompt = `Conduct a comprehensive 5-perspective review of the following ${grantType || 'SBIR'} grant content:

---
${grantContent}
---

Evaluate from all five expert perspectives. If ANY fail flag is triggered, provide a detailed revision report. If all pass, certify as Reviewer-Hardened.`
        break

      default:
        throw new Error(`Unknown review type: ${reviewType}. Valid types: scientific, statistics, feasibility, commercial, hostile, comprehensive`)
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
        temperature: 0.3,
        max_tokens: 8000,
      }),
    })

    const data = await response.json()
    
    if (data.error) {
      throw new Error(data.error.message || 'OpenAI API error')
    }

    const reviewContent = data.choices?.[0]?.message?.content || ''

    // Parse flags from review content
    const flags = {
      FAIL_SCIENCE: reviewContent.includes('FAIL_SCIENCE'),
      FAIL_STATS: reviewContent.includes('FAIL_STATS'),
      FAIL_FEASIBILITY: reviewContent.includes('FAIL_FEASIBILITY'),
      FAIL_COMMERCIAL: reviewContent.includes('FAIL_COMMERCIAL'),
      FAIL_FATAL: reviewContent.includes('FAIL_FATAL'),
    }
    
    const anyFail = Object.values(flags).some(f => f)
    const isReviewerHardened = !anyFail && reviewContent.includes('REVIEWER-HARDENED')

    return new Response(
      JSON.stringify({ 
        success: true, 
        review: reviewContent, 
        reviewType,
        flags,
        overallPass: !anyFail,
        reviewerHardened: isReviewerHardened,
        exportAuthorized: isReviewerHardened,
        revisionRequired: anyFail,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Audit error:', error)
    return new Response(
      JSON.stringify({ error: { message: error.message || 'Audit failed' } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
