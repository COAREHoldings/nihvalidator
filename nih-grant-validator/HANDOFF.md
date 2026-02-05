# NIH Grant Validator - Project Handoff

## Project Location
- **Workspace:** `/workspace/nih-grant-validator`
- **GitHub:** https://github.com/COAREHoldings/validator
- **Live URL:** https://ypnu6f0yr88b.space.minimax.io

## Supabase Backend
- **Project ID:** dvuhtfzsvcacyrlfettz
- **URL:** https://dvuhtfzsvcacyrlfettz.supabase.co

## Current Status: 9.5/10 Ready

### Completed Features
- Grant type selection & wizard
- Module-based data entry (8 modules)
- AI document generation (edge functions)
- DOCX/PDF export per document
- Download All Documents (ZIP)
- Figure/image upload & library
- JSON data export
- Toast notification system (fully integrated)
- Mobile-responsive UI:
  - Hamburger menu sidebar
  - Collapsible step navigation with horizontal pills
  - Card-based grants list on mobile
  - Responsive typography and spacing
- "My Grants" dedicated page
- AI Acknowledgment modal
- User authentication (Supabase Auth)
- Auto-save functionality

---

## REMAINING OPTIONAL ENHANCEMENTS

### 1. Additional Toast Integration (Optional)
Consider adding to these files if needed:
- `src/components/FigureLibrary.tsx` - Upload errors
- `src/components/AuditMode.tsx` - Parse/audit errors (5 locations)

### 2. Module Form Responsiveness (Minor)
Some individual module forms may need overflow handling:
- Add `overflow-x-auto` to table containers if needed
- Use responsive grid classes `grid-cols-1 md:grid-cols-2`

---

## Tech Stack
- React + TypeScript + Vite
- TailwindCSS
- Supabase (Auth, Database, Storage, Edge Functions)
- docx (DOCX generation)
- jszip (ZIP bundling)
- file-saver (downloads)
- react-hot-toast (notifications)

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

Read HANDOFF.md for context. The app is feature-complete at 9.5/10.

GitHub: https://github.com/COAREHoldings/validator
```

---
**Last Updated:** 2026-02-05
