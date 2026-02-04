# Feature Spec: Ancillary Document Generator

## Overview

Add comprehensive document generation for ALL required NIH SBIR/STTR submission documents beyond the core scientific narrative.

## Complete NIH Document Checklist

### Always Required

| Document | Description | Data Source | Priority |
|----------|-------------|-------------|----------|
| **SBIR/STTR Information Form** | Program-specific info (SBC size, women/minority owned, etc.) | New fields in setup | HIGH |
| **Letters of Support** | Consultant, vendor, collaborator, customer letters | M4 Team + M6 Budget | HIGH |
| **Data Management & Sharing Plan** | How data will be managed, preserved, shared | New M10 module | HIGH |
| **Facilities & Other Resources** | Lab space, equipment, institutional support | M7 expanded | HIGH |
| **Equipment** | Major equipment available and requested | M6 Budget + M7 | MEDIUM |

### Conditional Documents

| Document | Condition | Trigger Field | Priority |
|----------|-----------|---------------|----------|
| **Human Subjects** | If humans involved | `clinical_trial_included` or new `human_subjects` flag | HIGH |
| **Vertebrate Animals** | If animals used | `vertebrate_animals_involved` (exists in M7) | MEDIUM |
| **Auth of Key Bio/Chem Resources** | If key reagents, cell lines, antibodies used | New field in M5/M7 | MEDIUM |
| **Select Agent Research** | If select agents/toxins involved | New field in M7 | LOW |
| **Multi-PI Leadership Plan** | If >1 PI listed | Auto-detect from M4 `key_personnel` | MEDIUM |
| **Consortium/Contractual Arrangements** | If subawards exist | Auto-detect from M6 `sub_awards` | HIGH |
| **Resource Sharing Plan** | If genomic data, model organisms, software | New field | MEDIUM |
| **Progress Report Publication List** | Renewals/resubmissions only | New `is_renewal` flag | LOW |

---

## Data Management & Sharing Plan (DMSP)

### NIH Required Elements (per NOT-OD-21-013)

1. **Data Type** - Types and amount of scientific data to be generated
2. **Related Tools/Software** - Tools needed to access or manipulate data
3. **Standards** - Standards to be applied to data and metadata
4. **Data Preservation, Access, Timelines** - Repository, access controls, timeline
5. **Access, Distribution, Reuse** - Factors affecting access (privacy, IP, etc.)
6. **Oversight** - Who will manage compliance

### Proposed UI Fields (New M10 Module)

```typescript
interface M10DataSharing {
  // Data Types
  data_types_generated: string[]  // ['genomic', 'imaging', 'clinical', 'survey', etc.]
  data_volume_estimate: string    // "~500GB of sequencing data"
  
  // Tools & Standards
  file_formats: string[]          // ['FASTQ', 'BAM', 'CSV', etc.]
  metadata_standards: string[]    // ['MIAME', 'CDISC', etc.]
  software_tools: string[]        // Tools needed to use data
  
  // Preservation & Access
  repository_name: string         // "GEO", "dbGaP", "Zenodo", etc.
  repository_type: 'public' | 'controlled-access' | 'institutional'
  retention_period: string        // "10 years post-publication"
  access_timeline: string         // "Upon publication" or "Within 6 months of generation"
  
  // Access Restrictions
  contains_phi: boolean
  contains_proprietary: boolean
  access_restrictions: string[]   // Reasons for any restrictions
  
  // Oversight
  data_steward_name: string
  data_steward_role: string
  
  // AI Generated
  ai_narrative: string
  ai_approved: boolean
}
```

---

## Letters of Support - Detailed Spec

### Letter Types

#### 1. Consultant Commitment Letter
```
Source Data: M4.consultants[]
Required Fields:
- consultant.name
- consultant.expertise  
- consultant.role
- Derived: hours, rate from M6 budget

Template Structure:
- Letterhead placeholder
- Date
- "To Whom It May Concern" / PI name
- Statement of expertise
- Commitment to project (hours, activities)
- Relevance to specific aims
- Signature block
```

#### 2. Vendor/CRO Letter
```
Source Data: M6.vendors[]
Required Fields:
- vendor.vendorName
- vendor.description
- vendor.amount

Template Structure:
- Company letterhead placeholder
- Capability statement
- Services to be provided
- Timeline/capacity confirmation
- Pricing confirmation (optional)
- Contact information
```

