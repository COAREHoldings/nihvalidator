// Intel Clinical Trials Edge Function
// Fetches clinical trials data from ClinicalTrials.gov API v2

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const cache: Map<string, CacheEntry> = new Map();
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

function getCacheKey(keyword: string, filters: Record<string, unknown>): string {
  return `trials:${keyword}:${JSON.stringify(filters)}`;
}

function getFromCache(key: string): unknown | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, timestamp: Date.now() });
}

async function fetchWithRetry(url: string, options: RequestInit = {}, maxRetries = 2): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      if (response.status >= 500) {
        lastError = new Error(`Server error: ${response.status}`);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
      }
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
  
  throw lastError || new Error('Failed to fetch after retries');
}

function sanitizeInput(input: string): string {
  return input.replace(/[<>{}|\\^~\[\]`]/g, '').trim().substring(0, 200);
}

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
    const body = await req.json();
    const keyword = sanitizeInput(body.keyword || '');
    const filters = body.filters || {};
    const maxResults = Math.min(body.maxResults || 20, 20);

    if (!keyword) {
      return new Response(JSON.stringify({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Keyword is required' }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check cache
    const cacheKey = getCacheKey(keyword, filters);
    const cached = getFromCache(cacheKey);
    if (cached) {
      return new Response(JSON.stringify({
        success: true,
        data: cached,
        cached: true,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Build ClinicalTrials.gov API v2 request
    const baseUrl = 'https://clinicaltrials.gov/api/v2/studies';
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.set('query.term', keyword);
    queryParams.set('pageSize', String(maxResults));
    queryParams.set('format', 'json');
    
    // Request specific fields
    queryParams.set('fields', [
      'NCTId',
      'BriefTitle',
      'OfficialTitle',
      'Phase',
      'OverallStatus',
      'LeadSponsorName',
      'Condition',
      'InterventionName',
      'StartDate',
      'CompletionDate',
      'EnrollmentCount',
      'BriefSummary'
    ].join(','));

    // Apply filters
    if (filters.status) {
      queryParams.set('filter.overallStatus', filters.status);
    }
    
    if (filters.phase) {
      queryParams.set('filter.phase', filters.phase);
    }

    // Sort by relevance
    queryParams.set('sort', 'LastUpdatePostDate:desc');

    const apiUrl = `${baseUrl}?${queryParams.toString()}`;

    const response = await fetchWithRetry(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ClinicalTrials.gov API error:', errorText);
      throw new Error(`ClinicalTrials.gov API failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform results
    const studies = data.studies || [];
    
    const trials = studies.map((study: Record<string, unknown>) => {
      const protocolSection = study.protocolSection as Record<string, unknown> || {};
      const identificationModule = protocolSection.identificationModule as Record<string, unknown> || {};
      const statusModule = protocolSection.statusModule as Record<string, unknown> || {};
      const sponsorCollaboratorsModule = protocolSection.sponsorCollaboratorsModule as Record<string, unknown> || {};
      const designModule = protocolSection.designModule as Record<string, unknown> || {};
      const descriptionModule = protocolSection.descriptionModule as Record<string, unknown> || {};
      const conditionsModule = protocolSection.conditionsModule as Record<string, unknown> || {};
      const armsInterventionsModule = protocolSection.armsInterventionsModule as Record<string, unknown> || {};

      const nctId = identificationModule.nctId as string || '';
      const phases = (designModule.phases as string[]) || [];
      const conditions = (conditionsModule.conditions as string[]) || [];
      const interventions = (armsInterventionsModule.interventions as Array<Record<string, string>>) || [];
      
      const leadSponsor = sponsorCollaboratorsModule.leadSponsor as Record<string, string> || {};

      return {
        nctNumber: nctId,
        briefTitle: identificationModule.briefTitle || '',
        officialTitle: identificationModule.officialTitle || '',
        phase: phases.length > 0 ? phases.join(', ') : 'N/A',
        overallStatus: statusModule.overallStatus || 'Unknown',
        leadSponsor: leadSponsor.name || 'Unknown',
        conditions: conditions.slice(0, 3),
        interventions: interventions.slice(0, 3).map(i => i.name || ''),
        startDate: statusModule.startDateStruct?.date || '',
        completionDate: statusModule.completionDateStruct?.date || '',
        enrollmentCount: designModule.enrollmentInfo?.count || 0,
        briefSummary: ((descriptionModule.briefSummary as string) || '').substring(0, 400),
        link: `https://clinicaltrials.gov/study/${nctId}`
      };
    });

    const result = {
      trials,
      totalCount: data.totalCount || trials.length
    };

    setCache(cacheKey, result);

    return new Response(JSON.stringify({
      success: true,
      data: result,
      cached: false,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Intel Clinical Trials error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: {
        code: 'API_ERROR',
        message: 'External data temporarily unavailable'
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
