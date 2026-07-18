import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { guardioApi } from "@/services/api";
import { Alert } from "@/types/guardio";
import { ShieldAlert, ShieldX, Activity, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const typeConfig = {
  fraud: { icon: ShieldX, color: "text-fraud", bg: "bg-fraud/10" },
  blocked: { icon: ShieldAlert, color: "text-blocked", bg: "bg-blocked/10" },
  unusual: { icon: Activity, color: "text-suspicious", bg: "bg-suspicious/10" },
};

export default function Notifications() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch true security logs from PostgreSQL on load
  useEffect(() => {
    const fetchAlertsData = async () => {
      try {
        const alertData = await guardioApi.getAlerts();
        setAlerts(alertData);
      } catch (error) {
        console.error("Failed to load backend security alerts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlertsData();
  }, []);

  if (loading) {
    return (
      <AppLayout title="Notifications">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground">Synchronizing live security alerts...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Notifications">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{alerts.length} notifications</p>
          {alerts.length > 0 && (
            <button
              onClick={() => setReadIds(new Set(alerts.map((a) => a.id)))}
              className="text-xs text-primary hover:underline"
            >
              Mark all as read
            </button>
          )}
        </div>

        {alerts.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center text-xs text-muted-foreground">
            No active threat alerts detected. Your environment is secure.
          </div>
        ) : (
          alerts.map((alert, i) => {
            const config = typeConfig[alert.type] || typeConfig.unusual;
            const Icon = config.icon;
            const isRead = readIds.has(alert.id) || alert.resolved;

            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setReadIds((prev) => new Set(prev).add(alert.id))}
                className={`glass-card rounded-xl p-4 cursor-pointer transition-opacity ${isRead ? "opacity-50" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${config.bg} flex-shrink-0`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{alert.title}</p>
                      {!isRead && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-1">
                      {new Date(alert.timestamp).toLocaleString("en-US", { 
                        month: "short", 
                        day: "numeric", 
                        hour: "2-digit", 
                        minute: "2-digit" 
                      })}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </AppLayout>
  );
}