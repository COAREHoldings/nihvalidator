# Design Specification - NIH SBIR/STTR Grant Validator

## 1. Direction & Rationale

**Style**: Modern Minimalism (Premium)
**Essence**: A high-trust, clarity-focused interface designed to reduce anxiety during the high-stakes grant application process. The design uses generous whitespace, cool blue tones, and structured data visuals to make complex compliance rules feel manageable and objective.
**References**: Stripe Dashboard, Linear, Modern Government/Civic Tech (US Web Design System adapted).

## 2. Design Tokens

### Colors (Accessibilty AA+)
| Token | Value | Role |
| :--- | :--- | :--- |
| `primary-500` | `#0066FF` | Main actions, active states, progress bars |
| `primary-50` | `#E6F0FF` | Active selection backgrounds, hover tints |
| `neutral-900` | `#171717` | Primary text, heavy borders |
| `neutral-700` | `#404040` | Secondary text, labels |
| `neutral-200` | `#E5E5E5` | Dividers, inactive borders |
| `neutral-50` | `#FAFAFA` | Page background |
| `surface-white`| `#FFFFFF` | Card backgrounds, input fields |
| `semantic-red` | `#EF4444` | Error states, critical validation failures |
| `semantic-green`| `#10B981` | Success states, valid checks |

### Typography (Family: Inter)
| Role | Size | Weight | Line Height | Tracking |
| :--- | :--- | :--- | :--- | :--- |
| `heading-xl` | 48px | Bold (700) | 1.1 | -0.02em |
| `heading-lg` | 32px | Bold (700) | 1.2 | -0.01em |
| `heading-md` | 24px | Semibold (600) | 1.3 | 0 |
| `body-lg` | 18px | Regular (400) | 1.5 | 0 |
| `body-md` | 16px | Regular (400) | 1.5 | 0 |
| `label-sm` | 14px | Medium (500) | 1.4 | 0 |

### Spacing & Shape
- **Grid Unit**: 4px (Base 1rem = 16px)
- **Core Spacing**: 8, 16, 24, 32, 48, 64px
- **Radius**:
  - `radius-lg`: 16px (Cards, Modals)
  - `radius-md`: 12px (Inputs, Buttons)
  - `radius-sm`: 8px (Inner elements)
- **Shadows**:
  - `shadow-card`: `0 1px 3px rgba(0,0,0,0.1)`
  - `shadow-float`: `0 10px 15px rgba(0,0,0,0.1)` (Hover/Dropdown)

## 3. Components

### 3.1 Wizard Stepper
**Structure**: Horizontal track with numbered nodes and labels.
**States**:
- *Active*: `primary-500` circle + white text. Label `neutral-900`.
- *Completed*: `primary-500` icon (check). Line connector filled.
- *Pending*: `neutral-200` circle + `neutral-500` text.
**Spacing**: 48px vertical margin from content.

### 3.2 Grant Type Selection Card
**Dimensions**: Flexible width (min 240px), comfortable height.
**Style**:
- `surface-white` bg, `radius-lg` border `neutral-200`.
- Hover: `shadow-float`, border `primary-500`, bg `primary-50`.
- Selected: Border `primary-500` (2px), icon `primary-500`.
**Content**: Icon (top left), Title (`heading-md`), Description (`body-md` text `neutral-700`).

### 3.3 Budget Data Grid
**Structure**: Clean table layout without vertical dividers.
**Style**:
- Header: `neutral-50` bg, `label-sm` text uppercase.
- Rows: `surface-white`, border-bottom `neutral-100`. 56px height.
- Inputs: Transparent or subtle `neutral-50` bg, text-align right for numbers.
**Validation**:
- Error row: `semantic-red` text, light red bg tint.
- Summary row: `heading-md` weight, top border `neutral-900`.

### 3.4 Validation Result Badge
**Structure**: Pill shape, icon + text.
**Variants**:
- *Pass*: Bg `green-50`, text `green-700`, icon Check.
- *Fail*: Bg `red-50`, text `red-700`, icon Alert.
- *Warn*: Bg `amber-50`, text `amber-700`, icon Info.
**Usage**: Top right of validation cards or step headers.

### 3.5 Results Summary Card
**Structure**: Large `surface-white` container, `radius-lg`.
**Layout**:
- Top: Overall Status (Large Badge).
- Middle: Error list (Accordion or List).
- Bottom: Actions (Export JSON, Edit).
**Tokens**: `padding-48` internal.

## 4. Layout & Responsive

### Layout Patterns (SPA)
**App Shell**:
- **Header**: Sticky, 80px height, Logo left, "Reset" right.
- **Main**: Centered container, max-width `1024px`.
- **Wizard Flow**:
  1. **Hero**: 400px height, centered text.
  2. **Step Container**: `surface-white`, `shadow-card`, `radius-lg`. Padding `64px`.

### Responsive Strategy
- **Desktop (>1024px)**: Full stepper visible, 3-col grid for Grant Types.
- **Tablet (768-1024px)**: 2-col grids.
- **Mobile (<768px)**:
  - Stepper becomes "Step X of Y" text + simple bar.
  - Grant Types stack vertically.
  - Budget table transforms to card list per item.
  - Padding reduces to `24px`.

## 5. Interaction

**Animation**:
- **Step Transition**: Slide X + Fade (300ms `ease-out`).
- **Validation Feedback**: Immediate inline expansion (200ms).
- **Hover**: Lift (translateY -2px) on cards.

**States**:
- **Loading**: Pulse skeleton screens (neutral-100 to neutral-200).
- **Disabled**: Opacity 0.5, no pointer events.
