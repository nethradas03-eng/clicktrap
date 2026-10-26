/**
 * ClickTrap Icon Generator
 * Generates PNG icons (16, 32, 48, 128) using Node.js built-in zlib module without external dependencies.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Ensure icons directory exists
const iconsDir = path.join(__dirname, '..', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// CRC32 calculation table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ crcTable[(c ^ buf[i]) & 0xFF];
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function writeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(len + 12);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, len + 8));
  chunk.writeUInt32BE(crc, len + 8);
  return chunk;
}

function createPng(width, height, renderPixel) {
  const header = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);   // bit depth: 8
  ihdr.writeUInt8(6, 9);   // color type: RGBA (6)
  ihdr.writeUInt8(0, 10);  // compression: deflate
  ihdr.writeUInt8(0, 11);  // filter: standard
  ihdr.writeUInt8(0, 12);  // interlace: none
  const ihdrChunk = writeChunk('IHDR', ihdr);

  // Scanlines with filter byte 0
  const rowStride = width * 4;
  const rawData = Buffer.alloc(height * (rowStride + 1));
  
  let ptr = 0;
  for (let y = 0; y < height; y++) {
    rawData[ptr++] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = renderPixel(x, y, width, height);
      rawData[ptr++] = r;
      rawData[ptr++] = g;
      rawData[ptr++] = b;
      rawData[ptr++] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = writeChunk('IDAT', compressedData);
  const iendChunk = writeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

/**
 * ClickTrap Shield + Radar design:
 * Dark navy circular base (#0B1020), glowing teal shield rim (#35D6C2),
 * Soft cyan inner crosshair / radar sweep (#72B7FF), alert central iris.
 */
function renderClickTrapIcon(x, y, width, height) {
  // Normalize coordinates to -1.0 to 1.0
  const nx = (x + 0.5 - width / 2) / (width / 2);
  const ny = (y + 0.5 - height / 2) / (height / 2);
  const dist = Math.sqrt(nx * nx + ny * ny);

  // Background rounded squircle / shield
  if (dist > 0.98) {
    return [0, 0, 0, 0]; // Transparent outside
  }

  // Base background: Deep Navy (#0B1020)
  let r = 11, g = 16, b = 32, a = 255;

  // Outer ring border: Soft glow #35D6C2
  if (dist >= 0.85 && dist <= 0.96) {
    const edgeT = (dist - 0.85) / 0.11;
    const factor = Math.sin(edgeT * Math.PI);
    r = Math.round(11 + (53 - 11) * factor);
    g = Math.round(16 + (214 - 16) * factor);
    b = Math.round(32 + (194 - 32) * factor);
    return [r, g, b, 255];
  }

  // Shield Shape definition:
  // ny is between -0.6 (top) and 0.7 (bottom tip)
  // width bounds narrow towards bottom
  const shieldTop = -0.55;
  const shieldBottom = 0.65;
  
  if (ny >= shieldTop && ny <= shieldBottom) {
    const t = (ny - shieldTop) / (shieldBottom - shieldTop);
    // Shield width: wide at top (0.55), stays wide till t=0.4, then curves to 0 at bottom
    let maxW = 0.52;
    if (t > 0.35) {
      maxW = 0.52 * Math.cos(((t - 0.35) / 0.65) * (Math.PI / 2));
    }
    
    const absX = Math.abs(nx);
    // Shield rim
    if (absX <= maxW && absX >= maxW - 0.12) {
      // Teal highlight
      return [53, 214, 194, 255]; // #35D6C2
    }
    
    // Inside shield
    if (absX < maxW - 0.12) {
      // Dark navy surface #182338
      r = 24; g = 35; b = 56;
      
      // Radar rings inside shield
      const innerDist = Math.sqrt(nx * nx + (ny - 0.05) * (ny - 0.05));
      if (Math.abs(innerDist - 0.22) < 0.04) {
        return [114, 183, 255, 230]; // Soft cyan #72B7FF
      }
      
      // Central alert trap dot
      if (innerDist < 0.09) {
        return [53, 214, 194, 255]; // Bright teal
      }
    }
  }

  return [r, g, b, a];
}

const sizes = [16, 32, 48, 128];
sizes.forEach(size => {
  const png = createPng(size, size, renderClickTrapIcon);
  const outPath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`Generated: ${outPath} (${size}x${size})`);
});

// Also create an SVG version for high-res web usage
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#35D6C2" />
      <stop offset="100%" stop-color="#72B7FF" />
    </linearGradient>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#182338" />
      <stop offset="100%" stop-color="#0B1020" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <!-- Background Circle -->
  <circle cx="64" cy="64" r="60" fill="url(#bgGrad)" stroke="#1E2D4A" stroke-width="2"/>
  
  <!-- Outer Scanner Track -->
  <circle cx="64" cy="64" r="52" fill="none" stroke="#35D6C2" stroke-width="1.5" stroke-dasharray="8 6" opacity="0.6"/>
  
  <!-- Shield Emblem -->
  <path d="M 64 26 C 80 26 94 30 94 48 C 94 76 74 96 64 104 C 54 96 34 76 34 48 C 34 30 48 26 64 26 Z" 
        fill="#121A2B" stroke="url(#shieldGrad)" stroke-width="4" filter="url(#glow)"/>
        
  <!-- Radar concentric circles inside shield -->
  <circle cx="64" cy="60" r="16" fill="none" stroke="#72B7FF" stroke-width="2" opacity="0.75"/>
  <circle cx="64" cy="60" r="8" fill="none" stroke="#35D6C2" stroke-width="2"/>
  <circle cx="64" cy="60" r="3" fill="#35D6C2"/>
  
  <!-- Crosshair Reticle -->
  <line x1="64" y1="36" x2="64" y2="44" stroke="#72B7FF" stroke-width="2" stroke-linecap="round"/>
  <line x1="64" y1="76" x2="64" y2="84" stroke="#72B7FF" stroke-width="2" stroke-linecap="round"/>
  <line x1="42" y1="60" x2="50" y2="60" stroke="#72B7FF" stroke-width="2" stroke-linecap="round"/>
  <line x1="78" y1="60" x2="86" y2="60" stroke="#72B7FF" stroke-width="2" stroke-linecap="round"/>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent, 'utf8');
console.log('Generated: icons/icon.svg');
