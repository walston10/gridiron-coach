import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Application, Graphics, Container, Text, TextStyle, Sprite, Texture } from 'pixi.js';
import type { LiveGame } from '../../types';
import {
  loadPlayerSpriteSheet,
  loadFieldTexture,
  loadFootballTexture,
  ANIMATION_DEFINITIONS,
  getAnimationFrames,
  type TeamColor,
} from '../../graphics/SpriteLoader';

interface PixiGameCanvasProps {
  game: LiveGame;
  width?: number;
  height?: number;
  /** Use sprite sheet mode instead of inline pixel art */
  useSpriteSheets?: boolean;
  /** Team colors for sprite sheets */
  homeTeamColor?: TeamColor;
  awayTeamColor?: TeamColor;
}

// Sprite sheet state
interface LoadedSprites {
  home: Texture[][] | null;
  away: Texture[][] | null;
  field: Texture | null;
  football: Texture | null;
}

// Team color palettes - Retro Bowl style (brighter, more saturated)
const TEAM_PALETTES = {
  home: {
    helmet: 0x1e40af,           // Dark blue helmet
    jersey: 0x3b82f6,           // Bright blue jersey
    pants: 0xf0f0f0,            // White pants
    stripe: 0xffffff,           // White stripe
  },
  away: {
    helmet: 0xb91c1c,           // Dark red helmet
    jersey: 0xef4444,           // Bright red jersey
    pants: 0x374151,            // Gray pants
    stripe: 0xffffff,           // White stripe
  },
};

// Pixel art sprite data - Retro Bowl style (10x14 pixels)
// 0=transparent, 1=helmet, 2=jersey, 3=pants, 4=skin, 5=outline, 6=facemask, 7=stripe
const SPRITE_STANDING: number[][] = [
  [0, 0, 0, 5, 1, 1, 5, 0, 0, 0],  // Helmet top
  [0, 0, 5, 1, 1, 1, 1, 5, 0, 0],  // Helmet
  [0, 0, 5, 1, 1, 1, 1, 5, 0, 0],  // Helmet
  [0, 0, 0, 5, 6, 6, 5, 0, 0, 0],  // Facemask
  [0, 0, 0, 0, 4, 4, 0, 0, 0, 0],  // Neck
  [0, 0, 5, 2, 2, 2, 2, 5, 0, 0],  // Jersey shoulders
  [0, 5, 2, 2, 7, 7, 2, 2, 5, 0],  // Jersey with stripe
  [0, 5, 2, 2, 7, 7, 2, 2, 5, 0],  // Jersey with stripe
  [0, 0, 5, 2, 2, 2, 2, 5, 0, 0],  // Jersey bottom
  [0, 0, 5, 3, 3, 3, 3, 5, 0, 0],  // Pants
  [0, 0, 5, 3, 3, 3, 3, 5, 0, 0],  // Pants
  [0, 0, 5, 3, 0, 0, 3, 5, 0, 0],  // Legs
  [0, 0, 5, 5, 0, 0, 5, 5, 0, 0],  // Cleats
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],  // Empty row for shadow space
];

