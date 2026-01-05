# Sprite Assets

This directory supports two sprite formats. Use whichever you have!

## Folder Structure

```
sprites/
├── simple/           # Simple single-sprite per team (SpawnCampGames free)
│   ├── player_red.png
│   ├── player_black.png
│   ├── player_purple.png
│   ├── player_yellow.png
│   └── player_maroon.png
│
├── animated/         # Animation grid sprite sheets (8x6 grid)
│   ├── player_blue.png
│   ├── player_red.png
│   ├── player_green.png
│   ├── player_yellow.png
│   ├── player_purple.png
│   └── player_orange.png
│
├── field.png         # Field with branding
├── field_clean.png   # Field without branding
├── football.png      # Football sprite
└── power_meter.png   # Power meter bar
```

## Format 1: Simple Sprites (SpawnCampGames)

Single circular player sprites, one per team color.
Place in `sprites/simple/` folder.

Colors: `red`, `black`, `purple`, `yellow`, `maroon`

## Format 2: Animated Sprite Sheets (880×550, 110×110 frames)

8 columns × 5 rows grid with animations:
- Row 0: Idle/Standing (8 frames)
- Row 1: Running (8 frames)
- Row 2: Diving/Tackling (8 frames)
- Row 3: Blocking/Catching (8 frames)
- Row 4: Throwing/Celebrating (8 frames)

Place in `sprites/animated/` folder.

Colors: `blue`, `red`, `green`, `yellow`, `purple`, `orange`

## Configuring Frame Size

If your sprite frames differ, update in code:

```typescript
import { updateSpriteConfig } from './graphics/SpriteLoader';

// Call before loading sprites
updateSpriteConfig({
  frameWidth: 48,   // Your frame width
  frameHeight: 48,  // Your frame height
  columns: 8,       // Columns in sheet
  rows: 6,          // Rows in sheet
});
```

## Usage

```tsx
<PixiGameCanvas
  game={gameState}
  useSpriteSheets={true}
  homeTeamColor="blue"
  awayTeamColor="red"
/>
```

The system auto-detects which format is available and falls back gracefully.
