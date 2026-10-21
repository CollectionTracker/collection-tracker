---
name: Executive Collectible Intelligence
colors:
  surface: '#0a122a'
  surface-dim: '#0a122a'
  surface-bright: '#313852'
  surface-container-lowest: '#050d25'
  surface-container-low: '#131a33'
  surface-container: '#171e37'
  surface-container-high: '#212942'
  surface-container-highest: '#2c344d'
  on-surface: '#dbe1ff'
  on-surface-variant: '#bacac5'
  inverse-surface: '#dbe1ff'
  inverse-on-surface: '#282f49'
  outline: '#859490'
  outline-variant: '#3c4a46'
  surface-tint: '#3cddc7'
  primary: '#57f1db'
  on-primary: '#003731'
  primary-container: '#2dd4bf'
  on-primary-container: '#00574d'
  inverse-primary: '#006b5f'
  secondary: '#7bd0ff'
  on-secondary: '#00354a'
  secondary-container: '#00a6e0'
  on-secondary-container: '#00374d'
  tertiary: '#eacfff'
  on-tertiary: '#490080'
  tertiary-container: '#d7acff'
  on-tertiary-container: '#7003bf'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#62fae3'
  primary-fixed-dim: '#3cddc7'
  on-primary-fixed: '#00201c'
  on-primary-fixed-variant: '#005047'
  secondary-fixed: '#c4e7ff'
  secondary-fixed-dim: '#7bd0ff'
  on-secondary-fixed: '#001e2c'
  on-secondary-fixed-variant: '#004c69'
  tertiary-fixed: '#f0dbff'
  tertiary-fixed-dim: '#ddb7ff'
  on-tertiary-fixed: '#2c0051'
  on-tertiary-fixed-variant: '#6900b3'
  background: '#0a122a'
  on-background: '#dbe1ff'
  surface-variant: '#2c344d'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.03em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-eyebrow:
    fontFamily: Space Grotesk
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.12em
  label-md:
    fontFamily: Space Grotesk
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Space Grotesk
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.04em
  metric-display:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.25rem
---

## Brand & Style

This design system is tailored for an institutional-grade alternative asset management console and executive portfolio command center focused on high-value collectible assets, specifically graded trading cards, booster boxes, and factory-sealed master cases. It caters to high-net-worth collectors, portfolio managers, and market makers who treat physical pop-culture collectibles with the analytical precision of high-frequency trading assets and hedge fund reserves.

The aesthetic fuses **Modern FinTech Minimalism** with high-density **SaaS Command Interfaces**. Visual motifs rely on deep nocturnal canvas layers, luminous neon indicators, low-contrast structural dividers, and crisp geometric data displays. The interface instills trust, institutional prestige, and decisive clarity—dispelling amateurish playfulness in favor of calculated financial market telemetry.

## Colors

The palette establishes hierarchical depth using multi-layered deep midnight blues, vibrant functional neon accents, and refined muted slate neutrals.

- **Primary Canvas (`#0B132B` / `#0D1733`):** Dark midnight base canvas that establishes low-strain viewing and maximum contrast for luminous data points.
- **Surface Elevation 1 (`#142042`):** Primary card, panel, and widget backgrounds providing structural grouping without relying on heavy borders.
- **Surface Elevation 2 (`#1E2C58`):** Hover states, active row highlights, chip backgrounds, and inset track bars.
- **Primary Accent (`#2DD4BF` - Mint Teal):** Denotes positive financial performance, raw card segments, and high-priority progress metrics.
- **Secondary Accent (`#38BDF8` - Sky Cyan):** Represents sealed inventory, primary volume charts, and interactive controls.
- **Tertiary Accent (`#A855F7` - Vivid Violet):** Specialized subcategories, exotic SKUs, and premium tier assets.
- **Warning / Alert Accent (`#F59E0B` - Amber Gold):** Concentrated exposure warnings, high-value outliers, and top holdings flags.
- **Text & Foreground Hierarchy:**
  - High-Contrast White (`#F8FAFC`): Primary totals, dominant metrics, card titles.
  - Slate Medium (`#94A3B8`): Contextual subtext, SKU descriptions, table headers, secondary ratios.
  - Slate Muted (`#475569`): Inactive track bars, structural separator lines, chart baselines.

## Typography

The typographic hierarchy combines **Plus Jakarta Sans** for natural numeric readability and clean executive presence, paired with **Space Grotesk** for analytical labels, micro-tags, timestamps, and section super-headers.

- **Numerics & Financial Valuations:** Render large totals and asset values using `Plus Jakarta Sans` Bold or Extra Bold with negative tracking (`-0.02em` to `-0.03em`) to mimic fintech readouts.
- **Section Super-Headers / Eyebrows:** Set exclusively in `Space Grotesk` uppercase with tracked out spacing (`0.12em`) using `#2DD4BF` or `#38BDF8` to anchor widget focus.
- **Labels & Tabular Figures:** Use tabular numbers where applicable for alignment across inventory matrices, cost allocations, and percentage deltas.

