// Generates the PWA PNG icons with zero external dependencies.
// Draws a dark rounded-feel square with a bright gradient "pulse" (heartbeat) glyph.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public')
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

// --- minimal PNG encoder (truecolor + alpha, 8-bit) ---
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}
function encodePNG(size, pixels /* Uint8Array RGBA */) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  // rest 0 (compression, filter, interlace)
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0 // filter type none
    pixels.copy ? pixels.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
      : raw.set(pixels.subarray(y * stride, y * stride + stride), y * (stride + 1) + 1)
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

function lerp(a, b, t) { return Math.round(a + (b - a) * t) }

function drawIcon(size) {
  const px = Buffer.alloc(size * size * 4)
  const r = size * 0.18 // corner radius
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      // rounded-corner mask
      let inside = true
      const corners = [[r, r], [size - r, r], [r, size - r], [size - r, size - r]]
      const cx = x < size / 2 ? r : size - r
      const cy = y < size / 2 ? r : size - r
      if ((x < r || x > size - r) && (y < r || y > size - r)) {
        const dx = x - cx, dy = y - cy
        if (dx * dx + dy * dy > r * r) inside = false
      }
      if (!inside) { px[i + 3] = 0; continue }
      // diagonal gradient background: deep navy -> indigo
      const t = (x + y) / (2 * size)
      px[i] = lerp(11, 30, t)      // R  0b0f1a -> 1e1b4b-ish
      px[i + 1] = lerp(15, 27, t)  // G
      px[i + 2] = lerp(26, 75, t)  // B
      px[i + 3] = 255
    }
  }
  // draw a "pulse" (heartbeat) glyph with a green->cyan gradient
  const pts = [[0.18, 0.58], [0.34, 0.58], [0.42, 0.34], [0.54, 0.74], [0.66, 0.50], [0.82, 0.50]]
    .map(([fx, fy]) => [fx * size, fy * size])
  const strokeWidth = size * 0.085
  const distToSeg = (px0, py0, ax, ay, bx, by) => {
    const abx = bx - ax, aby = by - ay
    const apx = px0 - ax, apy = py0 - ay
    const ab2 = abx * abx + aby * aby
    let t = ab2 > 0 ? (apx * abx + apy * aby) / ab2 : 0
    t = Math.max(0, Math.min(1, t))
    const dx = px0 - (ax + abx * t), dy = py0 - (ay + aby * t)
    return Math.sqrt(dx * dx + dy * dy)
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      if (px[i + 3] === 0) continue
      let onStroke = false
      for (let s = 0; s < pts.length - 1; s++) {
        const [ax, ay] = pts[s], [bx, by] = pts[s + 1]
        if (distToSeg(x + 0.5, y + 0.5, ax, ay, bx, by) <= strokeWidth / 2) { onStroke = true; break }
      }
      if (onStroke) {
        const t = (x + (size - y)) / (2 * size)
        px[i] = lerp(34, 56, t)      // R   #22c55e -> #38bdf8
        px[i + 1] = lerp(197, 189, t) // G
        px[i + 2] = lerp(94, 248, t)  // B
        px[i + 3] = 255
      }
    }
  }
  return encodePNG(size, px)
}

writeFileSync(join(outDir, 'icon-192.png'), drawIcon(192))
writeFileSync(join(outDir, 'icon-512.png'), drawIcon(512))
console.log('✓ Generated icon-192.png and icon-512.png')
