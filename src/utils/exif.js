/**
 * Minimal EXIF GPS extractor — no dependencies.
 *
 * Reads the JPEG APP1/EXIF segment and returns
 * { lat, lng } in decimal degrees, or null if unavailable.
 *
 * Supports:
 *   - Little-endian (Intel) and big-endian (Motorola) TIFF headers
 *   - RATIONAL GPS coordinates (most cameras)
 *   - GPSLatitudeRef / GPSLongitudeRef for hemisphere
 */

const EXIF_MARKER      = 0xffe1; // APP1
const EXIF_HEADER      = 0x45786966; // "Exif"
const GPS_IFD_TAG      = 0x8825;
const GPS_LAT_REF_TAG  = 0x0001;
const GPS_LAT_TAG      = 0x0002;
const GPS_LNG_REF_TAG  = 0x0003;
const GPS_LNG_TAG      = 0x0004;

/**
 * Convert a DMS rational array to decimal degrees.
 * @param {number[]} dms  [degrees, minutes, seconds]  (each a decimal already)
 * @param {string}   ref  'N' | 'S' | 'E' | 'W'
 */
function dmsToDecimal(dms, ref) {
  const [deg, min, sec] = dms;
  let decimal = deg + min / 60 + sec / 3600;
  if (ref === 'S' || ref === 'W') decimal = -decimal;
  return decimal;
}

/**
 * Read a RATIONAL (2×uint32) value from a DataView.
 * Returns numerator / denominator.
 */
function readRational(view, offset, littleEndian) {
  const num = view.getUint32(offset,     littleEndian);
  const den = view.getUint32(offset + 4, littleEndian);
  return den === 0 ? 0 : num / den;
}

/**
 * Extract GPS coordinates from a File object (JPEG).
 * Returns a Promise resolving to { lat, lng } or null.
 */
export function extractGpsFromFile(file) {
  return new Promise((resolve) => {
    if (!file || !file.type.includes('jpeg') && !file.type.includes('jpg')) {
      // EXIF GPS is only reliably in JPEG
      resolve(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buf  = e.target.result;
        const view = new DataView(buf);

        // JPEG must start with FFD8
        if (view.getUint16(0) !== 0xffd8) { resolve(null); return; }

        let offset = 2;
        while (offset < view.byteLength - 2) {
          const marker = view.getUint16(offset);
          offset += 2;

          if (marker === EXIF_MARKER) {
            const segLen = view.getUint16(offset);
            // "Exif\0\0" header check
            if (view.getUint32(offset + 2) !== EXIF_HEADER) { resolve(null); return; }

            const tiffStart = offset + 8; // skip length (2) + "Exif\0\0" (6)
            const byteOrder = view.getUint16(tiffStart);
            const le        = byteOrder === 0x4949; // Intel = little-endian

            // IFD0 offset (relative to tiffStart)
            const ifd0Offset = tiffStart + view.getUint32(tiffStart + 4, le);
            const ifd0Count  = view.getUint16(ifd0Offset, le);

            let gpsIFDOffset = null;

            // Scan IFD0 for GPS sub-IFD pointer
            for (let i = 0; i < ifd0Count; i++) {
              const entryOffset = ifd0Offset + 2 + i * 12;
              const tag         = view.getUint16(entryOffset, le);
              if (tag === GPS_IFD_TAG) {
                gpsIFDOffset = tiffStart + view.getUint32(entryOffset + 8, le);
                break;
              }
            }

            if (!gpsIFDOffset) { resolve(null); return; }

            const gpsCount = view.getUint16(gpsIFDOffset, le);
            const gps      = {};

            for (let i = 0; i < gpsCount; i++) {
              const entryOffset = gpsIFDOffset + 2 + i * 12;
              const tag         = view.getUint16(entryOffset, le);
              const type        = view.getUint16(entryOffset + 2, le);
              const count       = view.getUint32(entryOffset + 4, le);
              const valueOffset = entryOffset + 8;

              // ASCII ref tags (GPSLatitudeRef, GPSLongitudeRef)
              if (tag === GPS_LAT_REF_TAG || tag === GPS_LNG_REF_TAG) {
                // value fits in 4 bytes for a single ASCII char
                gps[tag] = String.fromCharCode(view.getUint8(valueOffset));
              }

              // RATIONAL tags (GPSLatitude, GPSLongitude) — type 5
              if ((tag === GPS_LAT_TAG || tag === GPS_LNG_TAG) && type === 5) {
                // count == 3 rationals, value is a pointer
                const ptr = tiffStart + view.getUint32(valueOffset, le);
                const dms = [
                  readRational(view, ptr,      le),
                  readRational(view, ptr + 8,  le),
                  readRational(view, ptr + 16, le),
                ];
                gps[tag] = dms;
              }
            }

            const latDMS = gps[GPS_LAT_TAG];
            const lngDMS = gps[GPS_LNG_TAG];
            const latRef = gps[GPS_LAT_REF_TAG];
            const lngRef = gps[GPS_LNG_REF_TAG];

            if (latDMS && lngDMS) {
              resolve({
                lat: dmsToDecimal(latDMS, latRef || 'N'),
                lng: dmsToDecimal(lngDMS, lngRef || 'E'),
              });
            } else {
              resolve(null);
            }
            return;
          }

          // Skip non-APP1 segments
          if (marker === 0xffda) break; // SOS — no more metadata
          const segLen2 = view.getUint16(offset);
          offset += segLen2;
        }
      } catch {
        // Malformed EXIF — silently ignore
      }
      resolve(null);
    };
    reader.onerror = () => resolve(null);
    // Read only first 128 KB — enough for EXIF
    reader.readAsArrayBuffer(file.slice(0, 131072));
  });
}
