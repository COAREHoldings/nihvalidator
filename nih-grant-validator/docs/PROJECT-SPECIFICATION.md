# NIH Grant Validator - Complete Project Specification

## Product Vision / Original Prompt

### What to Tell an AI to Build This Application

```
Build a comprehensive NIH SBIR/STTR Grant Writing and Validation Platform with the following capabilities:

**Core Purpose:**
A web application that guides biotech/life science startups through the entire NIH SBIR/STTR grant proposal process, from initial concept through submission-ready documents. The system must enforce NIH compliance rules, provide AI-assisted content generation, and validate proposals against agency requirements.

**Grant Types Supported:**
- Phase I (initial feasibility)
- Phase II (full development, following successful Phase I)
- Fast Track (combined Phase I + II in single application)
- Direct to Phase II (skip Phase I with sufficient preliminary data)
- Phase IIB (continuation funding after Phase II)

**Program Types:**
- SBIR (Small Business Innovation Research) - small business performs majority of work
- STTR (Small Business Technology Transfer) - requires research institution partnership

**Key Features:**

1. **Project Creation Wizard**
   - Select program type (SBIR/STTR)
   - Select grant type (Phase I, II, Fast Track, Direct to Phase II, Phase IIB)
   - Select target NIH Institute (NCI, NHLBI, NIAID, etc.) - each has different budget caps
   - Configure FOA (Funding Opportunity Announcement) options
   - Indicate if clinical trial is involved

2. **Modular Grant Editor (9 Modules)**
   - M1: Title & Concept Clarity (project title, lay summary, scientific abstract, problem statement, solution, target population, therapeutic area, technology type)
   - M2: Hypothesis Development (central hypothesis, rationale, preliminary data, expected outcomes, success criteria)
   - M3: Specific Aims (3 aims with milestones, timeline, interdependencies)
   - M4: Team Mapping (PI qualifications, key personnel, collaborators, consultants)
   - M5: Experimental Approach (methodology, experimental design, data collection, analysis plan, statistics, pitfalls, alternatives)
   - M6: Budget & Justification (full NIH budget calculator with personnel, equipment, supplies, travel, subawards, F&A rates, SBIR/STTR percentage allocations)
   - M7: Regulatory & Supporting (human subjects, animal research, biohazards, IRB/IACUC approvals, facilities)
   - M8: Compilation & Review (validation dashboard, compliance checking, export)
   - M9: Commercialization Director (NIH's 6-section commercialization plan for Phase II/Fast Track)

3. **AI-Powered Features**
   - Generate project titles from lay summary
   - Generate Specific Aims Page (formal NIH document)
   - Generate full grant documents (Research Strategy, Approach sections)
   - AI refinement/rewriting of any section
   - Compliance audit with AI analysis
   - Real-time validation against NIH requirements

4. **Research Intelligence Dashboard**
   - Search NIH Reporter (funded grants database)
   - Search PubMed (scientific literature)
   - Search ClinicalTrials.gov
   - Search Grants.gov (open funding opportunities)

5. **Compliance System (8-Layer Architecture)**
   - Layer 1: Clinical Trial Flag (determines required forms)
   - Layer 2: Grant Type Logic (Phase I vs II requirements)
   - Layer 3: Lifecycle Transitions (Phase I → Phase II progression)
   - Layer 4: Module Dependencies (which sections unlock others)
   - Layer 5: FOA Parsing (extract requirements from funding announcements)
   - Layer 6: Claim Control (flag unsubstantiated claims like "novel", "first")
   - Layer 7: Audit Trail (track all compliance checks and revisions)
   - Layer 8: Export Gating (block export until compliance score meets threshold)

6. **Budget Calculator**
   - Institute-specific budget caps (NCI: $400K Phase I, $3M Phase II; Standard NIH: $300K/$2M)
   - Automatic MTDC (Modified Total Direct Costs) calculation
   - F&A (Indirect) cost calculation
   - SBIR minimum 67% small business allocation
   - STTR minimum 40% small business / 30% research institution
   - Sub-award and vendor tracking
   - Fee/profit calculation option

7. **Grant Summary & Export**
   - Compile all sections into viewable preview
   - Inline editing of compiled document
   - Export to PDF and Word formats
   - Section-by-section or full document export

8. **User Management**
   - User authentication (email/password)
   - Project persistence (save/load)
   - Multiple projects per user
   - Auto-save with 2-second debounce

**Technical Stack:**
- Frontend: React + TypeScript + Vite + TailwindCSS + shadcn/ui
- Backend: Supabase (PostgreSQL + Auth + Edge Functions)
- AI: OpenAI GPT-4 via Supabase Edge Functions
- Export: docx library for Word, PDF generation

**Design Requirements:**
- Modern, clean UI with sidebar navigation
- Step-by-step wizard for project creation
- Progress tracking across modules
- Real-time validation indicators
- Responsive design

**NIH-Specific Requirements:**
- Verbatim NIH commercialization section headings
- Page limits per section (12 pages for commercialization plan)
- ~550 words per page standard
- Specific Aims Page format (1 page limit)
- Research Strategy format requirements
```

