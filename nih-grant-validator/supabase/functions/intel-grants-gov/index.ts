// Intel Grants.gov Edge Function
// Fetches live funding opportunities from Grants.gov API

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const cache: Map<string, CacheEntry> = new Map();
const CACHE_TTL = 1 * 60 * 60 * 1000; // 1 hour in milliseconds (more frequent updates for live opportunities)

function getCacheKey(keyword: string, filters: Record<string, unknown>): string {
  return `grants:${keyword}:${JSON.stringify(filters)}`;
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

function isSBIRSTTR(opportunity: Record<string, unknown>): boolean {
  const title = ((opportunity.title || opportunity.opportunityTitle || '') as string).toLowerCase();
  const number = ((opportunity.number || opportunity.opportunityNumber || '') as string).toLowerCase();
  const category = ((opportunity.category || opportunity.fundingCategory || '') as string).toLowerCase();
  
  return title.includes('sbir') || 
         title.includes('sttr') ||
         number.includes('sbir') ||
         number.includes('sttr') ||
         category.includes('sbir') ||
         category.includes('sttr');
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

    // Build Grants.gov API request
    const baseUrl = 'https://api.grants.gov/v1/api/search2';
    
    // Build search parameters
    const searchParams: Record<string, unknown> = {
      keyword: keyword,
      oppStatuses: 'forecasted|posted',
      sortBy: 'closeDate|asc',
      rows: maxResults * 2 // Fetch more to filter for relevant results
    };

    // Apply agency filter for NIH
    if (filters.agency) {
      searchParams.agencies = filters.agency;
    } else {
      // Default to HHS (includes NIH)
      searchParams.agencies = 'HHS';
    }

    // Build query string
    const queryString = Object.entries(searchParams)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');

    const apiUrl = `${baseUrl}?${queryString}`;

    const response = await fetchWithRetry(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Grants.gov API error:', errorText);
      throw new Error(`Grants.gov API failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform and filter results
    const rawOpportunities = data.oppHits || data.opportunities || [];
    
    const opportunities = rawOpportunities
      .map((opp: Record<string, unknown>) => {
        const closeDate = (opp.closeDate || opp.closingDate || '') as string;
        const openDate = (opp.openDate || opp.openingDate || '') as string;
        
        return {
          opportunityNumber: opp.number || opp.opportunityNumber || '',
          opportunityTitle: opp.title || opp.opportunityTitle || '',
          agency: opp.agency || opp.agencyName || 'HHS',
          closingDate: closeDate,
          openingDate: openDate,
          status: opp.oppStatus || opp.status || 'posted',
          fundingInstrumentType: opp.fundingInstrument || opp.fundingInstrumentType || '',
          categoryDescription: opp.category?.description || opp.categoryDescription || '',
          awardCeiling: opp.awardCeiling || 0,
          awardFloor: opp.awardFloor || 0,
          isSBIRSTTR: isSBIRSTTR(opp),
          link: `https://www.grants.gov/search-results-detail/${opp.id || opp.opportunityId || ''}`
        };
      })
      .filter((opp: Record<string, unknown>) => {
        // Filter for opportunities with closing dates in the future
        if (opp.closingDate) {
          const closeDate = new Date(opp.closingDate as string);
          if (closeDate < new Date()) return false;
        }
        return true;
      })
      .slice(0, maxResults);

    // Sort by closing date ascending
    opportunities.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      const dateA = new Date(a.closingDate as string || '9999-12-31');
      const dateB = new Date(b.closingDate as string || '9999-12-31');
      return dateA.getTime() - dateB.getTime();
    });

    const result = {
      opportunities,
      totalCount: data.hitCount || opportunities.length
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
    console.error('Intel Grants.gov error:', error);
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