## Layout & Spacing

The command center uses a strict 12-column responsive fluid grid designed for multi-tier modular dashboards.

- **Breakpoints:**
  - Mobile (`< 768px`): 4-column layout; full-width stacked KPI metric cards, simplified single-column chart modules, horizontal scrolling status chips, outer margins of `1rem`.
  - Tablet (`768px – 1024px`): 8-column layout; 2-column KPI grid, outer margins of `1.5rem`.
  - Desktop (`> 1024px`): 12-column layout; 4-card top KPI tier (`col-span-3`), main view split into `col-span-5` (mix breakdown) and `col-span-7` (concentration analytics), outer margins of `2rem`.
- **Vertical Rhythm:** Element gaps within cards stay tight (`space-sm` to `space-md`) to enforce density, while card-to-card gaps leverage `gutter` (`1.25rem`) to maintain boundary recognition.

## Elevation & Depth

Visual hierarchy operates purely through subtle tonal surfacing and luminous rim treatments rather than heavy, drop-down shadows.

- **Canvas Foundation:** Layer 0 sits at `#0B132B`.
- **Card Containers:** Layer 1 rests at `#142042` with an ambient rim of `1px solid rgba(255, 255, 255, 0.05)`.
- **Elevated Insets / Track Bars:** Layer -1 recessed areas sit at `#0D1733` with `1px solid rgba(255, 255, 255, 0.03)` to embed horizontal progress bars, SKU bars, and donut chart hubs.
- **Hover & Active Depth:** When focused or hovered, cards elevate through a soft ambient glow: `box-shadow: 0 8px 24px -4px rgba(45, 212, 191, 0.08), 0 2px 6px rgba(0, 0, 0, 0.40)`.

## Shapes

The interface embraces a balanced modern radius (`roundedness: 2`, where containers use `0.75rem` to `1rem` and sub-elements scale to `0.5rem`).

- **Dashboard Cards:** Standardized at `rounded-lg` (`1rem` / `16px`) to ensure sleek modern container boundaries.
- **Indicators & Pill Markers:** Top metric accent bars and status pills utilize full `rounded-full` (`9999px`) caps for clean geometric endpoints.
- **Progress Bars:** All horizontal distribution bars use `rounded-full` track caps with seamless segmented interior fills.

## Components

### KPI Metric Cards
- Surface: `#142042` with `16px` border radius and `1.25rem` padding.
- Structure: A top horizontal accent pill (`4px` height, `32px` width) tinted by asset class (Mint for Total, Sky Cyan for Sealed, Violet for Raw, Amber for Valuation Range).
- Typography: Upper label in `label-eyebrow` uppercase `#94A3B8`. Main metric in `metric-display` `#F8FAFC`. Subtext in `body-sm` `#64748B`.

### Horizontal Allocation & Performance Bars
- Backing track: `#1A2850`, height `8px` or `12px`, with fully rounded corners.
- Active fill: Solid neon fill (`#2DD4BF`, `#38BDF8`, or `#F59E0B`).
- Label alignment: Split metadata where SKU title is left-aligned in `body-sm` `#94A3B8` and the currency value is right-aligned in `label-md` `#F8FAFC` bold.

### Donut & Proportional Wheels
- Center callout: Embedded hub rendered at `#0D1733` displaying dominant percentage in `headline-md` `#F8FAFC` and category name in `label-sm` uppercase.
- Legends: Vertical list paired with a `10px` circular neon bullet, asset title in `#94A3B8`, and formatted value in `#F8FAFC`.

### Data Chips & Status Badges
- Background: Inset navy tint `rgba(56, 189, 248, 0.1)`.
- Border: `1px solid rgba(56, 189, 248, 0.2)`.
- Content: `Space Grotesk` uppercase `11px`, with an optional leading `6px` pulsating status dot.

### Inputs & Filters
- Background: `#0D1733` with `1px solid #1E2C58`.
- Focus State: Border shifts to `#2DD4BF` with a subtle diffuse glow (`rgba(45, 212, 191, 0.15)`). Text renders crisp `#F8FAFC`.

### Interactive Buttons
- **Primary:** Solid `#2DD4BF` background, `#0B132B` text, `font-weight: 700`, with `rounded-md` corners.
- **Secondary / Ghost:** Transparent background with `1px solid #38BDF8` border and `#38BDF8` text.
- **Segmented Controls:** Enclosed pill switcher with `#0D1733` container and active segment sliding in `#1E2C58` with high-contrast `#F8FAFC` text.