---

## Competitive Landscape Analysis

### Direct Competitors

#### 1. **Scout Grants** (scoutgrants.ai) - MOST RELEVANT
- **Focus:** SBIR/STTR specifically (same target market)
- **Pricing:** Not publicly disclosed (premium positioning)
- **Strengths:**
  - Built specifically for federal grants (NIH, NSF, DoD)
  - Expert human review integrated
  - Compliance guardrails built-in
  - Claims 20x faster, 30% cost reduction, 10x win rate
  - End-to-end support (discovery → submission → post-award)
- **Weaknesses:**
  - Likely expensive (consulting-level pricing)
  - Less DIY-friendly
- **Differentiation vs. Our Tool:**
  - Scout = AI + Human Expert hybrid
  - Our Tool = Self-service with AI assistance

#### 2. **Grant Assistant** (grantassistant.ai)
- **Focus:** Nonprofits, Higher Ed, International Development
- **Pricing:** Demo-based (enterprise pricing)
- **Strengths:**
  - Trained on 7,000+ winning proposals
  - Semantic AI for voice matching
  - Claims 50-90% time reduction
- **Weaknesses:**
  - NOT focused on SBIR/STTR
  - Less compliance-focused
- **Differentiation:** Different market segment (nonprofits vs. biotech startups)

#### 3. **Grantboost** (grantboost.io)
- **Focus:** General nonprofit grant writing
- **Pricing:** Free tier, $19.99/mo Pro
- **Strengths:**
  - Affordable
  - Memory that learns your style
  - 5,000+ teams use it
- **Weaknesses:**
  - Generic, not SBIR/STTR specific
  - No compliance validation
- **Differentiation:** We're specialized; they're general purpose

#### 4. **Instrumentl**
- **Focus:** Grant discovery and tracking
- **Pricing:** $179/mo
- **Strengths:**
  - 400,000+ funder database
  - Great for finding opportunities
- **Weaknesses:**
  - NOT a writing tool
  - No proposal generation
- **Differentiation:** We help WRITE grants; they help FIND them

### General AI Writing Tools (Indirect Competitors)
| Tool | Price | Grant-Specific | Compliance |
|------|-------|----------------|------------|
| ChatGPT | $20/mo | No | No |
| Claude | $17/mo | No | No |
| Jasper | $39/mo | No | No |
| Copy.ai | $49/mo | No | No |

### Competitive Positioning Matrix

```
                    HIGH COMPLIANCE FOCUS
                           ↑
                           |
    Scout Grants ●         |         ● OUR TOOL
    (Expert + AI)          |         (Self-Service + AI)
                           |
    ←─────────────────────────────────────────────────→
    CONSULTING-LED         |         SELF-SERVICE
                           |
    Grant Assistant ●      |         ● Grantboost
    (Nonprofits)           |         (Generic)
                           |
                           ↓
                    LOW COMPLIANCE FOCUS
```

