# Prompt: Build NIH SBIR/STTR Grant Validator Web Application

## Overview

Build a comprehensive web application that helps researchers and entrepreneurs prepare NIH SBIR/STTR grant applications. The app should guide users through all required sections, validate completeness, and provide AI-powered review and refinement tools.

---

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS + shadcn/ui components
- **Backend:** Supabase (Edge Functions for AI features)
- **AI Integration:** OpenAI GPT-4 via Supabase Edge Functions
- **State Management:** React useState/useEffect (no Redux needed)

---

## Application Structure

### 1. Landing Page (Hero)

A clean landing page with:
- App title: "NIH Grant Validator"
- Tagline explaining the purpose (helping prepare SBIR/STTR grants)
- Two main action buttons:
  - "Start Building" → enters Build Mode
  - "Audit Document" → enters Audit Mode (for reviewing existing documents)

### 2. Grant Type Selector

Before entering build mode, users must select their grant type:
- **Phase I** - Initial feasibility study ($275K, 6-12 months)
- **Phase II** - Full R&D ($1.5M-2M, 2 years)
- **Fast-Track** - Combined Phase I + II
- **Direct-to-Phase II** - Skip Phase I (requires prior work)

The selected grant type affects which modules/fields are required.

### 3. Build Mode - Module System

The core of the app is a **9-module system** that covers all required grant sections:

#### Module 1: Project Fundamentals
Required fields:
- Project Title (text)
- Project Summary/Abstract (textarea, 30 lines max)
- Public Health Relevance Statement (textarea)
- Project Narrative (textarea)

#### Module 2: Specific Aims
Required fields:
- Overall Goal (textarea)
- Central Hypothesis (textarea)
- Aim 1: Title, Rationale, Approach, Expected Outcome
- Aim 2: Title, Rationale, Approach, Expected Outcome
- Aim 3 (optional): Title, Rationale, Approach, Expected Outcome
- Impact Statement (textarea)

#### Module 3: Research Strategy - Significance
Required fields:
- Problem Statement (textarea)
- Current Solutions & Limitations (textarea)
- Innovation Description (textarea)
- Expected Impact (textarea)
- Scientific Premise (textarea)

#### Module 4: Research Strategy - Innovation
Required fields:
- Technical Innovation (textarea)
- Commercial Innovation (textarea)
- Competitive Advantages (textarea)
- Paradigm Shift Description (textarea)

#### Module 5: Research Strategy - Approach
Required fields:
- Overall Study Design (textarea)
- Preliminary Data Summary (textarea)
- Timeline/Milestones (textarea)
- Potential Problems & Solutions (textarea)
- Rigor & Reproducibility (textarea)

#### Module 6: Team & Environment
Required fields:
- PI Qualifications (textarea)
- Team Members & Roles (textarea)
- Institutional Resources (textarea)
- Collaborations & Letters of Support (textarea)
- Consortium Arrangements if applicable (textarea)

#### Module 7: Budget & Resources
Required fields:
- Personnel Costs breakdown (textarea)
- Equipment Needs (textarea)
- Supplies & Materials (textarea)
- Travel Justification (textarea)
- Other Direct Costs (textarea)
- Budget Justification Narrative (textarea)

#### Module 8: Compliance & Human Subjects
Required fields:
- Human Subjects Involvement (yes/no + details)
- Vertebrate Animals (yes/no + details)
- Biohazards (yes/no + details)
- Data Management Plan (textarea)
- Authentication of Key Resources (textarea)

#### Module 9: Commercialization Plan (Phase II / Fast-Track only)
Required fields:
- Company Description (textarea)
- Market Analysis (textarea)
- Competition Analysis (textarea)
- Intellectual Property Strategy (textarea)
- Manufacturing/Production Plan (textarea)
- Regulatory Strategy (textarea)
- Marketing Strategy (textarea)
- Revenue Projections (textarea)
- Funding/Investment Strategy (textarea)

### 4. Module Navigation

- Left sidebar showing all 9 modules with completion status
- Visual indicators: ✓ Complete (green), ◐ In Progress (yellow), ○ Not Started (gray)
- Click to navigate between modules
- Show percentage complete for each module

### 5. Module Editor

For each module:
- Display all required fields with labels and helper text
- Textarea inputs with appropriate sizing
- Character/word count indicators where relevant
- Auto-save functionality (save to localStorage)
- Clear visual distinction between required and optional fields

### 6. Completion Feedback

