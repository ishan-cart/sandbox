export const METRICS_CHART_COLORS = ['#06b6d4', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b']

export const metricsStrokeColor = (index: number): string =>
  METRICS_CHART_COLORS[index % METRICS_CHART_COLORS.length]

export const metricsGradientId = (panelId: string | number | undefined, key: string): string =>
  `dynamicGrad_${String(panelId).replace(/[^a-zA-Z0-9]/g, '_')}_${key.replace(/[^a-zA-Z0-9]/g, '_')}`

export const isMetricsLimitKey = (key: string): boolean => {
  const normalized = key.toLowerCase()
  return normalized.includes('limit') || normalized.includes('thresh') || normalized.includes('quota')
}
