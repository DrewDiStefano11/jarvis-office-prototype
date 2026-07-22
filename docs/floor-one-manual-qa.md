# Floor One Map - Manual QA Checklist

- [ ] Every room polygon was visually inspected and is accurate.
- [ ] Every doorway is positioned at a logical visible opening.
- [ ] All primary corridors have walkable space defined.
- [ ] All major blocked furniture (nexus console, main desks) prevents character movement.
- [ ] Navigation graph connects all major departments to the central nexus and public entrance.
- [ ] Character never clips through blocked walls or furniture.
- [ ] Room hover and selection overlays work correctly without throwing errors.
- [ ] Camera controls (mouse drag, scroll zoom, F to fit, 0 to reset) function correctly.
- [ ] Geometry editing mode toggles successfully and prevents unintended runtime overlap.
- [ ] Map export and import correctly preserve JSON fidelity without ID loss.
- [ ] Foreground occlusion masks successfully render above the character.
- [ ] Browser resizing triggers fit recalculation.
- [ ] No uncaught console errors occur during extended testing.
