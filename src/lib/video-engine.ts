import { AspectRatio, BackgroundPresetId, Chapter, Verse, VideoConfig } from '@/types/quran';
import { BACKGROUND_PRESETS } from './constants';
import { cleanTranslationText } from './quran-api';

export interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  pulseSpeed: number;
  angle: number;
}

export function createParticles(count: number, width: number, height: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2.8 + 0.8,
      speedY: (Math.random() - 0.4) * 0.4,
      speedX: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.7 + 0.3,
      pulseSpeed: Math.random() * 0.03 + 0.01,
      angle: Math.random() * Math.PI * 2,
    });
  }
  return particles;
}

export function getCanvasDimensions(aspectRatio: AspectRatio, targetWidth = 1080): { width: number; height: number } {
  switch (aspectRatio) {
    case '9:16':
      return { width: targetWidth, height: Math.round((targetWidth * 16) / 9) }; // e.g. 1080 x 1920
    case '1:1':
      return { width: targetWidth, height: targetWidth }; // 1080 x 1080
    case '16:9':
      return { width: targetWidth, height: Math.round((targetWidth * 9) / 16) }; // 1920 x 1080
    default:
      return { width: 1080, height: 1920 };
  }
}

/**
 * Wraps text into lines that fit within a maximum width on a 2D canvas context
 */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (let n = 0; n < words.length; n++) {
    const testLine = currentLine ? `${currentLine} ${words[n]}` : words[n];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      lines.push(currentLine);
      currentLine = words[n];
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Renders an animated frame to the canvas
 */
export function renderVideoFrame({
  ctx,
  width,
  height,
  config,
  chapter,
  currentVerse,
  verseProgress = 0,
  totalProgress,
  particles,
  time = 0,
  customMediaElement,
  persianTafsirText,
}: {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  config: VideoConfig;
  chapter: Chapter | null;
  currentVerse: Verse | null;
  verseProgress?: number; // 0 to 1
  totalProgress?: number; // 0 to 1 across whole video
  particles: Particle[];
  time?: number;
  customMediaElement?: HTMLVideoElement | HTMLImageElement | null;
  persianTafsirText?: string;
}) {
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  const preset =
    BACKGROUND_PRESETS.find((p) => p.id === config.backgroundPreset) ||
    BACKGROUND_PRESETS[0];

  // 1. Draw Background
  if (customMediaElement) {
    try {
      ctx.drawImage(customMediaElement, 0, 0, width, height);
    } catch {
      drawPresetBackground(ctx, width, height, preset, time);
    }
  } else {
    drawPresetBackground(ctx, width, height, preset, time);
  }

  // 2. Draw Particles / Motion Effects
  drawParticles(ctx, width, height, particles, preset.id, time);

  // 3. Dark Overlay Vignette for Contrast & Readability
  drawOverlayVignette(ctx, width, height, config.overlayOpacity);

  // 4. Draw Center Verse Card & Calligraphy
  if (currentVerse) {
    drawCenterVerse(
      ctx,
      width,
      height,
      currentVerse,
      chapter,
      config,
      verseProgress,
      preset.accentColor,
      persianTafsirText || currentVerse.persianTafsir
    );
  }

  // 5. Draw Decorative Islamic Border & Footer
  drawIslamicAccents(
    ctx,
    width,
    height,
    config,
    preset.accentColor,
    verseProgress,
    totalProgress
  );

  ctx.restore();
}

function drawPresetBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  preset: (typeof BACKGROUND_PRESETS)[0],
  time: number
) {
  const gradient = ctx.createRadialGradient(
    width / 2 + Math.sin(time * 0.0005) * 80,
    height * 0.45 + Math.cos(time * 0.0006) * 60,
    width * 0.1,
    width / 2,
    height / 2,
    height * 0.75
  );

  gradient.addColorStop(0, preset.gradientColors[1]);
  gradient.addColorStop(0.65, preset.gradientColors[0]);
  gradient.addColorStop(1, preset.gradientColors[2]);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  particles: Particle[],
  presetId: BackgroundPresetId,
  time: number
) {
  ctx.save();
  for (const p of particles) {
    p.y += p.speedY;
    p.x += p.speedX;
    p.angle += p.pulseSpeed;

    // Wrap around screen
    if (p.y < 0) p.y = height;
    if (p.y > height) p.y = 0;
    if (p.x < 0) p.x = width;
    if (p.x > width) p.x = 0;

    const currentOpacity =
      p.opacity * (0.6 + 0.4 * Math.sin(p.angle + time * 0.002));

    if (presetId === 'emerald') {
      // Islamic 8-point geometric star motes
      ctx.strokeStyle = `rgba(16, 185, 129, ${currentOpacity * 0.5})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const s = p.size * 2.2;
      ctx.strokeRect(p.x - s / 2, p.y - s / 2, s, s);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.PI / 4);
      ctx.strokeRect(-s / 2, -s / 2, s, s);
      ctx.restore();
    } else if (presetId === 'rain') {
      // Falling raindrops
      ctx.fillStyle = `rgba(6, 182, 212, ${currentOpacity * 0.65})`;
      ctx.fillRect(p.x, p.y, 1.5, p.size * 6);
    } else if (presetId === 'gold') {
      // Warm glowing golden dust
      ctx.fillStyle = `rgba(245, 158, 11, ${currentOpacity * 0.8})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Cosmic stars
      ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawOverlayVignette(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  opacity: number
) {
  // Vignette gradient from edges to center
  const vignette = ctx.createRadialGradient(
    width / 2,
    height / 2,
    width * 0.25,
    width / 2,
    height / 2,
    height * 0.65
  );
  vignette.addColorStop(0, `rgba(0, 0, 0, ${opacity * 0.35})`);
  vignette.addColorStop(0.7, `rgba(0, 0, 0, ${opacity * 0.75})`);
  vignette.addColorStop(1, `rgba(0, 0, 0, ${Math.min(opacity * 1.25, 0.95)})`);

  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

function drawCenterVerse(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  verse: Verse,
  chapter: Chapter | null,
  config: VideoConfig,
  progress: number,
  accentColor: string,
  persianTafsirText?: string
) {
  ctx.save();

  // Subtle breathing float animation
  const floatOffset = Math.sin(progress * Math.PI) * 8;
  const centerY = height * 0.48 + floatOffset;

  // 1. Top Surah & Ayah Header ("Ayah" & "Surah {name}, Ayah {number}")
  if (config.showSurahBadge && chapter) {
    const badgeY = height * 0.13;
    const titleSize = config.surahTitleFontSize || 30;
    ctx.font = `700 ${titleSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
    ctx.fillStyle = config.surahTitleColor || '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Ayah', width / 2, badgeY);

    const subSize = config.badgeFontSize || 18;
    ctx.font = `500 ${subSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
    ctx.fillStyle = config.badgeTextColor || 'rgba(148, 163, 184, 0.9)';
    ctx.fillText(
      `Surah ${chapter.name_simple}, Ayah ${verse.verse_number}`,
      width / 2,
      badgeY + titleSize * 0.85
    );
  }

  // 2. Center Arabic Verse Calligraphy
  const paddingX = width * 0.08;
  const maxContentWidth = width - paddingX * 2;

  // Format Arabic text with Ayah end glyph ۝
  const arabicText = config.showAyahNumber
    ? `${verse.text_uthmani} ۝${toArabicDigits(verse.verse_number)}`
    : verse.text_uthmani;

  const arabicFontSize = config.arabicFontSize || 38;
  ctx.font = `600 ${arabicFontSize}px "${config.arabicFontFamily || 'Amiri Quran'}", "Amiri", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const arabicLines = wrapText(ctx, arabicText, maxContentWidth);
  const arabicLineHeight = arabicFontSize * 1.7;
  const totalArabicHeight = arabicLines.length * arabicLineHeight;

  // 3. Prepare English Translation Subtitle
  let englishLines: string[] = [];
  const translationFontSize = config.translationFontSize || 20;
  const englishLineHeight = translationFontSize * 1.5;
  let totalEnglishHeight = 0;

  if (config.showTranslation && verse.translations && verse.translations[0]) {
    const rawTranslation = verse.translations[0].text;
    const cleanText = cleanTranslationText(rawTranslation);

    ctx.font = `400 ${translationFontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
    englishLines = wrapText(ctx, cleanText, maxContentWidth * 0.92);
    if (englishLines.length > 0) {
      totalEnglishHeight = englishLines.length * englishLineHeight;
    }
  }

  // 4. Prepare Persian Tafsir Subtitle
  let persianLines: string[] = [];
  const persianFontSize = config.persianFontSize || 17;
  const persianLineHeight = persianFontSize * 1.6;
  let totalPersianHeight = 0;
  const activePersianText = persianTafsirText || verse.persianTafsir || '';

  if (config.showPersianTafsir && activePersianText) {
    ctx.font = `400 ${persianFontSize}px "Vazirmatn", "Amiri", "Plus Jakarta Sans", system-ui, sans-serif`;
    persianLines = wrapText(ctx, activePersianText, maxContentWidth * 0.92);
    if (persianLines.length > 0) {
      totalPersianHeight = persianLines.length * persianLineHeight;
    }
  }

  const hasEnglish = englishLines.length > 0;
  const hasPersian = persianLines.length > 0;
  const hasSubtitles = hasEnglish || hasPersian;
  const gapBetweenSubtitles = hasEnglish && hasPersian ? 26 : 0;
  const subtitleSpacing = hasSubtitles ? 28 : 0;
  const totalSubtitleHeight = totalEnglishHeight + totalPersianHeight + gapBetweenSubtitles;

  // Calculate starting Y for balanced center positioning
  const totalBlockHeight = totalArabicHeight + subtitleSpacing + totalSubtitleHeight;
  let startArabicY = centerY - totalBlockHeight / 2 + arabicLineHeight / 2;

  // If text is tall, push it up gracefully
  if (startArabicY < height * 0.19) {
    startArabicY = height * 0.19;
  }

  // Draw Central Soft Backdrop Card for ultimate mobile readability
  const cardPadY = 36;
  const cardPadX = 24;
  const cardHeight = totalBlockHeight + cardPadY * 2;
  const cardWidth = maxContentWidth + cardPadX * 2;
  const cardX = (width - cardWidth) / 2;
  const cardY = startArabicY - arabicLineHeight / 2 - cardPadY;

  ctx.fillStyle = 'rgba(10, 15, 30, 0.48)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 28);
  ctx.fill();
  ctx.stroke();

  // Glow Effect behind Arabic text
  if (config.glowEffect) {
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 24;
  }

  // Draw Arabic Calligraphy Lines
  ctx.fillStyle = config.arabicTextColor || '#FFFFFF';
  ctx.font = `600 ${arabicFontSize}px "${config.arabicFontFamily || 'Amiri Quran'}", "Amiri", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  arabicLines.forEach((line, idx) => {
    const lineY = startArabicY + idx * arabicLineHeight;
    ctx.fillText(line, width / 2, lineY);
  });

  // Reset shadow for subtitles
  ctx.shadowBlur = 0;

  // Draw Subtitles (English and/or Persian based on position)
  if (hasSubtitles) {
    let currentY =
      startArabicY + (arabicLines.length - 0.5) * arabicLineHeight + subtitleSpacing;

    const drawDivider = (yPos: number) => {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 50, yPos);
      ctx.lineTo(width / 2 + 50, yPos);
      ctx.stroke();
    };

    // Draw top divider after Arabic calligraphy
    drawDivider(currentY - 14);

    // Draw English Subtitle function
    const drawEnglishBlock = () => {
      ctx.font = `400 ${translationFontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
      ctx.fillStyle = config.translationTextColor || '#CBD5E1';
      ctx.textAlign = 'center';
      englishLines.forEach((tLine, tIdx) => {
        ctx.fillText(tLine, width / 2, currentY + tIdx * englishLineHeight);
      });
      currentY += totalEnglishHeight;
    };

    // Draw Persian Tafsir Subtitle function
    const drawPersianBlock = () => {
      ctx.font = `400 ${persianFontSize}px "Vazirmatn", "Amiri", "Plus Jakarta Sans", system-ui, sans-serif`;
      ctx.fillStyle = config.persianTextColor || '#FDE68A';
      ctx.textAlign = 'center';
      persianLines.forEach((pLine, pIdx) => {
        ctx.fillText(pLine, width / 2, currentY + pIdx * persianLineHeight);
      });
      currentY += totalPersianHeight;
    };

    // Ordering logic based on config.persianTafsirPosition ('under' or 'above')
    if (hasEnglish && hasPersian) {
      if (config.persianTafsirPosition === 'above') {
        // Persian ABOVE English
        drawPersianBlock();
        drawDivider(currentY + 12);
        currentY += gapBetweenSubtitles;
        drawEnglishBlock();
      } else {
        // Persian UNDER English (default)
        drawEnglishBlock();
        drawDivider(currentY + 12);
        currentY += gapBetweenSubtitles;
        drawPersianBlock();
      }
    } else if (hasPersian) {
      drawPersianBlock();
    } else if (hasEnglish) {
      drawEnglishBlock();
    }

    // Draw emerald accent pill under translation (matching user screenshot)
    ctx.fillStyle = '#10B981';
    ctx.beginPath();
    ctx.roundRect(width / 2 - 24, currentY + 12, 48, 4, 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawIslamicAccents(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: VideoConfig,
  accentColor: string,
  verseProgress: number,
  totalProgress?: number
) {
  ctx.save();

  const barHeight = 4;
  const barY = height - barHeight - 12;
  const barMargin = width * 0.08;
  const barWidth = width - barMargin * 2;

  // Bottom Sleek Progress Bar (Continuous full-filling bar across whole video or per verse)
  if (config.showProgressBar) {
    const progress =
      config.progressBarScope === 'verse'
        ? verseProgress
        : totalProgress !== undefined
        ? totalProgress
        : verseProgress;

    // Background track
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.roundRect(barMargin, barY, barWidth, barHeight, barHeight / 2);
    ctx.fill();

    // Progress fill
    const currentProgressWidth = Math.max(barWidth * Math.min(progress, 1), 6);
    ctx.fillStyle = config.progressBarColor || accentColor;
    ctx.beginPath();
    ctx.roundRect(barMargin, barY, currentProgressWidth, barHeight, barHeight / 2);
    ctx.fill();
  }

  // Subtle watermark / branding at bottom: "Powered by Quran.com"
  if (config.showWatermark) {
    const wmFontSize = config.watermarkFontSize || 18;
    ctx.font = `500 ${wmFontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = config.watermarkColor || 'rgba(255, 255, 255, 0.4)';
    const wmText = config.watermarkText || 'Powered by Quran.com';
    ctx.fillText(wmText, width / 2, barY - 14);
  }

  ctx.restore();
}

/**
 * Converts Western digits to Eastern Arabic numerals (e.g. 1 -> ١)
 */
function toArabicDigits(num: number): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num
    .toString()
    .split('')
    .map((d) => arabicDigits[parseInt(d, 10)] || d)
    .join('');
}
