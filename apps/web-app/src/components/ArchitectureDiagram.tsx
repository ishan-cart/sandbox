import { motion, AnimatePresence } from "motion/react";
import React, { useCallback, useRef, useState, useEffect } from "react";
import QuickPinchZoom from "react-quick-pinch-zoom";
import { 
  Activity, 
  LayoutDashboard, 
  Info,
  Cpu,
  Code,
  AlertTriangle
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import DIAGRAM_URL from "../assets/images/Untitled-2026-05-16-2229.png";

export const ArchitectureDiagram = () => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [activeTab, setActiveTab] = useState<"diagram" | "grafana">("diagram");
  const [showRawJson, setShowRawJson] = useState(false);

  const [snapshotData, setSnapshotData] = useState<any>(null);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchRuntimeSnapshot = async () => {
      try {
        const response = await fetch("/data/dashboard-snapshot.json");
        if (response.ok) {
          const data = await response.json();
          if (active) {
            setSnapshotData(data);
            setIsUnavailable(false);
            setLoading(false);
          }
        } else {
          if (active) {
            setIsUnavailable(true);
            setLoading(false);
          }
        }
      } catch (err) {
        console.warn("Could not fetch runtime /data/dashboard-snapshot.json:", err);
        if (active) {
          setIsUnavailable(true);
          setLoading(false);
        }
      }
    };

    fetchRuntimeSnapshot();
    return () => {
      active = false;
    };
  }, []);

  // Enforce normalization wrapper so that both raw Grafana dashboard and our simple template formats match beautifully
  let normalizedSnapshot: any = null;
  if (snapshotData) {
    normalizedSnapshot = snapshotData;
    if (!snapshotData.dashboard && Array.isArray((snapshotData as any).panels)) {
      normalizedSnapshot = { dashboard: snapshotData };
    } else if (!snapshotData.dashboard && !(snapshotData as any).panels && Array.isArray(snapshotData)) {
      normalizedSnapshot = { dashboard: { title: "Custom Snapshot Feed", panels: snapshotData } };
    } else if (!snapshotData.dashboard && (snapshotData as any).rows && Array.isArray((snapshotData as any).rows)) {
      const flatPanels: any[] = [];
      (snapshotData as any).rows.forEach((r: any) => {
        if (Array.isArray(r.panels)) flatPanels.push(...r.panels);
      });
      normalizedSnapshot = { dashboard: { title: (snapshotData as any).title || "DevOps Cluster", panels: flatPanels } };
    }
  }

  const snapshot = normalizedSnapshot;

  const onUpdate = useCallback(({ x, y, scale }: { x: number; y: number; scale: number }) => {
    const { current: img } = imgRef;
    if (img) {
      const value = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
      img.style.setProperty("transform", value);
    }
  }, []);

  // Helper to extract dataframes from both standard and newer Scenes dashboards
  const extractDataframes = (panel: any): any[] => {
    const dfs: any[] = [];
    if (!panel) return dfs;

    // 1. Traditional/Standard panel configurations
    if (panel.snapshotData?.data && Array.isArray(panel.snapshotData.data)) {
      dfs.push(...panel.snapshotData.data);
    } else if (panel.snapshotData && Array.isArray(panel.snapshotData)) {
      dfs.push(...panel.snapshotData);
    }

    // 2. Modern Scenes panels dataframes
    const queries = panel.spec?.data?.spec?.queries;
    if (Array.isArray(queries)) {
      queries.forEach((q: any) => {
        const snapshots = q?.spec?.query?.spec?.snapshot;
        if (Array.isArray(snapshots)) {
          dfs.push(...snapshots);
        }
        const specSnapshots = q?.spec?.snapshot;
        if (Array.isArray(specSnapshots)) {
          dfs.push(...specSnapshots);
        }
      });
    }

    // 3. Optional variations in telemetry JSON layouts
    if (panel.data?.snapshot && Array.isArray(panel.data.snapshot)) {
      dfs.push(...panel.data.snapshot);
    }
    if (panel.spec?.data?.snapshot && Array.isArray(panel.spec.data.snapshot)) {
      dfs.push(...panel.spec.data.snapshot);
    }

    return dfs;
  };

  // Resiliently parse metrics data out of both simple templates and standard raw Grafana dataframe exports.
  const parsePanelMetrics = (panel: any): any[] => {
    if (!panel) return [];

    // 1. If it already has our simplified custom metrics format, return it immediately
    if (Array.isArray(panel.metrics) && panel.metrics.length > 0) {
      return panel.metrics;
    }

    // 2. Parse Grafana snapshot dataframes
    try {
      const dataframes = extractDataframes(panel);
      if (dataframes.length > 0) {
        const mergedByTime: Record<number, any> = {};

        dataframes.forEach((df: any) => {
          const fields = df?.schema?.fields || [];
          const values = df?.data?.values || [];

          if (fields.length > 0 && values.length > 0) {
            // Find the time column index, defaulting to where name or type matches time
            const timeColIdx = fields.findIndex(
              (f: any) => f.type === "time" || f.name?.toLowerCase() === "time"
            );
            const timeIdx = timeColIdx !== -1 ? timeColIdx : 0;
            const timeValues = values[timeIdx] || [];

            fields.forEach((field: any, fieldIdx: number) => {
              if (fieldIdx === timeIdx) return; // skip time values itself

              // Determine unique series name based on displayName, label names (pod, container, etc)
              let fieldName = field.config?.displayName || field.name || `metric_${fieldIdx}`;
              if (field.name === "Value" || !field.name || fieldName === "Value") {
                if (field.labels) {
                  if (field.labels.pod) {
                    fieldName = field.labels.pod;
                  } else if (field.labels.container) {
                    fieldName = field.labels.container;
                  } else if (field.labels.instance) {
                    fieldName = field.labels.instance;
                  } else {
                    const labelVals = Object.values(field.labels).join("-");
                    if (labelVals) {
                      fieldName = labelVals;
                    }
                  }
                }
              }

              const fieldValues = values[fieldIdx] || [];

              timeValues.forEach((rawTime: any, idx: number) => {
                const val = fieldValues[idx];
                if (val === undefined || val === null) return;

                const timestampMillis = typeof rawTime === "string" ? Date.parse(rawTime) : Number(rawTime);
                if (isNaN(timestampMillis)) return;

                if (!mergedByTime[timestampMillis]) {
                  const date = new Date(timestampMillis);
                  const hrs = date.getHours().toString().padStart(2, "0");
                  const mins = date.getMinutes().toString().padStart(2, "0");
                  mergedByTime[timestampMillis] = {
                    timestampMillis,
                    timestamp: `${hrs}:${mins}`,
                  };
                }
                // Format decimal values cleanly
                mergedByTime[timestampMillis][fieldName] = typeof val === "number" ? Math.round(val * 100000) / 100000 : val;
              });
            });
          }
        });

        const sortedTimes = Object.keys(mergedByTime).map(Number).sort((a, b) => a - b);
        if (sortedTimes.length > 0) {
          return sortedTimes.map(t => mergedByTime[t]);
        }
      }
    } catch (err) {
      console.warn("Could not parse snapshotData dataframes:", err);
    }

    // 3. Fallback: Parse common alternate formats like targets with datapoints array [value, timestamp]
    try {
      const seriesList = panel?.targets || panel?.series;
      if (Array.isArray(seriesList)) {
        const mergedByTime: Record<number, any> = {};
        seriesList.forEach((s: any, sIdx: number) => {
          const seriesName = s.target || s.refId || `series_${sIdx}`;
          const datapoints = s.datapoints || []; // Array of [value, timestamp]
          
          if (Array.isArray(datapoints)) {
            datapoints.forEach((dp: any) => {
              if (!Array.isArray(dp) || dp.length < 2) return;
              const val = dp[0];
              const rawTime = dp[1];
              
              const timestampMillis = typeof rawTime === "string" ? Date.parse(rawTime) : Number(rawTime);
              if (isNaN(timestampMillis)) return;
              
              if (!mergedByTime[timestampMillis]) {
                const date = new Date(timestampMillis);
                const hrs = date.getHours().toString().padStart(2, "0");
                const mins = date.getMinutes().toString().padStart(2, "0");
                mergedByTime[timestampMillis] = {
                  timestampMillis,
                  timestamp: `${hrs}:${mins}`,
                };
              }
              mergedByTime[timestampMillis][seriesName] = typeof val === "number" ? Math.round(val * 100) / 100 : val;
            });
          }
        });
        
        const sortedTimes = Object.keys(mergedByTime).map(Number).sort((a, b) => a - b);
        if (sortedTimes.length > 0) {
          return sortedTimes.map(t => mergedByTime[t]);
        }
      }
    } catch (err) {
      console.warn("Could not parse targets/series list:", err);
    }

    return [];
  };

  // Extract all distinct metrics keynames (e.g. cpu_core1, cpu_core2, etc) excluding our timestamps
  const getMetricsKeys = (data: any[]) => {
    if (!data || data.length === 0) return [];
    const keys = new Set<string>();
    data.forEach(item => {
      Object.keys(item).forEach(key => {
        if (key !== "timestamp" && key !== "timestampMillis") {
          keys.add(key);
        }
      });
    });
    return Array.from(keys);
  };

  // Extract Grafana Dashboard information safely
  const dashboardTitle = isUnavailable ? "Dashboard Unavailable" : (snapshot?.dashboard?.title || snapshot?.title || "DevOps Cluster overview");

  // Custom robust panel extractor
  const extractAllPanels = (dashboardObj: any): any[] => {
    if (!dashboardObj) return [];
    
    const panelsList: any[] = [];
    const seenIds = new Set<any>();

    const scan = (item: any) => {
      if (!item || typeof item !== "object") return;

      const isPanel = 
        item.kind === "Panel" || 
        (typeof item.type === "string" && (item.title || item.id || item.targets || item.snapshotData || item.spec?.title));
      
      if (isPanel) {
        const id = item.id || item.spec?.id || Math.random().toString(36).substr(2, 9);
        const title = item.title || item.spec?.title || "";
        
        const normalized = {
          ...item,
          id,
          title,
          metrics: item.metrics || item.spec?.metrics,
          type: item.type || item.spec?.vizConfig?.kind || item.kind || "timeseries",
        };
        
        if (!seenIds.has(id)) {
          seenIds.add(id);
          panelsList.push(normalized);
        }
      }

      if (Array.isArray(item)) {
        item.forEach(scan);
      } else {
        Object.keys(item).forEach(key => {
          if (key !== "values" && key !== "snapshotData" && key !== "schema" && key !== "datapoints" && key !== "metrics") {
            scan(item[key]);
          }
        });
      }
    };

    scan(dashboardObj);
    return panelsList;
  };

  const panels = snapshot ? extractAllPanels(snapshot.dashboard || snapshot) : [];

  return (
    <section className="pt-20 pb-20 px-6 relative overflow-hidden bg-white" id="architecture">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12 text-left">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex items-center gap-3 mb-2"
          >
            <div className="w-12 h-1 bg-brand-primary rounded-full" />
            <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-black">System Flow</span>
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="text-5xl md:text-6xl font-black mb-4 text-slate-900 tracking-tighter"
          >
            How did I <span className="text-slate-300">deploy this?</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 max-w-xl text-lg leading-relaxed font-light"
          >
            Explore my deployment blueprints and live cluster telemetry directly feeding from the server's Grafana snapshot monitor.
          </motion.p>
        </div>

        {/* Dynamic Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1.5 bg-slate-100 rounded-3xl border border-slate-200/60 shadow-sm">
            <button
              onClick={() => setActiveTab("diagram")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold tracking-wider uppercase transition-all duration-200 ${
                activeTab === "diagram"
                  ? "bg-white text-slate-900 shadow-md"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Blueprints
            </button>
            <button
              onClick={() => setActiveTab("grafana")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold tracking-wider uppercase transition-all duration-200 ${
                activeTab === "grafana"
                  ? "bg-white text-slate-900 shadow-md"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <Activity className="w-4 h-4 text-brand-primary" />
              Live Telemetry
            </button>
          </div>
        </div>

        {/* Tab Contents */}
        <AnimatePresence mode="wait">
          {activeTab === "diagram" ? (
            <motion.div
              key="diagram-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="relative flex flex-col items-center w-full max-w-4xl lg:max-w-2xl mx-auto"
            >
              <div className="relative w-full rounded-2xl border-2 border-slate-900 bg-white overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-4 md:p-8 touch-none">
                <QuickPinchZoom onUpdate={onUpdate} enforceBounds={true} tapZoomFactor={2}>
                  <img 
                    ref={imgRef}
                    src={DIAGRAM_URL} 
                    alt="Cloud Architecture Strategy" 
                    className="w-full h-auto block mx-auto transition-transform duration-75 will-change-transform"
                    referrerPolicy="no-referrer"
                  />
                </QuickPinchZoom>
                
                <div className="absolute bottom-4 right-4 md:hidden pointer-events-none">
                  <span className="bg-slate-900/80 text-white text-[10px] px-2 py-1 rounded-full font-mono uppercase tracking-tighter backdrop-blur-sm">Pinch to Zoom</span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-slate-400 text-xs font-sans">
                <Info className="w-3.5 h-3.5 text-slate-300" />
                <span>Pinch to zoom dynamically on touch screens</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="grafana-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-4xl mx-auto flex flex-col gap-6"
            >
              <div className="relative w-full rounded-2xl border-2 border-slate-900 bg-slate-950 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col">
                {/* Dashboard Bezel Header */}
                <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    </div>
                    <span className="text-[10px] font-mono uppercase text-slate-400 ml-2 tracking-wider">
                      {dashboardTitle}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 uppercase tracking-widest">
                      Local Config Source
                    </span>
                  </div>
                </div>

                {/* Main Dashboard Workspace area */}
                <div className="p-6 bg-slate-950 flex flex-col gap-6 min-h-[500px]">

                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400 font-mono text-xs">
                      <div className="w-8 h-8 rounded-full border-2 border-slate-850 border-t-cyan-500 animate-spin" />
                      <span>Retrieving telemetry snapshot stream...</span>
                    </div>
                  ) : isUnavailable ? (
                    <div className="flex flex-col items-center justify-center p-8 py-20 border border-slate-900 rounded-2xl text-center">
                      <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-4 animate-pulse mx-auto">
                        <AlertTriangle className="w-8 h-8" />
                      </div>
                      <h3 className="text-base font-bold text-slate-200 font-mono uppercase tracking-wider mb-2">
                        Dashboard Unavailable
                      </h3>
                      <p className="text-slate-500 text-xs font-mono max-w-sm leading-relaxed mx-auto">
                        The application was unable to retrieve a valid snapshot JSON from <code className="bg-slate-900 px-1 py-0.5 rounded border border-slate-800 text-slate-300 font-sans">/data/dashboard-snapshot.json</code>.
                        Please verify that the configuration file exists in your output directory and is well-formed.
                      </p>
                    </div>
                  ) : (
                    /* Dynamic Snapshot Panels Grid */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {panels.length > 0 ? (
                        panels.map((panel, idx) => {
                          const metricsData = parsePanelMetrics(panel);
                          const keys = getMetricsKeys(metricsData);
                          const title = panel.title || panel.spec?.title || "Telemetry Panel";
                          const unit = panel.unit || panel.spec?.unit || "";

                          // Check if this looks like a stat / gauge layout panel
                          if (panel.stats || panel.type === "singlestat" || panel.type === "gauge") {
                            const statsMap = panel.stats || {};
                            return (
                              <div key={panel.id || idx} className="p-5 rounded-2xl border border-slate-900 bg-slate-900/20 flex flex-col gap-3 h-full justify-between">
                                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2">
                                  <Activity className="w-4 h-4 text-emerald-400" />
                                  {title}
                                </h3>
                                <div className="grid grid-cols-2 gap-3 mt-2">
                                  {Object.entries(statsMap).map(([k, v]: [string, any]) => (
                                    <div key={k} className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/40 flex flex-col gap-1.5">
                                      <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">{k}</span>
                                      <div className="text-slate-200 font-mono font-bold text-sm">
                                        {String(v)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }

                          // Default Timeseries Area Chart
                          return (
                            <div key={panel.id || idx} className="p-5 rounded-2xl border border-slate-900 bg-slate-900/20 flex flex-col gap-3 md:col-span-2">
                              <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2">
                                  <Cpu className="w-4 h-4 text-cyan-400" />
                                  {title}
                                </h3>
                                {unit && (
                                  <span className="text-[9px] font-mono text-cyan-500 px-1.5 py-0.5 rounded-sm bg-cyan-950/50 border border-cyan-900/40">
                                    {unit}
                                  </span>
                                )}
                              </div>

                              <div className="h-64 w-full mt-2">
                                {metricsData.length > 0 && keys.length > 0 ? (
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={metricsData}>
                                      <defs>
                                        {keys.map((key, index) => {
                                          const colors = ["#06b6d4", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#f59e0b"];
                                          const strokeColor = colors[index % colors.length];
                                          const gradId = `dynamicGrad_${String(panel.id).replace(/[^a-zA-Z0-9]/g, "_")}_${key.replace(/[^a-zA-Z0-9]/g, "_")}`;
                                          return (
                                            <linearGradient id={gradId} key={gradId} x1="0" y1="0" x2="0" y2="1">
                                              <stop offset="5%" stopColor={strokeColor} stopOpacity={0.25}/>
                                              <stop offset="95%" stopColor={strokeColor} stopOpacity={0}/>
                                            </linearGradient>
                                          );
                                        })}
                                      </defs>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                                      <XAxis dataKey="timestamp" stroke="#64748b" fontSize={9} />
                                      <YAxis stroke="#64748b" fontSize={9} domain={[0, 'auto']} />
                                      <Tooltip 
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} 
                                        labelStyle={{ color: '#94a3b8', fontSize: '10px', fontFamily: 'monospace' }}
                                        itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                                      />
                                      <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '8px' }} />
                                      {keys.map((key, index) => {
                                        const colors = ["#06b6d4", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#f59e0b"];
                                        const strokeColor = colors[index % colors.length];
                                        const gradId = `dynamicGrad_${String(panel.id).replace(/[^a-zA-Z0-9]/g, "_")}_${key.replace(/[^a-zA-Z0-9]/g, "_")}`;
                                        
                                        const isLimit = key.toLowerCase().includes("limit") || key.toLowerCase().includes("thresh") || key.toLowerCase().includes("quota");
                                        if (isLimit) {
                                          return (
                                            <Area 
                                              key={key}
                                              type="monotone" 
                                              name={key} 
                                              dataKey={key} 
                                              stroke="#ef4444" 
                                              strokeWidth={1.5} 
                                              strokeDasharray="4 4" 
                                              fill="none" 
                                            />
                                          );
                                        }

                                        return (
                                          <Area 
                                            key={key}
                                            type="monotone" 
                                            name={key} 
                                            dataKey={key} 
                                            stroke={strokeColor} 
                                            strokeWidth={2} 
                                            fillOpacity={1} 
                                            fill={`url(#${gradId})`} 
                                          />
                                        );
                                      })}
                                    </AreaChart>
                                  </ResponsiveContainer>
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-xs text-slate-500 font-mono">
                                    No parsed metrics data for this panel
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-12 text-center border-2 border-dashed border-slate-800 rounded-3xl col-span-2 text-slate-400 text-sm font-mono flex flex-col items-center justify-center gap-2">
                          <Info className="w-5 h-5 text-slate-600" />
                          <span>No active metrics panels detected in snapshot JSON</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Accordion view looking into the actual telemetry.json payload */}
                  <div className="mt-2 border-t border-slate-900 pt-4 flex flex-col">
                    <button
                      onClick={() => setShowRawJson(!showRawJson)}
                      className="text-left py-2 text-[10px] font-mono uppercase tracking-wider text-slate-500 hover:text-slate-300 flex items-center gap-1.5 cursor-pointer self-start select-none transition-colors"
                    >
                      <Code className="w-3.5 h-3.5" />
                      {showRawJson ? "[- Hide Snapshot JSON]" : "[+ View Raw Snapshot JSON]"}
                    </button>

                    <AnimatePresence>
                      {showRawJson && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden mt-3"
                        >
                          <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400 overflow-x-auto max-h-[250px] leading-relaxed select-all">
                            {JSON.stringify(snapshot, null, 2)}
                          </pre>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                </div>
              </div>

              {/* Guide card helpful context for snapshot feed integration */}
              <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50 text-slate-500 text-xs flex flex-col gap-2 font-sans md:mx-auto md:max-w-xl animate-fade-in">
                <div className="flex items-center gap-2 font-black text-slate-700 uppercase tracking-wider text-[10px]">
                  <Info className="w-4 h-4 text-brand-primary" />
                  SRE Deployment Integration Guide
                </div>
                <p className="font-light leading-relaxed">
                  This dashboard renders telemetry loaded directly from your local configuration file. Edit <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded font-mono text-[10px]">/data/dashboard-snapshot.json</code> to supply or modify telemetry panels.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};



