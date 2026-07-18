import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  variant?: "default" | "primary" | "success" | "danger";
}

const variantStyles = {
  default: "glass-card",
  primary: "gradient-primary text-primary-foreground",
  success: "glass-card border-safe/20",
  danger: "glass-card border-fraud/20",
};

const iconStyles = {
  default: "bg-accent text-accent-foreground",
  primary: "bg-primary-foreground/20 text-primary-foreground",
  success: "bg-safe/10 text-safe",
  danger: "bg-fraud/10 text-fraud",
};

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = "default" }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl p-5 ${variantStyles[variant]}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${iconStyles[variant]}`}>
          <Icon className="h-4 w-4" />
        </div>
        {trend && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            trend.positive ? "status-safe" : "status-fraud"
          }`}>
            {trend.value}
          </span>
        )}
      </div>
      <p className={`text-2xl font-display font-bold ${variant === "primary" ? "" : ""}`}>
        {value}
      </p>
      <p className={`text-xs mt-1 ${
        variant === "primary" ? "text-primary-foreground/70" : "text-muted-foreground"
      }`}>
        {title}
      </p>
      {subtitle && (
        <p className={`text-[10px] mt-0.5 ${
          variant === "primary" ? "text-primary-foreground/50" : "text-muted-foreground/70"
        }`}>
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}
