---
name: GroupSpace Design System
description: Modern, accessible, high-contrast collaborative workspace system
colors:
  primary: "#2563eb"
  primary-hover: "#1d4ed8"
  primary-light: "#eff6ff"
  accent-green: "#059669"
  accent-amber: "#b45309"
  accent-red: "#dc2626"
  surface-light: "#ffffff"
  background-light: "#f8fafc"
  border-light: "#cbd5e1"
  text-light: "#0f172a"
  text-muted-light: "#475569"
  surface-dark: "#1e293b"
  background-dark: "#0f172a"
  border-dark: "#334155"
  text-dark: "#ffffff"
  text-muted-dark: "#94a3b8"
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
  small:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
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
    padding: "8px 18px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  card:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.text-light}"
    rounded: "{rounded.lg}"
    padding: "20px"
---

# Design System

## Overview
GroupSpace's visual language is built around high-contrast typography, crisp geometric structure, and purposeful elevation. It bridges focused individual productivity with clear team coordination.

## Colors
- **Primary / Brand**: Blue `#2563eb` provides clear interactive affordances and highlights.
- **Accents**: 
  - Success / Action: Emerald `#047857` (light) / `#10b981` (dark).
  - Attention / Pending: Amber `#b45309` (light) / `#f59e0b` (dark).
  - Destructive / Urgent: Crimson `#dc2626` (light) / `#ef4444` (dark).
- **Surfaces**:
  - Light Mode: Neutral slate background `#f8fafc`, pure white card containers `#ffffff`, and border `#cbd5e1`.
  - Dark Mode: Slate background `#0f172a`, card containers `#1e293b`, and border `#334155`.

## Typography
- Default font stack: `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`.
- Editorial and note canvas: Supports classic serif fonts (`Times New Roman`, `Georgia`, `Calibri`, `Arial`) with explicit font-size scales (12px to 36px).
- Legibility floor: All functional UI text, labels, metadata, and badges are minimum `11px` (`0.6875rem`), with body text at `14px-15px`.

## Layout
- Desktop: Left navigation sidebar (`260px`) with fluid main content workspace.
- Mobile: Left navigation transforms into an accessible off-canvas drawer (`transform: translateX(-100%)`) triggered by the top hamburger button (`☰`). Touch targets maintain minimum `44px` height.
- Content measure: Maximum container widths prevent unreadable line lengths (`max-width: 1200px`).

## Elevation & Depth
- Cards and containers declare elevation once: subtle border (`1px solid var(--border)`) paired with soft, low-contrast shadows (`0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)`).
- Zero-offset chromatic halos and harsh artificial glowing borders are prohibited.

## Shapes
- Cards and panels: `12px` to `14px` border-radius.
- Interactive controls (buttons, inputs, selects): `8px` to `10px` border-radius.
- Badges and status pills: `9999px` full-rounded pills.

## Components
- **Buttons**:
  - `.btn-green`: Primary action button with high-contrast text.
  - `.btn-outline`: Secondary action button with subtle border and smooth hover fill.
  - `.personal-tab-btn`: Tab pill control with active container background.
- **Modals**: Centered overlays with backdrop blur (`rgba(15, 23, 42, 0.6)`), accessible close triggers, and responsive max-width.
- **Toolbar Ribbons**: MS Word-style categorized tabs ([Home], [Insert], [Draw], [Layout]) with strict active tab isolation.

## Do's and Don'ts
- **DO**: Maintain WCAG AA text contrast ratio (≥ 4.5:1 for body and labels, ≥ 3:1 for large headings).
- **DO**: Keep micro-labels and badges at or above the 11px floor.
- **DON'T**: Use thick one-sided border stripes (`border-left: 4px`) on rounded cards.
- **DON'T**: Apply zero-offset colored glow halos on dark surfaces.
