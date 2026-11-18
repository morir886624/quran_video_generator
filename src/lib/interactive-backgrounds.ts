import { BackgroundPresetId } from '@/types/quran';

export interface InteractiveRipple {
  x: number; // 0 to 1
  y: number; // 0 to 1
  born: number; // timestamp in ms
}

export interface InteractivePointerState {
  x: number; // 0 to 1 (0.5 center)
  y: number; // 0 to 1 (0.5 center)
  active: boolean;
  ripples?: InteractiveRipple[];
}

export function isInteractivePreset(id: BackgroundPresetId | string): boolean {
  return typeof id === 'string' && id.startsWith('interactive-');
}

function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function lerpColor(hexA: string, hexB: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  const r = Math.round(lerp(r1, r2, t));
  const g = Math.round(lerp(g1, g2, t));
  const b = Math.round(lerp(b1, b2, t));
  return `rgb(${r}, ${g}, ${b})`;
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
}

/**
 * Draws a deterministic twinkling starfield with 4-point cross flares on major stars
 */
function drawStarfield(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  count: number,
  maxY: number,
  time: number,
  opacityScale: number,
  pxOffset = 0,
  pyOffset = 0
) {
  if (opacityScale <= 0.01) return;
  ctx.save();
  for (let i = 0; i < count; i++) {
    const rx = hash(i * 3.17);
    const ry = hash(i * 7.31);
    const rSize = hash(i * 11.13);
    const x = ((rx * width + pxOffset * (0.2 + rSize * 0.8)) % width + width) % width;
    const y = ((ry * maxY + pyOffset * (0.2 + rSize * 0.5)) % maxY + maxY) % maxY;
    const twinkle = 0.45 + 0.55 * Math.sin(time * (0.0015 + rSize * 0.0025) + i * 2.1);
    const alpha = twinkle * opacityScale * (1 - (y / maxY) * 0.35);
    const radius = 0.8 + rSize * 2.4;

    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // 4-point celestial flare on bright stars
    if (rSize > 0.84) {
      const flareLen = radius * (3.5 + twinkle * 2.5);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.55})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - flareLen, y);
      ctx.lineTo(x + flareLen, y);
      ctx.moveTo(x, y - flareLen);
      ctx.lineTo(x, y + flareLen);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * Draws a layered procedural mountain ridge silhouette
 */