When a module is complete (all required fields filled):
- Show a success message: "Module Complete!"
- Display a prominent "Next Module" button
- On the last module, show "Validate Grant" button instead

---

## AI-Powered Features (Supabase Edge Functions)

### Feature 1: Comprehensive Grant Audit

**Endpoint:** `/audit-comprehensive`

Performs a multi-perspective AI review of the entire grant with 6 expert personas:

1. **NIH Program Officer** - Reviews scientific merit, alignment with NIH priorities
2. **Regulatory Compliance Reviewer** - Checks for completeness, required elements
3. **Commercialization Strategist** - Evaluates market potential, business viability
4. **Study Section Scientist** - Assesses scientific rigor, methodology
5. **Budget Analyst** - Reviews cost justification, appropriateness
6. **Voice & Authenticity Reviewer** - Checks for LLM-detection risk, authentic writing

Each reviewer can raise flags:
- `SCIENTIFIC_WEAKNESS` - Methodological concerns
- `COMMERCIAL_GAPS` - Business plan deficiencies
- `COMPLIANCE_MISSING` - Required elements missing
- `BUDGET_CONCERNS` - Cost justification issues
- `STUDY_SECTION_RED_FLAGS` - Review criteria problems
- `VOICE_FLATTENING` - Text sounds AI-generated

**Response format:**
```json
{
  "flags": {
    "SCIENTIFIC_WEAKNESS": true/false,
    "COMMERCIAL_GAPS": true/false,
    "COMPLIANCE_MISSING": true/false,
    "BUDGET_CONCERNS": true/false,
    "STUDY_SECTION_RED_FLAGS": true/false,
    "VOICE_FLATTENING": true/false
  },
  "reviewContent": "Full markdown review text...",
  "overallScore": 1-10,
  "passedReview": true/false
}
```

### Feature 2: Section-Specific Audit

**Endpoint:** `/audit-grant`

Reviews individual modules with specialized prompts:
- `technical` - Scientific/technical review
- `commercial` - Business/market review
- `compliance` - Regulatory compliance review
- `budget` - Budget appropriateness review
- `voice` - Authenticity/LLM detection review
- `comprehensive` - All perspectives combined

### Feature 3: Document Audit

**Endpoint:** `/audit-document`

For users who upload existing grant documents:
- Accepts raw text from uploaded documents
- Performs the same multi-perspective review
- Identifies specific sections that need improvement

### Feature 4: AI Refinement / Rewrite

**Endpoint:** `/rewrite-section`

Takes a section of text and rewrites it based on:
- Target audience (reviewers, program officers)
- Improvement goals (clarity, conciseness, impact)
- Style guidelines (formal academic, persuasive)

### Feature 5: Specific Aims Page Generator

**Endpoint:** `/generate-aims-page`

Generates a complete Specific Aims page based on:
- Project fundamentals (title, summary)
- Individual aims data (goals, approaches)
- Target word count (~1 page)

### Feature 6: Document Import Parser

**Endpoint:** `/parse-document`

Parses uploaded text documents and attempts to:
- Identify which module each section belongs to
- Extract relevant content into structured format
- Pre-populate the module fields

---

## Audit Mode UI

A separate view for auditing existing documents:

1. **Document Upload Area**
   - Drag-and-drop or file picker
   - Accepts .txt, .docx, .pdf (text extraction)
   - Or paste text directly

2. **Review Type Selection**
   - Quick Review (single perspective)
   - Comprehensive Review (all 6 perspectives)
   - Specific focus (technical only, commercial only, etc.)

3. **Results Display**
   - Overall score with visual indicator
   - Pass/Fail badge
   - Expandable sections for each reviewer's feedback
   - Flag summary table
   - Specific recommendations with line references

4. **Navigation**
   - Header with "Home" and "Build Mode" buttons
   - Back to previous view

---

## Validation System

### Client-Side Validation

Create a `validation.ts` file that:

1. **Defines required fields per module** based on grant type
2. **Validates completeness** - checks if all required fields have content
3. **Calculates progress** - percentage complete per module and overall
4. **Returns structured results:**

```typescript
interface ValidationResult {
  module_id: number;
  status: 'complete' | 'incomplete' | 'not_started';
  missing_fields: string[];
  field_count: number;
  filled_count: number;
}
```

### Grant-Type Conditional Logic

- **Phase I:** Skip Module 9 (Commercialization) - not required
- **Phase II:** All modules required
- **Fast-Track:** All modules required
- **Direct-to-Phase II:** All modules + prior work documentation

