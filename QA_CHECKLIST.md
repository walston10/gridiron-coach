# Illegal Motion - QA Checklist

## Pre-Launch Testing Checklist

### 1. App Initialization
- [ ] App loads without errors on fresh visit
- [ ] Sound system initializes (verify console has no audio errors)
- [ ] Settings load from localStorage correctly
- [ ] Save system initializes (IndexedDB available)
- [ ] Main menu displays correctly

### 2. Main Menu
- [ ] "New Franchise" button works
- [ ] "Continue" button appears only when saves exist
- [ ] "Load Game" opens save manager
- [ ] "Settings" opens settings panel
- [ ] Menu music plays (if not muted)
- [ ] Hover sounds work on buttons

### 3. Settings Panel
- [ ] Audio tab: All volume sliders work
- [ ] Audio tab: Mute toggle works
- [ ] Gameplay tab: Difficulty selection persists
- [ ] Gameplay tab: Game length selection persists
- [ ] Gameplay tab: Animation speed affects playback
- [ ] Gameplay tab: Auto-save toggle works
- [ ] Display tab: All toggles work
- [ ] Accessibility tab: Reduced motion affects animations
- [ ] "Reset to Defaults" works
- [ ] Settings persist after browser refresh

### 4. Intro Sequence
- [ ] Loading screen shows progress bar
- [ ] Loading tips rotate
- [ ] Skip button works during loading
- [ ] Intro cinematic plays after loading
- [ ] Audio syncs with visuals (Ken Burns + voiceover)
- [ ] Skip button works during intro
- [ ] Transition to name input is smooth

### 5. GM Name Input
- [ ] Text input accepts characters
- [ ] Validation prevents empty name
- [ ] "Start" button is disabled until name entered
- [ ] Name persists to game state

### 6. Save/Load System
- [ ] Creating new save works
- [ ] Save slots display correct metadata
- [ ] Loading a save restores game state
- [ ] Delete save with confirmation works
- [ ] Rename save works
- [ ] Export save generates valid JSON
- [ ] Import save validates and loads
- [ ] Auto-save triggers on phase changes
- [ ] Auto-save indicator shows during saves
- [ ] Maximum 5 saves enforced

### 7. Desk View (Main Hub)
- [ ] All desk items are clickable
- [ ] Calendar shows current week
- [ ] Meters display correctly
- [ ] Phone interactions work
- [ ] Computer opens properly
- [ ] Files open properly
- [ ] Owner photo interaction works
- [ ] Whiskey Easter egg works (if implemented)

### 8. Weekly Events
- [ ] Events display correctly
- [ ] Event choices have visible effects
- [ ] Event outcomes affect meters
- [ ] Events advance properly with calendar

### 9. Draft
- [ ] Draft board displays all prospects
- [ ] Scouting reveals hidden ratings
- [ ] Player selection works
- [ ] Draft picks advance properly
- [ ] Draft class joins roster

### 10. Game Day
- [ ] Game initializes correctly
- [ ] Play selection UI works
- [ ] Offensive plays execute
- [ ] Defensive plays execute
- [ ] Play results display correctly
- [ ] Score updates properly
- [ ] Clock management works
- [ ] Timeouts work
- [ ] Quarter transitions work
- [ ] Halftime displays
- [ ] Game end shows results
- [ ] Stats are recorded

### 11. Playbook
- [ ] Playbook list displays all plays
- [ ] Play preview shows formation
- [ ] Folder organization works
- [ ] Tag filtering works
- [ ] Search works (if implemented)

### 12. Play Designer
- [ ] Formation selection works
- [ ] Route assignment works
- [ ] Blocking assignments work
- [ ] Play validation works
- [ ] Save new play works

### 13. Roster/Franchise
- [ ] Team roster displays correctly
- [ ] Player cards show stats
- [ ] Depth chart is editable
- [ ] Contract information displays

### 14. Season Flow
- [ ] Schedule displays correctly
- [ ] Standings update after games
- [ ] Playoff qualification works
- [ ] Season end triggers properly
- [ ] Offseason phases work

### 15. Offseason
- [ ] Season end summary displays
- [ ] Contract decisions work
- [ ] Free agency signings work
- [ ] Draft picks work
- [ ] Training camp progression works
- [ ] New season starts correctly

### 16. Tutorial System
- [ ] First-run tutorials trigger
- [ ] Tutorial hints display correctly
- [ ] "Skip all" works
- [ ] Tutorial completion persists
- [ ] Target element highlighting works

### 17. Pause Menu
- [ ] ESC key opens pause menu
- [ ] Resume button closes menu
- [ ] Save/Load buttons work
- [ ] Settings button opens settings
- [ ] "Return to Main Menu" works
- [ ] No game state lost on pause

### 18. Error Handling
- [ ] Error boundary catches component errors
- [ ] Error screen shows helpful message
- [ ] "Try Again" button works
- [ ] "Return to Main Menu" works
- [ ] "Reload Game" works
- [ ] No console errors in normal play

### 19. Performance
- [ ] No noticeable lag in UI interactions
- [ ] Animations are smooth (60fps target)
- [ ] Memory usage stays stable during session
- [ ] No memory leaks after navigating screens
- [ ] Game performs well after 30+ minutes

### 20. Browser Compatibility
- [ ] Chrome (latest): Full functionality
- [ ] Firefox (latest): Full functionality
- [ ] Safari (latest): Full functionality
- [ ] Edge (latest): Full functionality
- [ ] Mobile browsers: Reasonable experience

### 21. Accessibility
- [ ] Reduced motion setting works
- [ ] High contrast mode improves visibility
- [ ] Color blind modes work
- [ ] Screen reader basics (if implemented)
- [ ] Keyboard navigation (if implemented)

### 22. Data Persistence
- [ ] Game state survives browser refresh
- [ ] Game state survives browser close
- [ ] Settings survive browser refresh
- [ ] Tutorial progress persists
- [ ] Export/Import maintains all data

---

## Known Issues to Verify Fixed

1. [ ] Intro audio/video sync race condition
2. [ ] Suspension duration now capped at 2 games
3. [ ] Save validation prevents corrupted loads
4. [ ] Error boundary prevents white screen of death

---

## Launch Readiness Assessment

### Must Have (P0)
- [ ] App loads without errors
- [ ] New game flow works end-to-end
- [ ] Save/Load functions correctly
- [ ] No game-breaking bugs in core loop
- [ ] Error handling prevents crashes

### Should Have (P1)
- [ ] All settings work
- [ ] Tutorial system helps new players
- [ ] Audio enhances experience
- [ ] UI polish is consistent

### Nice to Have (P2)
- [ ] All animations smooth
- [ ] All Easter eggs work
- [ ] Performance optimized
- [ ] Full accessibility support

---

## Test Environment Notes

- Node version: (check `node -v`)
- npm version: (check `npm -v`)
- Browser: Chrome/Firefox/Safari version
- OS: Windows/Mac/Linux
- Date tested: ____/____/____
- Tester: ________________
