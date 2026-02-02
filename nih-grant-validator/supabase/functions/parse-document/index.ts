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
    const { fileContent, fileName, fileType } = await req.json();

    if (!fileContent) {
      throw new Error('File content is required');
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // For DOCX/PDF, the frontend will extract text; we receive plain text
    const textContent = fileContent;

    const systemPrompt = `You are an NIH grant document parser. Your ONLY job is to extract information that is EXPLICITLY WRITTEN in the document provided below.

CRITICAL RULES:
1. ONLY extract text that appears VERBATIM or is directly stated in the document
2. If information for a field is NOT in the document, leave that field EMPTY or omit it entirely
3. NEVER invent, fabricate, or guess ANY content - not even plausible-sounding content
4. NEVER use your training knowledge to fill in gaps
5. If the document is about Topic X, ALL extracted content must relate to Topic X
6. Return an EMPTY object {} if the document doesn't contain grant-related content

Return a JSON object with these keys (ONLY include keys where you found EXPLICIT content):

{
  "m1_title_concept": {
    "project_title": "EXACT title from document",
    "lay_summary": "EXACT non-technical summary from document",
    "scientific_abstract": "EXACT technical abstract from document",
    "problem_statement": "EXACT problem statement from document",
    "proposed_solution": "EXACT proposed solution from document",
    "target_population": "EXACT target population mentioned",
    "therapeutic_area": "EXACT medical/scientific area mentioned",
    "technology_type": "EXACT technology type mentioned"
  },
  "m2_hypothesis": {
    "central_hypothesis": "EXACT hypothesis stated",
    "supporting_rationale": "EXACT rationale from document",
    "preliminary_data_summary": "EXACT preliminary data mentioned",
    "expected_outcomes": "EXACT expected outcomes stated",
    "success_criteria": "EXACT success criteria stated"
  },
  "m3_specific_aims": {
    "aim1_statement": "EXACT Aim 1 from document",
    "aim1_milestones": ["EXACT milestones listed"],
    "aim2_statement": "EXACT Aim 2 from document",
    "aim2_milestones": ["EXACT milestones listed"],
    "aim3_statement": "EXACT Aim 3 if present",
    "aim3_milestones": ["EXACT milestones listed"],
    "timeline_summary": "EXACT timeline from document",
    "interdependencies": "EXACT interdependencies stated"
  },
  "m4_team_mapping": {
    "pi_name": "EXACT PI name from document",
    "pi_qualifications": "EXACT qualifications stated",
    "key_personnel": [{"name": "EXACT name", "role": "EXACT role", "expertise": "EXACT expertise"}]
  },
  "m5_experimental_approach": {
    "methodology_overview": "EXACT methods described",
    "experimental_design": "EXACT study design",
    "data_collection_methods": "EXACT data collection methods",
    "analysis_plan": "EXACT analysis approach",
    "statistical_approach": "EXACT statistics mentioned",
    "expected_results": "EXACT anticipated findings",
    "potential_pitfalls": "EXACT pitfalls mentioned",
    "alternative_approaches": "EXACT alternatives described"
  },
  "m7_regulatory": {
    "human_subjects_involved": true/false based on EXPLICIT mention,
    "vertebrate_animals_involved": true/false based on EXPLICIT mention,
    "biohazards_involved": true/false based on EXPLICIT mention,
    "facilities_description": "EXACT facilities description"
  }
}

REMEMBER: If content is NOT in the document, return {} for that module. NEVER make up content.`;

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
          { role: 'user', content: `IMPORTANT: Only extract content that is EXPLICITLY written in the following document. Do NOT add any information from your training data. If the document mentions "ovarian cancer", do NOT return anything about "Alzheimer's". Extract ONLY what you see below:\n\n---DOCUMENT START---\n${textContent}\n---DOCUMENT END---` }
        ],
        temperature: 0,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const result = await response.json();
    const parsedContent = JSON.parse(result.choices[0].message.content);

    // Calculate summary of what was extracted
    const summary = {
      modulesFound: [] as string[],
      totalFieldsExtracted: 0,
    };

    const moduleNames: Record<string, string> = {
      m1_title_concept: 'Title & Concept',
      m2_hypothesis: 'Hypothesis',
      m3_specific_aims: 'Specific Aims',
      m4_team_mapping: 'Team',
      m5_experimental_approach: 'Experimental Approach',
      m7_regulatory: 'Regulatory',
    };

    for (const [key, value] of Object.entries(parsedContent)) {
      if (value && typeof value === 'object' && Object.keys(value).length > 0) {
        summary.modulesFound.push(moduleNames[key] || key);
        summary.totalFieldsExtracted += Object.keys(value).length;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: parsedContent,
      summary,
      fileName,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Parse document error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