#### 3. Collaborator Letter (Academic)
```
Source Data: M4.collaborators[]
Required Fields:
- collaborator.name
- collaborator.institution
- collaborator.contribution

Template Structure:
- Institutional letterhead
- Relationship to project
- Specific contributions
- Access to facilities/resources
- Commitment statement
```

#### 4. Subcontractor Letter (STTR Required)
```
Source Data: M6.sub_awards[]
Required Fields:
- subAward.institutionName
- subAward.contactPI
- subAward.directCosts

Template Structure:
- Institution letterhead
- Scope of work
- Key personnel involved
- Budget confirmation
- F&A rate confirmation
- Commitment to timeline
```

#### 5. Customer Interest Letter (Commercialization)
```
Source Data: M9.section3_market
New Fields Needed:
- potential_customers: { name, company, title, interest_statement }[]

Template Structure:
- Customer letterhead
- Problem/need statement
- Interest in solution
- Potential use case
- Non-binding interest statement
```

---

## Implementation Phases

### Phase 1: Letters & Core Documents (4 hours)
- [ ] Create `generate-letter` edge function
- [ ] Add letter generation UI to M4 Team step
- [ ] Add Consortium/Contract plan generator
- [ ] Deploy and test

### Phase 2: Data Sharing Plan (3 hours)
- [ ] Add M10 Data Sharing module to types.ts
- [ ] Create UI for M10 fields
- [ ] Create DMSP generator in edge function
- [ ] Add to document checklist

### Phase 3: Conditional Documents (4 hours)
- [ ] Human Subjects template generator
- [ ] Vertebrate Animals template generator
- [ ] Multi-PI Leadership Plan generator
- [ ] Resource Sharing Plan generator
- [ ] Auth of Key Resources generator

### Phase 4: Document Dashboard (2 hours)
- [ ] New "Documents" tab in Review step
- [ ] Checklist showing required vs. optional
- [ ] Status indicators (generated/not generated)
- [ ] Bulk download option

---

## Edge Function Design

### Unified `generate-ancillary` Function

```typescript
// Request payload
{
  documentType: 'letter-consultant' | 'letter-vendor' | 'letter-collaborator' | 
                'letter-subcontractor' | 'letter-customer' | 
                'dmsp' | 'facilities' | 'equipment' |
                'human-subjects' | 'vertebrate-animals' | 
                'multi-pi-plan' | 'consortium-plan' | 'resource-sharing' |
                'bio-resources-auth',
  
  // For letters, specify which entity
  entityIndex?: number,  // e.g., consultants[0]
  
  // Full project context
  project: ProjectSchemaV2
}

// Response
{
  success: boolean,
  data: {
    type: string,
    content: string,
    wordCount: number,
    generatedAt: string,
    suggestedFilename: string  // e.g., "Letter_DrSmith_Consultant.docx"
  }
}
```

---

## UI Mockup - Letter Generation

```
┌─────────────────────────────────────────────────────────────┐
│ Team & Personnel                                       Step 4│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Consultants                                    [+ Add]  │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Dr. Jane Smith - Regulatory Expert                      │ │
│ │ Role: FDA submission strategy                           │ │
│ │ [Edit] [Delete] [📄 Generate Letter]                    │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Dr. Bob Johnson - Biostatistician                       │ │
│ │ Role: Clinical trial design                             │ │
│ │ [Edit] [Delete] [📄 Generate Letter]                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Letters Generated                                       │ │
│ │ ✅ Dr. Jane Smith - Consultant Letter (Jan 15, 2026)    │ │
│ │    [View] [Regenerate] [Download DOCX]                  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Success Metrics

- Time to generate complete document package: < 30 minutes (vs. 15-30 hours manual)
- All NIH-required documents available from single platform
- Letter generation success rate: > 95%
- User satisfaction: Consultants approve AI-drafted letters without major edits

---

## Competitive Advantage

**No competitor offers:**
1. Auto-generated Letters of Support from project data
2. DMSP generator compliant with NOT-OD-21-013
3. Conditional document detection and generation
4. Full document package export

This positions the platform as a **complete submission solution**, not just a writing tool.
