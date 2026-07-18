import { AppLayout } from "@/components/AppLayout";
import { Shield, ShieldCheck, Bell, Zap, Lock, Eye, Fingerprint } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { useState } from "react";

const tips = [
  "Never share your card details over email or phone",
  "Enable transaction notifications for all purchases",
  "Review your statements regularly for unauthorized charges",
  "Use virtual cards for online subscriptions",
];

export default function Security() {
  const [autoBlock, setAutoBlock] = useState(true);
  const [sensitivity, setSensitivity] = useState([75]);
  const securityScore = 92;

  return (
    <AppLayout title="Security Center">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Security Score */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-6 text-center">
          <div className="gradient-primary w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="h-10 w-10 text-primary-foreground" />
          </div>
          <p className="font-display text-4xl font-bold">{securityScore}</p>
          <p className="text-xs text-muted-foreground mt-1">Security Score — Excellent</p>
          <Progress value={securityScore} className="mt-4 h-2 max-w-xs mx-auto" />
        </motion.div>

        {/* Settings */}
        <div className="glass-card rounded-xl p-5 space-y-5">
          <h3 className="font-display font-semibold text-sm">Protection Settings</h3>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Auto-Block Suspicious Transactions</p>
                <p className="text-xs text-muted-foreground">Automatically block high-risk transactions</p>
              </div>
            </div>
            <Switch checked={autoBlock} onCheckedChange={setAutoBlock} />
          </div>

          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-suspicious/10 p-2 rounded-lg">
                <Bell className="h-4 w-4 text-suspicious" />
              </div>
              <div>
                <p className="text-sm font-medium">Alert Sensitivity</p>
                <p className="text-xs text-muted-foreground">
                  {sensitivity[0] < 30 ? "Low" : sensitivity[0] < 70 ? "Medium" : "High"} — {sensitivity[0]}%
                </p>
              </div>
            </div>
            <Slider value={sensitivity} onValueChange={setSensitivity} max={100} step={5} className="max-w-sm ml-11" />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-safe/10 p-2 rounded-lg">
                <Fingerprint className="h-4 w-4 text-safe" />
              </div>
              <div>
                <p className="text-sm font-medium">Biometric Authentication</p>
                <p className="text-xs text-muted-foreground">Use fingerprint or face for large transactions</p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-accent p-2 rounded-lg">
                <Eye className="h-4 w-4 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Transaction Monitoring</p>
                <p className="text-xs text-muted-foreground">24/7 AI-powered monitoring</p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>
        </div>

        {/* Tips */}
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="h-4 w-4 text-primary" />
            <h3 className="font-display font-semibold text-sm">Security Tips</h3>
          </div>
          <div className="space-y-2">
            {tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                <Shield className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
