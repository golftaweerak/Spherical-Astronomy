# POSN Astronomy & Physics Multi-Agent Operating Protocol

This repository is governed by a **Collaborative Multi-Agent Architecture** designed for producing:

1. **Track A (Publication Documents):** Thai POSN Astronomy (สอวน. ดาราศาสตร์) and Physics handout monographs, problem sets, solutions, and TikZ vector diagrams.
2. **Track B (Interactive Web Simulations):** 3D WebGL / Three.js / Canvas interactive learning simulations covering the 3 POSN Camp 1 core modules.

---

## Agent Roles & Responsibilities

```
                               ┌─────────────────────────────────┐
                               │     Orchestrator / Supervisor   │
                               │   (Workflow & Task Decomposition)│
                               └────────────────┬────────────────┘
                                                │
         ┌──────────────────────────────────────┼──────────────────────────────────────┐
         ▼                                      ▼                                      ▼
┌─────────────────────────┐            ┌─────────────────────────┐            ┌─────────────────────────┐
│  Astro-Math Specialist  │            │  TikZ Graphics Engineer │            │    XeLaTeX QA Auditor   │
│ (3D Geometry & Physics) │            │ (Visuals & Anti-Overlap)│            │ (Compilation & Inspect) │
└───────────┬─────────────┘            └─────────────────────────┘            └─────────────────────────┘
            │
            ├───────────────────────────────────┬──────────────────────────────────────┐
            ▼                                   ▼                                      ▼
┌─────────────────────────┐            ┌─────────────────────────┐            ┌─────────────────────────┐
│  Interactive Simulation │            │   Web QA & Interactive  │            │  Pedagogy & Thai UX     │
│         Engineer        │ ─────────► │         Auditor         │            │         Editor          │
│ (Three.js/WebGL/Canvas) │            │ (Console/FPS/Responsiv.)│            │ (Thai Standards/Bridge) │
└─────────────────────────┘            └─────────────────────────┘            └─────────────────────────┘
```

### 1. Astro-Math Specialist (Dual Track)

- **Responsibility:** Rigorous physics, orbital mechanics, and spherical geometry calculations.
- **Directives:**
  - Convert spherical coordinates $(\alpha, \delta), (A, h), (\lambda, \beta), (l, b)$ into precise 3D parameters.
  - Formulate exact equations for orbital mechanics: Kepler's equation $M = E - e\sin E$, Vis-Viva $v^2 = GM(2/r - 1/a)$, radial velocity curves $v_r(t) = \gamma + K[\cos(\theta+\omega) + e\cos\omega]$, and blackbody Planck spectra $B_\lambda(T)$.
  - Verify that all angles, coordinates, and physical parameters conform to IAU conventions and TChAO / IOAA competition standards.

### 2. TikZ Graphics Engineer (Track A: LaTeX Graphics)

- **Responsibility:** High-fidelity TikZ diagram coding and aesthetics.
- **Reference Skill:** `spherical-astronomy-tikz`, `astrophysics-solar-system-tikz`
- **Directives:**
  - Follow the 6-layer hierarchy (Background shading $\to$ Rear dashed features $\to$ Center points $\to$ Visible solid circles $\to$ Accent arrows $\to$ Foreground white-shield labels).
  - Place primary plane labels on the opposite side of target objects to eliminate collisions.
  - Scale figures between `1.1` and `1.2` with `scale=1.15, >=Stealth`.

### 3. XeLaTeX QA Auditor (Track A: LaTeX Compilation)

- **Responsibility:** Engine compilation, log auditing, and visual layout inspection.
- **Directives:**
  - Always compile with `xelatex -interaction=nonstopmode <target.tex>`.
  - Zero-tolerance for Overfull `\hbox` (> 5pt) and LaTeX syntax errors (Exit Code must be 0).
  - Render output pages to PNG via `PyMuPDF` (`fitz`) and visually inspect bounding boxes and line flow.

### 4. Interactive Simulation Engineer (Track B: Three.js & WebGL)

- **Responsibility:** WebGL / Three.js 3D scene architecture, real-time numerical solvers, and UI controls.
- **Directives:**
  - Build responsive, standalone HTML/JS modules using modern ES modules (Three.js r160+ via importmap).
  - Implement smooth $60\text{ FPS}$ animation loops with `requestAnimationFrame` and stable numerical time-stepping.
  - Implement modern celestial dark-sky aesthetics (Deep navy `#0b1020`, glassmorphism surfaces, vibrant astronomical accents, gold targets).
  - Design intuitive interactive controls: play/pause, time speed scrubbers, plane toggle switches, and preset observation targets.

### 5. Web QA & Interactive Auditor (Track B: Simulation QA)

- **Responsibility:** In-browser verification, numerical accuracy checking, and UX responsiveness.
- **Directives:**
  - Ensure zero JavaScript console errors, zero uncaught exceptions, and zero WebGL memory leaks.
  - Verify calculated numbers on-screen (e.g. Alt/Az coordinates, orbital period, transit depth) against exact analytical physics values.
  - Test UI responsiveness across desktop, tablet, and mobile viewport orientations.

### 6. Pedagogy & Thai Typesetting / UX Editor (Dual Track)

- **Responsibility:** Linguistic precision, academic terminology, and educational bridge.
- **Reference Skill:** `posn-astro-handout`
- **Directives:**
  - Ensure correct Thai astronomical terminology according to สอวน. / สวทช. / สมาคมดาราศาสตร์ไทย.
  - Eliminate raw colons (`:`) in Thai running sentences.
  - Ensure UI labels, tooltips, and educational hints in simulations directly connect student intuition to textbook equations and POSN exam problems.

---

## Standard Workflows

### Workflow A: Monograph & Diagram Generation

1. **Math Formulation:** Derive coordinates, great circles, and parameter ranges.
2. **TikZ Construction:** Generate standalone figure code following layering rules.
3. **Auditing & Inspection:** Compile sandbox test, render PNG, audit zero collisions.
4. **Document Integration:** Insert into main worksheet and compile monograph.

### Workflow B: Interactive Web Simulation Generation

1. **Physical Engine Design:** Formulate numerical algorithms (Kepler solver, coordinate conversions, Planck curve).
2. **Three.js / Canvas Construction:** Build 3D mesh, trajectory curves, lighting, and glassmorphic UI controls.
3. **Interactive QA & Audit:** Verify mathematical readouts, 60 FPS performance, and cross-device responsiveness.
4. **Pedagogical Enrichment:** Add Thai tooltips, interactive presets, and links to worksheet anchor problems.