// Running animation frame 1 (legs apart)
const SPRITE_RUNNING_1: number[][] = [
  [0, 0, 0, 5, 1, 1, 5, 0, 0, 0],
  [0, 0, 5, 1, 1, 1, 1, 5, 0, 0],
  [0, 0, 5, 1, 1, 1, 1, 5, 0, 0],
  [0, 0, 0, 5, 6, 6, 5, 0, 0, 0],
  [0, 0, 0, 0, 4, 4, 0, 0, 0, 0],
  [0, 0, 5, 2, 2, 2, 2, 5, 0, 0],
  [0, 5, 2, 2, 7, 7, 2, 2, 5, 0],
  [0, 5, 2, 2, 7, 7, 2, 2, 5, 0],
  [0, 0, 5, 2, 2, 2, 2, 5, 0, 0],
  [0, 0, 5, 3, 3, 3, 3, 5, 0, 0],
  [0, 5, 3, 3, 0, 0, 3, 3, 5, 0],  // Legs spread
  [0, 5, 5, 0, 0, 0, 0, 5, 5, 0],  // Cleats spread
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

// Running animation frame 2 (legs together)
const SPRITE_RUNNING_2: number[][] = [
  [0, 0, 0, 5, 1, 1, 5, 0, 0, 0],
  [0, 0, 5, 1, 1, 1, 1, 5, 0, 0],
  [0, 0, 5, 1, 1, 1, 1, 5, 0, 0],
  [0, 0, 0, 5, 6, 6, 5, 0, 0, 0],
  [0, 0, 0, 0, 4, 4, 0, 0, 0, 0],
  [0, 0, 5, 2, 2, 2, 2, 5, 0, 0],
  [0, 5, 2, 2, 7, 7, 2, 2, 5, 0],
  [0, 5, 2, 2, 7, 7, 2, 2, 5, 0],
  [0, 0, 5, 2, 2, 2, 2, 5, 0, 0],
  [0, 0, 5, 3, 3, 3, 3, 5, 0, 0],
  [0, 0, 0, 5, 3, 3, 5, 0, 0, 0],  // Legs together
  [0, 0, 0, 5, 5, 5, 5, 0, 0, 0],  // Cleats together
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

// Map color indices to actual colors for a team
function getSpriteColors(palette: typeof TEAM_PALETTES.home): Record<number, number> {
  return {
    0: 0x000000,      // Transparent (will skip)
    1: palette.helmet,
    2: palette.jersey,
    3: palette.pants,
    4: 0xffdbac,      // Skin tone
    5: 0x1a1a1a,      // Outline/black
    6: 0x4a4a4a,      // Facemask gray
    7: palette.stripe,
  };
}

// Draw a pixel art sprite
function drawPixelSprite(
  graphics: Graphics,
  x: number,
  y: number,
  scale: number,
  sprite: number[][],
  colors: Record<number, number>,
  isBallCarrier: boolean = false
) {
  const pixelSize = Math.max(1, Math.floor(2 * scale)); // Each "pixel" is 2 screen pixels at scale 1
  const spriteWidth = sprite[0].length;
  const spriteHeight = sprite.length;

  // Center the sprite on x, y
  const startX = x - (spriteWidth * pixelSize) / 2;
  const startY = y - (spriteHeight * pixelSize) / 2;

  // Ball carrier glow
  if (isBallCarrier) {
    graphics.circle(x, y, spriteWidth * pixelSize * 0.8);
    graphics.fill({ color: 0xfbbf24, alpha: 0.4 });
  }

  // Draw shadow
  graphics.ellipse(x + 2 * scale, y + spriteHeight * pixelSize * 0.4,
                   spriteWidth * pixelSize * 0.4, pixelSize * 2);
  graphics.fill({ color: 0x000000, alpha: 0.3 });

  // Draw each pixel
  for (let row = 0; row < spriteHeight; row++) {
    for (let col = 0; col < spriteWidth; col++) {
      const colorIndex = sprite[row][col];
      if (colorIndex === 0) continue; // Skip transparent

      const color = colors[colorIndex];
      const px = startX + col * pixelSize;
      const py = startY + row * pixelSize;

      graphics.rect(px, py, pixelSize, pixelSize);
      graphics.fill(color);
    }
  }
}

// Generate jersey numbers from player position IDs (NFL-style)
function getJerseyNumber(playerId: string): number {
  const id = playerId.toUpperCase();

  // Offense
  if (id === 'QB') return 12;
  if (id === 'RB' || id === 'HB') return 28;
  if (id === 'FB') return 44;
  if (id === 'WR1') return 11;
  if (id === 'WR2') return 84;
  if (id === 'FLEX') return 87;
  if (id === 'TE') return 87;
  if (id === 'LT') return 76;
  if (id === 'RT') return 71;

  // Defense
  if (id === 'CB1') return 24;
  if (id === 'CB2') return 21;
  if (id === 'S' || id === 'FS' || id === 'SS') return 32;
  if (id === 'LB1' || id === 'MLB') return 54;
  if (id === 'LB2' || id === 'OLB') return 58;
  if (id === 'EDGE_L') return 91;
  if (id === 'EDGE_R') return 99;
  if (id === 'DT_L') return 97;
  if (id === 'DT_R') return 93;
  if (id === 'NT') return 95;

  // Fallback
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
  }
  return Math.abs(hash % 89) + 10;
}

export const PixiGameCanvas: React.FC<PixiGameCanvasProps> = ({
  game,
  width = 900,
  height = 600,
  useSpriteSheets = false,
  homeTeamColor = 'blue',
  awayTeamColor = 'red',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const fieldContainerRef = useRef<Container | null>(null);
  const dynamicContainerRef = useRef<Container | null>(null);
  const spriteContainerRef = useRef<Container | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [loadedSprites, setLoadedSprites] = useState<LoadedSprites>({
    home: null,
    away: null,
    field: null,
    football: null,
  });
  const [spritesLoaded, setSpritesLoaded] = useState(false);

  // Player sprite pool for sprite sheet mode
  const playerSpritesRef = useRef<Map<string, Sprite>>(new Map());

  const ENGINE_WIDTH = 160;
  const VISIBLE_YARDS = 50;
  const HORIZON_Y = 80;
  const YARDS_TO_UNITS = 3;

  // Coordinate helpers
  const yardLineToEngineY = (yardLine: number) => (yardLine + 10) * 3;
  const engineYToYardLine = (y: number) => Math.floor(y / 3) - 10;

  // Load sprite sheets when enabled
  useEffect(() => {
    if (!useSpriteSheets) return;

    let cancelled = false;

    const loadSprites = async () => {
      try {
        const [homeSprites, awaySprites] = await Promise.all([
          loadPlayerSpriteSheet(homeTeamColor).catch(() => null),
          loadPlayerSpriteSheet(awayTeamColor).catch(() => null),
        ]);

        // Also try to load field and football sprites
        const [fieldTex, footballTex] = await Promise.all([
          loadFieldTexture().catch(() => null),
          loadFootballTexture().catch(() => null),
        ]);

        if (!cancelled) {
          setLoadedSprites({
            home: homeSprites,
            away: awaySprites,
            field: fieldTex,
            football: footballTex,
          });
          setSpritesLoaded(true);
          console.log('Sprite sheets loaded:', {
            home: !!homeSprites,
            away: !!awaySprites,
            field: !!fieldTex,
            football: !!footballTex,
          });
        }
      } catch (err) {
        console.warn('Failed to load sprite sheets, falling back to pixel art:', err);
        if (!cancelled) {
          setSpritesLoaded(false);
        }
      }
    };

    loadSprites();

    return () => {
      cancelled = true;
    };
  }, [useSpriteSheets, homeTeamColor, awayTeamColor]);

  // Helper to get sprite texture for current animation frame
  const getSpriteTexture = useCallback((
    sprites: Texture[][] | null,
    animName: 'idle' | 'running',
    frameIndex: number
  ): Texture | null => {
    if (!sprites) return null;
    const frames = getAnimationFrames(sprites, animName);
    if (frames.length === 0) return null;
    return frames[frameIndex % frames.length];
  }, []);

  // Initialize Pixi
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let app: Application | null = null;
    let cancelled = false;

    const initPixi = async () => {
      try {
        app = new Application();

        await app.init({
          width,
          height,
          background: '#1a1a2e',
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
          preference: 'webgl',
        });

        if (cancelled || !app.canvas) {
          app?.destroy(true);
          return;
        }

        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
        container.appendChild(app.canvas);

        appRef.current = app;

        // Containers for layering
        const fieldContainer = new Container();
        const spriteContainer = new Container(); // For sprite sheet players
        const dynamicContainer = new Container();

        app.stage.addChild(fieldContainer);
        app.stage.addChild(spriteContainer);
        app.stage.addChild(dynamicContainer);

        fieldContainerRef.current = fieldContainer;
        spriteContainerRef.current = spriteContainer;
        dynamicContainerRef.current = dynamicContainer;

        app.render();
        setIsReady(true);
      } catch (err) {
        console.error('Failed to initialize Pixi:', err);
      }
    };

    initPixi();

    return () => {
      cancelled = true;
      if (appRef.current) {
        // Clear sprite pool
        playerSpritesRef.current.clear();
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
        fieldContainerRef.current = null;
        spriteContainerRef.current = null;
        dynamicContainerRef.current = null;
      }
      setIsReady(false);
    };
  }, [width, height]);

  // Render game
  useEffect(() => {
    if (!appRef.current || !fieldContainerRef.current || !dynamicContainerRef.current) return;

    const fieldContainer = fieldContainerRef.current;
    const dynamicContainer = dynamicContainerRef.current;

    // Clear containers
    fieldContainer.removeChildren();
    dynamicContainer.removeChildren();

    // Calculate viewport
    const losEngineY = yardLineToEngineY(game.fieldPosition.yardLine);
    let cameraFocusY = losEngineY;

    if (game.state === 'PLAY_RUNNING' || game.state === 'SNAP') {
      if (game.ballInFlight) {
        cameraFocusY = game.ballInFlight.y;
      } else if (game.ballCarrier) {
        cameraFocusY = game.ballCarrier.y;
      }
    }

    const viewportStartY = cameraFocusY - 12 * YARDS_TO_UNITS;
    const minViewport = yardLineToEngineY(-10);
    const maxViewport = yardLineToEngineY(110) - VISIBLE_YARDS * YARDS_TO_UNITS;
    const clampedStartY = Math.max(minViewport, Math.min(viewportStartY, maxViewport));
    const clampedEndY = clampedStartY + VISIBLE_YARDS * YARDS_TO_UNITS;

    // Screen layout
    const fieldMarginX = 50;
    const fieldTop = HORIZON_Y;
    const fieldBottom = height - 40;
    const fieldHeight = fieldBottom - fieldTop;

    // Transform functions
    const getDepth = (engineY: number) => {
      return (engineY - clampedStartY) / (clampedEndY - clampedStartY);
    };

    const toScreen = (engineX: number, engineY: number) => {
      const depth = getDepth(engineY);
      const screenY = fieldBottom - depth * fieldHeight;
      const perspectiveScale = 1 - depth * 0.35; // Reduced from 0.6 for better visibility
      const centerX = width / 2;
      const fieldWidthAtDepth = (width - fieldMarginX * 2) * perspectiveScale;
      const normalizedX = (engineX / ENGINE_WIDTH) - 0.5;
      const screenX = centerX + normalizedX * fieldWidthAtDepth;
      return { x: screenX, y: screenY, scale: perspectiveScale };
    };

    // Draw background
    const bgGraphics = new Graphics();
    bgGraphics.rect(0, 0, width, height);
    bgGraphics.fill(0x1a1a2e);
    fieldContainer.addChild(bgGraphics);

    // Draw grass stripes (batched into single Graphics)
    const grassGraphics = new Graphics();
    const startYard = engineYToYardLine(clampedStartY);
    const endYard = engineYToYardLine(clampedEndY);

    for (let yard = Math.floor(startYard / 5) * 5; yard <= Math.ceil(endYard / 5) * 5; yard += 5) {
      if (yard < 0 || yard > 100) continue;

      const engineY1 = yardLineToEngineY(yard);
      const engineY2 = yardLineToEngineY(yard + 5);

      const topLeft = toScreen(0, engineY2);
      const topRight = toScreen(ENGINE_WIDTH, engineY2);
      const bottomLeft = toScreen(0, engineY1);
      const bottomRight = toScreen(ENGINE_WIDTH, engineY1);

      grassGraphics.moveTo(bottomLeft.x, bottomLeft.y);
      grassGraphics.lineTo(bottomRight.x, bottomRight.y);
      grassGraphics.lineTo(topRight.x, topRight.y);
      grassGraphics.lineTo(topLeft.x, topLeft.y);
      grassGraphics.closePath();
      grassGraphics.fill((yard / 5) % 2 === 0 ? 0x166534 : 0x15803d);
    }
    fieldContainer.addChild(grassGraphics);

    // Draw endzones (batched)
    const endzoneGraphics = new Graphics();

    const ownGoalLineY = yardLineToEngineY(0);
    const ownEndzoneBackY = yardLineToEngineY(-10);
    if (clampedStartY < ownGoalLineY) {
      const endzoneStart = Math.max(ownEndzoneBackY, clampedStartY);
      const topLeft = toScreen(0, ownGoalLineY);
      const topRight = toScreen(ENGINE_WIDTH, ownGoalLineY);
      const bottomLeft = toScreen(0, endzoneStart);
      const bottomRight = toScreen(ENGINE_WIDTH, endzoneStart);

      endzoneGraphics.moveTo(bottomLeft.x, bottomLeft.y);
      endzoneGraphics.lineTo(bottomRight.x, bottomRight.y);
      endzoneGraphics.lineTo(topRight.x, topRight.y);
      endzoneGraphics.lineTo(topLeft.x, topLeft.y);
      endzoneGraphics.closePath();
      endzoneGraphics.fill(0x5f1e1e);
    }

    const oppGoalLineY = yardLineToEngineY(100);
    const oppEndzoneBackY = yardLineToEngineY(110);
    if (clampedEndY > oppGoalLineY) {
      const endzoneEnd = Math.min(oppEndzoneBackY, clampedEndY);
      const topLeft = toScreen(0, endzoneEnd);
      const topRight = toScreen(ENGINE_WIDTH, endzoneEnd);
      const bottomLeft = toScreen(0, oppGoalLineY);
      const bottomRight = toScreen(ENGINE_WIDTH, oppGoalLineY);

      endzoneGraphics.moveTo(bottomLeft.x, bottomLeft.y);
      endzoneGraphics.lineTo(bottomRight.x, bottomRight.y);
      endzoneGraphics.lineTo(topRight.x, topRight.y);
      endzoneGraphics.lineTo(topLeft.x, topLeft.y);
      endzoneGraphics.closePath();
      endzoneGraphics.fill(0x1e3a5f);
    }
    fieldContainer.addChild(endzoneGraphics);

    // Draw yard lines (all in one Graphics object)
    const lines = new Graphics();
    for (let yard = Math.floor(startYard / 5) * 5; yard <= endYard; yard += 5) {
      if (yard < 0 || yard > 100) continue;

      const engineY = yardLineToEngineY(yard);
      const left = toScreen(0, engineY);
      const right = toScreen(ENGINE_WIDTH, engineY);

      const isMajor = yard % 10 === 0;
      lines.moveTo(left.x, left.y);
      lines.lineTo(right.x, right.y);
      lines.stroke({
        width: isMajor ? 3 * left.scale : 1,
        color: 0xffffff,
        alpha: isMajor ? 0.8 : 0.3,
      });
    }

    // Draw sidelines
    const nearLeft = toScreen(0, clampedStartY);
    const nearRight = toScreen(ENGINE_WIDTH, clampedStartY);
    const farLeft = toScreen(0, clampedEndY);
    const farRight = toScreen(ENGINE_WIDTH, clampedEndY);

    lines.moveTo(nearLeft.x, nearLeft.y);
    lines.lineTo(farLeft.x, farLeft.y);
    lines.stroke({ width: 3, color: 0xffffff, alpha: 0.9 });

    lines.moveTo(nearRight.x, nearRight.y);
    lines.lineTo(farRight.x, farRight.y);
    lines.stroke({ width: 3, color: 0xffffff, alpha: 0.9 });

    fieldContainer.addChild(lines);

    // Draw yard numbers
    const textStyle = new TextStyle({
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: 'bold',
      fill: 0xffffff,
    });

    for (let yard = Math.floor(startYard / 10) * 10; yard <= endYard; yard += 10) {
      if (yard <= 0 || yard >= 100) continue;

      const engineY = yardLineToEngineY(yard);
      const pos = toScreen(ENGINE_WIDTH / 2, engineY);
      const num = yard <= 50 ? yard : 100 - yard;

      textStyle.fontSize = Math.max(12, Math.floor(24 * pos.scale));
      const text = new Text({ text: num.toString(), style: textStyle });
      text.anchor.set(0.5);
      text.position.set(pos.x, pos.y);
      text.alpha = 0.7;
      fieldContainer.addChild(text);
    }

    // Draw line of scrimmage
    const losLeft = toScreen(0, losEngineY);
    const losRight = toScreen(ENGINE_WIDTH, losEngineY);

    const losLine = new Graphics();
    losLine.moveTo(losLeft.x, losLeft.y);
    losLine.lineTo(losRight.x, losRight.y);
    losLine.stroke({ width: 4 * losLeft.scale, color: 0x3b82f6, alpha: 0.9 });
    dynamicContainer.addChild(losLine);

    // Draw first down line
    const firstDownYard = game.fieldPosition.yardLine + game.fieldPosition.yardsToGo;
    if (firstDownYard <= 100) {
      const fdEngineY = yardLineToEngineY(firstDownYard);
      const fdLeft = toScreen(0, fdEngineY);
      const fdRight = toScreen(ENGINE_WIDTH, fdEngineY);

      const fdLine = new Graphics();
      fdLine.moveTo(fdLeft.x, fdLeft.y);
      fdLine.lineTo(fdRight.x, fdRight.y);
      fdLine.stroke({ width: 4 * fdLeft.scale, color: 0xfbbf24, alpha: 0.9 });
      dynamicContainer.addChild(fdLine);
    }

    // Determine team assignments
    const offenseTeam = game.possession || 'home';
    const defenseTeam = offenseTeam === 'home' ? 'away' : 'home';

    // Animation frame based on time (for running animation)
    const animFrame = Math.floor(Date.now() / 100) % 8; // 8 frames, 100ms each
    const animFrameSimple = Math.floor(Date.now() / 150) % 2; // Simple 2-frame for pixel art
    const isPlayActive = game.state === 'PLAY_RUNNING' || game.state === 'SNAP';

    // Sort players by depth (far first for proper layering)
    const sortedPlayers = [...game.playerPositions].sort((a, b) => b.y - a.y);

    // Check if we should use sprite sheets
    const useSprites = useSpriteSheets && spritesLoaded && loadedSprites.home && loadedSprites.away;
    const spriteContainer = spriteContainerRef.current;

    if (useSprites && spriteContainer) {
      // Clear sprite container
      spriteContainer.removeChildren();

      // Render players using loaded sprite sheets
      sortedPlayers.forEach(player => {
        const pos = toScreen(player.x, player.y);
        if (pos.y < fieldTop - 20 || pos.y > fieldBottom + 20) return;

        const isBallCarrier = game.ballCarrier && player.id === game.ballCarrier.playerId;
        const isOffense = player.role === 'offense';
        const teamSprites = isOffense
          ? (offenseTeam === 'home' ? loadedSprites.home : loadedSprites.away)
          : (defenseTeam === 'home' ? loadedSprites.home : loadedSprites.away);

        if (!teamSprites) return;

        // Get the correct animation frame
        const animName = isPlayActive ? 'running' : 'idle';
        const texture = getSpriteTexture(teamSprites, animName, animFrame);

        if (!texture) return;

        // Create or reuse sprite
        let sprite = playerSpritesRef.current.get(player.id);
        if (!sprite) {
          sprite = new Sprite();
          sprite.anchor.set(0.5, 1); // Bottom center anchor
          playerSpritesRef.current.set(player.id, sprite);
        }

        sprite.texture = texture;
        sprite.x = pos.x;
        sprite.y = pos.y;
        sprite.scale.set(pos.scale * 2); // Scale up sprites

        // Ball carrier glow effect
        if (isBallCarrier) {
          sprite.tint = 0xffffaa; // Slight yellow tint
        } else {
          sprite.tint = 0xffffff; // Normal
        }

        spriteContainer.addChild(sprite);
      });

      // Draw ball carrier highlight ring
      if (game.ballCarrier) {
        const pos = toScreen(game.ballCarrier.x, game.ballCarrier.y);
        const glowGraphics = new Graphics();
        glowGraphics.circle(pos.x, pos.y - 10 * pos.scale, 20 * pos.scale);
        glowGraphics.fill({ color: 0xfbbf24, alpha: 0.3 });
        dynamicContainer.addChild(glowGraphics);
      }
    } else {
      // Fallback to pixel art rendering
      const playerGraphics = new Graphics();

      // Draw players using Retro Bowl pixel art style
      sortedPlayers.forEach(player => {
        const pos = toScreen(player.x, player.y);
        if (pos.y < fieldTop - 20 || pos.y > fieldBottom + 20) return;

        // Skip ball carrier (drawn on top separately)
        if (game.ballCarrier && player.id === game.ballCarrier.playerId) return;

        const isOffense = player.role === 'offense';
        const palette = TEAM_PALETTES[isOffense ? offenseTeam : defenseTeam];
        const colors = getSpriteColors(palette);

        // Use running animation during active play, standing otherwise
        const sprite = isPlayActive
          ? (animFrameSimple === 0 ? SPRITE_RUNNING_1 : SPRITE_RUNNING_2)
          : SPRITE_STANDING;

        drawPixelSprite(playerGraphics, pos.x, pos.y, pos.scale, sprite, colors, false);
      });

      dynamicContainer.addChild(playerGraphics);

      // Draw ball carrier on top with glow
      if (game.ballCarrier) {
        const pos = toScreen(game.ballCarrier.x, game.ballCarrier.y);
        const palette = TEAM_PALETTES[offenseTeam];
        const colors = getSpriteColors(palette);

        // Ball carrier always uses running sprite when play is active
        const sprite = isPlayActive
          ? (animFrameSimple === 0 ? SPRITE_RUNNING_1 : SPRITE_RUNNING_2)
          : SPRITE_STANDING;

        const ballCarrierGraphics = new Graphics();
        drawPixelSprite(ballCarrierGraphics, pos.x, pos.y, pos.scale, sprite, colors, true);
        dynamicContainer.addChild(ballCarrierGraphics);
      }
    }

    // Draw ball in flight
    if (game.ballInFlight) {
      const pos = toScreen(game.ballInFlight.x, game.ballInFlight.y);
      const arcHeight = Math.sin(game.ballInFlight.progress * Math.PI);
      const liftAmount = arcHeight * 60 * pos.scale;

      // Shadow
      const ballGraphics = new Graphics();
      const shadowSize = (8 + arcHeight * 4) * pos.scale;
      ballGraphics.ellipse(pos.x, pos.y, shadowSize, shadowSize * 0.4);
      ballGraphics.fill({ color: 0x000000, alpha: 0.4 });
      dynamicContainer.addChild(ballGraphics);

      // Use football sprite if loaded, otherwise draw with graphics
      if (useSpriteSheets && loadedSprites.football) {
        const ballSprite = new Sprite(loadedSprites.football);
        ballSprite.anchor.set(0.5);
        ballSprite.x = pos.x;
        ballSprite.y = pos.y - liftAmount;
        ballSprite.scale.set(pos.scale * 1.5);
        ballSprite.rotation = game.ballInFlight.progress * Math.PI * 4; // Spin
        dynamicContainer.addChild(ballSprite);
      } else {
        // Fallback to drawn ball
        const ballWidth = 12 * pos.scale;
        const ballHeight = 7 * pos.scale;
        ballGraphics.ellipse(pos.x, pos.y - liftAmount, ballWidth, ballHeight);
        ballGraphics.fill(0x92400e);

        ballGraphics.ellipse(pos.x - 2, pos.y - liftAmount - 2, ballWidth * 0.5, ballHeight * 0.5);
        ballGraphics.fill(0xb45309);

        ballGraphics.moveTo(pos.x - 4 * pos.scale, pos.y - liftAmount);
        ballGraphics.lineTo(pos.x + 4 * pos.scale, pos.y - liftAmount);
        ballGraphics.stroke({ width: Math.max(1, 2 * pos.scale), color: 0xffffff });
      }
    }

    // Draw handoff effect with multiple rings
    if (game.handoffEffect) {
      const pos = toScreen(game.handoffEffect.x, game.handoffEffect.y);
      const progress = game.handoffEffect.progress;

      const maxRadius = 60 * pos.scale;
      const opacity = 1 - progress;

      const effectGraphics = new Graphics();

      // Multiple rings for more impact
      for (let i = 0; i < 2; i++) {
        const ringProgress = Math.max(0, progress - i * 0.15);
        const ringOp = Math.max(0, opacity - i * 0.3);
        const radius = maxRadius * ringProgress;

        effectGraphics.circle(pos.x, pos.y, radius);
        effectGraphics.stroke({
          width: Math.max(2, (5 - i * 2) * pos.scale * (1 - ringProgress)),
          color: 0xffd700,
          alpha: ringOp,
        });
      }

      if (progress < 0.3) {
        const innerOpacity = 1 - (progress / 0.3);
        effectGraphics.circle(pos.x, pos.y, 20 * pos.scale * (1 - progress / 0.3));
        effectGraphics.fill({ color: 0xffffcc, alpha: innerOpacity * 0.6 });
      }

      dynamicContainer.addChild(effectGraphics);
    }

    // Draw result text
    if (game.state === 'PLAY_DEAD' && game.playResult) {
      const result = game.playResult;
      let text = '';
      let color = 0xffffff;

      if (result.penalty) {
        text = `FLAG: ${result.penalty.description.toUpperCase()}`;
        color = 0xfbbf24;
      } else if (result.touchdown) {
        text = 'TOUCHDOWN!';
        color = 0xfbbf24;
      } else if (result.sack) {
        text = `SACK! ${Math.abs(result.yardsGained)} YARD LOSS`;
        color = 0xef4444;
      } else if (result.turnover) {
        text = 'TURNOVER!';
        color = 0xef4444;
      } else if (result.yardsGained > 0) {
        text = `GAIN OF ${result.yardsGained} YARDS`;
        color = 0x22c55e;
      } else if (result.yardsGained < 0) {
        text = `LOSS OF ${Math.abs(result.yardsGained)} YARDS`;
        color = 0xef4444;
      } else {
        text = 'NO GAIN';
        color = 0x94a3b8;
      }

      const resultStyle = new TextStyle({
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 42,
        fontWeight: 'bold',
        fill: color,
        stroke: { color: 0x000000, width: 4 },
        dropShadow: {
          color: color,
          blur: 20,
          alpha: 0.8,
        },
      });

      const resultText = new Text({ text, style: resultStyle });
      resultText.anchor.set(0.5);
      resultText.position.set(width / 2, height / 2);
      dynamicContainer.addChild(resultText);
    }

    // Force render
    if (appRef.current) {
      appRef.current.render();
    }

  }, [game, width, height, isReady, useSpriteSheets, spritesLoaded, loadedSprites, getSpriteTexture]);

  return (
    <div className="relative rounded-xl overflow-hidden shadow-2xl border border-white/10">
      <div ref={containerRef} style={{ width, height }} />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
        }}
      />
    </div>
  );
};

export default PixiGameCanvas;
