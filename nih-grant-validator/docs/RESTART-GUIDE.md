# NIH Grant Validator - Session Restart Guide

## Quick Start for New AI Session

### 1. Project Location
```
Workspace: /workspace/nih-grant-validator/
GitHub: https://github.com/COAREHoldings/validator.git
```

### 2. Essential Context to Provide

When starting a new session, provide this context:

```
I'm continuing work on the NIH Grant Validator project.

**Project:** NIH SBIR/STTR Grant Writing & Validation Platform
**Location:** /workspace/nih-grant-validator/
**GitHub:** https://github.com/COAREHoldings/validator.git

**Tech Stack:**
- Frontend: React + TypeScript + Vite + TailwindCSS
- Backend: Supabase (Edge Functions for AI)
- Database: Supabase PostgreSQL

**Key Files to Read:**
- docs/PROJECT-SPECIFICATION.md - Full product spec
- src/types.ts - Complete data schema
- src/App.tsx - Main application structure

**Supabase Project:**
- URL: https://dvuhtfzsvcacyrlfettz.supabase.co
- Project ID: dvuhtfzsvcacyrlfettz

[Then describe what you want to work on]
```

### 3. Supabase Credentials (Stored as Secrets)

The following credentials are stored and should be available:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID`
- `GITHUB_TOKEN`

### 4. Key Commands

```bash
# Install dependencies
cd /workspace/nih-grant-validator && pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Deploy (use Matrix Agent deploy tool)
# Output directory: dist/

# Git operations
git status
git add .
git commit -m "message"
git push origin master
```

---

## Application Architecture

### Data Flow

```
User Input → React Components → ProjectSchemaV2 State → Auto-Save → Supabase DB
                                      ↓
                              AI Edge Functions
                                      ↓
                              Generated Content
```

### Module System

The grant is organized into 9 modules:

| Module | Component | Purpose |
|--------|-----------|---------|
| M1 | StepSetup.tsx | Project title, summaries, concept |
| M2 | StepCoreConcept.tsx | Hypothesis development |
| M3 | StepCoreConcept.tsx | Specific Aims |
| M4 | StepTeam.tsx | Team composition |
| M5 | StepResearchPlan.tsx | Experimental approach |
| M6 | StepBudget.tsx | Budget calculator |
| M7 | (embedded) | Regulatory requirements |
| M8 | StepReview.tsx | Review, validation, export |
| M9 | CommercializationDirector.tsx | Phase II commercialization plan |

### State Management

- Main state: `currentProject: ProjectSchemaV2` in App.tsx
- Updates via: `handleProjectUpdate(updates: Partial<ProjectSchemaV2>)`
- Auto-save: 2-second debounce after changes
- Module states: Auto-calculated from project data

### AI Integration

All AI features use Supabase Edge Functions:

| Function | Purpose |
|----------|---------|
| generate-document | Generate full sections |
| generate-aims-page | Create Specific Aims document |
| ai-refine | Improve/rewrite content |
| audit-* | Compliance checking |
| intel-* | Research intelligence (NIH Reporter, PubMed, etc.) |
| parse-foa | Extract requirements from FOA |

---

## Common Development Tasks

### Adding a New Field to the Schema

1. Add type to `src/types.ts` in the appropriate module interface
2. Add to `MODULE_DEFINITIONS` required_fields if mandatory
3. Add UI in the corresponding Step component
4. Add to `createDefaultProject()` with default value

### Adding a New AI Feature

1. Create Edge Function in `supabase/functions/[name]/`
2. Follow pattern from existing functions (use `_shared/` utilities)
3. Deploy: `supabase functions deploy [name]`
4. Call from frontend via Supabase client

### Modifying the Editor UI

1. Main editor: `src/components/editor/GrantEditor.tsx`
2. Step components: `src/components/editor/Step*.tsx`
3. Shared components: `src/components/shared/`
4. AI buttons: `src/components/shared/AIGenerateButton.tsx`

### Budget Calculator

Located in `StepBudget.tsx`:
- Institute-specific caps from `complianceConfig.ts`
- MTDC calculation excludes equipment over $5K and certain subaward costs
- F&A calculated on MTDC
- SBIR requires 67%+ small business allocation
- STTR requires 40%+ small business, 30%+ research institution

---

## Recent Changes Log

### February 2026
1. **Grant Summary Feature**
   - New `GrantSummary.tsx` component
   - Compiles all sections into editable preview
   - Export to PDF/Word

2. **Title Input Enhancement**
   - Added user title input before AI generation in StepSetup.tsx

3. **StepReview Refactor**
   - Added tabbed interface: Summary | Validation | Documents

---

## Planned Future Work

### DOD Grant Support
- Requires refactoring compliance system for multi-agency
- Different budget structures, review criteria
- Suggested approach: Consolidate 14 Edge Functions into 5 generic ones first

### Backend Consolidation Plan
Current 14 functions → Proposed 5:

| Current | Proposed |
|---------|----------|
| generate-document, generate-aims-page | unified-generate |
| audit-*, intel-* | unified-audit, unified-intel |
| parse-document, parse-foa | unified-parse |
| ai-refine, rewrite-section | unified-refine |

---

## Troubleshooting

### Common Issues

**Build fails with JSX syntax error:**
- Check for unclosed JSX comments `{/* ... */}`
- Ensure all braces are balanced

**Supabase Edge Function errors:**
- Check function logs: `supabase functions logs [name]`
- Verify CORS headers in function response
- Check OpenAI API key is set in Supabase secrets

**Auto-save not working:**
- Verify user is authenticated
- Check project has `id` (saved to DB)
- Check browser console for errors

**Module states not updating:**
- Module states auto-calculate in useEffect
- Check `updateModuleStates()` in types.ts
- Verify field names match MODULE_DEFINITIONS

---

## Contact / Resources

- **Supabase Dashboard:** https://supabase.com/dashboard/project/dvuhtfzsvcacyrlfettz
- **GitHub Repo:** https://github.com/COAREHoldings/validator
- **NIH SBIR/STTR Guide:** https://seed.nih.gov/