function drawMountainRidge(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  baseY: number,
  amplitude: number,
  seed: number,
  fillStyle: string | CanvasGradient,
  pxShift: number,
  ridgeHighlightColor?: string
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, height);
  const steps = 48;
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const x = u * width;
    const wx = u * 5 + seed + pxShift * 0.002;
    const y =
      baseY -
      Math.sin(wx) * amplitude * 0.55 -
      Math.cos(wx * 2.3 + seed) * amplitude * 0.28 -
      Math.sin(wx * 5.1 - seed * 1.7) * amplitude * 0.14;
    pts.push({ x, y });
    ctx.lineTo(x, y);
  }
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();

  if (ridgeHighlightColor) {
    ctx.strokeStyle = ridgeHighlightColor;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    pts.forEach((p, idx) => {
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Main entry point to render any of the 20 Interactive Nature Backgrounds.
 * Engineered to evolve with totalProgress (0 -> 1) so viewers stay until the end of the recitation,
 * pulse with verseProgress (0 -> 1), and respond to touch/pointer interaction.
 */
export function drawInteractiveBackground({
  ctx,
  width,
  height,
  presetId,
  time,
  verseProgress = 0,
  totalProgress = 0,
  pointer,
}: {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  presetId: BackgroundPresetId;
  time: number;
  verseProgress?: number;
  totalProgress?: number;
  pointer?: InteractivePointerState;
}) {
  ctx.save();

  // Smooth progression (0 -> 1 from start to end of recitation)
  const prog = clamp(totalProgress, 0, 1);
  // Subtle pulse on each verse
  const vPulse = Math.sin(clamp(verseProgress, 0, 1) * Math.PI);

  // Interactive focal point (follows user touch/mouse when active, or organic Lissajous path when hands-free / exporting)
  const autoX = 0.5 + Math.sin(time * 0.00045) * 0.22;
  const autoY = 0.42 + Math.cos(time * 0.00035) * 0.16;
  const px = pointer?.active ? pointer.x : autoX;
  const py = pointer?.active ? pointer.y : autoY;
  const shiftX = (px - 0.5) * width * 0.12;
  const shiftY = (py - 0.5) * height * 0.08;

  switch (presetId) {
    case 'interactive-dawn-awakening':
      drawDawnAwakening(ctx, width, height, time, prog, vPulse, px, py, shiftX, shiftY);
      break;
    case 'interactive-celestial-aurora':
      drawCelestialAurora(ctx, width, height, time, prog, vPulse, px, py, shiftX, shiftY);
      break;
    case 'interactive-desert-miracle':
      drawDesertMiracle(ctx, width, height, time, prog, vPulse, px, py, shiftX, shiftY);
      break;
    case 'interactive-storm-to-serenity':
      drawStormToSerenity(ctx, width, height, time, prog, vPulse, px, py, shiftX, shiftY);
      break;
    case 'interactive-luminous-woods':
      drawLuminousWoods(ctx, width, height, time, prog, vPulse, px, py, shiftX, shiftY);
      break;
    case 'interactive-eclipse-crown':
      drawEclipseCrown(ctx, width, height, time, prog, vPulse, px, py, shiftX, shiftY);
      break;
    case 'interactive-sakura-breeze':
      drawSakuraBreeze(ctx, width, height, time, prog, vPulse, px, py, shiftX, shiftY);
      break;
    case 'interactive-cascading-light':
      drawCascadingLight(ctx, width, height, time, prog, vPulse, px, py, shiftX, shiftY);
      break;
    case 'interactive-falling-stars':
      drawFallingStars(ctx, width, height, time, prog, vPulse, px, py, shiftX, shiftY);
      break;
    case 'interactive-crystal-cavern':
      drawCrystalCavern(ctx, width, height, time, prog, vPulse, px, py, shiftX, shiftY);
      break;
    case 'interactive-autumn-stream':
      drawAutumnStream(ctx, width, height, time, prog, vPulse, px, py, shiftX, shiftY);
      break;
    case 'interactive-alpine-alpenglow':
      drawAlpineAlpenglow(ctx, width, height, time, prog, vPulse, px, py, shiftX, shiftY);
      break;
    case 'interactive-ocean-cathedral':
      drawOceanCathedral(ctx, width, height, time, prog, vPulse, px, py, shiftX, shiftY);
      break;
    case 'interactive-moonlit-lotus':
      drawMoonlitLotus(ctx, width, height, time, prog, vPulse, px, py, shiftX, shiftY, pointer);
      break;
    case 'interactive-sacred-gorge':
      drawSacredGorge(ctx, width, height, time, prog, vPulse, px, py, shiftX, shiftY);
      break;
    case 'interactive-primordial-earth':
      drawPrimordialEarth(ctx, width, height, time, prog, vPulse, px, py, shiftX, shiftY);
      break;
    case 'interactive-nordic-fjord':
      drawNordicFjord(ctx, width, height, time, prog, vPulse, px, py, shiftX, shiftY);
      break;
    case 'interactive-rain-sanctuary':
      drawRainSanctuary(ctx, width, height, time, prog, vPulse, px, py, shiftX, shiftY);
      break;
    case 'interactive-pillars-of-creation':
      drawPillarsOfCreation(ctx, width, height, time, prog, vPulse, px, py, shiftX, shiftY);
      break;
    case 'interactive-emerald-bamboo':
      drawEmeraldBamboo(ctx, width, height, time, prog, vPulse, px, py, shiftX, shiftY);
      break;
    default:
      drawDawnAwakening(ctx, width, height, time, prog, vPulse, px, py, shiftX, shiftY);
      break;
  }

  // Draw interactive touch ripples whenever user touches/drags on the canvas
  if (pointer?.ripples && pointer.ripples.length > 0) {
    for (const r of pointer.ripples) {
      const age = (time - r.born) / 1400;
      if (age >= 0 && age <= 1) {
        const rx = r.x * width;
        const ry = r.y * height;
        const rad = age * Math.min(width, height) * 0.22;
        const alpha = (1 - age) * 0.35;
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(rx, ry, rad, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}

// ============================================================================
// 1. DAWN AWAKENING (Night Stars -> Crimson Horizon -> Golden Mountain Sunrise)
// ============================================================================
function drawDawnAwakening(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  prog: number,
  vPulse: number,
  px: number,
  _py: number,
  shiftX: number,
  shiftY: number
) {
  // Sky evolves across 3 stages: Night (0) -> Violet/Crimson Dawn (0.5) -> Golden Morning (1.0)
  const topCol =
    prog < 0.5
      ? lerpColor('#040714', '#1E1B4B', prog * 2)
      : lerpColor('#1E1B4B', '#1D4ED8', (prog - 0.5) * 2);
  const midCol =
    prog < 0.5
      ? lerpColor('#0F172A', '#7C2D12', prog * 2)
      : lerpColor('#7C2D12', '#D97706', (prog - 0.5) * 2);
  const horCol =
    prog < 0.5
      ? lerpColor('#1E1B4B', '#F97316', prog * 2)
      : lerpColor('#F97316', '#FEF08A', (prog - 0.5) * 2);

  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.78);
  sky.addColorStop(0, topCol);
  sky.addColorStop(0.55, midCol);
  sky.addColorStop(1, horCol);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Stars fade out gradually as sunrise reaches climax
  const starOpacity = clamp(1 - prog * 1.15, 0.08, 1);
  drawStarfield(ctx, w, h, 70, h * 0.58, time, starOpacity, shiftX * 0.4, shiftY * 0.4);

  // Rising Sun behind mountains (ascends from h*0.76 to h*0.44 as recitation progresses)
  const sunX = w * (0.5 + (px - 0.5) * 0.16);
  const sunY = lerp(h * 0.76, h * 0.43, smoothstep(0, 1, prog));
  const sunRadius = Math.min(w, h) * (0.11 + prog * 0.05 + vPulse * 0.01);

  // Volumetric God-Rays radiating from rising sun
  const rayCount = 14;
  ctx.save();
  ctx.translate(sunX, sunY);
  const rayIntensity = smoothstep(0.15, 1.0, prog) * (0.28 + vPulse * 0.08);
  for (let i = 0; i < rayCount; i++) {
    const angle = (i / rayCount) * Math.PI * 2 + time * 0.00012;
    const rayGrad = ctx.createLinearGradient(0, 0, Math.cos(angle) * h * 0.9, Math.sin(angle) * h * 0.9);
    rayGrad.addColorStop(0, `rgba(254, 240, 138, ${rayIntensity})`);
    rayGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = rayGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, h * 0.95, angle - 0.07, angle + 0.07);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Sun Corona & Core
  const sunGlow = ctx.createRadialGradient(sunX, sunY, sunRadius * 0.2, sunX, sunY, sunRadius * 3.8);
  sunGlow.addColorStop(0, '#FFFBEB');
  sunGlow.addColorStop(0.25, rgba('#FDE047', 0.85));
  sunGlow.addColorStop(0.6, rgba('#F97316', 0.35 + prog * 0.25));
  sunGlow.addColorStop(1, 'rgba(249, 115, 22, 0)');
  ctx.fillStyle = sunGlow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunRadius * 3.8, 0, Math.PI * 2);
  ctx.fill();

  // 4 Layered Mountain Ranges with parallax & golden rim light
  const rimAlpha = smoothstep(0.25, 1, prog) * 0.65;
  drawMountainRidge(
    ctx,
    w,
    h,
    h * 0.62,
    h * 0.09,
    1.2,
    lerpColor('#1E1B4B', '#451A03', prog),
    shiftX * 0.4,
    `rgba(253, 224, 71, ${rimAlpha * 0.8})`
  );
  drawMountainRidge(
    ctx,
    w,
    h,
    h * 0.71,
    h * 0.08,
    2.7,
    lerpColor('#0F172A', '#291509', prog),
    shiftX * 0.75,
    `rgba(251, 146, 60, ${rimAlpha * 0.55})`
  );

  // Drifting golden valley mist
  for (let m = 0; m < 3; m++) {
    const mistY = h * (0.68 + m * 0.07);
    const mistGrad = ctx.createLinearGradient(0, mistY - 35, 0, mistY + 45);
    mistGrad.addColorStop(0, 'rgba(254, 215, 170, 0)');
    mistGrad.addColorStop(0.5, `rgba(253, 186, 116, ${0.12 + prog * 0.16})`);
    mistGrad.addColorStop(1, 'rgba(254, 215, 170, 0)');
    ctx.fillStyle = mistGrad;
    ctx.fillRect(0, mistY - 35, w, 80);
  }

  drawMountainRidge(ctx, w, h, h * 0.83, h * 0.06, 4.4, '#090D16', shiftX * 1.15);
}

// ============================================================================
// 2. CELESTIAL AURORA (Expanding Polar Ribbons & Arctic Lake Reflection)
// ============================================================================
function drawCelestialAurora(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  prog: number,
  vPulse: number,
  px: number,
  py: number,
  shiftX: number,
  shiftY: number
) {
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.72);
  sky.addColorStop(0, '#020617');
  sky.addColorStop(0.6, '#042F2E');
  sky.addColorStop(1, '#0F172A');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  drawStarfield(ctx, w, h, 80, h * 0.65, time, 0.9, shiftX * 0.3, shiftY * 0.3);

  // Aurora Borealis Curtains (number of active layers & vividness grow with prog 0 -> 1)
  const ribbonColors = ['#10B981', '#06B6D4', '#A855F7', '#34D399'];
  const activeRibbons = 2 + Math.floor(prog * 2.99);

  for (let r = 0; r < activeRibbons; r++) {
    const col = ribbonColors[r % ribbonColors.length];
    const baseY = h * (0.22 + r * 0.075) + (py - 0.5) * 50;
    const curtainHeight = h * (0.18 + prog * 0.12 + vPulse * 0.04);

    ctx.save();
    const strips = 54;
    const stripW = w / strips;
    for (let i = 0; i <= strips; i++) {
      const u = i / strips;
      const x = u * w;
      const wave =
        Math.sin(u * 6 + time * 0.0012 + r * 1.5 + (px - 0.5) * 3) * 45 +
        Math.cos(u * 11 - time * 0.0009 + r) * 22;
      const yTop = baseY + wave - curtainHeight * 0.6;
      const yBot = baseY + wave + curtainHeight * 0.4;
      const intensity = (0.35 + 0.65 * Math.sin(u * Math.PI)) * (0.35 + prog * 0.45);

      const g = ctx.createLinearGradient(x, yTop, x, yBot);
      g.addColorStop(0, rgba(col, 0));
      g.addColorStop(0.55, rgba(col, intensity * 0.55));
      g.addColorStop(0.85, rgba('#A7F3D0', intensity * 0.8));
      g.addColorStop(1, rgba(col, 0));

      ctx.fillStyle = g;
      ctx.fillRect(x - 1, yTop, stripW + 3, yBot - yTop);
    }
    ctx.restore();
  }

  // Horizon Arctic Mountains
  const horizonY = h * 0.68;
  drawMountainRidge(ctx, w, h, horizonY, h * 0.085, 3.1, '#081420', shiftX * 0.5, 'rgba(52, 211, 153, 0.3)');

  // Glassy Arctic Lake in bottom 32% reflecting the Aurora
  const lakeGrad = ctx.createLinearGradient(0, horizonY, 0, h);
  lakeGrad.addColorStop(0, '#041E24');
  lakeGrad.addColorStop(0.5, lerpColor('#042F2E', '#064E3B', prog));
  lakeGrad.addColorStop(1, '#020617');
  ctx.fillStyle = lakeGrad;
  ctx.fillRect(0, horizonY, w, h - horizonY);

  // Shimmering Aurora Reflection Ripples on Lake
  for (let i = 0; i < 38; i++) {
    const u = i / 38;
    const ry = horizonY + u * (h - horizonY);
    const rw = w * (0.25 + 0.45 * Math.sin(i * 1.9 + time * 0.001));
    const rx = w * 0.5 + Math.sin(time * 0.0008 + i) * w * 0.18 - rw / 2 + shiftX * u;
    const col = i % 2 === 0 ? '#34D399' : '#A855F7';
    ctx.fillStyle = rgba(col, (0.14 + prog * 0.22) * (1 - u * 0.5));
    ctx.fillRect(rx, ry, rw, 2 + u * 3);
  }
}

// ============================================================================
// 3. DESERT MIRACLE (Parched Dunes -> Gentle Rain -> Glowing Emerald Flora Bloom)
// ============================================================================
function drawDesertMiracle(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  prog: number,
  vPulse: number,
  px: number,
  _py: number,
  shiftX: number,
  shiftY: number
) {
  // Sky shifts from dry amber night to lush emerald-gold oasis twilight
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.7);
  sky.addColorStop(0, lerpColor('#140C08', '#042F2E', prog));
  sky.addColorStop(0.6, lerpColor('#451A03', '#065F46', prog));
  sky.addColorStop(1, lerpColor('#9A3412', '#F59E0B', prog));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  drawStarfield(ctx, w, h, 55, h * 0.5, time, 0.75, shiftX * 0.3, shiftY * 0.3);

  // Glowing Crescent Moon
  const moonX = w * 0.76 + shiftX * 0.25;
  const moonY = h * 0.22 + shiftY * 0.25;
  const moonR = Math.min(w, h) * 0.055;
  ctx.save();
  ctx.fillStyle = '#FEF08A';
  ctx.shadowColor = '#FDE047';
  ctx.shadowBlur = 30;
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(moonX - moonR * 0.38, moonY - moonR * 0.15, moonR * 0.88, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 3 Sweeping Sahara Dune Layers
  const dune1Col = lerpColor('#78350F', '#065F46', smoothstep(0.45, 1, prog) * 0.65);
  const dune2Col = lerpColor('#451A03', '#064E3B', smoothstep(0.45, 1, prog) * 0.75);
  const dune3Col = lerpColor('#270E04', '#022C22', smoothstep(0.45, 1, prog) * 0.85);

  drawMountainRidge(ctx, w, h, h * 0.64, h * 0.05, 1.5, dune1Col, shiftX * 0.5, 'rgba(253, 224, 71, 0.25)');
  drawMountainRidge(ctx, w, h, h * 0.74, h * 0.055, 3.2, dune2Col, shiftX * 0.85, 'rgba(110, 231, 183, 0.25)');
  drawMountainRidge(ctx, w, h, h * 0.84, h * 0.045, 5.1, dune3Col, shiftX * 1.2);

  // Act II (prog 0.2 -> 0.75): Sacred Desert Rain
  const rainAlpha = smoothstep(0.15, 0.4, prog) * (1 - smoothstep(0.7, 0.95, prog));
  if (rainAlpha > 0.01) {
    ctx.strokeStyle = `rgba(167, 243, 208, ${rainAlpha * 0.45})`;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 65; i++) {
      const rx = ((hash(i * 5.1) * w + time * 0.15 + (px - 0.5) * 200) % w + w) % w;
      const ry = ((hash(i * 9.3) * h + time * 0.95) % h + h) % h;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 6, ry + 26);
      ctx.stroke();
    }
  }

  // Act III (prog 0.35 -> 1.0): Glowing Emerald & Gold Desert Flowers Blooming across Dunes!
  const bloomProg = smoothstep(0.3, 1.0, prog);
  if (bloomProg > 0.01) {
    const flowerCount = 28;
    for (let i = 0; i < flowerCount; i++) {
      const threshold = (i / flowerCount) * 0.75;
      const localGrowth = clamp((bloomProg - threshold) / 0.25, 0, 1);
      if (localGrowth <= 0) continue;

      const fx = hash(i * 14.3) * w;
      const fy = h * (0.66 + hash(i * 19.7) * 0.28);
      const sway = Math.sin(time * 0.002 + i) * 8 * localGrowth + (px - 0.5) * 18;
      const stemH = (22 + hash(i * 3.7) * 34) * localGrowth;

      // Glowing Stem
      ctx.strokeStyle = rgba('#34D399', 0.75 * localGrowth);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.quadraticCurveTo(fx + sway * 0.5, fy - stemH * 0.5, fx + sway, fy - stemH);
      ctx.stroke();

      // Glowing Blossom Head
      const bx = fx + sway;
      const by = fy - stemH;
      const bRad = (4 + hash(i * 8.1) * 5) * localGrowth * (1 + vPulse * 0.15);

      const glow = ctx.createRadialGradient(bx, by, 1, bx, by, bRad * 3.5);
      glow.addColorStop(0, '#FEF08A');
      glow.addColorStop(0.4, rgba(i % 2 === 0 ? '#10B981' : '#FBBF24', 0.8));
      glow.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(bx, by, bRad * 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ============================================================================
// 4. STORM TO SERENITY (Turbulent Lightning Sea -> Calm Moonlit Silver Ocean)
// ============================================================================
function drawStormToSerenity(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  prog: number,
  vPulse: number,
  px: number,
  _py: number,
  shiftX: number,
  shiftY: number
) {
  const calmFactor = smoothstep(0, 1, prog);
  const stormFactor = 1 - calmFactor;

  // Sky clears from stormy slate to serene starlit indigo
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.62);
  sky.addColorStop(0, lerpColor('#090D16', '#020617', calmFactor));
  sky.addColorStop(0.6, lerpColor('#1E293B', '#0F172A', calmFactor));
  sky.addColorStop(1, lerpColor('#334155', '#1E3A8A', calmFactor));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Sheet lightning flash during storm phase on verse pulses
  if (stormFactor > 0.2 && vPulse > 0.82) {
    const flash = (vPulse - 0.82) * 5 * stormFactor * 0.25;
    ctx.fillStyle = `rgba(186, 230, 253, ${flash})`;
    ctx.fillRect(0, 0, w, h * 0.62);
  }

  // Stars appear as storm clouds part
  drawStarfield(ctx, w, h, 75, h * 0.55, time, calmFactor * 0.95, shiftX * 0.3, shiftY * 0.3);

  // Full Moon emerging behind parting clouds
  const moonX = w * 0.5 + (px - 0.5) * w * 0.12;
  const moonY = h * 0.32;
  const moonR = Math.min(w, h) * 0.075;
  const moonGlow = ctx.createRadialGradient(moonX, moonY, moonR * 0.3, moonX, moonY, moonR * 4);
  moonGlow.addColorStop(0, `rgba(255, 255, 255, ${0.3 + calmFactor * 0.7})`);
  moonGlow.addColorStop(0.35, `rgba(186, 230, 253, ${0.15 + calmFactor * 0.45})`);
  moonGlow.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = moonGlow;
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR * 4, 0, Math.PI * 2);
  ctx.fill();

  // Parting Storm Cloud Banks (move outward left & right as prog -> 1)
  const cloudSpread = calmFactor * w * 0.45;
  ctx.fillStyle = `rgba(15, 23, 42, ${0.85 * stormFactor + 0.15})`;
  for (let c = 0; c < 8; c++) {
    const isLeft = c % 2 === 0;
    const baseCx = isLeft ? w * 0.25 - cloudSpread : w * 0.75 + cloudSpread;
    const cx = baseCx + Math.sin(time * 0.0004 + c) * 40;
    const cy = h * (0.18 + (c % 4) * 0.09);
    const cr = w * (0.18 + (c % 3) * 0.06);
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5 Rolling Ocean Wave Layers (wave amplitude & speed calm down as prog -> 1)
  const horizonY = h * 0.6;
  const waveLayers = 5;
  for (let l = 0; l < waveLayers; l++) {
    const u = l / waveLayers;
    const baseY = horizonY + u * (h - horizonY);
    const amp = lerp(28 + l * 10, 5 + l * 3, calmFactor);
    const speed = lerp(0.0035, 0.0012, calmFactor) * (1 + l * 0.2);

    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 20) {
      const wave =
        Math.sin(x * 0.008 + time * speed + l * 1.4 + (px - 0.5) * 2) * amp +
        Math.cos(x * 0.018 - time * speed * 0.8 + l) * amp * 0.4;
      ctx.lineTo(x, baseY + wave);
    }
    ctx.lineTo(w, h);
    ctx.closePath();

    const waveCol = lerpColor('#0B192C', '#020617', u);
    ctx.fillStyle = waveCol;
    ctx.fill();

    // Moonlit shimmer path in the center of the waves
    const shimmerWidth = w * (0.12 + u * 0.25) * (0.3 + calmFactor * 0.7);
    const shimmerGrad = ctx.createLinearGradient(moonX - shimmerWidth, baseY, moonX + shimmerWidth, baseY);
    shimmerGrad.addColorStop(0, 'rgba(186, 230, 253, 0)');
    shimmerGrad.addColorStop(0.5, `rgba(224, 242, 254, ${0.2 + calmFactor * 0.5})`);
    shimmerGrad.addColorStop(1, 'rgba(186, 230, 253, 0)');
    ctx.strokeStyle = shimmerGrad;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
}

// ============================================================================
// 5. LUMINOUS WOODS (Sacred Bioluminescent Forest Awakening)
// ============================================================================
function drawLuminousWoods(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  prog: number,
  vPulse: number,
  px: number,
  py: number,
  shiftX: number,
  _shiftY: number
) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#021814');
  bg.addColorStop(0.55, lerpColor('#042F2E', '#064E3B', prog));
  bg.addColorStop(1, '#01110E');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Canopy Light Beams filtering through ancient trees
  const beamAlpha = (0.08 + prog * 0.2) * (1 + vPulse * 0.25);
  for (let b = 0; b < 5; b++) {
    const bx = w * (0.15 + b * 0.18) + shiftX * 0.5;
    const beamGrad = ctx.createLinearGradient(bx, 0, bx + (px - 0.5) * 180, h * 0.85);
    beamGrad.addColorStop(0, `rgba(45, 212, 191, ${beamAlpha})`);
    beamGrad.addColorStop(1, 'rgba(45, 212, 191, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(bx - 30, 0);
    ctx.lineTo(bx + 30, 0);
    ctx.lineTo(bx + 140 + (px - 0.5) * 140, h);
    ctx.lineTo(bx - 100 + (px - 0.5) * 140, h);
    ctx.closePath();
    ctx.fill();
  }

  // Ancient Tree Trunks in 2 Parallax Layers
  const treeCount = 10;
  for (let t = 0; t < treeCount; t++) {
    const isFore = t % 2 === 0;
    const tx = ((hash(t * 7.7) * w * 1.2 - w * 0.1 + shiftX * (isFore ? 1.1 : 0.45)) % (w * 1.2) + w * 1.2) % (w * 1.2) - w * 0.1;
    const tw = (isFore ? 38 : 22) + hash(t * 3.1) * 20;
    ctx.fillStyle = isFore ? '#021310' : '#052620';
    ctx.fillRect(tx - tw / 2, 0, tw, h);

    // Glowing bioluminescent moss veins on trunks as prog advances
    if (prog > 0.2) {
      const mossAlpha = smoothstep(0.2, 1, prog) * (0.25 + 0.2 * Math.sin(time * 0.002 + t));
      ctx.strokeStyle = rgba('#2DD4BF', mossAlpha);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tx, h * 0.85);
      ctx.quadraticCurveTo(tx + (t % 2 ? 10 : -10), h * 0.65, tx, h * 0.45);
      ctx.stroke();
    }
  }

  // Bioluminescent Forest Floor Flora & Floating Spores (awaken progressively 0 -> 1)
  const sporeCount = Math.floor(25 + prog * 55);
  for (let i = 0; i < sporeCount; i++) {
    const sx =
      ((hash(i * 9.1) * w + Math.sin(time * 0.001 + i) * 45 + (px - 0.5) * 120) % w + w) % w;
    const sy =
      ((hash(i * 13.7) * h - time * (0.03 + hash(i) * 0.05) + (py - 0.5) * 80) % h + h) % h;
    const col = i % 3 === 0 ? '#2DD4BF' : i % 3 === 1 ? '#34D399' : '#FDE047';
    const rad = (2.5 + hash(i * 4.3) * 4.5) * (0.7 + 0.3 * Math.sin(time * 0.003 + i));

    const g = ctx.createRadialGradient(sx, sy, 0.5, sx, sy, rad * 3);
    g.addColorStop(0, '#FFFFFF');
    g.addColorStop(0.35, rgba(col, 0.75));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, sy, rad * 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ============================================================================
// 6. ECLIPSE CROWN (Lunar Disc Aligns Across Sun -> Diamond Ring & Solar Corona)
// ============================================================================
function drawEclipseCrown(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  prog: number,
  vPulse: number,
  px: number,
  py: number,
  shiftX: number,
  shiftY: number
) {
  const sky = ctx.createRadialGradient(w * 0.5, h * 0.36, 10, w * 0.5, h * 0.36, h * 0.85);
  sky.addColorStop(0, lerpColor('#451A03', '#1E1B4B', smoothstep(0.6, 1, prog)));
  sky.addColorStop(0.5, '#090A10');
  sky.addColorStop(1, '#020408');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Stars brighten dramatically as eclipse approaches totality (prog -> 1)
  drawStarfield(ctx, w, h, 85, h * 0.78, time, 0.25 + prog * 0.75, shiftX * 0.35, shiftY * 0.35);

  const sunX = w * 0.5 + (px - 0.5) * 40;
  const sunY = h * 0.36 + (py - 0.5) * 30;
  const sunR = Math.min(w, h) * 0.13;

  // Solar Corona Filaments (blossom outward as alignment reaches totality)
  const totality = smoothstep(0.2, 1.0, prog);
  const coronaRays = 24;
  ctx.save();
  ctx.translate(sunX, sunY);
  for (let i = 0; i < coronaRays; i++) {
    const angle = (i / coronaRays) * Math.PI * 2 + time * 0.00015;
    const len = sunR * (1.8 + totality * 2.2 + Math.sin(i * 3 + time * 0.002) * 0.4 + vPulse * 0.3);
    const g = ctx.createLinearGradient(0, 0, Math.cos(angle) * len, Math.sin(angle) * len);
    g.addColorStop(0, `rgba(254, 240, 138, ${0.35 + totality * 0.45})`);
    g.addColorStop(0.5, `rgba(245, 158, 11, ${0.18 + totality * 0.25})`);
    g.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, len, angle - 0.09, angle + 0.09);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Blazing Sun Rim
  const sunHalo = ctx.createRadialGradient(sunX, sunY, sunR * 0.85, sunX, sunY, sunR * 2.2);
  sunHalo.addColorStop(0, '#FFFBEB');
  sunHalo.addColorStop(0.25, '#FDE047');
  sunHalo.addColorStop(0.55, rgba('#F59E0B', 0.55));
  sunHalo.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = sunHalo;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR * 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Gliding Lunar Disc (moves from offset into exact cosmic alignment at prog = 1)
  const moonOffset = (1 - smoothstep(0, 0.96, prog)) * sunR * 1.15;
  const moonX = sunX + moonOffset;
  const moonY = sunY - moonOffset * 0.25;
  ctx.fillStyle = '#03050A';
  ctx.beginPath();
  ctx.arc(moonX, moonY, sunR * 0.985, 0, Math.PI * 2);
  ctx.fill();

  // Diamond Ring Flare on the limb of the eclipse
  const flareAngle = -0.35 + time * 0.0002;
  const fx = sunX - Math.cos(flareAngle) * sunR;
  const fy = sunY - Math.sin(flareAngle) * sunR;
  const flareSize = sunR * (0.4 + totality * 0.65 + vPulse * 0.2);
  const flare = ctx.createRadialGradient(fx, fy, 1, fx, fy, flareSize);
  flare.addColorStop(0, '#FFFFFF');
  flare.addColorStop(0.3, rgba('#FEF08A', 0.9));
  flare.addColorStop(1, 'rgba(253, 224, 71, 0)');
  ctx.fillStyle = flare;
  ctx.beginPath();
  ctx.arc(fx, fy, flareSize, 0, Math.PI * 2);
  ctx.fill();

  // Dark Craggy Horizon Silhouette
  drawMountainRidge(ctx, w, h, h * 0.82, h * 0.06, 6.2, '#020408', shiftX * 0.7, 'rgba(253, 224, 71, 0.35)');
}

// ============================================================================
// 7. SPRING BREEZE (Sakura Blossom Valley & Swirling Petals)
// ============================================================================
function drawSakuraBreeze(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  prog: number,
  vPulse: number,
  px: number,
  py: number,
  shiftX: number,
  _shiftY: number
) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, lerpColor('#1E1B4B', '#3B0764', prog));
  sky.addColorStop(0.6, lerpColor('#311042', '#831843', prog));
  sky.addColorStop(1, lerpColor('#0F172A', '#4C0519', prog));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Soft Glowing Full Moon behind blossoms
  const mx = w * 0.72 + shiftX * 0.3;
  const my = h * 0.26;
  const mr = Math.min(w, h) * 0.09;
  const mg = ctx.createRadialGradient(mx, my, mr * 0.2, mx, my, mr * 2.5);
  mg.addColorStop(0, 'rgba(255, 241, 242, 0.9)');
  mg.addColorStop(0.45, 'rgba(244, 114, 182, 0.35)');
  mg.addColorStop(1, 'rgba(244, 114, 182, 0)');
  ctx.fillStyle = mg;
  ctx.beginPath();
  ctx.arc(mx, my, mr * 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Distant Valley Hills
  drawMountainRidge(ctx, w, h, h * 0.73, h * 0.065, 2.2, '#1A0B26', shiftX * 0.5);

  // Gnarled Blossom Tree Branches extending from top-left
  ctx.save();
  ctx.strokeStyle = '#0F0517';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-20, h * 0.18);
  ctx.quadraticCurveTo(w * 0.22, h * 0.24, w * 0.46 + shiftX * 0.3, h * 0.16);
  ctx.stroke();

  // Blooming clusters on branches (grow fuller as prog 0 -> 1)
  const clusterCount = Math.floor(12 + prog * 24);
  for (let c = 0; c < clusterCount; c++) {
    const u = c / 36;
    const bx = w * 0.04 + u * w * 0.45 + Math.sin(c * 2.3) * 28 + shiftX * 0.3;
    const by = h * 0.17 + Math.cos(c * 1.7) * 36;
    const br = (6 + hash(c) * 10) * (0.5 + prog * 0.5);
    ctx.fillStyle = rgba(c % 2 === 0 ? '#F9A8D4' : '#FBCFE8', 0.7);
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Swirling 3D Blossom Petals in the Wind (count & breeze energy build with prog)
  const petalCount = Math.floor(30 + prog * 55);
  for (let i = 0; i < petalCount; i++) {
    const speedX = 0.08 + hash(i * 3.1) * 0.14;
    const speedY = 0.04 + hash(i * 5.7) * 0.08;
    const x =
      ((hash(i * 11.3) * w + time * speedX + (px - 0.5) * 260) % (w + 60) + (w + 60)) %
        (w + 60) -
      30;
    const y =
      ((hash(i * 17.9) * h + time * speedY + Math.sin(time * 0.002 + i) * 35 + (py - 0.5) * 120) %
        (h + 60) +
        (h + 60)) %
        (h + 60) -
      30;

    const rot = time * (0.002 + hash(i) * 0.003) + i;
    const pSize = (4 + hash(i * 2.9) * 6) * (1 + vPulse * 0.12);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(1, 0.55 + 0.45 * Math.sin(time * 0.004 + i));
    ctx.fillStyle = i % 3 === 0 ? '#FFF1F2' : i % 3 === 1 ? '#F9A8D4' : '#F472B6';
    ctx.beginPath();
    ctx.ellipse(0, 0, pSize, pSize * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ============================================================================
// 8. CASCADING LIGHT (Towering Misty Waterfall & Emerging Rainbow Arc)
// ============================================================================
function drawCascadingLight(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  prog: number,
  vPulse: number,
  px: number,
  _py: number,
  shiftX: number,
  _shiftY: number
) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#042F2E');
  bg.addColorStop(0.65, '#0F766E');
  bg.addColorStop(1, '#022C22');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Left & Right Mossy Cliff Walls framing central Waterfall
  ctx.fillStyle = '#031C1A';
  ctx.fillRect(0, 0, w * 0.28 + shiftX * 0.3, h * 0.78);
  ctx.fillRect(w * 0.72 + shiftX * 0.3, 0, w * 0.35, h * 0.78);

  // Cascading Waterfall Streams in center
  const fallLeft = w * 0.28 + shiftX * 0.3;
  const fallWidth = w * 0.44;
  const poolY = h * 0.74;

  const fallGrad = ctx.createLinearGradient(0, 0, 0, poolY);
  fallGrad.addColorStop(0, 'rgba(153, 246, 228, 0.25)');
  fallGrad.addColorStop(0.5, 'rgba(204, 251, 241, 0.45)');
  fallGrad.addColorStop(1, 'rgba(255, 255, 255, 0.75)');
  ctx.fillStyle = fallGrad;
  ctx.fillRect(fallLeft, 0, fallWidth, poolY);

  // Animated vertical falling water streaks
  for (let s = 0; s < 42; s++) {
    const sx = fallLeft + hash(s * 7.1) * fallWidth;
    const len = 60 + hash(s * 3.3) * 140;
    const sy = ((hash(s * 13.7) * poolY + time * (0.45 + hash(s) * 0.35)) % (poolY + len)) - len;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 + hash(s) * 0.35})`;
    ctx.lineWidth = 1.5 + hash(s) * 2.5;
    ctx.beginPath();
    ctx.moveTo(sx, Math.max(0, sy));
    ctx.lineTo(sx, Math.min(poolY, sy + len));
    ctx.stroke();
  }

  // Lagoon Pool & Rising Spray Mist
  const poolGrad = ctx.createLinearGradient(0, poolY, 0, h);
  poolGrad.addColorStop(0, '#14B8A6');
  poolGrad.addColorStop(0.4, '#0D9488');
  poolGrad.addColorStop(1, '#042F2E');
  ctx.fillStyle = poolGrad;
  ctx.fillRect(0, poolY, w, h - poolY);

  // Rising Mist Clouds at base of Waterfall
  for (let m = 0; m < 10; m++) {
    const mx = w * 0.25 + (m / 9) * w * 0.5 + Math.sin(time * 0.001 + m) * 25;
    const my = poolY - 10 + Math.cos(time * 0.0015 + m) * 18;
    const mr = 45 + (m % 3) * 25;
    const mg = ctx.createRadialGradient(mx, my, 5, mx, my, mr);
    mg.addColorStop(0, 'rgba(240, 253, 250, 0.42)');
    mg.addColorStop(1, 'rgba(204, 251, 241, 0)');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Luminous Rainbow Arc emerging in the mist as recitation progresses (prog 0.25 -> 1.0)
  const rainbowAlpha = smoothstep(0.2, 1.0, prog) * (0.38 + vPulse * 0.12);
  if (rainbowAlpha > 0.01) {
    const rainbowCols = ['#F43F5E', '#F59E0B', '#FDE047', '#10B981', '#38BDF8', '#A855F7'];
    const rcx = w * 0.5 + (px - 0.5) * 60;
    const rcy = poolY + 40;
    const baseR = w * 0.36;
    rainbowCols.forEach((rc, idx) => {
      ctx.strokeStyle = rgba(rc, rainbowAlpha);
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(rcx, rcy, baseR - idx * 6, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    });
  }
}

// ============================================================================
// 9. FALLING STARS (Milky Way Desert Oasis & Intensifying Meteor Shower)
// ============================================================================
function drawFallingStars(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  prog: number,
  _vPulse: number,
  px: number,
  py: number,
  shiftX: number,
  shiftY: number
) {
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.72);
  sky.addColorStop(0, '#020617');
  sky.addColorStop(0.5, '#0F172A');
  sky.addColorStop(1, '#1E1B4B');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Diagonal Milky Way Galactic Core Glow
  ctx.save();
  ctx.translate(w * 0.5 + shiftX * 0.3, h * 0.32 + shiftY * 0.3);
  ctx.rotate(-0.55 + prog * 0.15);
  const mw = ctx.createRadialGradient(0, 0, 10, 0, 0, w * 0.65);
  mw.addColorStop(0, `rgba(165, 180, 252, ${0.22 + prog * 0.2})`);
  mw.addColorStop(0.5, `rgba(129, 140, 248, ${0.1 + prog * 0.12})`);
  mw.addColorStop(1, 'rgba(30, 27, 75, 0)');
  ctx.fillStyle = mw;
  ctx.scale(1.8, 0.45);
  ctx.beginPath();
  ctx.arc(0, 0, w * 0.65, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawStarfield(ctx, w, h, 95, h * 0.7, time, 0.95, shiftX * 0.3, shiftY * 0.3);

  // Shooting Stars / Meteor Shower (count & frequency build with prog 0 -> 1)
  const meteorStreams = 2 + Math.floor(prog * 7);
  for (let m = 0; m < meteorStreams; m++) {
    const cycle = ((time * (0.0005 + (m % 3) * 0.0002) + m * 0.37) % 1);
    if (cycle < 0.45) {
      const t = cycle / 0.45;
      const startX = w * (0.15 + hash(m * 9.1) * 0.75) + (px - 0.5) * 90;
      const startY = h * (0.06 + hash(m * 4.7) * 0.25) + (py - 0.5) * 40;
      const mx = startX - t * w * 0.35;
      const my = startY + t * h * 0.28;
      const tailLen = 85 + prog * 55;

      const tail = ctx.createLinearGradient(mx, my, mx + tailLen, my - tailLen * 0.8);
      tail.addColorStop(0, `rgba(255, 255, 255, ${1 - t})`);
      tail.addColorStop(0.4, `rgba(165, 180, 252, ${(1 - t) * 0.6})`);
      tail.addColorStop(1, 'rgba(165, 180, 252, 0)');

      ctx.strokeStyle = tail;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + tailLen, my - tailLen * 0.8);
      ctx.stroke();
    }
  }

  // Oasis Lagoon Reflection at bottom
  const poolY = h * 0.72;
  drawMountainRidge(ctx, w, h, poolY, h * 0.04, 8.1, '#060A17', shiftX * 0.6);

  const pool = ctx.createLinearGradient(0, poolY, 0, h);
  pool.addColorStop(0, '#0F172A');
  pool.addColorStop(0.5, '#1E1B4B');
  pool.addColorStop(1, '#020617');
  ctx.fillStyle = pool;
  ctx.fillRect(0, poolY, w, h - poolY);
}

// ============================================================================
// 10. CRYSTAL CAVERN (Prismatic Geode Crystals Igniting with Refracted Beams)
// ============================================================================
function drawCrystalCavern(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  prog: number,
  vPulse: number,
  px: number,
  py: number,
  shiftX: number,
  _shiftY: number
) {
  const bg = ctx.createRadialGradient(w * 0.5, h * 0.45, 20, w * 0.5, h * 0.5, h * 0.85);
  bg.addColorStop(0, lerpColor('#1E1B4B', '#4C1D95', prog));
  bg.addColorStop(0.6, '#170B2B');
  bg.addColorStop(1, '#07030D');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Geometric Crystal Formations along bottom left & right
  const crystalClusters = [
    { x: 0.14, y: 0.78, w: 0.07, h: 0.24, angle: 0.18, col: '#C084FC' },
    { x: 0.24, y: 0.82, w: 0.055, h: 0.18, angle: 0.32, col: '#38BDF8' },
    { x: 0.86, y: 0.77, w: 0.075, h: 0.25, angle: -0.2, col: '#E879F9' },
    { x: 0.75, y: 0.83, w: 0.055, h: 0.19, angle: -0.34, col: '#34D399' },
    { x: 0.5, y: 0.86, w: 0.065, h: 0.2, angle: 0.02, col: '#FDE047' },
  ];

  const targetX = w * px;
  const targetY = h * (0.28 + (py - 0.5) * 0.2);

  crystalClusters.forEach((c, idx) => {
    const cx = c.x * w + shiftX * 0.6;
    const cy = c.y * h;
    const cw = c.w * w;
    const ch = c.h * h;
    const awake = smoothstep(idx * 0.16, idx * 0.16 + 0.3, prog);

    // Refracted Prismatic Beam from crystal tip to focal point
    if (awake > 0.02) {
      const tipX = cx + Math.sin(c.angle) * ch;
      const tipY = cy - Math.cos(c.angle) * ch;
      const beam = ctx.createLinearGradient(tipX, tipY, targetX, targetY);
      beam.addColorStop(0, rgba(c.col, awake * (0.45 + vPulse * 0.2)));
      beam.addColorStop(1, rgba(c.col, 0));
      ctx.strokeStyle = beam;
      ctx.lineWidth = cw * 0.55;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();
    }

    // Faceted Crystal Pillar
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(c.angle);
    const cg = ctx.createLinearGradient(0, -ch, 0, 0);
    cg.addColorStop(0, lerpColor('#3B0764', c.col, 0.35 + awake * 0.65));
    cg.addColorStop(1, '#090414');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.moveTo(-cw * 0.5, 0);
    ctx.lineTo(-cw * 0.38, -ch * 0.82);
    ctx.lineTo(0, -ch);
    ctx.lineTo(cw * 0.38, -ch * 0.82);
    ctx.lineTo(cw * 0.5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba('#FFFFFF', 0.25 + awake * 0.5);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  });

  // Floating Crystalline Sparkles
  for (let i = 0; i < 36; i++) {
    const sx = (hash(i * 6.3) * w + Math.sin(time * 0.001 + i) * 30) % w;
    const sy = (hash(i * 11.9) * h + Math.cos(time * 0.0012 + i) * 25) % h;
    const s = (2 + hash(i) * 4) * (0.4 + prog * 0.6);
    ctx.fillStyle = rgba(i % 2 === 0 ? '#E879F9' : '#38BDF8', 0.4 + 0.4 * Math.sin(time * 0.003 + i));
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(Math.PI / 4 + time * 0.001);
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.restore();
  }
}

// ============================================================================
// 11. AUTUMN STREAM (Fiery Sunset River & Drifting Golden/Crimson Leaves)
// ============================================================================
function drawAutumnStream(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  prog: number,
  _vPulse: number,
  px: number,
  py: number,
  shiftX: number,
  _shiftY: number
) {
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.65);
  sky.addColorStop(0, lerpColor('#270E05', '#451A03', prog));
  sky.addColorStop(0.55, lerpColor('#7C2D12', '#C2410C', prog));
  sky.addColorStop(1, lerpColor('#D97706', '#FEF08A', prog));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Autumn Hills & Valley Banks
  const riverTop = h * 0.62;
  drawMountainRidge(ctx, w, h, riverTop, h * 0.06, 4.5, '#2A0F05', shiftX * 0.4, 'rgba(251, 191, 36, 0.3)');

  // Golden Winding River Surface
  const river = ctx.createLinearGradient(0, riverTop, 0, h);
  river.addColorStop(0, lerpColor('#9A3412', '#F59E0B', prog));
  river.addColorStop(0.45, lerpColor('#451A03', '#B45309', prog));
  river.addColorStop(1, '#1C0A03');
  ctx.fillStyle = river;
  ctx.fillRect(0, riverTop, w, h - riverTop);

  // Flowing Golden Water Ripples
  for (let r = 0; r < 30; r++) {
    const u = r / 30;
    const ry = riverTop + u * (h - riverTop);
    const rx = w * 0.5 + Math.sin(u * 6 - time * 0.002) * w * 0.16 + shiftX * u;
    const rw = w * (0.14 + u * 0.35);
    ctx.fillStyle = `rgba(254, 240, 138, ${(0.18 + prog * 0.25) * (1 - u * 0.4)})`;
    ctx.fillRect(rx - rw / 2, ry, rw, 2 + u * 2.5);
  }

  // Drifting Amber & Crimson Autumn Leaves
  const leafCount = Math.floor(28 + prog * 36);
  const leafColors = ['#F59E0B', '#EF4444', '#FBBF24', '#EA580C'];
  for (let i = 0; i < leafCount; i++) {
    const lx =
      ((hash(i * 7.9) * w + time * (0.05 + hash(i) * 0.08) + (px - 0.5) * 180) % (w + 40)) - 20;
    const ly =
      ((hash(i * 13.1) * h + time * (0.04 + hash(i * 2) * 0.05) + (py - 0.5) * 90) % (h + 40)) -
      20;
    const rot = time * 0.002 + i * 1.7;
    const sz = 5 + hash(i * 4.1) * 6;

    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(rot);
    ctx.fillStyle = leafColors[i % leafColors.length];
    ctx.beginPath();
    ctx.moveTo(0, -sz);
    ctx.quadraticCurveTo(sz, 0, 0, sz);
    ctx.quadraticCurveTo(-sz, 0, 0, -sz);
    ctx.fill();
    ctx.restore();
  }
}

// ============================================================================
// 12. SILENT SNOWFALL (3D Parallax Snow & Rose-Gold Alpine Summit Alpenglow)
// ============================================================================
function drawAlpineAlpenglow(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  prog: number,
  _vPulse: number,
  px: number,
  _py: number,
  shiftX: number,
  shiftY: number
) {
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.7);
  sky.addColorStop(0, '#090D16');
  sky.addColorStop(0.55, lerpColor('#1E293B', '#4C1D95', prog));
  sky.addColorStop(1, lerpColor('#334155', '#F43F5E', prog));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  drawStarfield(ctx, w, h, 65, h * 0.5, time, 0.8, shiftX * 0.3, shiftY * 0.3);

  // Alpine Peaks catching Rose-Gold Alpenglow as prog -> 1
  const peakGrad = ctx.createLinearGradient(0, h * 0.45, 0, h * 0.85);
  peakGrad.addColorStop(0, lerpColor('#475569', '#FDA4AF', prog));
  peakGrad.addColorStop(0.35, lerpColor('#1E293B', '#BE123C', prog * 0.85));
  peakGrad.addColorStop(1, '#090D16');

  drawMountainRidge(
    ctx,
    w,
    h,
    h * 0.62,
    h * 0.11,
    2.4,
    peakGrad,
    shiftX * 0.45,
    `rgba(254, 205, 211, ${0.25 + prog * 0.65})`
  );
  drawMountainRidge(ctx, w, h, h * 0.78, h * 0.07, 5.3, '#0B111E', shiftX * 0.9);

  // 3-Layer Depth-of-Field Snowfall responding to interactive pointer breeze
  const snowCount = 85;
  for (let i = 0; i < snowCount; i++) {
    const depth = (i % 3) + 1; // 1 = far, 2 = mid, 3 = near
    const wind = (px - 0.5) * 0.25 * depth;
    const sx =
      ((hash(i * 8.3) * w + time * (0.02 * depth + wind) + Math.sin(time * 0.0015 + i) * 20) % w +
        w) %
      w;
    const sy = ((hash(i * 14.9) * h + time * (0.045 * depth)) % h + h) % h;
    const rad = depth * 1.4;

    ctx.fillStyle = `rgba(255, 255, 255, ${0.25 + depth * 0.22})`;
    ctx.beginPath();
    ctx.arc(sx, sy, rad, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ============================================================================
// 13. OCEAN CATHEDRAL (Volumetric Underwater Sunbeams & Swaying Marine Kelp)
// ============================================================================
function drawOceanCathedral(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  prog: number,
  vPulse: number,
  px: number,
  _py: number,
  shiftX: number,
  _shiftY: number
) {
  const sea = ctx.createLinearGradient(0, 0, 0, h);
  sea.addColorStop(0, lerpColor('#0284C7', '#22D3EE', prog));
  sea.addColorStop(0.5, '#0369A1');
  sea.addColorStop(1, '#041322');
  ctx.fillStyle = sea;
  ctx.fillRect(0, 0, w, h);

  // Volumetric God-Rays from rippling water surface above (converge & brighten with prog)
  const rayCount = 9;
  for (let r = 0; r < rayCount; r++) {
    const u = r / (rayCount - 1);
    const topX = lerp(w * (0.1 + u * 0.8), w * (0.35 + u * 0.3), prog * 0.6) + shiftX * 0.4;
    const botSpread = (u - 0.5) * w * 0.55 + (px - 0.5) * 160;
    const alpha = (0.12 + prog * 0.22 + vPulse * 0.06) * (0.6 + 0.4 * Math.sin(time * 0.002 + r));

    const rg = ctx.createLinearGradient(topX, 0, topX + botSpread, h * 0.92);
    rg.addColorStop(0, `rgba(224, 242, 254, ${alpha})`);
    rg.addColorStop(0.6, `rgba(34, 211, 238, ${alpha * 0.5})`);
    rg.addColorStop(1, 'rgba(34, 211, 238, 0)');

    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(topX - 28, 0);
    ctx.lineTo(topX + 28, 0);
    ctx.lineTo(topX + botSpread + 95, h);
    ctx.lineTo(topX + botSpread - 95, h);
    ctx.closePath();
    ctx.fill();
  }

  // Swaying Marine Kelp Forest Silhouettes along Ocean Floor (Pure Marine Flora)
  const kelpCount = 16;
  for (let k = 0; k < kelpCount; k++) {
    const kx = (k / (kelpCount - 1)) * w + shiftX * 0.7;
    const kh = h * (0.18 + hash(k * 5.1) * 0.16);
    const sway = Math.sin(time * 0.0018 + k) * 28 + (px - 0.5) * 45;

    ctx.strokeStyle = k % 2 === 0 ? '#021B2B' : '#042F40';
    ctx.lineWidth = 10 + (k % 3) * 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(kx, h);
    ctx.quadraticCurveTo(kx + sway * 0.5, h - kh * 0.5, kx + sway, h - kh);
    ctx.stroke();
  }

  // Rising Luminous Oxygen Bubbles & Bioluminescent Plankton
  for (let b = 0; b < 45; b++) {
    const bx =
      ((hash(b * 9.7) * w + Math.sin(time * 0.002 + b) * 25 + (px - 0.5) * 90) % w + w) % w;
    const by = ((hash(b * 15.3) * h - time * (0.06 + hash(b) * 0.06)) % h + h) % h;
    const br = 2 + hash(b * 3.9) * 5;
    ctx.strokeStyle = `rgba(186, 230, 253, ${0.35 + prog * 0.35})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// ============================================================================
// 14. MOONLIT POND (Rippling Dark Mirror Pond & Blooming Golden Water Lilies)
// ============================================================================
function drawMoonlitLotus(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  prog: number,
  vPulse: number,
  px: number,
  py: number,
  shiftX: number,
  shiftY: number,
  _pointer?: InteractivePointerState
) {
  const pond = ctx.createRadialGradient(
    w * 0.5 + shiftX * 0.3,
    h * 0.45 + shiftY * 0.3,
    20,
    w * 0.5,
    h * 0.5,
    h * 0.85
  );
  pond.addColorStop(0, lerpColor('#064E3B', '#0F766E', prog));
  pond.addColorStop(0.6, '#022C22');
  pond.addColorStop(1, '#011410');
  ctx.fillStyle = pond;
  ctx.fillRect(0, 0, w, h);

  // Expanding Concentric Water Ripples across the Pond
  const rippleCenters = [
    { x: 0.28, y: 0.35 },
    { x: 0.72, y: 0.42 },
    { x: 0.48, y: 0.68 },
    { x: 0.25, y: 0.76 },
    { x: 0.76, y: 0.74 },
    { x: px, y: py },
  ];

  rippleCenters.forEach((rc, idx) => {
    const cycle = ((time * 0.00045 + idx * 0.23) % 1);
    const rx = rc.x * w;
    const ry = rc.y * h;
    const maxR = Math.min(w, h) * 0.16;
    ctx.strokeStyle = `rgba(167, 243, 208, ${(1 - cycle) * 0.35})`;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(rx, ry, cycle * maxR, cycle * maxR * 0.65, 0, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Floating Lotus Pads & Blooming Water Lilies (petals unfold as prog 0 -> 1)
  const lilies = [
    { x: 0.22, y: 0.72, s: 1.0 },
    { x: 0.5, y: 0.78, s: 1.25 },
    { x: 0.78, y: 0.71, s: 0.95 },
    { x: 0.34, y: 0.86, s: 0.85 },
    { x: 0.68, y: 0.85, s: 0.9 },
  ];

  lilies.forEach((l, idx) => {
    const lx = l.x * w + shiftX * 0.5 + Math.sin(time * 0.0012 + idx) * 8;
    const ly = l.y * h + shiftY * 0.3 + Math.cos(time * 0.001 + idx) * 5;
    const padR = Math.min(w, h) * 0.055 * l.s;

    // Lily Pad
    ctx.fillStyle = '#065F46';
    ctx.beginPath();
    ctx.arc(lx, ly, padR, 0.2, Math.PI * 1.95);
    ctx.lineTo(lx, ly);
    ctx.closePath();
    ctx.fill();

    // Unfolding Lotus Petals (bloom openness driven by prog)
    const bloom = clamp(0.25 + prog * 0.75, 0, 1);
    const petalCount = 8;
    const petalLen = padR * (0.45 + bloom * 0.45) * (1 + vPulse * 0.08);

    ctx.save();
    ctx.translate(lx, ly - 4);
    for (let p = 0; p < petalCount; p++) {
      const a = (p / petalCount) * Math.PI * 2 + time * 0.0002;
      ctx.save();
      ctx.rotate(a);
      ctx.fillStyle = p % 2 === 0 ? '#FFFBEB' : '#FDE68A';
      ctx.beginPath();
      ctx.ellipse(0, -petalLen * 0.5, petalLen * 0.28 * bloom, petalLen * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Golden Glowing Lotus Heart
    const heartGlow = ctx.createRadialGradient(0, 0, 1, 0, 0, padR * 0.9 * bloom);
    heartGlow.addColorStop(0, '#FEF08A');
    heartGlow.addColorStop(0.4, rgba('#F59E0B', 0.75 * bloom));
    heartGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = heartGlow;
    ctx.beginPath();
    ctx.arc(0, 0, padR * 0.9 * bloom, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

// ============================================================================
// 15. SACRED GORGE (Sweeping Slot-Canyon Sunbeams & Illuminated Golden Dust)
// ============================================================================
function drawSacredGorge(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  prog: number,
  vPulse: number,
  px: number,
  _py: number,
  shiftX: number,
  _shiftY: number
) {
  const gorge = ctx.createLinearGradient(0, 0, w, h);
  gorge.addColorStop(0, '#2A0F05');
  gorge.addColorStop(0.5, lerpColor('#7C2D12', '#9A3412', prog));
  gorge.addColorStop(1, '#1A0802');
  ctx.fillStyle = gorge;
  ctx.fillRect(0, 0, w, h);

  // Sweeping Diagonal Sunbeams from upper canyon opening (pivot across chamber as prog 0 -> 1)
  const beamOriginX = lerp(w * 0.25, w * 0.75, prog) + (px - 0.5) * 120;
  for (let b = 0; b < 4; b++) {
    const spread = (b - 1.5) * w * 0.22;
    const bg = ctx.createLinearGradient(beamOriginX, 0, w * 0.5 + spread, h);
    const alpha = (0.18 + prog * 0.22 + vPulse * 0.08);
    bg.addColorStop(0, `rgba(254, 240, 138, ${alpha})`);
    bg.addColorStop(0.65, `rgba(251, 146, 60, ${alpha * 0.55})`);
    bg.addColorStop(1, 'rgba(251, 146, 60, 0)');

    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(beamOriginX - 35, 0);
    ctx.lineTo(beamOriginX + 35, 0);
    ctx.lineTo(w * 0.5 + spread + 140, h);
    ctx.lineTo(w * 0.5 + spread - 140, h);
    ctx.closePath();
    ctx.fill();
  }

  // Sculpted Sandstone Canyon Walls on Left & Right
  ctx.fillStyle = '#1C0903';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w * 0.22, 0);
  ctx.quadraticCurveTo(w * 0.08 + shiftX * 0.4, h * 0.5, w * 0.26, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(w, 0);
  ctx.lineTo(w * 0.78, 0);
  ctx.quadraticCurveTo(w * 0.92 + shiftX * 0.4, h * 0.5, w * 0.74, h);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  // Swirling Golden Canyon Dust Motes
  for (let d = 0; d < 65; d++) {
    const dx = ((hash(d * 5.9) * w + Math.sin(time * 0.001 + d) * 40 + shiftX) % w + w) % w;
    const dy = ((hash(d * 11.3) * h - time * 0.03) % h + h) % h;
    const r = 1.5 + hash(d) * 3.5;
    ctx.fillStyle = `rgba(253, 224, 71, ${0.35 + 0.45 * Math.sin(time * 0.003 + d)})`;
    ctx.beginPath();
    ctx.arc(dx, dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ============================================================================
// 16. PRIMORDIAL EARTH (Volcanic Mountain Embers Cooling into Peaceful Stars)
// ============================================================================
function drawPrimordialEarth(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  prog: number,
  _vPulse: number,
  px: number,
  _py: number,
  shiftX: number,
  shiftY: number
) {
  // Sky transitions from smoky crimson ember-glow to serene starry midnight
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.75);
  sky.addColorStop(0, lerpColor('#1A0505', '#020617', prog));
  sky.addColorStop(0.55, lerpColor('#450A0A', '#0F172A', prog));
  sky.addColorStop(1, lerpColor('#9A3412', '#1E1B4B', prog));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Stars emerge in upper sky as volcanic turmoil cools into peace
  drawStarfield(ctx, w, h, 80, h * 0.62, time, smoothstep(0.15, 1, prog), shiftX * 0.35, shiftY * 0.35);

  // Ascending Embers that transform from fiery orange sparks at bottom to silver-gold stars above
  for (let e = 0; e < 60; e++) {
    const ex =
      ((hash(e * 7.3) * w + Math.sin(time * 0.002 + e) * 35 + (px - 0.5) * 140) % w + w) % w;
    const ey = ((hash(e * 13.7) * h - time * (0.08 + hash(e) * 0.08)) % h + h) % h;
    const heightRatio = 1 - ey / h;
    const col = lerpColor('#F97316', '#FEF08A', clamp(heightRatio * 0.7 + prog * 0.5, 0, 1));
    const r = 1.5 + hash(e * 3.1) * 3.2;

    ctx.fillStyle = rgba(col, 0.75);
    ctx.beginPath();
    ctx.arc(ex, ey, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Basalt Mountain Range with glowing ridge fissures
  const ridgeCol = lerpColor('#FB923C', '#38BDF8', prog);
  drawMountainRidge(ctx, w, h, h * 0.68, h * 0.09, 3.8, '#0D070A', shiftX * 0.5, rgba(ridgeCol, 0.55));
  drawMountainRidge(ctx, w, h, h * 0.81, h * 0.06, 6.4, '#050305', shiftX * 0.9);
}

// ============================================================================
// 17. MISTY FJORD (Parting Emerald Fog Curtains Unveiling Hidden Valley)
// ============================================================================
function drawNordicFjord(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  prog: number,
  _vPulse: number,
  px: number,
  _py: number,
  shiftX: number,
  _shiftY: number
) {
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.72);
  sky.addColorStop(0, '#042F2E');
  sky.addColorStop(0.55, lerpColor('#115E59', '#0D9488', prog));
  sky.addColorStop(1, lerpColor('#134E4A', '#99F6E4', prog));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Hidden Sunlit Valley Glow in Center Distance (revealed as fog curtains part)
  const valleyGlow = ctx.createRadialGradient(w * 0.5, h * 0.52, 10, w * 0.5, h * 0.52, w * 0.5);
  valleyGlow.addColorStop(0, `rgba(254, 240, 138, ${0.2 + prog * 0.65})`);
  valleyGlow.addColorStop(0.5, `rgba(94, 234, 212, ${0.15 + prog * 0.35})`);
  valleyGlow.addColorStop(1, 'rgba(13, 148, 136, 0)');
  ctx.fillStyle = valleyGlow;
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.52, w * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Steep Fjord Cliffs
  drawMountainRidge(ctx, w, h, h * 0.64, h * 0.1, 1.9, '#063734', shiftX * 0.4);
  drawMountainRidge(ctx, w, h, h * 0.74, h * 0.08, 4.2, '#03201E', shiftX * 0.8);

  // Parting Atmospheric Fog Curtains (drift outward left & right as prog 0 -> 1)
  const partOffset = prog * w * 0.38;
  for (let f = 0; f < 6; f++) {
    const isLeft = f % 2 === 0;
    const fx =
      (isLeft ? w * 0.25 - partOffset : w * 0.75 + partOffset) +
      Math.sin(time * 0.0006 + f) * 35 +
      (px - 0.5) * 60;
    const fy = h * (0.45 + f * 0.07);
    const fr = w * 0.34;
    const fg = ctx.createRadialGradient(fx, fy, 10, fx, fy, fr);
    fg.addColorStop(0, `rgba(204, 251, 241, ${(1 - prog * 0.6) * 0.35})`);
    fg.addColorStop(1, 'rgba(204, 251, 241, 0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(fx, fy, fr, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ============================================================================
// 18. RAIN ON GLASS (Trickling Window Raindrops & Blooming Golden Garden Bokeh)
// ============================================================================
function drawRainSanctuary(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  prog: number,
  vPulse: number,
  px: number,
  py: number,
  shiftX: number,
  shiftY: number
) {
  // Soft-focus Botanical Garden Backdrop
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#052E16');
  bg.addColorStop(0.55, lerpColor('#14532D', '#15803D', prog));
  bg.addColorStop(1, '#021A0C');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Dreamy Bokeh Light Orbs blooming across the garden as prog -> 1
  const bokehCount = Math.floor(14 + prog * 22);
  for (let b = 0; b < bokehCount; b++) {
    const bx = hash(b * 6.7) * w + shiftX * (0.3 + hash(b) * 0.5);
    const by = hash(b * 11.3) * h + shiftY * 0.4;
    const br = (25 + hash(b * 3.1) * 55) * (0.6 + prog * 0.5 + vPulse * 0.08);
    const col = b % 2 === 0 ? '#FDE047' : '#86EFAC';
    const alpha = (0.12 + prog * 0.22) * (0.6 + 0.4 * Math.sin(time * 0.0015 + b));

    const g = ctx.createRadialGradient(bx, by, br * 0.1, bx, by, br);
    g.addColorStop(0, rgba(col, alpha));
    g.addColorStop(0.7, rgba(col, alpha * 0.6));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }

  // Trickling Refractive Raindrops on the Foreground Glass Pane
  const dropCount = 42;
  for (let d = 0; d < dropCount; d++) {
    const speed = 0.05 + hash(d * 4.3) * 0.11;
    const dx =
      ((hash(d * 9.1) * w + Math.sin(time * 0.001 + d) * 6 + (px - 0.5) * 40) % w + w) % w;
    const dy = ((hash(d * 15.7) * h + time * speed + (py - 0.5) * 30) % (h + 80)) - 40;
    const trailLen = 28 + hash(d * 2.3) * 45;
    const r = 3 + hash(d) * 3.5;

    // Refractive trail
    const trail = ctx.createLinearGradient(dx, dy - trailLen, dx, dy);
    trail.addColorStop(0, 'rgba(255, 255, 255, 0)');
    trail.addColorStop(1, 'rgba(220, 252, 231, 0.35)');
    ctx.strokeStyle = trail;
    ctx.lineWidth = r * 0.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(dx, dy - trailLen);
    ctx.lineTo(dx, dy);
    ctx.stroke();

    // Water droplet bead
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.beginPath();
    ctx.arc(dx, dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ============================================================================
// 19. COSMIC PILLARS (3D Deep-Space Flight & Star Genesis in Nebula Clouds)
// ============================================================================
function drawPillarsOfCreation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  prog: number,
  vPulse: number,
  px: number,
  py: number,
  _shiftX: number,
  _shiftY: number
) {
  ctx.fillStyle = '#030510';
  ctx.fillRect(0, 0, w, h);

  const cx = w * (0.5 + (px - 0.5) * 0.25);
  const cy = h * (0.48 + (py - 0.5) * 0.25);

  // Billowing Nebula Gas Pillars (grow richer & more luminous as prog 0 -> 1)
  const nebulaClouds = [
    { dx: -0.18, dy: -0.12, r: 0.42, col: '#7E22CE' },
    { dx: 0.16, dy: 0.08, r: 0.38, col: '#0284C7' },
    { dx: 0.0, dy: -0.04, r: 0.35, col: '#D946EF' },
    { dx: -0.12, dy: 0.2, r: 0.36, col: '#F59E0B' },
  ];

  nebulaClouds.forEach((nc, idx) => {
    const nx = cx + nc.dx * w + Math.sin(time * 0.0005 + idx) * 35;
    const ny = cy + nc.dy * h + Math.cos(time * 0.0004 + idx) * 35;
    const nr = Math.min(w, h) * nc.r * (0.85 + prog * 0.35);
    const g = ctx.createRadialGradient(nx, ny, 10, nx, ny, nr);
    g.addColorStop(0, rgba(nc.col, 0.28 + prog * 0.22));
    g.addColorStop(1, rgba(nc.col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(nx, ny, nr, 0, Math.PI * 2);
    ctx.fill();
  });

  // 3D Warp-Depth Starfield streaming outward from focal point (cx, cy)
  const starCount = 90;
  for (let i = 0; i < starCount; i++) {
    const z = ((hash(i * 5.3) + time * 0.00018) % 1);
    const angle = hash(i * 11.7) * Math.PI * 2;
    const dist = z * Math.max(w, h) * 0.75;
    const sx = cx + Math.cos(angle) * dist;
    const sy = cy + Math.sin(angle) * dist;
    const size = (0.6 + z * 3.2) * (1 + vPulse * 0.15);
    const alpha = Math.sin(z * Math.PI);

    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, size, 0, Math.PI * 2);
    ctx.fill();

    // Newly ignited newborn stars with 4-point cross diffraction spikes as prog increases
    if (i < Math.floor(prog * 22) && z > 0.35) {
      const spike = size * 5;
      ctx.strokeStyle = `rgba(254, 240, 138, ${alpha * 0.7})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sx - spike, sy);
      ctx.lineTo(sx + spike, sy);
      ctx.moveTo(sx, sy - spike);
      ctx.lineTo(sx, sy + spike);
      ctx.stroke();
    }
  }
}

// ============================================================================
// 20. EMERALD BAMBOO (Swaying Bamboo Grove with Interactive Wind Physics)
// ============================================================================
function drawEmeraldBamboo(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  prog: number,
  _vPulse: number,
  px: number,
  _py: number,
  shiftX: number,
  _shiftY: number
) {
  const grove = ctx.createLinearGradient(0, 0, 0, h);
  grove.addColorStop(0, lerpColor('#022C22', '#065F46', prog));
  grove.addColorStop(0.55, lerpColor('#064E3B', '#047857', prog));
  grove.addColorStop(1, '#011712');
  ctx.fillStyle = grove;
  ctx.fillRect(0, 0, w, h);

  // Rising Golden Sunbeams piercing the Bamboo Grove as prog -> 1
  const rayAlpha = 0.08 + prog * 0.24;
  for (let r = 0; r < 5; r++) {
    const rx = w * (0.15 + r * 0.18) + shiftX * 0.4;
    const rg = ctx.createLinearGradient(rx, 0, rx + 120, h);
    rg.addColorStop(0, `rgba(253, 224, 71, ${rayAlpha})`);
    rg.addColorStop(1, 'rgba(16, 185, 129, 0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(rx - 25, 0);
    ctx.lineTo(rx + 25, 0);
    ctx.lineTo(rx + 160, h);
    ctx.lineTo(rx + 40, h);
    ctx.closePath();
    ctx.fill();
  }

  // Segmented Bamboo Stalks swaying with harmonic wind & touch pointer force
  const stalkCount = 14;
  for (let s = 0; s < stalkCount; s++) {
    const isFore = s % 2 === 0;
    const baseX = (s / (stalkCount - 1)) * w + (hash(s) - 0.5) * 40 + shiftX * (isFore ? 0.9 : 0.4);
    const sway =
      Math.sin(time * 0.0016 + s * 0.7) * (18 + prog * 12) + (px - 0.5) * (isFore ? 65 : 35);
    const stalkW = isFore ? 14 : 9;
    const col = isFore ? '#022019' : '#053B2E';

    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = stalkW;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(baseX, h);
    ctx.quadraticCurveTo(baseX + sway * 0.45, h * 0.5, baseX + sway, 0);
    ctx.stroke();

    // Bamboo Node Rings & Delicate Leaves
    const segments = 7;
    for (let seg = 1; seg < segments; seg++) {
      const u = seg / segments;
      const nx = baseX + sway * (u * u * 0.55 + u * 0.45);
      const ny = h * (1 - u);
      ctx.strokeStyle = rgba('#6EE7B7', isFore ? 0.35 : 0.2);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(nx - stalkW * 0.6, ny);
      ctx.lineTo(nx + stalkW * 0.6, ny);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Floating Golden-Emerald Light Motes rising through the bamboo grove
  for (let m = 0; m < 45; m++) {
    const mx = ((hash(m * 8.1) * w + Math.sin(time * 0.0015 + m) * 30) % w + w) % w;
    const my = ((hash(m * 12.7) * h - time * 0.04) % h + h) % h;
    const r = 2 + hash(m) * 3.5;
    ctx.fillStyle = rgba(m % 2 === 0 ? '#FEF08A' : '#6EE7B7', 0.4 + prog * 0.4);
    ctx.beginPath();
    ctx.arc(mx, my, r, 0, Math.PI * 2);
    ctx.fill();
  }
}
