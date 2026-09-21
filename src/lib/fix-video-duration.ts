import { fixWebmDuration } from './fix-webm-duration';

export { fixWebmDuration };

/**
 * Patches in-place duration metadata in MP4 (ISO Base Media File Format) containers.
 * MediaRecorder in Chromium / Android WebView produces fragmented MP4 (fMP4)
 * with duration = 0 in mvhd, tkhd, and mdhd headers.
 * Android's native MPEG4Extractor / MediaScanner falls back to the first fragment (~3s),
 * causing Android Gallery, Google Photos, and native players to display 0:03.
 *
 * This function updates:
 * 1. mvhd (Movie Header): timescale & duration
 * 2. trak -> tkhd (Track Header): duration in movie timescale
 * 3. trak -> mdia -> mdhd (Media Header): duration in media timescale
 * 4. mvex -> mehd (Movie Extends Header): fragment_duration
 *
 * It modifies bytes in place without changing box sizes or shifting offsets.
 */
export function patchMp4ArrayBuffer(buffer: ArrayBuffer, durationSeconds: number): boolean {
  if (buffer.byteLength < 16 || durationSeconds <= 0) {
    return false;
  }

  const view = new DataView(buffer);
  const totalLength = buffer.byteLength;
  let mvhdTimescale = 1000;
  let patched = false;

  function parseBoxes(
    start: number,
    limit: number,
    callback: (type: string, dataPos: number, dataSize: number, boxPos: number, boxSize: number) => void
  ) {
    let p = start;
    while (p + 8 <= limit) {
      let size = view.getUint32(p, false);
      let headerSize = 8;

      if (size === 1) {
        if (p + 16 > limit) break;
        const high = view.getUint32(p + 8, false);
        const low = view.getUint32(p + 12, false);
        size = high * 4294967296 + low;
        headerSize = 16;
      } else if (size === 0) {
        size = limit - p;
      }

      if (size < headerSize || p + size > limit) break;

      const type = String.fromCharCode(
        view.getUint8(p + 4),
        view.getUint8(p + 5),
        view.getUint8(p + 6),
        view.getUint8(p + 7)
      );

      callback(type, p + headerSize, size - headerSize, p, size);
      p += size;
    }
  }

  // 1. First pass: find 'moov' and 'mvhd' to extract timescale and patch mvhd duration
  parseBoxes(0, totalLength, (type, moovDataPos, moovDataSize) => {
    if (type !== 'moov') return;

    parseBoxes(moovDataPos, moovDataPos + moovDataSize, (boxType, dataPos) => {
      if (boxType === 'mvhd') {
        const version = view.getUint8(dataPos);
        if (version === 0) {
          mvhdTimescale = view.getUint32(dataPos + 12, false) || 1000;
          const targetDuration = Math.round(durationSeconds * mvhdTimescale);
          view.setUint32(dataPos + 16, targetDuration, false);
          patched = true;
        } else if (version === 1) {
          mvhdTimescale = view.getUint32(dataPos + 20, false) || 1000;
          const targetDuration = Math.round(durationSeconds * mvhdTimescale);
          view.setUint32(dataPos + 24, 0, false);
          view.setUint32(dataPos + 28, targetDuration, false);
          patched = true;
        }
      }
    });

    // 2. Second pass: patch each 'trak' (tkhd, mdhd) and 'mvex' (mehd)
    parseBoxes(moovDataPos, moovDataPos + moovDataSize, (boxType, dataPos, dataSize) => {
      if (boxType === 'trak') {
        parseBoxes(dataPos, dataPos + dataSize, (trakType, trakDataPos, trakDataSize) => {
          if (trakType === 'tkhd') {
            const version = view.getUint8(trakDataPos);
            const targetDuration = Math.round(durationSeconds * mvhdTimescale);
            if (version === 0) {
              view.setUint32(trakDataPos + 20, targetDuration, false);
              patched = true;
            } else if (version === 1) {
              view.setUint32(trakDataPos + 28, 0, false);
              view.setUint32(trakDataPos + 32, targetDuration, false);
              patched = true;
            }
          } else if (trakType === 'mdia') {
            parseBoxes(trakDataPos, trakDataPos + trakDataSize, (mdiaType, mdiaDataPos) => {
              if (mdiaType === 'mdhd') {
                const version = view.getUint8(mdiaDataPos);
                if (version === 0) {
                  const mediaTimescale = view.getUint32(mdiaDataPos + 12, false) || mvhdTimescale;
                  const targetDuration = Math.round(durationSeconds * mediaTimescale);
                  view.setUint32(mdiaDataPos + 16, targetDuration, false);
                  patched = true;
                } else if (version === 1) {
                  const mediaTimescale = view.getUint32(mdiaDataPos + 20, false) || mvhdTimescale;
                  const targetDuration = Math.round(durationSeconds * mediaTimescale);
                  view.setUint32(mdiaDataPos + 24, 0, false);
                  view.setUint32(mdiaDataPos + 28, targetDuration, false);
                  patched = true;
                }
              }
            });
          }
        });
      } else if (boxType === 'mvex') {
        parseBoxes(dataPos, dataPos + dataSize, (mvexType, mvexDataPos) => {
          if (mvexType === 'mehd') {
            const version = view.getUint8(mvexDataPos);
            const targetDuration = Math.round(durationSeconds * mvhdTimescale);
            if (version === 0) {
              view.setUint32(mvexDataPos + 4, targetDuration, false);
              patched = true;
            } else if (version === 1) {
              view.setUint32(mvexDataPos + 4, 0, false);
              view.setUint32(mvexDataPos + 8, targetDuration, false);
              patched = true;
            }
          }
        });
      }
    });
  });

  return patched;
}

