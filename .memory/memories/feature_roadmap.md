# NIH Grant Validator - Feature Roadmap

## Discussed Features (Ready to Implement)

### 1. Figure/Image Upload System
**Status:** Discussed, not yet implemented
**Key Decisions:**
- Storage: Supabase Storage (per-project buckets)
- Sizing: Flexible with legibility guidance (not forced constraints)
- Layout: Text wrapping optional, investigator controls size
- Page counting: Real-time calculator showing figure space impact
- Export: Include figures in PDF/DOCX with positioning

**Implementation Phases:**
1. Storage bucket + basic upload UI
2. Flexible sizing with legibility indicators
3. Real-time page calculator with figures
4. Export with embedded figures

### 2. Compliance Approach
**Status:** Decided - Light touch
**Key Decisions:**
- Trust researchers as professionals
- One-time acknowledgment on first AI use (never again)
- No pop-ups, gates, or repeated confirmations
- Legal responsibility in Terms of Service
- Help/FAQ available but not forced

## Completed This Session
- Reorganized AI Documents section with proper document types
- Added experimental-plan support
- Added document descriptions
- Pushed to GitHub
