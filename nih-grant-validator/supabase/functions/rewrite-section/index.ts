import { getCompliancePrompt, corsHeaders } from '../_shared/compliancePrompt.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { originalText, documentType, mechanism, auditFeedback, grantType, institute, clinicalTrialAllowed } = await req.json();

    if (!originalText || !documentType) {
      throw new Error('Original text and document type are required');
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Layer 2: Inject compliance system prompt
    const compliancePrompt = getCompliancePrompt(documentType, grantType || 'Phase I', institute, clinicalTrialAllowed);

    const documentTypeLabels: Record<string, string> = {
      'specific_aims': 'Specific Aims',
      'research_strategy': 'Research Strategy',
      'budget': 'Budget Justification',
      'commercialization_plan': 'Commercialization Plan',
      'biosketches': 'Biosketch',
      'letters_of_support': 'Letter of Support',
      'milestones': 'Milestones',
      'rigor': 'Rigor and Reproducibility',
      'vertebrate_animals': 'Vertebrate Animals',
      'human_subjects': 'Human Subjects',
    };

    const docLabel = documentTypeLabels[documentType] || documentType;

    const systemPrompt = `${compliancePrompt}

=== TASK: SECTION REWRITE ===
You are a senior NIH reviewer and grant writer with extensive experience in ${mechanism || 'SBIR/STTR'} applications.

Your task is to rewrite the provided ${docLabel} section to improve its competitiveness for NIH funding while ensuring STRICT COMPLIANCE with all NIH requirements.

CRITICAL COMPLIANCE RULES (MUST FOLLOW):
1. REMOVE ALL promotional/marketing language (revolutionary, groundbreaking, etc.)
2. ADD quantitative criteria where missing (statistical tests, n=, power calculations)
3. ADD Go/No-Go criteria if this is Phase I and they are missing
4. ENSURE all claims are evidence-based, not speculative
5. REMOVE any placeholders (TBD, [insert], etc.) - flag them as needing input

CRITICAL PRESERVATION RULES:
1. Preserve ALL scientific meaning and technical accuracy
2. Do NOT exaggerate claims or results
3. Do NOT fabricate citations or references
4. Do NOT add information that wasn't in the original
5. Maintain the author's voice while improving clarity

IMPROVEMENTS TO MAKE:
- Strengthen clarity and readability
- Improve logical flow and transitions between paragraphs
- Enhance statistical reasoning where applicable
- Make aims/objectives more specific and measurable
- Strengthen innovation claims with concrete evidence from the text
- Improve significance statements
- Tighten prose (reduce wordiness)
- Use active voice where appropriate
- Ensure NIH-appropriate terminology

${auditFeedback ? `AUDIT FEEDBACK TO ADDRESS:\n${auditFeedback}\n` : ''}

OUTPUT FORMAT:
Return a JSON object with:
{
  "rewrittenText": "The full rewritten section",
  "paragraphs": [
    {
      "original": "original paragraph text",
      "rewritten": "rewritten paragraph text", 
      "changes": ["list of specific changes made"]
    }
  ],
  "complianceFixes": [
    {"original": "problematic text", "fix": "compliant replacement", "rule": "which compliance rule"}
  ],
  "summary": {
    "majorChanges": ["list of major improvements"],
    "complianceIssuesFixed": ["list of compliance issues addressed"],
    "wordCountOriginal": number,
    "wordCountRewritten": number
  }
}

Preserve paragraph structure where possible. Each paragraph should be a logical unit.`;

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
          { role: 'user', content: `Rewrite the following ${docLabel} section ensuring NIH compliance:\n\n${originalText}` }
        ],
        temperature: 0.4,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const result = await response.json();
    const rewriteResult = JSON.parse(result.choices[0].message.content);

    return new Response(JSON.stringify({
      success: true,
      documentType,
      rewrite: rewriteResult,
      complianceEnforced: true, // Layer 2 indicator
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Rewrite section error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
