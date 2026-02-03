# NIH Grant Validator - Project Continuation Details

**Last Updated:** 2026-02-03 14:23 UTC  
**Version:** FinalEddie

---

## Live Deployment

**URL:** https://m2gp5oqskdiv.space.minimax.io

---

## Supabase Backend Configuration

| Setting | Value |
|---------|-------|
| **Project ID** | `raqkwtjsxohnhtcacakb` |
| **Project URL** | `https://raqkwtjsxohnhtcacakb.supabase.co` |
| **Anon Key** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhcWt3dGpzeG9obmh0Y2FjYWtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDIyNTQsImV4cCI6MjA4NTI3ODI1NH0.pDpNp4UlpCinhi6gl2qtKhT3t20uUGHU_FUxTxYjttI` |

### Secrets Configured
- `OPENAI_API_KEY` - Set in Supabase Edge Function secrets

---

## Deployed Edge Functions

| Function | URL | Purpose |
|----------|-----|---------|
| `ai-refine` | `/functions/v1/ai-refine` | AI-powered grant section refinement, compliance check, reviewer simulation, and scoring |
| `audit-comprehensive` | `/functions/v1/audit-comprehensive` | Comprehensive grant audit |
| `audit-document` | `/functions/v1/audit-document` | Document-level audit |
| `audit-grant` | `/functions/v1/audit-grant` | Grant validation audit |
| `generate-aims-page` | `/functions/v1/generate-aims-page` | Generate Specific Aims page |
| `generate-document` | `/functions/v1/generate-document` | Generate grant documents |
| `parse-document` | `/functions/v1/parse-document` | Parse uploaded documents |
| `rewrite-section` | `/functions/v1/rewrite-section` | AI section rewriting |

---

## Key Features Implemented

### 1. Module-Based Grant Builder
- 9 modules covering all SBIR/STTR grant requirements
- Real-time validation with field-level feedback
- Progress tracking and completion status

### 2. Inline Navigation Warning (NEW)
- Warns users when navigating away from incomplete modules
- Shows list of missing required fields
- "Stay & Complete" or "Continue Anyway" options

### 3. AI Compilation & Review (FIXED)
- **AI Gating removed** - Always accessible now
- Actions available:
  - `refine` - Writing quality improvement suggestions
  - `compliance` - NIH compliance checking
  - `reviewer` - Simulated study section review (1-9 scoring)
  - `score` - Predicted fundability score

### 4. Document Generation
- Specific Aims page generator
- Research Strategy builder
- Budget calculator
- Commercialization Plan director

### 5. Import/Export
- Import from Word/PDF documents
- Export completed grant data
- Download as JSON

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Backend** | Supabase Edge Functions (Deno) |
| **AI** | OpenAI GPT-4o |
| **PDF Parsing** | pdf.js |
| **DOCX Parsing** | mammoth.js |

---

## File Structure

```
nih-grant-validator/
├── src/
│   ├── App.tsx                 # Main app component with navigation logic
│   ├── types.ts                # TypeScript interfaces and constants
│   ├── validation.ts           # Grant validation rules + AI gating (disabled)
│   └── components/
│       ├── AIRefinement.tsx    # AI review panel
│       ├── AuditMode.tsx       # Comprehensive audit view
│       ├── CommercializationDirector.tsx
│       ├── DocumentImport.tsx  # Word/PDF import
│       ├── ModuleEditor.tsx    # Module editing forms
│       ├── ModuleNav.tsx       # Side navigation
│       ├── ResultsPanel.tsx    # Validation results
│       └── SpecificAimsGenerator.tsx
├── supabase/
│   └── functions/
│       ├── ai-refine/          # AI analysis function
│       ├── audit-*/            # Audit functions
│       ├── generate-*/         # Generation functions
│       └── parse-document/     # Document parsing
└── dist/                       # Production build
```

---

## Recent Changes (This Session)

1. **Supabase Project Changed**
   - Migrated from `dvuhtfzsvcacyrlfettz` to `raqkwtjsxohnhtcacakb`
   - All frontend files updated with new URL and anon key

2. **AI Features Fixed**
   - Created missing `ai-refine` edge function
   - Removed AI gating lock in `validation.ts`
   - Configured OpenAI API key as project secret

3. **Inline Validation Added** (previous session)
   - Navigation warning modal for incomplete modules
   - `pendingNavigation` state management

---

## To Continue Development

### Option 1: Use the ZIP file
1. Extract `nih-grant-validator-2026-02-03-1423-FinalEddie.zip`
2. Run `pnpm install`
3. Run `pnpm dev` for local development
4. Run `pnpm build` to build for production

### Option 2: Deploy to Different Supabase Project
1. Update URLs in these files:
   - `src/App.tsx`
   - `src/components/AIRefinement.tsx`
   - `src/components/AuditMode.tsx`
   - `src/components/CommercializationDirector.tsx`
   - `src/components/DocumentImport.tsx`
   - `src/components/ModuleEditor.tsx`
   - `src/components/SpecificAimsGenerator.tsx`
2. Deploy edge functions from `supabase/functions/`
3. Set `OPENAI_API_KEY` secret in new project

### Potential Future Improvements
- [ ] Code splitting / lazy loading (reduce ~1.9MB bundle)
- [ ] User authentication & project saving
- [ ] Export to NIH-formatted PDF
- [ ] Multi-user collaboration
- [ ] Version history / undo

---

## Contact / Notes

Project built for NIH SBIR/STTR grant application preparation.
Supports: Phase I, Phase II, Direct-to-Phase II, Fast Track, Phase IIB mechanisms.
