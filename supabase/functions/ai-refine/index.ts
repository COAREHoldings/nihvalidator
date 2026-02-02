Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const { action, text, sectionType, grantType } = await req.json();

        if (!action || !text) {
            throw new Error('Action and text are required');
        }

        const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
        if (!openaiApiKey) {
            throw new Error('OpenAI API key not configured');
        }

        let systemPrompt = '';
        let userPrompt = '';

        switch (action) {
            case 'refine':
                systemPrompt = `You are an expert NIH SBIR/STTR grant writing consultant. Analyze the provided grant section and provide specific, actionable improvement suggestions. Focus on:
- Clarity and conciseness
- Scientific rigor and innovation emphasis
- Alignment with NIH review criteria (Significance, Innovation, Approach)
- Proper structure for the section type
- Persuasive language without overpromising

Format your response as JSON with:
- "summary": Brief overall assessment (2-3 sentences)
- "strengths": Array of 2-3 strong points
- "improvements": Array of specific suggestions with "issue" and "suggestion" fields
- "revisedExcerpt": A sample revised version of the weakest paragraph`;
                userPrompt = `Section Type: ${sectionType || 'General'}\nGrant Type: ${grantType || 'Phase I'}\n\nContent to analyze:\n${text}`;
                break;

            case 'compliance':
                systemPrompt = `You are an NIH SBIR/STTR compliance expert. Review the text for:
1. Prohibited language (funding guarantees, certainty statements like "will definitely", "guaranteed success")
2. Inappropriate claims or overstatements
3. Budget-related compliance issues mentioned in narrative
4. Missing required elements for the section type

Format response as JSON:
- "compliant": boolean
- "issues": Array of {"text": flagged text, "problem": why it's problematic, "suggestion": how to fix}
- "overallRisk": "low" | "medium" | "high"`;
                userPrompt = `Grant Type: ${grantType || 'Phase I'}\nSection: ${sectionType || 'General'}\n\nText to review:\n${text}`;
                break;

            case 'reviewer':
                systemPrompt = `You are simulating an NIH study section reviewer evaluating an SBIR/STTR application. Provide a realistic mock review following NIH criteria.

Consider these review criteria:
- Significance: Does the project address an important problem?
- Innovation: Does it employ novel concepts or approaches?
- Approach: Is the methodology well-reasoned and feasible?
- Investigator(s): Are they qualified?
- Environment: Is the scientific environment appropriate?

Format response as JSON:
- "overallImpression": 1-2 paragraph summary
- "significance": {"score": 1-9, "strengths": [], "weaknesses": []}
- "innovation": {"score": 1-9, "strengths": [], "weaknesses": []}
- "approach": {"score": 1-9, "strengths": [], "weaknesses": []}
- "additionalComments": Any other observations`;
                userPrompt = `Grant Type: ${grantType || 'Phase I'}\nSection: ${sectionType || 'Specific Aims'}\n\nContent:\n${text}`;
                break;

            case 'score':
                systemPrompt = `You are an experienced NIH grant reviewer. Based on the provided text, estimate a likely impact score (1-9 scale, where 1 is exceptional and 9 is poor).

Consider:
- NIH scoring: 1 (Exceptional), 2 (Outstanding), 3 (Excellent), 4 (Very Good), 5 (Good), 6 (Satisfactory), 7 (Fair), 8 (Marginal), 9 (Poor)
- SBIR/STTR specific: commercialization potential, small business involvement, innovation

Format response as JSON:
- "predictedScore": number 1-9
- "confidence": "low" | "medium" | "high"
- "rationale": Detailed explanation of score
- "scoringFactors": {"positive": [], "negative": []}
- "improvementPotential": How much the score could improve with revisions`;
                userPrompt = `Grant Type: ${grantType || 'Phase I'}\nSection: ${sectionType || 'Specific Aims'}\n\nContent to score:\n${text}`;
                break;

            default:
                throw new Error(`Unknown action: ${action}`);
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API error: ${errorText}`);
        }

        const result = await response.json();
        const content = result.choices[0]?.message?.content;

        if (!content) {
            throw new Error('No response from OpenAI');
        }

        const parsed = JSON.parse(content);

        return new Response(JSON.stringify({ data: parsed }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('AI Refine error:', error);
        return new Response(JSON.stringify({
            error: { code: 'AI_REFINE_ERROR', message: error.message }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
