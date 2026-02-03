// Intel PubMed Edge Function
// Fetches literature data from PubMed E-utilities API

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const cache: Map<string, CacheEntry> = new Map();
const CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

function getCacheKey(keyword: string, filters: Record<string, unknown>): string {
  return `pubmed:${keyword}:${JSON.stringify(filters)}`;
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
  // Remove potentially dangerous characters, keep alphanumeric, spaces, and common punctuation
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

    // Build search query
    const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
    let searchTerm = encodeURIComponent(keyword);
    
    // Apply filters
    if (filters.yearFrom) {
      searchTerm += `+AND+${filters.yearFrom}:${filters.yearTo || '3000'}[pdat]`;
    }
    if (filters.articleType) {
      searchTerm += `+AND+${encodeURIComponent(filters.articleType)}[pt]`;
    }

    // Step 1: Search for PMIDs
    const searchUrl = `${baseUrl}/esearch.fcgi?db=pubmed&term=${searchTerm}&retmax=${maxResults}&retmode=json&sort=relevance`;
    
    const searchResponse = await fetchWithRetry(searchUrl);
    if (!searchResponse.ok) {
      throw new Error(`PubMed search failed: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const pmids = searchData.esearchresult?.idlist || [];

    if (pmids.length === 0) {
      const emptyResult = { articles: [], totalCount: 0 };
      setCache(cacheKey, emptyResult);
      return new Response(JSON.stringify({
        success: true,
        data: emptyResult,
        cached: false,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Step 2: Fetch article details
    const fetchUrl = `${baseUrl}/efetch.fcgi?db=pubmed&id=${pmids.join(',')}&retmode=xml`;
    
    const fetchResponse = await fetchWithRetry(fetchUrl);
    if (!fetchResponse.ok) {
      throw new Error(`PubMed fetch failed: ${fetchResponse.status}`);
    }

    const xmlText = await fetchResponse.text();
    
    // Parse XML using regex (DOMParser not reliable in Deno)
    const articles: Array<{
      pmid: string;
      title: string;
      authors: string[];
      journal: string;
      year: string;
      abstract: string;
      link: string;
    }> = [];

    // Extract article blocks
    const articleMatches = xmlText.match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g) || [];
    
    for (const articleXml of articleMatches) {
      // Extract PMID
      const pmidMatch = articleXml.match(/<PMID[^>]*>(\d+)<\/PMID>/);
      const pmid = pmidMatch ? pmidMatch[1] : '';

      // Extract title
      const titleMatch = articleXml.match(/<ArticleTitle>([^<]*)<\/ArticleTitle>/);
      const title = titleMatch ? titleMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') : '';

      // Extract authors
      const authorMatches = articleXml.match(/<LastName>([^<]*)<\/LastName>\s*<ForeName>([^<]*)<\/ForeName>/g) || [];
      const authors = authorMatches.slice(0, 5).map(match => {
        const lastMatch = match.match(/<LastName>([^<]*)<\/LastName>/);
        const firstMatch = match.match(/<ForeName>([^<]*)<\/ForeName>/);
        return `${lastMatch ? lastMatch[1] : ''} ${firstMatch ? firstMatch[1] : ''}`.trim();
      });

      // Extract journal
      const journalMatch = articleXml.match(/<Title>([^<]*)<\/Title>/);
      const journal = journalMatch ? journalMatch[1] : '';

      // Extract year
      const yearMatch = articleXml.match(/<PubDate>[\s\S]*?<Year>(\d+)<\/Year>/);
      const year = yearMatch ? yearMatch[1] : '';

      // Extract abstract
      const abstractMatch = articleXml.match(/<AbstractText[^>]*>([^<]*)<\/AbstractText>/);
      const abstract = abstractMatch ? abstractMatch[1].substring(0, 500) : '';

      if (pmid && title) {
        articles.push({
          pmid,
          title,
          authors,
          journal,
          year,
          abstract,
          link: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
        });
      }
    }

    const result = {
      articles,
      totalCount: parseInt(searchData.esearchresult?.count || '0', 10)
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
    console.error('Intel PubMed error:', error);
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
