import { motion, AnimatePresence } from "motion/react";
import React, { useCallback, useRef, useState, useEffect } from "react";
import QuickPinchZoom, { make3dTransformValue } from "react-quick-pinch-zoom";
import { 
  Activity, 
  LayoutDashboard, 
  Info,
  Layers,
  Code,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCcw
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
  const containerRef = useRef<HTMLDivElement>(null);
  const pinchZoomRef = useRef<any>(null);
  const currentScaleRef = useRef<number>(1);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<"diagram" | "telemetry">("diagram");
  const [showRawJson, setShowRawJson] = useState(false);

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      setImageLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (pinchZoomRef.current) {
      const pz = pinchZoomRef.current;
      const originalUpdateInteraction = pz._updateInteraction;
      
      pz._updateInteraction = function (event: any) {
        // Distinguish real native touch events from library-simulated mouse events on desktop
        const isRealTouchEvent = event && (
          (event.type && typeof event.type === "string" && event.type.startsWith("touch"))
        );

        if (isRealTouchEvent) {
          const fingers = this._fingers;
          if (fingers === 2) {
            return this._setInteraction("zoom", event);
          }
          // Prevent drag/pan with single finger on touch screens and allow it to bubble up to page scroll
          this._setInteraction(null, event);
          return;
        }

        return originalUpdateInteraction.call(this, event);
      };
    }
  }, [imageLoaded, activeTab]);

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

  const onUpdate = useCallback(({ x, y, scale }: { x: number; y: number; scale: number }) => {
    currentScaleRef.current = scale;
    const { current: container } = containerRef;
    if (container) {
      const value = make3dTransformValue({ x, y, scale });
      container.style.setProperty("transform", value);
    }
  }, []);

  const handleZoomIn = () => {
    if (pinchZoomRef.current) {
      const nextScale = Math.min(4, currentScaleRef.current + 0.5);
      pinchZoomRef.current.scaleTo({
        scale: nextScale,
        x: 0,
        y: 0,
        animated: true
      });
    }
  };

  const handleZoomOut = () => {
    if (pinchZoomRef.current) {
      const nextScale = Math.max(1, currentScaleRef.current - 0.5);
      pinchZoomRef.current.scaleTo({
        scale: nextScale,
        x: 0,
        y: 0,
        animated: true
      });
    }
  };

  const handleReset = () => {
    if (pinchZoomRef.current) {
      pinchZoomRef.current.scaleTo({
        scale: 1,
        x: 0,
        y: 0,
        animated: true
      });
    }
  };

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
    unit: "5min Update Interval",
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
            What began as a deep-dive into self-managed Kubernetes ultimately gave me the idea to deploy this portfolio!
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
              SYSTEM
            </button>
            <button
              onClick={() => setActiveTab("telemetry")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold tracking-wider uppercase transition-all duration-200 ${
                activeTab === "telemetry"
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
              <div className="relative w-full rounded-2xl border-2 border-slate-900 bg-white overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.1)] touch-pan-y">
                <QuickPinchZoom 
                  key={imageLoaded ? "loaded" : "loading"} 
                  ref={pinchZoomRef} 
                  onUpdate={onUpdate} 
                  enforceBounds={true} 
                  tapZoomFactor={2}
                  horizontalPadding={16}
                  verticalPadding={16}
                  containerProps={{
                    style: {
                      touchAction: "pan-y"
                    }
                  }}
                >
                  <div ref={containerRef} className="w-full h-auto origin-[0_0]">
                    <img 
                      ref={imgRef}
                      src={DIAGRAM_URL} 
                      onLoad={() => setImageLoaded(true)}
                      alt="Cloud Architecture Strategy" 
                      className="w-full h-auto block mx-auto transition-transform duration-75 will-change-transform"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </QuickPinchZoom>
                
                {/* Floating Interactive Zoom Controls */}
                <div className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-slate-900/90 text-white rounded-xl p-1.5 shadow-lg backdrop-blur-sm z-10 border border-slate-800">
                  <button 
                    onClick={handleZoomIn}
                    title="Zoom In"
                    className="p-1 px-1.5 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={handleZoomOut}
                    title="Zoom Out"
                    className="p-1 px-1.5 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <div className="w-[1px] h-4 bg-slate-800 mx-1" />
                  <button 
                    onClick={handleReset}
                    title="Reset Zoom"
                    className="p-1 px-1.5 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center text-slate-300"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-slate-400 text-xs font-sans">
                <Info className="w-3.5 h-3.5 text-slate-300" />
                <span>Pinch with 2 fingers to zoom/pan on touch screens</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="telemetry-tab"
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
                      <span>Retrieving live Prometheus metrics stream...</span>
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
                        We &apos; re having technical difficulties, data will be back up shortly.
                      </p>
                    </div>
                  ) : (
                    /* Dynamic Snapshot Panels Grid */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {panels.length > 0 ? (
                        panels.map((panel, idx) => {
                          const metricsData = parsePanelMetrics(panel);
                          const keys = getMetricsKeys(metricsData);
                          const title = panel.title || "Telemetry Panel";
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

                  {/* Accordion view looking into the actual telemetry.json payload */}
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



