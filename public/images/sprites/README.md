# SpawnCampGames Sprite Assets

Place your itch.io football assets in this directory.

## Required Files

### Player Sprites (single circular sprites per team color)

| Filename | Description |
|----------|-------------|
| `player_red.png` | Red team player |
| `player_black.png` | Black/gray team player |
| `player_purple.png` | Purple team player |
| `player_yellow.png` | Yellow/gold team player |
| `player_maroon.png` | Maroon/dark red team player |

### Field Background

| Filename | Description |
|----------|-------------|
| `field.png` | Field with SPAWNCAMPGAMES branding |
| `field_clean.png` | Field without branding |

### Other Sprites

| Filename | Description |
|----------|-------------|
| `football.png` | Football sprite |
| `power_meter.png` | Power meter gradient bar |

## Usage

Enable sprite mode in your game component:

```tsx
<PixiGameCanvas
  game={gameState}
  useSpriteSheets={true}
  homeTeamColor="purple"
  awayTeamColor="red"
/>
```

Available team colors: `red`, `black`, `purple`, `yellow`, `maroon`

The canvas will fall back to built-in pixel art if sprites aren't found.
