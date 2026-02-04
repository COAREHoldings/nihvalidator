# NIH Grant Validator - UI Redesign Specification

## Overview
Redesign the existing NIH Grant Validator application with a cleaner, more intuitive interface while preserving ALL existing backend functionality (Supabase edge functions, validation logic, compliance system).

## Design Principles
1. **Progressive Disclosure** - Show only what's needed at each step
2. **Single Task Focus** - One clear action per view
3. **Visual Progress** - Clear step indicators
4. **Reduced Cognitive Load** - Fewer buttons, cleaner layout

## Color Palette
- Primary: #3B82F6 (Blue)
- Success: #10B981 (Green)
- Warning: #F59E0B (Amber)
- Error: #EF4444 (Red)
- Background: #F9FAFB (Light Gray)
- Surface: #FFFFFF (White)
- Text Primary: #111827
- Text Secondary: #6B7280

## Page Structure

### 1. Dashboard (Home)
**Route:** `/` or `mainView === 'home'`

**Layout:**
- Left Sidebar (fixed, 240px):
  - Logo at top
  - Nav items: Dashboard, My Grants, Research Tools, Settings
- Main Content:
  - Welcome header with user greeting
  - 3 Action Cards (horizontal):
    1. "Start New Grant" - opens wizard
    2. "Continue Draft" - shows if draft exists
    3. "Audit Grant" - opens audit mode
  - Recent Activity section (optional)

### 2. Grant Editor (Step-Based)
**Route:** `mainView === 'build'`

**Layout:**
- Left Sidebar (fixed, 280px):
  - Back to Dashboard link
  - Grant title/type summary
  - **5 Steps with visual progress:**
    1. Setup (Grant type, Institute, FOA) - consolidates current config
    2. Core Concept (Title, Problem, Hypothesis, Aims) - M1 + M2 + M3
    3. Research Plan (Approach, Methods, Timeline, Regulatory) - M5 + M7
    4. Team & Budget (Team mapping, Budget calculator) - M4 + M6
    5. Review & Export (Validation, Compliance, Export) - M8 + validation
  - Overall progress bar at bottom
  
- Main Content:
  - Breadcrumb: Dashboard > Grant Name > Current Step
  - Step title and description
  - Form fields for current step only
  - **Contextual AI Assistant** (collapsible right panel)
  
- Footer:
  - "Save Draft" (secondary)
  - "Continue" (primary) or "Back" on left

### 3. Research Intelligence
**Route:** `mainView === 'research-intelligence'`
- Keep existing but simplify header
- Add back button to return to dashboard/editor

### 4. Audit Mode
**Route:** `mainView === 'audit'`
- Keep existing but match new design language

## Step Content Mapping

### Step 1: Setup
- Program Type (SBIR/STTR)
- Grant Type (Phase I, II, Fast Track, etc.)
- NIH Institute selection
- Clinical Trial toggle
- FOA Upload (optional)

### Step 2: Core Concept
- Project Title
- Problem Statement
- Proposed Solution
- Central Hypothesis
- Supporting Rationale
- Specific Aims (Aim 1, 2, 3)
- For Fast Track: Phase-specific aims

### Step 3: Research Plan
- Experimental Approach
- Methods & Milestones
- Timeline
- Go/No-Go Criteria
- Regulatory Requirements
- Statistical Approach

### Step 4: Team & Budget
- PI Information
- Key Personnel
- Collaborators
- Budget Calculator (with the new MTDC logic)
- Effort Allocation

### Step 5: Review & Export
- Validation Summary (pass/fail for each section)
- Compliance Audit results
- Quick edit links for each section
- Export options: JSON, generate documents
- Commercialization section (if Phase II+)

## Component Architecture

```
src/
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx (main nav sidebar)
│   │   ├── StepSidebar.tsx (step progress sidebar)
│   │   └── Header.tsx (minimal top bar)
│   ├── dashboard/
│   │   ├── Dashboard.tsx (main dashboard view)
│   │   ├── ActionCard.tsx (start/continue/audit cards)
│   │   └── RecentActivity.tsx
│   ├── editor/
│   │   ├── GrantEditor.tsx (main editor container)
│   │   ├── StepSetup.tsx
│   │   ├── StepCoreConcept.tsx
│   │   ├── StepResearchPlan.tsx
│   │   ├── StepTeamBudget.tsx
│   │   └── StepReview.tsx
│   ├── shared/
│   │   ├── AIAssistant.tsx (inline AI helper)
│   │   ├── ProgressIndicator.tsx
│   │   └── FormField.tsx
│   └── [keep existing specialized components]
```

## Key Behaviors

1. **Auto-save:** Save draft on field blur or every 30 seconds
2. **Step Locking:** Steps unlock progressively (can skip back but not forward until required fields done)
3. **AI Assistant:** Always visible but collapsible, provides contextual suggestions
4. **Validation:** Real-time inline validation, full validation on Step 5
5. **Mobile:** Sidebar collapses to hamburger menu

## Preserved Functionality
- All Supabase edge functions (parse-document, parse-foa, generate-document, intel-*, validate-section)
- ProjectSchemaV2 data structure
- Validation logic
- Compliance checking
- Budget calculations (MTDC, F&A, caps)
- Document import/export
- FOA parsing
- Research Intelligence dashboard

## Mockup References
- Dashboard: imgs/mockup_dashboard.png
- Step Editor: imgs/mockup_step_page.png
- Review Page: imgs/mockup_review.png
