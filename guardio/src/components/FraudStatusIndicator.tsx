import { Shield, ShieldAlert, ShieldX } from "lucide-react";
import { motion } from "framer-motion";

type FraudLevel = "safe" | "alert" | "critical";

interface FraudStatusIndicatorProps {
  level: FraudLevel;
}

const config: Record<FraudLevel, { label: string; sublabel: string; icon: typeof Shield; bg: string; text: string; glow: string }> = {
  safe: {
    label: "All Clear",
    sublabel: "No threats detected",
    icon: Shield,
    bg: "bg-safe/10",
    text: "text-safe",
    glow: "shadow-[0_0_20px_4px_hsl(var(--safe)/0.2)]",
  },
  alert: {
    label: "Alert Active",
    sublabel: "Suspicious activity detected",
    icon: ShieldAlert,
    bg: "bg-suspicious/10",
    text: "text-suspicious",
    glow: "shadow-[0_0_20px_4px_hsl(var(--suspicious)/0.2)]",
  },
  critical: {
    label: "Fraud Detected",
    sublabel: "Immediate action required",
    icon: ShieldX,
    bg: "bg-fraud/10",
    text: "text-fraud",
    glow: "shadow-[0_0_20px_4px_hsl(var(--fraud)/0.2)]",
  },
};

export function FraudStatusIndicator({ level }: FraudStatusIndicatorProps) {
  const c = config[level];
  const Icon = c.icon;

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`glass-card rounded-xl p-4 flex items-center gap-4 ${c.glow}`}
    >
      <div className={`p-3 rounded-xl ${c.bg}`}>
        <Icon className={`h-6 w-6 ${c.text}`} />
      </div>
      <div>
        <p className={`font-display font-semibold ${c.text}`}>{c.label}</p>
        <p className="text-xs text-muted-foreground">{c.sublabel}</p>
      </div>
      <div className="ml-auto">
        <div className={`w-3 h-3 rounded-full ${c.bg} ${c.text} animate-pulse`}>
          <div className={`w-3 h-3 rounded-full ${level === "safe" ? "bg-safe" : level === "alert" ? "bg-suspicious" : "bg-fraud"}`} />
        </div>
      </div>
    </motion.div>
  );
}
