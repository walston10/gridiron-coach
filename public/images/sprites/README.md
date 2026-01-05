# Sprite Assets

Place your itch.io sprite sheets in this directory.

## Required Files

### Player Sprites (8x6 grid, 48 frames per sheet)

| Filename | Description |
|----------|-------------|
| `player_blue.png` | Blue team player sprite sheet |
| `player_red.png` | Red team player sprite sheet |
| `player_green.png` | Green team player sprite sheet |
| `player_yellow.png` | Yellow team player sprite sheet |
| `player_purple.png` | Purple team player sprite sheet |

### Expected Sprite Sheet Layout (8 columns x 6 rows)

- **Row 0**: Idle animation (4-8 frames)
- **Row 1**: Running animation (8 frames)
- **Row 2**: Diving/tackling animation (6 frames)
- **Row 3**: Getting up animation (6 frames)
- **Row 4**: Blocking animation (4 frames)
- **Row 5**: Throwing/celebrating (8 frames)

### Other Sprites

| Filename | Description |
|----------|-------------|
| `field.png` | Football field background |
| `football.png` | Football sprite |
| `power_meter.png` | Power meter gradient bar |

## Configuration

If your sprite sheet dimensions differ, update the config in:
`src/graphics/SpriteLoader.ts`

```typescript
export const PLAYER_SPRITE_CONFIG = {
  frameWidth: 32,   // Width of each frame
  frameHeight: 32,  // Height of each frame
  columns: 8,       // Number of columns
  rows: 6,          // Number of rows
};
```

## Usage

To enable sprite sheet mode, pass the `useSpriteSheets` prop:

```tsx
<PixiGameCanvas
  game={gameState}
  useSpriteSheets={true}
  homeTeamColor="blue"
  awayTeamColor="red"
/>
```

The canvas will automatically fall back to pixel art if sprites fail to load.
