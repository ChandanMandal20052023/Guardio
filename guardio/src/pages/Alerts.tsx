import { AppLayout } from "@/components/AppLayout";
import { Alert } from "@/types/mockData";
import { ShieldAlert, ShieldX, Activity, Check, Eye, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useEffect } from "react";
import api from "@/services/api";

const typeConfig = {
  fraud: { icon: ShieldX, color: "text-fraud", bg: "bg-fraud/10", label: "Fraud" },
  blocked: { icon: ShieldAlert, color: "text-blocked", bg: "bg-blocked/10", label: "Blocked" },
  unusual: { icon: Activity, color: "text-suspicious", bg: "bg-suspicious/10", label: "Unusual" },
};

export default function Alerts() {
  const [liveAlerts, setLiveAlerts] = useState<Alert[]>([]);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [transactionsMap, setTransactionsMap] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const [alertsRes, txnsRes] = await Promise.all([
          api.get('/transactions/alerts/'),
          api.get('/transactions/')
        ]);
        
        const mappedAlerts = (alertsRes.data?.results || alertsRes.data || []).map((a: any) => ({
          id: a.alert_id,
          type: a.prediction === 'FRAUD' || a.prediction === 'BLOCKED' ? 'fraud' : 'unusual',
          title: `Alert: ${a.prediction}`,
          description: a.reason,
          timestamp: a.timestamp,
          resolved: a.is_resolved,
          transactionId: a.transaction
        }));
        
        setLiveAlerts(mappedAlerts);
        setResolvedIds(new Set(mappedAlerts.filter((a: any) => a.resolved).map((a: any) => a.id)));
        
        const txMap: Record<string, any> = {};
        (txnsRes.data?.results || txnsRes.data || []).forEach((t: any) => {
          txMap[t.transaction_id] = t;
        });
        setTransactionsMap(txMap);
      } catch (err) {
        console.error("Failed to load alerts", err);
      }
    };
    
    fetchAlerts();
    // Poll every 10 seconds
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleResolve = async (id: string) => {
    try {
      await api.patch(`/transactions/alerts/${id}/`, { is_resolved: true });
      setResolvedIds((prev) => new Set(prev).add(id));
    } catch (err) {
      console.error("Failed to resolve alert", err);
    }
  };

  return (
    <AppLayout title="Fraud Alerts">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Summary */}
        <div className="glass-card rounded-xl p-4 flex items-center gap-4">
          <div className="gradient-primary rounded-xl p-3">
            <ShieldAlert className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-display font-semibold text-sm">Real-Time Monitoring</p>
            <p className="text-xs text-muted-foreground">
              {liveAlerts.filter((a) => !resolvedIds.has(a.id)).length} unresolved alerts
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Radio className="h-3 w-3 text-safe animate-pulse" />
              <span className="text-[10px] text-safe font-medium">LIVE</span>
            </div>
            <Badge className="gradient-primary border-0">AI Active</Badge>
          </div>
        </div>

        {/* Timeline */}
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {liveAlerts.map((alert, i) => {
              const config = typeConfig[alert.type];
              const Icon = config.icon;
              const isResolved = resolvedIds.has(alert.id);
              const tx = transactionsMap[alert.transactionId];
              const isNew = false; // can be determined by timestamp vs last visit

              return (
                <motion.div
                  key={alert.id}
                  layout
                  initial={{ opacity: 0, x: -20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className={`glass-card rounded-xl p-4 ${isResolved ? "opacity-60" : ""} ${
                    isNew && !isResolved ? "ring-2 ring-primary/30 shadow-elevated" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-lg ${config.bg} flex-shrink-0 ${
                      isNew && !isResolved ? "animate-pulse" : ""
                    }`}>
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold text-sm">{alert.title}</p>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 border-0 ${config.bg} ${config.color}`}>
                          {config.label}
                        </Badge>
                        {isNew && !isResolved && (
                          <Badge className="text-[10px] px-1.5 py-0 h-4 gradient-primary border-0 animate-pulse">
                            NEW
                          </Badge>
                        )}
                        {isResolved && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-0 status-safe">
                            Resolved
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{alert.description}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {new Date(alert.timestamp).toLocaleString("en-US", {
                          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>

                      {tx && tx.prediction_reason && (
                        <div className="mt-2 bg-muted/50 rounded-lg p-2">
                          <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Detection Reason:</p>
                          <p className="text-[11px]">{tx.prediction_reason}</p>
                        </div>
                      )}

                      {!isResolved && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleResolve(alert.id)}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Allow
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-fraud/30 text-fraud hover:bg-fraud/10"
                            onClick={() => handleResolve(alert.id)}
                          >
                            Keep Blocked
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs ml-auto">
                            <Eye className="h-3 w-3 mr-1" />
                            Details
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
