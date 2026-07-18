import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Alert } from "@/types/mockData";
import { ShieldX, ShieldAlert, Activity } from "lucide-react";
import React from "react";

const simulatedAlerts: Omit<Alert, "id">[] = [
  {
    type: "fraud",
    title: "🚨 Fraud Detected",
    description: "Suspicious charge of ₹3,29,000 at Electronics Depot, Bucharest, Romania",
    timestamp: new Date().toISOString(),
    transactionId: "sim1",
    resolved: false,
  },
  {
    type: "blocked",
    title: "🛑 Transaction Blocked",
    description: "Wire transfer of ₹8,75,000 to unknown offshore account was auto-blocked",
    timestamp: new Date().toISOString(),
    transactionId: "sim2",
    resolved: false,
  },
  {
    type: "unusual",
    title: "⚡ Unusual Activity",
    description: "Multiple rapid purchases detected — 5 transactions in 2 minutes",
    timestamp: new Date().toISOString(),
    transactionId: "sim3",
    resolved: false,
  },
  {
    type: "fraud",
    title: "🚨 Card Cloning Suspected",
    description: "Your card was used in Tokyo while a transaction occurred in New York simultaneously",
    timestamp: new Date().toISOString(),
    transactionId: "sim4",
    resolved: false,
  },
  {
    type: "blocked",
    title: "🛑 High-Risk Purchase Blocked",
    description: "Cryptocurrency purchase of ₹15,00,000 from unverified exchange blocked",
    timestamp: new Date().toISOString(),
    transactionId: "sim5",
    resolved: false,
  },
];

const toastStyles: Record<string, { icon: React.ReactNode; className: string }> = {
  fraud: {
    icon: React.createElement(ShieldX, { className: "h-5 w-5 text-fraud" }),
    className: "border-fraud/30 bg-fraud/5",
  },
  blocked: {
    icon: React.createElement(ShieldAlert, { className: "h-5 w-5 text-blocked" }),
    className: "border-blocked/30 bg-blocked/5",
  },
  unusual: {
    icon: React.createElement(Activity, { className: "h-5 w-5 text-suspicious" }),
    className: "border-suspicious/30 bg-suspicious/5",
  },
};

interface UseFraudSimulationOptions {
  onNewAlert?: (alert: Alert) => void;
  intervalMs?: number;
  enabled?: boolean;
}

export function useFraudSimulation({
  onNewAlert,
  intervalMs = 8000,
  enabled = true,
}: UseFraudSimulationOptions = {}) {
  const indexRef = useRef(0);

  const triggerAlert = useCallback(() => {
    const simData = simulatedAlerts[indexRef.current % simulatedAlerts.length];
    const newAlert: Alert = {
      ...simData,
      id: `sim-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

    const style = toastStyles[newAlert.type];

    toast(newAlert.title, {
      description: newAlert.description,
      icon: style.icon,
      duration: 6000,
      className: style.className,
      action: newAlert.type === "fraud" || newAlert.type === "blocked"
        ? {
            label: "Review",
            onClick: () => {
              window.location.href = "/alerts";
            },
          }
        : undefined,
    });

    onNewAlert?.(newAlert);
    indexRef.current++;
  }, [onNewAlert]);

  useEffect(() => {
    if (!enabled) return;

    // First alert after 3 seconds
    const initialTimeout = setTimeout(triggerAlert, 3000);

    // Then every intervalMs
    const interval = setInterval(triggerAlert, intervalMs);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [enabled, intervalMs, triggerAlert]);

  return { triggerAlert };
}