---

## Data Model

### TypeScript Types (`types.ts`)

```typescript
interface Project {
  id: string;
  grant_type: 'Phase I' | 'Phase II' | 'Fast-Track' | 'Direct-to-Phase II';
  created_at: string;
  updated_at: string;
  
  // Module data objects
  m1_fundamentals: Module1Data;
  m2_specific_aims: Module2Data;
  m3_significance: Module3Data;
  m4_innovation: Module4Data;
  m5_approach: Module5Data;
  m6_team: Module6Data;
  m7_budget: Module7Data;
  m8_compliance: Module8Data;
  m9_commercialization: Module9Data;
}

// Define interfaces for each module's data structure
interface Module1Data {
  project_title: string;
  project_summary: string;
  public_health_relevance: string;
  project_narrative: string;
}
// ... etc for all modules
```

---

## UI/UX Requirements

### Design System

- **Colors:**
  - Primary: Blue (#3B82F6)
  - Success: Green (#10B981)
  - Warning: Yellow (#F59E0B)
  - Error: Red (#EF4444)
  - Background: Slate gray tones

- **Typography:**
  - Headings: Inter or system font, bold
  - Body: 16px base, good line height for readability
  - Form labels: Slightly smaller, medium weight

### Key UX Patterns

1. **Progress Persistence** - Save to localStorage, restore on reload
2. **Auto-save** - Save changes as user types (debounced)
3. **Clear Navigation** - Always know where you are, easy to move between sections
4. **Helpful Guidance** - Tooltips, helper text, examples for complex fields
5. **Visual Feedback** - Clear indicators for complete/incomplete status
6. **Mobile Responsive** - Works on tablets (primary use case: laptop/desktop)

### Accessibility

- Proper form labels and ARIA attributes
- Keyboard navigation support
- Sufficient color contrast
- Focus indicators

---

## Component Structure

```
src/
├── components/
│   ├── Hero.tsx              # Landing page
│   ├── GrantTypeSelector.tsx # Grant type selection
│   ├── ModuleNav.tsx         # Left sidebar navigation
│   ├── ModuleEditor.tsx      # Main form editor
│   ├── ResultsPanel.tsx      # Validation results display
│   ├── AuditMode.tsx         # Document audit view
│   ├── AIRefinement.tsx      # AI rewrite panel
│   ├── DocumentImport.tsx    # Document upload/parse
│   ├── SpecificAimsGenerator.tsx  # Aims page generator
│   └── CommercializationDirector.tsx  # Guided commercialization
├── hooks/
│   └── use-mobile.tsx        # Responsive hook
├── lib/
│   └── utils.ts              # Utility functions (cn for classnames)
├── types.ts                  # TypeScript interfaces
├── validation.ts             # Validation logic
├── App.tsx                   # Main app component
└── main.tsx                  # Entry point
```

---

## Supabase Edge Functions Structure

```
supabase/
└── functions/
    ├── audit-comprehensive/
    │   └── index.ts          # Multi-persona review
    ├── audit-grant/
    │   └── index.ts          # Section-specific audit
    ├── audit-document/
    │   └── index.ts          # Document audit
    ├── rewrite-section/
    │   └── index.ts          # AI refinement
    ├── generate-aims-page/
    │   └── index.ts          # Aims generator
    ├── generate-document/
    │   └── index.ts          # Full document generation
    └── parse-document/
        └── index.ts          # Document parser
```

Each edge function should:
1. Handle CORS properly (OPTIONS preflight)
2. Accept JSON body with relevant data
3. Call OpenAI API with appropriate system prompts
4. Return structured JSON response
5. Handle errors gracefully

---

## Environment Variables

Frontend (in code):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Public anon key

Edge Functions (Supabase secrets):
- `OPENAI_API_KEY` - For AI features

---

## Deployment

1. Build frontend: `npm run build`
2. Deploy to static hosting (Netlify, Vercel, or similar)
3. Deploy edge functions to Supabase
4. Configure environment variables

---

## Summary

This application helps NIH grant applicants by:
1. **Structuring** - Breaking the complex grant into manageable modules
2. **Validating** - Ensuring all required sections are complete
3. **Reviewing** - AI-powered multi-perspective feedback
4. **Refining** - AI assistance for improving specific sections
5. **Generating** - Auto-generating certain standard sections

The goal is to increase the quality and completeness of grant submissions, ultimately improving funding success rates.
