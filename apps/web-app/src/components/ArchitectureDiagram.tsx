import { motion, AnimatePresence } from "motion/react";
import React, { useRef, useState, useEffect } from "react";
import { 
  Activity, 
  LayoutDashboard, 
  Info,
  Layers,
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
import DIAGRAM_URL from "../assets/images/Untitled-2026-05-16-2229.svg";

export const ArchitectureDiagram = () => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [zoomContainer, setZoomContainer] = useState<HTMLDivElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<"diagram" | "metrics">("diagram");
  const [showRawJson, setShowRawJson] = useState(false);

  const [zoomState, setZoomState] = useState({ scale: 1, x: 0, y: 0 });
  const [isZooming, setIsZooming] = useState(false);
  const [transitioningBack, setTransitioningBack] = useState(false);
  const isZoomingRef = useRef(false);
  const touchStartRef = useRef<{ dist: number; cx: number; cy: number }>({ dist: 0, cx: 0, cy: 0 });

  const isCurrentlyZoomed = isZooming || zoomState.scale > 1 || transitioningBack;

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      setImageLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== "diagram") {
      setImageLoaded(false);
      setZoomState({ scale: 1, x: 0, y: 0 });
      setIsZooming(false);
      setTransitioningBack(false);
      isZoomingRef.current = false;
    }
  }, [activeTab]);

  useEffect(() => {
    if (!zoomContainer) {
      setZoomState({ scale: 1, x: 0, y: 0 });
      setIsZooming(false);
      setTransitioningBack(false);
      isZoomingRef.current = false;
      return;
    }

    // Explicitly reset everything on mount/remount of the zoom container to guarantee a fresh state
    setZoomState({ scale: 1, x: 0, y: 0 });
    setIsZooming(false);
    setTransitioningBack(false);
    isZoomingRef.current = false;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        if (e.cancelable) {
          e.preventDefault();
        }
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Guard against single-point coordinates or extremely close fingers to avoid infinite scale
        if (dist > 15) {
          const cx = (t1.clientX + t2.clientX) / 2;
          const cy = (t1.clientY + t2.clientY) / 2;

          touchStartRef.current = { dist, cx, cy };
          isZoomingRef.current = true;
          setIsZooming(true);
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (isZoomingRef.current && e.touches.length === 2) {
        if (e.cancelable) {
          e.preventDefault();
        }
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const cx = (t1.clientX + t2.clientX) / 2;
        const cy = (t1.clientY + t2.clientY) / 2;

        // Clamp the zoom scale factor conservatively between 1 and 4.5
        const scale = Math.min(4.5, Math.max(1, dist / touchStartRef.current.dist));
        const x = cx - touchStartRef.current.cx;
        const y = cy - touchStartRef.current.cy;

        setZoomState({ scale, x, y });
      }
    };

    const onTouchEnd = () => {
      if (isZoomingRef.current) {
        isZoomingRef.current = false;
        setIsZooming(false);
        setZoomState({ scale: 1, x: 0, y: 0 });
        setTransitioningBack(true);
        setTimeout(() => {
          setTransitioningBack(false);
        }, 300);
      }
    };

    zoomContainer.addEventListener("touchstart", onTouchStart, { passive: false });
    zoomContainer.addEventListener("touchmove", onTouchMove, { passive: false });
    zoomContainer.addEventListener("touchend", onTouchEnd, { passive: true });
    zoomContainer.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      zoomContainer.removeEventListener("touchstart", onTouchStart);
      zoomContainer.removeEventListener("touchmove", onTouchMove);
      zoomContainer.removeEventListener("touchend", onTouchEnd);
      zoomContainer.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [zoomContainer]);

  const [snapshotData, setSnapshotData] = useState<any>(null);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const dashboardTitle = "Memory Usage by Cluster Namespace";

  useEffect(() => {
    let active = true;
    const fetchRuntimeSnapshot = async () => {
      try {
        const response = await fetch("/data/data.json");
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
        console.warn("Could not fetch runtime /data/data.json:", err);
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

  // Parse Prometheus range query matrix results to coordinate records
  const parsePanelMetrics = (panel: any): any[] => {
    if (!panel || !panel.rawData) return [];

    try {
      const result = panel.rawData.result || [];
      const mergedByTime: Record<number, any> = {};

      result.forEach((series: any) => {
        const metricObj = series.metric || {};
        
        // Dynamically resolve legend/series label name from available keys
        const getSeriesLabel = (metric: Record<string, string>): string => {
          if (!metric) return "Value";
          const preferredLabels = ["pod", "namespace", "container", "instance", "job", "device", "host", "service"];
          for (const label of preferredLabels) {
            if (metric[label]) return metric[label];
          }
          if (metric.__name__) return metric.__name__;
          const remainingKeys = Object.keys(metric).filter(k => k !== "__name__");
          return remainingKeys.length > 0 ? remainingKeys.map(k => metric[k]).join("-") : "Value";
        };

        const seriesName = getSeriesLabel(metricObj);
        const values = series.values || [];
        
        values.forEach((valPair: any) => {
          if (!Array.isArray(valPair) || valPair.length < 2) return;
          const rawTime = valPair[0];
          const valStr = valPair[1];
          
          const timestampMillis = Number(rawTime) * 1000;
          if (isNaN(timestampMillis)) return;

          const val = parseFloat(valStr);
          if (isNaN(val)) return;

          // Convert raw byte values to MiB
          const valInMiB = val / (1024 * 1024);

          if (!mergedByTime[timestampMillis]) {
            const date = new Date(timestampMillis);
            const hrs = date.getHours().toString().padStart(2, "0");
            const mins = date.getMinutes().toString().padStart(2, "0");
            mergedByTime[timestampMillis] = {
              timestampMillis,
              timestamp: `${hrs}:${mins}`,
            };
          }
          mergedByTime[timestampMillis][seriesName] = Math.round(valInMiB * 100) / 100;
        });
      });

      const sortedTimes = Object.keys(mergedByTime).map(Number).sort((a, b) => a - b);
      return sortedTimes.map(t => mergedByTime[t]);
    } catch (err) {
      console.warn("Could not parse Prometheus matrix:", err);
    }
    return [];
  };

  // Get distinct series/metrics keys to plot
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

  // Build the single adaptive timeline panel purely around the Prometheus range query response payload
  const panels = !isUnavailable && snapshotData ? [{
    id: "prometheus-matrix-query",
    title: dashboardTitle,
    type: "timeseries",
    unit: "LAST 10MIN",
    rawData: snapshotData?.data,
  }] : [];

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
            How Did I <span className="text-slate-300">Deploy This?</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 max-w-xl text-lg leading-relaxed font-light"
          >
            Below is a diagram of the system design. What began as a deep-dive into Kubernetes ultimately gave me the idea to deploy this site on it!
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
              System Design
            </button>
            <button
              onClick={() => setActiveTab("metrics")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold tracking-wider uppercase transition-all duration-200 ${
                activeTab === "metrics"
                  ? "bg-white text-slate-900 shadow-md"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <Activity className="w-4 h-4 text-brand-primary" />
              Metrics
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
              <div 
                ref={setZoomContainer} 
                className={`relative w-full rounded-2xl border-2 border-slate-900 bg-white select-none aspect-[816/844] touch-pan-y transition-shadow duration-300 ${
                  isCurrentlyZoomed 
                    ? "overflow-visible z-[100] shadow-[0_30px_70px_rgba(0,0,0,0.25)]" 
                    : "overflow-hidden z-0 shadow-[0_20px_50px_rgba(0,0,0,0.1)]"
                }`}
              >
                {!imageLoaded && (
                  <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center gap-3 z-20">
                    <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-cyan-500 animate-spin" />
                    <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase font-bold animate-pulse">Rendering system design...</span>
                  </div>
                )}
                <div 
                  className="w-full h-auto origin-center"
                  style={{
                    transform: `translate3d(${zoomState.x}px, ${zoomState.y}px, 0) scale3d(${zoomState.scale}, ${zoomState.scale}, 1)`,
                    transition: isZooming ? "none" : "transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)",
                    willChange: "transform"
                  }}
                >
                  <img 
                    ref={imgRef}
                    src={DIAGRAM_URL} 
                    onLoad={() => setImageLoaded(true)}
                    alt="Cloud Architecture Strategy" 
                    className="w-full h-auto block mx-auto select-none pointer-events-none"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            </motion.div>
          ) : (
                  <motion.div
                    key="metrics-tab"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25 }}
                    className="w-full max-w-4xl mx-auto flex flex-col gap-6"
                  >
              <div className="relative w-full rounded-2xl border border-slate-900 bg-slate-950 overflow-hidden shadow-[0_20px_50px_rgba(30,41,59,0.15)] flex flex-col">
                {/* Main Dashboard Workspace area */}
                <div className="p-6 bg-slate-950 flex flex-col gap-6 min-h-[500px]">

                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-500 font-mono text-xs">
                      <div className="w-8 h-8 rounded-full border-2 border-slate-800 border-t-cyan-500 animate-spin" />
                      <span>Querying Prometheus...</span>
                    </div>
                  ) : isUnavailable ? (
                    <div className="flex flex-col items-center justify-center p-8 py-20 border border-slate-900 rounded-2xl text-center">
                      <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-4 animate-pulse mx-auto">
                        <AlertTriangle className="w-8 h-8" />
                      </div>
                      <h3 className="text-base font-bold text-slate-100 font-mono uppercase tracking-wider mb-2">
                        Technical Difficulties
                      </h3>
                      <p className="text-slate-400 text-xs font-sans max-w-sm leading-relaxed mx-auto">
                        Data will be back up shortly.
                      </p>
                    </div>
                  ) : (
                    /* Dynamic metrics Panels Grid */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {panels.length > 0 ? (
                        panels.map((panel, idx) => {
                          const metricsData = parsePanelMetrics(panel);
                          const keys = getMetricsKeys(metricsData);
                          const title = panel.title || "Metrics Panel";
                          const unit = panel.unit || "";

                          // Default Timeseries Area Chart
                          return (
                            <div key={panel.id || idx} className="p-5 rounded-2xl border border-slate-900 bg-slate-900/30 flex flex-col gap-3 md:col-span-2">
                              <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2">
                                  <Layers className="w-4 h-4 text-cyan-400" />
                                  {title}
                                </h3>
                                {unit && (
                                  <span className="text-[9px] font-mono text-cyan-400 px-1.5 py-0.5 rounded-sm bg-cyan-950/40 border border-cyan-900/40">
                                    {unit}
                                  </span>
                                )}
                              </div>

                              <div className="h-80 sm:h-96 md:h-[400px] w-full mt-2">
                                {metricsData.length > 0 && keys.length > 0 ? (
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={metricsData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
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
                                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.4} />
                                      <XAxis dataKey="timestamp" stroke="#64748b" fontSize={9} minTickGap={30} />
                                      <YAxis stroke="#64748b" fontSize={9} domain={[0, 'auto']} />
                                      <Tooltip 
                                        position={{ y: 0 }}
                                        wrapperStyle={{ pointerEvents: 'none', zIndex: 50 }}
                                        contentStyle={{ 
                                          backgroundColor: 'rgba(15, 23, 42, 0.75)', 
                                          borderColor: 'rgba(30, 41, 59, 0.8)', 
                                          borderRadius: '12px', 
                                          boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                                          backdropFilter: 'blur(6px)',
                                          WebkitBackdropFilter: 'blur(6px)'
                                        }} 
                                        labelStyle={{ color: '#94a3b8', fontSize: '10px', fontFamily: 'monospace' }}
                                        itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                                        formatter={(value: any, name: any) => [`${value} MiB`, name]}
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
                        <div className="p-12 text-center border-2 border-dashed border-slate-800 rounded-3xl col-span-2 text-slate-500 text-sm font-mono flex flex-col items-center justify-center gap-2">
                           <Info className="w-5 h-5 text-slate-600" />
                           <span>No active metrics panels detected in query-range JSON</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Accordion view looking into the actual Prometheus metrics payload */}
                  <div className="mt-2 border-t border-slate-900 pt-4 flex flex-col">
                    <button
                      onClick={() => setShowRawJson(!showRawJson)}
                      className="text-left py-2 text-[10px] font-mono uppercase tracking-wider text-slate-500 hover:text-slate-300 flex items-center gap-1.5 cursor-pointer self-start select-none transition-colors"
                    >
                      <Code className="w-3.5 h-3.5" />
                      {showRawJson ? "[- Hide Prometheus JSON]" : "[+ View Raw Prometheus JSON]"}
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
                            {JSON.stringify(snapshotData, null, 2)}
                          </pre>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                </div>
              </div>


            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};


