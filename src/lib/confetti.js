// Tiny dependency-free canvas confetti burst. Call confetti() to celebrate.
export function confetti({ count = 120, colors = ['#22c55e', '#38bdf8', '#ec4899', '#fbbf24', '#a855f7'] } = {}) {
  if (typeof document === 'undefined') return
  const cv = document.createElement('canvas')
  cv.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999'
  cv.width = innerWidth; cv.height = innerHeight
  document.body.appendChild(cv)
  const ctx = cv.getContext('2d')

  const parts = Array.from({ length: count }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 120,
    y: innerHeight / 2,
    vx: (Math.random() - 0.5) * 14,
    vy: Math.random() * -16 - 4,
    size: Math.random() * 7 + 3,
    color: colors[(Math.random() * colors.length) | 0],
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    life: 1,
  }))

  let frame = 0
  const tick = () => {
    ctx.clearRect(0, 0, cv.width, cv.height)
    frame++
    for (const p of parts) {
      p.vy += 0.4            // gravity
      p.x += p.vx; p.y += p.vy
      p.vx *= 0.99
      p.rot += p.vr
      p.life -= 0.008
      ctx.save()
      ctx.globalAlpha = Math.max(0, p.life)
      ctx.translate(p.x, p.y); ctx.rotate(p.rot)
      ctx.fillStyle = p.color
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
      ctx.restore()
    }
    if (frame < 140) requestAnimationFrame(tick)
    else cv.remove()
  }
  requestAnimationFrame(tick)
}
