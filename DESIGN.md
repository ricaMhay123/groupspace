---
name: GroupSpace Design System
description: Minimal studio light-first workspace system (Craft / Linear / Notion parity) with composed obsidian dark mode
colors:
  primary: "#2e5bff"
  primary-hover: "#2148d9"
  primary-light: "#eef2ff"
  accent-green: "#0d7a53"
  accent-amber: "#b45309"
  accent-red: "#c82838"
  surface-light: "#ffffff"
  sidebar-light: "#f1f0ec"
  background-light: "#f7f6f3"
  secondary-light: "#ecebe6"
  border-light: "#e5e4df"
  text-light: "#16181d"
  text-muted-light: "#5a5f6b"
  surface-dark: "#191b20"
  sidebar-dark: "#141519"
  background-dark: "#111215"
  secondary-dark: "#23262e"
  border-dark: "#272a33"
  text-dark: "#f4f5f7"
  text-muted-dark: "#9ba1ae"
typography:
  display:
    fontFamily: "'Bricolage Grotesque', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "'Bricolage Grotesque', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
  code:
    fontFamily: "'JetBrains Mono', monospace"
    fontSize: "0.85rem"
    fontWeight: 500
  serif:
    fontFamily: "Georgia, serif"
    fontSize: "0.875rem"
    fontWeight: 700
  small:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    minHeight: "36px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.text-light}"
    borderColor: "{colors.border-light}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
    minHeight: "36px"
  card:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.text-light}"
    borderColor: "{colors.border-light}"
    rounded: "{rounded.lg}"
    padding: "20px"
---

# Design System

## Overview
GroupSpace pairs a sunlit warm-stone canvas (`#f7f6f3`) and inset rail (`#f1f0ec`) with floating crisp white panels (`#ffffff`) bounded by quiet hairline dividers (`#e5e4df`), inspired by Notion, Linear, and Craft light mode—complemented by an intentional obsidian dark mode (`#111215` / `#191b20`).

## Colors
- **Primary Action / Interactive Highlight**: Studio Cobalt `#2e5bff` (`#2148d9` hover, `#eef2ff` light selection wash) in light mode; `#3b63ff` (`#4d73ff` ring) in dark mode.
- **Accents & Statuses**:
  - Success / Settled: `#0d7a53` (light) / `#34d399` (dark).
  - Pending / Approval Needed: `#b45309` (light) / `#fbbf24` (dark).
  - Destructive / Overdue: `#c82838` (light) / `#f87171` (dark).
- **Surfaces**:
  - Light Mode: Warm stone canvas `#f7f6f3`, recessed sidebar `#f1f0ec`, floating white panels `#ffffff`, hairline border `#e5e4df`.
  - Dark Mode: Obsidian canvas `#111215`, recessed sidebar `#141519`, elevated dark panels `#191b20`, hairline border `#272a33`.

## Typography
- Primary UI stack: `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`; display headers in `'Bricolage Grotesque'`; tabular numbers and codes in `'JetBrains Mono'`.
- Legibility floor: All functional UI labels, metadata, and badges maintain WCAG AA contrast (≥ 4.5:1 body, ≥ 3:1 controls/large headings) and ≥ 11px minimum font size.

## Layout & Spacing Rhythm (`4px` Base)
- **Desktop (`> 768px`)**:
  - Left navigation sidebar: `248px` width, `20px 14px` padding.
  - Sticky dashboard header: `20px 32px` padding.
  - Main tab workspace (`.tab-view`): `24px 32px 40px` padding; panel grid `16px–20px` gaps; cards `18px–20px` internal padding.
  - Public header: `60px` height, `0 32px` padding.
- **Mobile (`≤ 768px`)**:
  - `.dashboard-main` keeps `0` side padding (`padding: 0 0 32px`) so `.dashboard-header` (`14px 16px`) spans flush edge-to-edge.
  - `.tab-view` uses a single `16px 16px 28px` gutter (eliminating double horizontal padding).
  - Left navigation collapses into an accessible off-canvas drawer (`280px` max `85vw`) via `☰`. Primary interactive buttons and inputs enforce `44px` minimum mobile hit height without stretching compact icon triggers (`⋯`, zoom steppers).

## Buttons & Elevation
- **Cards**: Floating white panels rely on subtle `1px solid var(--border)` hairline borders paired with soft offset elevation (`0 1px 3px rgba(20, 22, 27, 0.04)`). No decorative colored side stripes or glowing zero-offset halos.
- **Primary CTA (`.btn-primary`, `.btn-green`)**: Solid cobalt fill (`#2e5bff`), `#ffffff` text, `8px` radius, `36px` desktop min-height, `8px 16px` padding.
- **Secondary / Outline (`.btn-outline`, `.secondary-btn`)**: Surface fill (`#ffffff` light / `#191b20` dark), hairline border, subtle wash on hover, `8px` radius, `36px` desktop min-height, `8px 14px` padding.
- **Browser Chrome**: Theme selection highlights (`::selection`), `2px solid var(--ring)` keyboard focus outlines, and scrollbar colors are derived directly from the palette.
