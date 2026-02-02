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

    const systemPrompt = `You are an expert NIH grant document parser. Analyze the provided grant document and extract content into the appropriate NIH SBIR/STTR grant modules.

Return a JSON object with these exact keys (only include keys where you found relevant content):

{
  "m1_title_concept": {
    "project_title": "extracted title",
    "lay_summary": "non-technical summary",
    "scientific_abstract": "technical abstract",
    "problem_statement": "the problem being addressed",
    "proposed_solution": "the proposed solution",
    "target_population": "who benefits",
    "therapeutic_area": "medical/scientific area",
    "technology_type": "type of technology"
  },
  "m2_hypothesis": {
    "central_hypothesis": "main hypothesis",
    "supporting_rationale": "why hypothesis is valid",
    "preliminary_data_summary": "existing data supporting this",
    "expected_outcomes": "what outcomes are expected",
    "success_criteria": "how success will be measured"
  },
  "m3_specific_aims": {
    "aim1_statement": "first specific aim",
    "aim1_milestones": ["milestone1", "milestone2"],
    "aim2_statement": "second specific aim",
    "aim2_milestones": ["milestone1", "milestone2"],
    "aim3_statement": "third specific aim (if any)",
    "aim3_milestones": ["milestone1", "milestone2"],
    "timeline_summary": "overall timeline",
    "interdependencies": "how aims relate"
  },
  "m4_team_mapping": {
    "pi_name": "Principal Investigator name",
    "pi_qualifications": "PI qualifications",
    "key_personnel": [{"name": "", "role": "", "expertise": ""}]
  },
  "m5_experimental_approach": {
    "methodology_overview": "research methods",
    "experimental_design": "study design",
    "data_collection_methods": "how data collected",
    "analysis_plan": "analysis approach",
    "statistical_approach": "statistics used",
    "expected_results": "anticipated findings",
    "potential_pitfalls": "possible problems",
    "alternative_approaches": "backup plans"
  },
  "m7_regulatory": {
    "human_subjects_involved": true/false,
    "vertebrate_animals_involved": true/false,
    "biohazards_involved": true/false,
    "facilities_description": "lab/facility details"
  }
}

Only include fields where you found clear, relevant content in the document. Do not fabricate or guess content.`;

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
          { role: 'user', content: `Parse this grant document and extract content into the appropriate modules:\n\n${textContent}` }
        ],
        temperature: 0.1,
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
