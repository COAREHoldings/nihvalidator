# NIH Grant Validator - Project Handoff

## Project Location
- **Workspace:** `/workspace/nih-grant-validator`
- **GitHub:** https://github.com/COAREHoldings/validator
- **Live URL:** https://huhga0gptllp.space.minimax.io

## Supabase Backend
- **Project ID:** dvuhtfzsvcacyrlfettz
- **URL:** https://dvuhtfzsvcacyrlfettz.supabase.co

## Current Status: 9/10 Ready

### Completed Features
- Grant type selection & wizard
- Module-based data entry (8 modules)
- AI document generation (edge functions)
- DOCX/PDF export per document
- Download All Documents (ZIP)
- Figure/image upload & library
- JSON data export
- Toast notification system (INTEGRATED in App.tsx, DownloadButtons, AIGenerateButton)
- Mobile-responsive sidebar with hamburger menu
- "My Grants" dedicated page
- AI Acknowledgment modal
- User authentication (Supabase Auth)
- Auto-save functionality

---

## REMAINING TASKS

### 1. Mobile Responsiveness - Key Areas

**Priority fixes:**

#### A. GrantEditor stepper (`src/components/editor/GrantEditor.tsx`)
- Stepper numbers cramped on mobile
- Fix: vertical layout or icons-only on small screens
- Add: `flex-col md:flex-row` to stepper container

#### B. My Grants table (`src/components/dashboard/MyGrants.tsx`)
- Table overflows on mobile
- Fix: card view for mobile, or horizontal scroll wrapper
- Add: `overflow-x-auto` wrapper around table

#### C. Module forms (various `Step*.tsx` files)
- Some inputs/tables may overflow
- Fix: Add `overflow-x-auto` to table containers
- Fix: Use responsive grid classes `grid-cols-1 md:grid-cols-2`

**CSS utilities available in `src/index.css`:**
```css
@media (max-width: 768px) {
  .mobile-full-width { width: 100%; }
  .mobile-stack { grid-template-columns: 1fr !important; }
  .mobile-compact { padding: 1rem !important; }
}
```

### 2. Additional Toast Integration (Optional)

Toast system in `src/components/shared/ToastProvider.tsx` is integrated in main files.
Consider adding to these files if needed:
- `src/components/FigureLibrary.tsx` - Upload errors
- `src/components/AuditMode.tsx` - Parse/audit errors (5 locations)
- `src/components/DocumentImport.tsx` - Import errors

---

## Tech Stack
- React + TypeScript + Vite
- TailwindCSS
- Supabase (Auth, Database, Storage, Edge Functions)
- docx (DOCX generation)
- jszip (ZIP bundling)
- file-saver (downloads)

## Build & Deploy Commands
```bash
cd /workspace/nih-grant-validator
npm install
npx tsc -b && npx vite build
# Then use deploy tool with dist_dir="/workspace/nih-grant-validator/dist"
```

## Git Commands
```bash
git add -A && git commit -m "message" && git push origin master
```

---

## Quick Start for Next Session

Tell the AI:
```
Continue working on the NIH Grant Validator project at /workspace/nih-grant-validator

Read HANDOFF.md for context. The main remaining task is:
- Improve mobile responsiveness in GrantEditor stepper and MyGrants table

GitHub: https://github.com/COAREHoldings/validator
```

---
**Last Updated:** 2026-02-05
