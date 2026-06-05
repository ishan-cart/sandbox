export interface PinchTouchMetrics {
  dist: number
  cx: number
  cy: number
}

export const getPinchTouchMetrics = (touches: TouchList): PinchTouchMetrics | null => {
  if (touches.length !== 2) {
    return null
  }

  const t1 = touches[0]
  const t2 = touches[1]
  const dx = t1.clientX - t2.clientX
  const dy = t1.clientY - t2.clientY
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist <= 15) {
    return null
  }

  return {
    dist,
    cx: (t1.clientX + t2.clientX) / 2,
    cy: (t1.clientY + t2.clientY) / 2
  }
}
