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
    const { documents, mechanism, generateSuggestions } = await req.json();

    if (!documents || !mechanism) {
      throw new Error('Documents and mechanism are required');
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Phase requirement matrix
    const requirementMatrix: Record<string, { required: string[]; recommended: string[]; conditional: Record<string, string[]> }> = {
      'Phase I': {
        required: ['specific_aims', 'research_strategy'],
        recommended: ['biosketches', 'letters_of_support', 'budget'],
        conditional: {
          'human_subjects': ['irb_approval', 'protection_of_human_subjects'],
          'vertebrate_animals': ['iacuc_approval', 'vertebrate_animals_section'],
        }
      },
      'Phase II': {
        required: ['specific_aims', 'research_strategy', 'commercialization_plan', 'budget'],
        recommended: ['biosketches', 'letters_of_support', 'milestones'],
        conditional: {
          'human_subjects': ['irb_approval', 'protection_of_human_subjects'],
          'vertebrate_animals': ['iacuc_approval', 'vertebrate_animals_section'],
        }
      },
      'Direct-to-Phase II': {
        required: ['specific_aims', 'research_strategy', 'commercialization_plan', 'budget', 'feasibility_data'],
        recommended: ['biosketches', 'letters_of_support', 'milestones'],
        conditional: {
          'human_subjects': ['irb_approval', 'protection_of_human_subjects'],
          'vertebrate_animals': ['iacuc_approval', 'vertebrate_animals_section'],
        }
      },
      'Fast Track': {
        required: ['specific_aims', 'research_strategy', 'commercialization_plan', 'budget', 'phase1_milestones', 'phase2_milestones'],
        recommended: ['biosketches', 'letters_of_support'],
        conditional: {
          'human_subjects': ['irb_approval', 'protection_of_human_subjects'],
          'vertebrate_animals': ['iacuc_approval', 'vertebrate_animals_section'],
        }
      },
      'Phase IIB': {
        required: ['specific_aims', 'research_strategy', 'commercialization_plan', 'budget', 'prior_phase_results'],
        recommended: ['biosketches', 'letters_of_support', 'milestones', 'matching_funds_documentation'],
        conditional: {
          'human_subjects': ['irb_approval', 'protection_of_human_subjects'],
          'vertebrate_animals': ['iacuc_approval', 'vertebrate_animals_section'],
        }
      }
    };

    const requirements = requirementMatrix[mechanism] || requirementMatrix['Phase I'];

    // Combine all document content for analysis
    const combinedContent = Object.entries(documents)
      .map(([type, content]) => `=== ${type.toUpperCase()} ===\n${content}`)
      .join('\n\n');

    const systemPrompt = `You are an expert NIH SBIR/STTR grant reviewer conducting a comprehensive pre-submission audit. 
This is a ${mechanism} application.

IMPORTANT: This is an ADVISORY PRE-SUBMISSION AUDIT - NOT an official NIH review.

Analyze the provided grant documents and return a JSON object with the following structure:

{
  "documentStatus": {
    "specific_aims": { "status": "present|missing|incomplete", "issues": [] },
    "research_strategy": { "status": "present|missing|incomplete", "issues": [] },
    "budget": { "status": "present|missing|incomplete", "issues": [] },
    "commercialization_plan": { "status": "present|missing|incomplete", "issues": [] },
    "biosketches": { "status": "present|missing|incomplete", "issues": [] },
    "letters_of_support": { "status": "present|missing|incomplete", "issues": [] },
    "milestones": { "status": "present|missing|incomplete", "issues": [] }
  },
  "parsedSections": {
    "title": "extracted project title",
    "aims": ["aim 1 text", "aim 2 text", "aim 3 text if present"],
    "hypothesis": "central hypothesis if found",
    "significance": "key significance points",
    "innovation": "innovation claims",
    "approach": "methodology summary",
    "timeline": "project timeline",
    "budget_total": "total budget amount if found",
    "team": ["PI name and role", "Co-I names and roles"]
  },
  "conditionalDetection": {
    "human_subjects": { "detected": true/false, "details": "evidence found" },
    "vertebrate_animals": { "detected": true/false, "details": "evidence found" },
    "biohazards": { "detected": true/false, "details": "evidence found" },
    "clinical_trial": { "detected": true/false, "details": "evidence found" }
  },
  "validationResults": {
    "structural": {
      "score": 0-100,
      "findings": [{"issue": "description", "severity": "critical|major|minor", "location": "section"}],
      "nihSectionMapping": {"section_name": "detected|missing|incomplete"}
    },
    "scientific": {
      "score": 0-100,
      "findings": [{"issue": "description", "severity": "critical|major|minor", "location": "section"}],
      "hypothesisClarity": 0-100,
      "methodologicalRigor": 0-100,
      "statisticalApproach": 0-100
    },
    "budget": {
      "score": 0-100,
      "findings": [{"issue": "description", "severity": "critical|major|minor", "location": "section"}],
      "justificationQuality": 0-100,
      "personnelAppropriate": true/false,
      "equipmentJustified": true/false
    },
    "commercialization": {
      "score": 0-100,
      "findings": [{"issue": "description", "severity": "critical|major|minor", "location": "section"}],
      "marketAnalysis": 0-100,
      "ipStrategy": 0-100,
      "revenueModel": 0-100,
      "teamCommercialExperience": 0-100
    },
    "consistency": {
      "score": 0-100,
      "findings": [{"issue": "description", "severity": "critical|major|minor", "location": "section"}],
      "aimsAlignmentWithApproach": true/false,
      "budgetMatchesScope": true/false,
      "timelineRealistic": true/false
    }
  },
  "reviewerSimulation": {
    "scientific": {
      "overallImpression": "summary paragraph",
      "strengths": ["strength 1", "strength 2"],
      "weaknesses": ["weakness 1", "weakness 2"],
      "score": 1-9,
      "recommendedScore": "Outstanding|Excellent|Very Good|Good|Satisfactory|Fair|Marginal|Poor|Not Recommended"
    },
    "commercialization": {
      "overallImpression": "summary paragraph",
      "strengths": ["strength 1", "strength 2"],
      "weaknesses": ["weakness 1", "weakness 2"],
      "score": 1-9
    },
    "budget": {
      "overallImpression": "summary paragraph",
      "concerns": ["concern 1", "concern 2"],
      "recommendations": ["recommendation 1"]
    }
  },
  "overallScores": {
    "structural": 0-100,
    "scientific": 0-100,
    "budget": 0-100,
    "commercialization": 0-100,
    "consistency": 0-100,
    "weighted_total": 0-100
  }
}

Score weights: Structural (25%), Scientific Rigor (30%), Budget (15%), Commercialization (20%), Cross-module Consistency (10%)

For ${mechanism}, required documents are: ${requirements.required.join(', ')}
Recommended documents are: ${requirements.recommended.join(', ')}

Be thorough but fair. Identify genuine issues that would concern NIH reviewers.`;

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
          { role: 'user', content: `Audit the following ${mechanism} grant application:\n\n${combinedContent}` }
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

    // Calculate weighted total score
    const weights = { structural: 0.25, scientific: 0.30, budget: 0.15, commercialization: 0.20, consistency: 0.10 };
    const scores = auditResult.overallScores || auditResult.validationResults;
    
    const weightedTotal = Math.round(
      (scores.structural?.score || scores.structural || 0) * weights.structural +
      (scores.scientific?.score || scores.scientific || 0) * weights.scientific +
      (scores.budget?.score || scores.budget || 0) * weights.budget +
      (scores.commercialization?.score || scores.commercialization || 0) * weights.commercialization +
      (scores.consistency?.score || scores.consistency || 0) * weights.consistency
    );

    auditResult.overallScores = {
      ...auditResult.overallScores,
      structural: scores.structural?.score || scores.structural || 0,
      scientific: scores.scientific?.score || scores.scientific || 0,
      budget: scores.budget?.score || scores.budget || 0,
      commercialization: scores.commercialization?.score || scores.commercialization || 0,
      consistency: scores.consistency?.score || scores.consistency || 0,
      weighted_total: weightedTotal
    };

    // Generate improvement suggestions if requested
    let suggestions = null;
    if (generateSuggestions) {
      const suggestionsPrompt = `Based on this audit result, provide specific, actionable improvement suggestions for each area with issues:

${JSON.stringify(auditResult.validationResults, null, 2)}

Return a JSON object with:
{
  "prioritized_improvements": [
    {"priority": 1-5, "area": "section name", "issue": "problem", "suggestion": "specific fix", "impact": "high|medium|low"}
  ],
  "quick_wins": ["easy fixes that would improve score"],
  "major_revisions": ["significant changes needed"],
  "reviewer_tips": ["what reviewers look for in ${mechanism}"]
}`;

      const suggestionsResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'You are an NIH grant writing consultant providing actionable improvement suggestions.' },
            { role: 'user', content: suggestionsPrompt }
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        }),
      });

      if (suggestionsResponse.ok) {
        const suggestionsResult = await suggestionsResponse.json();
        suggestions = JSON.parse(suggestionsResult.choices[0].message.content);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      mechanism,
      requirements,
      audit: auditResult,
      suggestions,
      disclaimer: 'ADVISORY PRE-SUBMISSION AUDIT - This is NOT an official NIH review. Results are for guidance only.',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Audit grant error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
