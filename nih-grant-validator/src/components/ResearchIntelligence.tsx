import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  Search, 
  ExternalLink, 
  Calendar, 
  DollarSign, 
  User, 
  BookOpen, 
  FlaskConical, 
  Building2, 
  FileText,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertCircle,
  Clock,
  Tag,
  ArrowLeft
} from 'lucide-react'
import type { ProjectSchemaV2 } from '../types'

interface ResearchIntelligenceProps {
  project: ProjectSchemaV2 | null
  onBack: () => void
}

// Types for API responses
interface PubMedArticle {
  pmid: string
  title: string
  authors: string[]
  journal: string
  year: string
  abstract: string
  link: string
}

interface NIHGrant {
  projectNumber: string
  projectTitle: string
  piName: string
  allPIs: string[]
  institute: string
  fiscalYear: string | number
  fundingAmount: number
  abstractText: string
  activityCode: string
  link: string
}

interface GrantsGovOpportunity {
  opportunityNumber: string
  opportunityTitle: string
  agency: string
  closingDate: string
  openingDate: string
  status: string
  isSBIRSTTR: boolean
  link: string
}

interface ClinicalTrial {
  nctNumber: string
  briefTitle: string
  officialTitle: string
  phase: string
  overallStatus: string
  leadSponsor: string
  conditions: string[]
  interventions: string[]
  briefSummary: string
  link: string
}

interface PanelState<T> {
  data: T[]
  loading: boolean
  error: string | null
  totalCount: number
}

const SUPABASE_URL = 'https://dvuhtfzsvcacyrlfettz.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dWh0ZnpzdmNhY3lybGZldHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDk3OTYsImV4cCI6MjA4NTIyNTc5Nn0.vUtnPXeQrzU0kO0E7qK2qJtZ_RCqnXCEFSa60adHld0'

