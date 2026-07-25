# Design References

This document catalogs Figma design files and their relationship to the codebase.

## Figma Design Files

### Subject Browser & Premium HUD

- **Main Design**: [Subject Browser & Premium HUD](https://www.figma.com/design/oPAdd7oWLQVMTP1v6pJOW0/Untitled?node-id=0-1&t=uwgLA6DfJ5z6ozTR-1)
  - Implementation: `docs/superpowers/specs/2026-07-25-subject-browser-premium-hud-design.md`
  - Plan: `docs/superpowers/plans/2026-07-25-subject-browser-premium-hud.md`
  - Status: In progress (Phase C)

- **Detailed Components**: [Component Specifications](https://www.figma.com/design/oPAdd7oWLQVMTP1v6pJOW0/Untitled?node-id=18-113&t=uwgLA6DfJ5z6ozTR-1)
  - Detailed component layouts and interactions

- **Additional Pages**: [Extended Designs](https://www.figma.com/design/oPAdd7oWLQVMTP1v6pJOW0/Untitled?node-id=44-287&t=uwgLA6DfJ5z6ozTR-1)
  - Extended design variations and states

- **Final Polish**: [Premium HUD Polish](https://www.figma.com/design/oPAdd7oWLQVMTP1v6pJOW0/Untitled?node-id=46-905&t=uwgLA6DfJ5z6ozTR-1)
  - Premium visual treatment and polish specifications

## Design System

The project follows a **Paper-Cut Protest** design system with:

- **Palette**: Locked to cream (`#EDE7DD`), slate (`#5B7A8C`), sage (`#6D7A5E`), ink (`#2A2420`), coral (`#E8A9A0`)
- **Typography**: Fraunces (display) + Space Mono (mono)
- **Visual Style**: Hand-cut paper aesthetic with torn edges, offset shadows, and tactile feedback
- **Implementation**: `src/render/paperCut.ts` provides shared utilities for edge wobble and shadow treatment

## Design-to-Code Mapping

| Design Element | Implementation |
|---|---|
| Torn paper edges | `src/render/paperCut.ts:paperCutEdgePath()` |
| Offset shadows | `src/render/paperCut.ts:withPaperCutShadow()` |
| HUD placard | `src/hud/Hud.ts` + `src/hud/hud.css` |
| Subject browser drawer | `src/hud/SubjectDrawer.ts` + `src/hud/subjectDrawer.css` |
| Drag interaction | `src/input/SubjectDragSource.ts` |
| Spring easing | `src/config/tokens.ts:EASE.spring` + `src/styles/tokens.css:--ease-spring` |

## Adding New Design References

When adding new Figma designs:

1. Add the link to this document with a descriptive title
2. Reference the related spec/plan files
3. Note the implementation status
4. Update the Design-to-Code Mapping table if new components are introduced
