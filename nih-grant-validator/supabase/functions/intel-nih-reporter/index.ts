// Intel NIH RePORTER Edge Function
// Fetches funded grants data from NIH RePORTER API v2

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const cache: Map<string, CacheEntry> = new Map();
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

function getCacheKey(keyword: string, filters: Record<string, unknown>): string {
  return `reporter:${keyword}:${JSON.stringify(filters)}`;
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

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 2): Promise<Response> {
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

    // Build NIH RePORTER API request
    const apiUrl = 'https://api.reporter.nih.gov/v2/projects/search';
    
    // Build criteria object
    const criteria: Record<string, unknown> = {
      advanced_text_search: {
        operator: 'and',
        search_field: 'all',
        search_text: keyword
      },
      exclude_subprojects: true,
      include_active_projects: true
    };

    // Apply filters
    if (filters.fiscalYears && Array.isArray(filters.fiscalYears)) {
      criteria.fiscal_years = filters.fiscalYears;
    } else {
      // Default to recent years
      const currentYear = new Date().getFullYear();
      criteria.fiscal_years = [currentYear, currentYear - 1, currentYear - 2];
    }

    if (filters.institute) {
      criteria.agencies = [filters.institute];
    }

    if (filters.activityCodes) {
      criteria.activity_codes = filters.activityCodes;
    }

    const requestBody = {
      criteria,
      offset: 0,
      limit: maxResults,
      sort_field: 'project_start_date',
      sort_order: 'desc'
    };

    const response = await fetchWithRetry(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('NIH RePORTER API error:', errorText);
      throw new Error(`NIH RePORTER API failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform results
    const grants = (data.results || []).map((project: Record<string, unknown>) => {
      const piNames = ((project.principal_investigators as Array<Record<string, string>>) || [])
        .map(pi => pi.full_name || `${pi.first_name || ''} ${pi.last_name || ''}`.trim())
        .filter(name => name);

      return {
        projectNumber: project.project_num || '',
        projectTitle: project.project_title || '',
        piName: piNames.length > 0 ? piNames[0] : 'Unknown PI',
        allPIs: piNames,
        institute: (project.agency_ic_fundings as Array<Record<string, string>>)?.[0]?.abbreviation || project.agency_code || '',
        fiscalYear: project.fiscal_year || '',
        fundingAmount: project.award_amount || 0,
        projectStartDate: project.project_start_date || '',
        projectEndDate: project.project_end_date || '',
        abstractText: ((project.abstract_text as string) || '').substring(0, 500),
        activityCode: project.activity_code || '',
        link: `https://reporter.nih.gov/search/results?query=${encodeURIComponent(project.project_num as string || '')}`
      };
    });

    const result = {
      grants,
      totalCount: data.meta?.total || 0
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
    console.error('Intel NIH RePORTER error:', error);
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