export function ResearchIntelligence({ project, onBack }: ResearchIntelligenceProps) {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [useProjectContext, setUseProjectContext] = useState(!!project)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Panel states
  const [pubmed, setPubmed] = useState<PanelState<PubMedArticle>>({ data: [], loading: false, error: null, totalCount: 0 })
  const [nihReporter, setNihReporter] = useState<PanelState<NIHGrant>>({ data: [], loading: false, error: null, totalCount: 0 })
  const [grantsGov, setGrantsGov] = useState<PanelState<GrantsGovOpportunity>>({ data: [], loading: false, error: null, totalCount: 0 })
  const [clinicalTrials, setClinicalTrials] = useState<PanelState<ClinicalTrial>>({ data: [], loading: false, error: null, totalCount: 0 })

  // Expanded abstracts tracking
  const [expandedPubmed, setExpandedPubmed] = useState<Set<string>>(new Set())
  const [expandedTrials, setExpandedTrials] = useState<Set<string>>(new Set())

  // Generate context-aware query from project
  const generateProjectQuery = useCallback((): string => {
    if (!project) return ''
    
    const terms: string[] = []
    
    // Disease area / therapeutic area
    if (project.m1_title_concept?.therapeutic_area) {
      terms.push(project.m1_title_concept.therapeutic_area)
    }
    
    // Technology type
    if (project.m1_title_concept?.technology_type) {
      terms.push(project.m1_title_concept.technology_type)
    }
    
    // Target population
    if (project.m1_title_concept?.target_population) {
      terms.push(project.m1_title_concept.target_population)
    }
    
    // Problem statement keywords
    if (project.m1_title_concept?.problem_statement) {
      const keywords = project.m1_title_concept.problem_statement
        .split(/\s+/)
        .filter(w => w.length > 5)
        .slice(0, 2)
      terms.push(...keywords)
    }
    
    // Central hypothesis keywords
    if (project.m2_hypothesis?.central_hypothesis) {
      const keywords = project.m2_hypothesis.central_hypothesis
        .split(/\s+/)
        .filter(w => w.length > 6)
        .slice(0, 2)
      terms.push(...keywords)
    }

    // Institute
    if (project.institute && project.institute !== 'Standard NIH') {
      terms.push(project.institute)
    }

    // Deduplicate and limit
    const uniqueTerms = [...new Set(terms.filter(t => t))].slice(0, 5)
    return uniqueTerms.join(' ')
  }, [project])

  // Fetch function for each API
  const fetchData = useCallback(async (endpoint: string, keyword: string) => {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ keyword, maxResults: 20 })
    })
    
    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error?.message || 'API request failed')
    }
    return result.data
  }, [])

  // Search all APIs
  const performSearch = useCallback(async (keyword: string) => {
    if (!keyword.trim()) return
    
    setActiveSearch(keyword)

    // Reset all panels to loading state
    setPubmed(prev => ({ ...prev, loading: true, error: null }))
    setNihReporter(prev => ({ ...prev, loading: true, error: null }))
    setGrantsGov(prev => ({ ...prev, loading: true, error: null }))
    setClinicalTrials(prev => ({ ...prev, loading: true, error: null }))

    // Fetch PubMed
    fetchData('intel-pubmed', keyword)
      .then(data => setPubmed({ data: data.articles || [], loading: false, error: null, totalCount: data.totalCount || 0 }))
      .catch(err => setPubmed(prev => ({ ...prev, loading: false, error: 'External data temporarily unavailable' })))

    // Fetch NIH RePORTER
    fetchData('intel-nih-reporter', keyword)
      .then(data => setNihReporter({ data: data.grants || [], loading: false, error: null, totalCount: data.totalCount || 0 }))
      .catch(err => setNihReporter(prev => ({ ...prev, loading: false, error: 'External data temporarily unavailable' })))

    // Fetch Grants.gov
    fetchData('intel-grants-gov', keyword)
      .then(data => setGrantsGov({ data: data.opportunities || [], loading: false, error: null, totalCount: data.totalCount || 0 }))
      .catch(err => setGrantsGov(prev => ({ ...prev, loading: false, error: 'External data temporarily unavailable' })))

    // Fetch Clinical Trials
    fetchData('intel-clinical-trials', keyword)
      .then(data => setClinicalTrials({ data: data.trials || [], loading: false, error: null, totalCount: data.totalCount || 0 }))
      .catch(err => setClinicalTrials(prev => ({ ...prev, loading: false, error: 'External data temporarily unavailable' })))
  }, [fetchData])

  // Debounced search
  const handleSearchInput = useCallback((value: string) => {
    setSearchKeyword(value)
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    
    debounceRef.current = setTimeout(() => {
      if (value.trim()) {
        performSearch(value)
      }
    }, 500)
  }, [performSearch])

  // Initial search with project context
  useEffect(() => {
    if (useProjectContext && project) {
      const contextQuery = generateProjectQuery()
      if (contextQuery) {
        setSearchKeyword(contextQuery)
        performSearch(contextQuery)
      }
    }
  }, []) // Only run on mount

  // Toggle project context
  const handleContextToggle = () => {
    const newValue = !useProjectContext
    setUseProjectContext(newValue)
    
    if (newValue && project) {
      const contextQuery = generateProjectQuery()
      if (contextQuery) {
        setSearchKeyword(contextQuery)
        performSearch(contextQuery)
      }
    }
  }

  // Format date helper
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return 'N/A'
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  // Format currency helper
  const formatCurrency = (amount: number): string => {
    if (!amount) return 'N/A'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
  }

  // Error State Component
  const ErrorState = ({ message }: { message: string }) => (
    <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
      <AlertCircle className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm">{message}</span>
    </div>
  )

  // Loading State Component
  const LoadingState = () => (
    <div className="flex items-center justify-center p-8">
      <RefreshCw className="w-6 h-6 text-primary-500 animate-spin" />
    </div>
  )

  // Empty State Component
  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-8 text-neutral-500">
      <p className="text-sm">{message}</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-200">
        <div className="h-16 flex items-center px-4 md:px-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors mr-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium hidden sm:inline">Back</span>
          </button>
          
          <div className="flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-primary-500" />
            <h1 className="text-lg font-semibold text-neutral-900">Research Intelligence</h1>
          </div>

          {project && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-neutral-500 hidden md:inline">Context-aware search:</span>
              <button
                onClick={handleContextToggle}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  useProjectContext 
                    ? 'bg-primary-100 text-primary-700 border border-primary-200' 
                    : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                }`}
              >
                {useProjectContext ? 'Using Project Context' : 'Manual Search'}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Search Bar */}
      <div className="bg-white border-b border-neutral-200 px-4 md:px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="Enter keywords to search across all research databases..."
              className="w-full pl-12 pr-4 py-3 border border-neutral-200 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          {activeSearch && (
            <p className="mt-2 text-xs text-neutral-500">
              Showing results for: <span className="font-medium text-neutral-700">"{activeSearch}"</span>
            </p>
          )}
        </div>
      </div>

      {/* Main Content - 4 Panels */}
      <div className="p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Panel A: Live Funding (Grants.gov) */}
          <div className="bg-white rounded-lg border border-neutral-200 shadow-card overflow-hidden">
            <div className="px-4 py-3 bg-green-50 border-b border-green-100">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <h2 className="font-semibold text-green-900">Live Funding Opportunities</h2>
                <span className="ml-auto text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">Grants.gov</span>
              </div>
            </div>
            <div className="p-4 max-h-[500px] overflow-y-auto">
              {grantsGov.loading ? (
                <LoadingState />
              ) : grantsGov.error ? (
                <ErrorState message={grantsGov.error} />
              ) : grantsGov.data.length === 0 ? (
                <EmptyState message="No funding opportunities found. Try different keywords." />
              ) : (
                <div className="space-y-3">
                  {grantsGov.data.map((opp) => (
                    <div key={opp.opportunityNumber} className="p-3 bg-neutral-50 rounded-lg border border-neutral-100 hover:border-green-200 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-sm font-medium text-neutral-900 line-clamp-2">{opp.opportunityTitle}</h3>
                        {opp.isSBIRSTTR && (
                          <span className="flex-shrink-0 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium">
                            SBIR/STTR
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {opp.agency}
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <Tag className="w-3 h-3" />
                          {opp.opportunityNumber}
                        </span>
                        <span className="flex items-center gap-1 text-amber-600 font-medium">
                          <Calendar className="w-3 h-3" />
                          Closes: {formatDate(opp.closingDate)}
                        </span>
                      </div>
                      <a
                        href={opp.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
                      >
                        View Details <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Panel B: Funded Grants (NIH RePORTER) */}
          <div className="bg-white rounded-lg border border-neutral-200 shadow-card overflow-hidden">
            <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-blue-900">Funded Grants</h2>
                <span className="ml-auto text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">NIH RePORTER</span>
              </div>
            </div>
            <div className="p-4 max-h-[500px] overflow-y-auto">
              {nihReporter.loading ? (
                <LoadingState />
              ) : nihReporter.error ? (
                <ErrorState message={nihReporter.error} />
              ) : nihReporter.data.length === 0 ? (
                <EmptyState message="No funded grants found. Try different keywords." />
              ) : (
                <div className="space-y-3">
                  {nihReporter.data.map((grant) => (
                    <div key={grant.projectNumber} className="p-3 bg-neutral-50 rounded-lg border border-neutral-100 hover:border-blue-200 transition-colors">
                      <h3 className="text-sm font-medium text-neutral-900 line-clamp-2 mb-2">{grant.projectTitle}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 mb-2">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {grant.piName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {grant.institute}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          FY {grant.fiscalYear}
                        </span>
                        <span className="flex items-center gap-1 text-green-600 font-medium">
                          <DollarSign className="w-3 h-3" />
                          {formatCurrency(grant.fundingAmount)}
                        </span>
                      </div>
                      {grant.abstractText && (
                        <p className="text-xs text-neutral-600 line-clamp-2 mb-2">{grant.abstractText}</p>
                      )}
                      <a
                        href={grant.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
                      >
                        View in RePORTER <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Panel C: Literature (PubMed) */}
          <div className="bg-white rounded-lg border border-neutral-200 shadow-card overflow-hidden">
            <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-600" />
                <h2 className="font-semibold text-amber-900">Scientific Literature</h2>
                <span className="ml-auto text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded">PubMed</span>
              </div>
            </div>
            <div className="p-4 max-h-[500px] overflow-y-auto">
              {pubmed.loading ? (
                <LoadingState />
              ) : pubmed.error ? (
                <ErrorState message={pubmed.error} />
              ) : pubmed.data.length === 0 ? (
                <EmptyState message="No literature found. Try different keywords." />
              ) : (
                <div className="space-y-3">
                  {pubmed.data.map((article) => (
                    <div key={article.pmid} className="p-3 bg-neutral-50 rounded-lg border border-neutral-100 hover:border-amber-200 transition-colors">
                      <h3 className="text-sm font-medium text-neutral-900 line-clamp-2 mb-2">{article.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 mb-2">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {article.authors.slice(0, 2).join(', ')}{article.authors.length > 2 ? ' et al.' : ''}
                        </span>
                        <span className="italic">{article.journal}</span>
                        <span>{article.year}</span>
                        <span className="font-mono text-primary-600">PMID: {article.pmid}</span>
                      </div>
                      {article.abstract && (
                        <div className="mb-2">
                          <button
                            onClick={() => {
                              const newExpanded = new Set(expandedPubmed)
                              if (newExpanded.has(article.pmid)) {
                                newExpanded.delete(article.pmid)
                              } else {
                                newExpanded.add(article.pmid)
                              }
                              setExpandedPubmed(newExpanded)
                            }}
                            className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700"
                          >
                            {expandedPubmed.has(article.pmid) ? (
                              <>
                                <ChevronUp className="w-3 h-3" /> Hide abstract
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3 h-3" /> Show abstract
                              </>
                            )}
                          </button>
                          {expandedPubmed.has(article.pmid) && (
                            <p className="mt-2 text-xs text-neutral-600 bg-white p-2 rounded border border-neutral-100">
                              {article.abstract}
                            </p>
                          )}
                        </div>
                      )}
                      <a
                        href={article.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
                      >
                        View on PubMed <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Panel D: Clinical Trials */}
          <div className="bg-white rounded-lg border border-neutral-200 shadow-card overflow-hidden">
            <div className="px-4 py-3 bg-purple-50 border-b border-purple-100">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-purple-600" />
                <h2 className="font-semibold text-purple-900">Clinical Trials</h2>
                <span className="ml-auto text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded">ClinicalTrials.gov</span>
              </div>
            </div>
            <div className="p-4 max-h-[500px] overflow-y-auto">
              {clinicalTrials.loading ? (
                <LoadingState />
              ) : clinicalTrials.error ? (
                <ErrorState message={clinicalTrials.error} />
              ) : clinicalTrials.data.length === 0 ? (
                <EmptyState message="No clinical trials found. Try different keywords." />
              ) : (
                <div className="space-y-3">
                  {clinicalTrials.data.map((trial) => (
                    <div key={trial.nctNumber} className="p-3 bg-neutral-50 rounded-lg border border-neutral-100 hover:border-purple-200 transition-colors">
                      <h3 className="text-sm font-medium text-neutral-900 line-clamp-2 mb-2">{trial.briefTitle}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 mb-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {trial.phase}
                        </span>
                        <span className={`px-2 py-0.5 rounded font-medium ${
                          trial.overallStatus === 'Recruiting' 
                            ? 'bg-green-100 text-green-700' 
                            : trial.overallStatus === 'Completed'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-neutral-100 text-neutral-600'
                        }`}>
                          {trial.overallStatus}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {trial.leadSponsor}
                        </span>
                        <span className="font-mono text-purple-600">{trial.nctNumber}</span>
                      </div>
                      {trial.briefSummary && (
                        <div className="mb-2">
                          <button
                            onClick={() => {
                              const newExpanded = new Set(expandedTrials)
                              if (newExpanded.has(trial.nctNumber)) {
                                newExpanded.delete(trial.nctNumber)
                              } else {
                                newExpanded.add(trial.nctNumber)
                              }
                              setExpandedTrials(newExpanded)
                            }}
                            className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700"
                          >
                            {expandedTrials.has(trial.nctNumber) ? (
                              <>
                                <ChevronUp className="w-3 h-3" /> Hide summary
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3 h-3" /> Show summary
                              </>
                            )}
                          </button>
                          {expandedTrials.has(trial.nctNumber) && (
                            <p className="mt-2 text-xs text-neutral-600 bg-white p-2 rounded border border-neutral-100">
                              {trial.briefSummary}
                            </p>
                          )}
                        </div>
                      )}
                      <a
                        href={trial.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
                      >
                        View on ClinicalTrials.gov <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Footer Note */}
      <div className="px-4 md:px-6 py-4 text-center">
        <p className="text-xs text-neutral-400">
          Data sourced from public APIs. Results are read-only and for research purposes.
          Last search: {activeSearch ? new Date().toLocaleTimeString() : 'N/A'}
        </p>
      </div>
    </div>
  )
}