### Our Unique Value Proposition

**"The only self-service SBIR/STTR grant writing platform with NIH-specific compliance validation"**

1. **NIH-Specific:** Built ground-up for NIH SBIR/STTR (not adapted from nonprofit tools)
2. **Self-Service:** Founders can use directly without hiring consultants
3. **Compliance-First:** 8-layer compliance system validates against actual NIH rules
4. **Full Lifecycle:** Supports Phase I → II → IIB progression
5. **Affordable:** Not consultant pricing

### Market Opportunity

- SBIR/STTR programs award ~$4B annually
- NIH alone awards ~$1.2B in SBIR/STTR
- ~2,500 new SBIR/STTR awards per year from NIH
- Most startups either: (a) hire consultants ($10-50K), or (b) struggle with DIY
- Gap: No affordable, self-service, compliance-focused tool exists

---

## Technical Architecture Summary

### Frontend Structure
```
src/
├── App.tsx                    # Main app with routing/state
├── types.ts                   # Full TypeScript schema (780+ lines)
├── validation.ts              # Validation logic
├── contexts/
│   └── AuthContext.tsx        # User authentication state
├── components/
│   ├── auth/                  # Login/signup screens
│   ├── dashboard/             # Project list, dashboard
│   ├── editor/                # Grant editor components
│   │   ├── GrantEditor.tsx    # Main editor wrapper
│   │   ├── StepSetup.tsx      # M1: Title & Concept
│   │   ├── StepCoreConcept.tsx # M2-M3: Hypothesis, Aims
│   │   ├── StepTeam.tsx       # M4: Team
│   │   ├── StepResearchPlan.tsx # M5: Experimental Approach
│   │   ├── StepBudget.tsx     # M6: Budget Calculator
│   │   ├── StepReview.tsx     # M8: Review & Export
│   │   └── GrantSummary.tsx   # Compiled document view
│   ├── layout/                # Sidebar, navigation
│   └── shared/                # Reusable components
├── services/
│   └── projectService.ts      # Supabase CRUD operations
├── lib/
│   ├── supabase.ts            # Supabase client
│   └── docxGenerator.ts       # Word document export
└── compliance/
    ├── complianceConfig.ts    # NIH rules configuration
    └── complianceAudit.ts     # Audit logic
```

### Backend (Supabase Edge Functions)
```
supabase/functions/
├── _shared/                   # Shared utilities
├── ai-refine/                 # Rewrite/improve sections
├── audit-comprehensive/       # Full compliance audit
├── audit-document/            # Document-level audit
├── audit-grant/               # Grant-level audit
├── generate-aims-page/        # Specific Aims generation
├── generate-document/         # Full document generation
├── intel-clinical-trials/     # ClinicalTrials.gov search
├── intel-grants-gov/          # Grants.gov search
├── intel-nih-reporter/        # NIH Reporter search
├── intel-pubmed/              # PubMed search
├── parse-document/            # Document parsing
├── parse-foa/                 # FOA parsing
└── rewrite-section/           # Section rewriting
```

### Database Schema
```sql
-- Main projects table
projects (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  data JSONB,  -- Full ProjectSchemaV2 object
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

---

## GitHub Repository

**Repository:** https://github.com/COAREHoldings/validator.git

**Branch:** master

**Last Push:** February 2026

---

## Key Dependencies

```json
{
  "react": "^18.x",
  "typescript": "^5.x",
  "vite": "^5.x",
  "tailwindcss": "^3.x",
  "@supabase/supabase-js": "^2.x",
  "docx": "^8.x",
  "lucide-react": "^0.x",
  "@radix-ui/*": "various"
}
```

---

## Environment Variables Required

```env
VITE_SUPABASE_URL=https://dvuhtfzsvcacyrlfettz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## Deployment

**Live URL:** Deployed via Matrix Agent deployment system

**Build Command:** `pnpm build`

**Output Directory:** `dist/`
