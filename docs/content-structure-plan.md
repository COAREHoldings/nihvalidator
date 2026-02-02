# Content Structure Plan - NIH SBIR/STTR Grant Validator

## 1. Material Inventory

**Content Files:**
- `docs/nih_sbir_sttr_system_prompt_v2.md` (System prompts containing all validation logic, error codes, and compliance rules)

**Visual Assets:**
- No specific image files provided.
- Will require SVG icon sets (Lucide/Heroicons) as per design style.

## 2. Website Structure

**Type:** SPA (Single Page Application)
**Reasoning:** The application is a linear, state-dependent wizard workflow. Users need to maintain context across steps without full page reloads. A single "App Shell" with a dynamic content area is the most efficient pattern for this utility-focused tool.

## 3. Page/Section Breakdown

**Visual Asset Column Rules:**

| [OK] Content Images (SPECIFY) | [X] Decorative Images (DON'T specify) |
| ----------------------------- | ------------------------------------- |
| Product screenshots, logos    | Hero backgrounds, abstract patterns   |
| Team headshots, client logos  | Gradient overlays, texture images     |
| Charts with specific data     | Atmospheric/mood photos               |

### Page 1: Main App Shell (`/`)

**Purpose**: Validate NIH SBIR/STTR grant applications for structural and budgetary compliance.
**Content Mapping:**

| Section | Component Pattern | Data Source (System Prompt) | Content to Extract | Visual Asset |
| :--- | :--- | :--- | :--- | :--- |
| **Hero / Landing** | Hero Pattern (Modern Minimalist) | General App Context | Title: "NIH SBIR/STTR Validator"<br>Sub: "Pre-submission structural & budget compliance check"<br>CTA: "Start Validation" | - |
| **Wizard Step 1** | Radio Card Grid | §1 Lifecycle Validation | Grant Types: Phase I, Phase II, Fast Track, Direct to Phase II, Phase IIB | - |
| **Wizard Step 2** | Conditional Form | §1 Valid Transitions | Prior Phase inputs (Award #, Date) if applicable | - |
| **Wizard Step 3** | Checklist Group | §2 Structural Completeness | Items: Specific Aims, Research Strategy, Budget, Biosketches, Facilities, etc. | - |
| **Wizard Step 4** | Data Entry Grid | §3 Budget Enforcement | Fields: Direct Costs, Personnel Effort, Subawards, Indirect Rates | - |
| **Results Panel** | Dashboard / Status Card | §9 Final Readiness | Validation Status (Pass/Fail), Error Codes, Readiness Summary | - |

## 4. Content Analysis

**Information Density:** High
- **Reasoning**: The application deals with complex regulatory data, financial figures, and specific compliance checklists. The design must balance this density with the "Spacious > Dense" philosophy of Modern Minimalism to prevent cognitive overload.

**Content Balance:**
- **Images**: Low (< 5%) - Interface is utility-driven.
- **Data/Input**: High (70%) - Primary interaction is data entry and checking.
- **Text**: Medium (25%) - Instructions and error messages.
- **Content Type**: Data-driven / Functional Tool