/**
 * Patches duration in an MP4 Blob.
 */
export async function fixMp4Duration(blob: Blob, durationSeconds: number): Promise<Blob> {
  if (blob.size === 0 || durationSeconds <= 0) {
    return blob;
  }

  try {
    const arrayBuffer = await blob.arrayBuffer();
    const success = patchMp4ArrayBuffer(arrayBuffer, durationSeconds);
    if (success) {
      return new Blob([arrayBuffer], { type: blob.type || 'video/mp4' });
    }
    return blob;
  } catch (err) {
    console.warn('Failed to patch MP4 duration:', err);
    return blob;
  }
}

/**
 * Inspects container magic bytes and applies the appropriate duration patch
 * for either MP4 (ftyp) or WebM (EBML) containers.
 */
export async function fixVideoDuration(blob: Blob, durationSeconds: number): Promise<Blob> {
  if (blob.size === 0 || durationSeconds <= 0) {
    return blob;
  }

  try {
    const headerSlice = await blob.slice(0, 32).arrayBuffer();
    const headerBytes = new Uint8Array(headerSlice);

    // Check for MP4 ('ftyp' at offset 4..7)
    const isMp4 =
      headerBytes.length >= 8 &&
      headerBytes[4] === 0x66 && // 'f'
      headerBytes[5] === 0x74 && // 't'
      headerBytes[6] === 0x79 && // 'y'
      headerBytes[7] === 0x70; // 'p'

    if (isMp4 || blob.type.includes('mp4')) {
      const fixedMp4 = await fixMp4Duration(blob, durationSeconds);
      return fixedMp4;
    }

    // Check for WebM (EBML header: 0x1A, 0x45, 0xDF, 0xA3)
    const isWebm =
      headerBytes.length >= 4 &&
      headerBytes[0] === 0x1a &&
      headerBytes[1] === 0x45 &&
      headerBytes[2] === 0xdf &&
      headerBytes[3] === 0xa3;

    if (isWebm || blob.type.includes('webm')) {
      const fixedWebm = await fixWebmDuration(blob, durationSeconds * 1000);
      return fixedWebm;
    }

    // Fallback: try MP4 first, then return original
    const attemptMp4 = await fixMp4Duration(blob, durationSeconds);
    return attemptMp4;
  } catch (err) {
    console.warn('Failed to patch video duration header:', err);
    return blob;
  }
}

