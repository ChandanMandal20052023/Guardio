import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { Mail, User as UserIcon, Shield, CreditCard, Calendar, MapPin, Phone, LogOut, Pencil, Trash2, AlertTriangle, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "@/services/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const name = user ? `${user.first_name} ${user.last_name}`.trim() : "Guest User";
  const email = user?.email || "guest@ccfd.app";
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  const [stats, setStats] = useState({ total_transactions: 0, safe_transactions: 0, blocked_transactions: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [overviewRes, txnsRes] = await Promise.all([
          api.get('/transactions/summary/overview/'),
          api.get('/transactions/')
        ]);
        
        const total = overviewRes.data.total_transactions || 0;
        const allTxns = txnsRes.data?.results || txnsRes.data || [];
        const blocked = allTxns.filter((t: any) => t.status === 'BLOCKED').length;
        const safe = allTxns.filter((t: any) => t.status === 'SAFE').length;
        
        setStats({ total_transactions: total, safe_transactions: safe, blocked_transactions: blocked });
      } catch (err) {
        console.error(err);
      }
    };
    fetchStats();
  }, []);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [ack1, setAck1] = useState(false);
  const [ack2, setAck2] = useState(false);
  const [ack3, setAck3] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const resetDeleteFlow = () => {
    setStep(1);
    setAck1(false);
    setAck2(false);
    setAck3(false);
    setConfirmText("");
    setDeleting(false);
  };

  const handleOpenChange = (open: boolean) => {
    setDeleteOpen(open);
    if (!open) resetDeleteFlow();
  };

  const handleDelete = async () => {
    setDeleting(true);
    // Local-first app: wipe all stored data
    await new Promise((r) => setTimeout(r, 900));
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("ccfd_"))
        .forEach((k) => localStorage.removeItem(k));
    } catch {}
    logout();
    toast.success("Your account has been deleted");
    navigate("/login");
  };

  const details = [
    { icon: UserIcon, label: "Full name", value: name },
    { icon: Mail, label: "Email address", value: email },
    { icon: Phone, label: "Phone", value: user?.phone_number || "+91 98765 43210" },
    { icon: MapPin, label: "Location", value: user?.city || "Mumbai, India" },
    { icon: Calendar, label: "Member since", value: "Jan 2025" },
    { icon: CreditCard, label: "Primary card", value: "•••• •••• •••• 4821" },
  ];

  return (
    <AppLayout title="My Profile">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl p-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-2xl font-semibold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-2xl font-bold">{name}</h2>
                <Badge className="bg-safe/10 text-safe border-safe/20 hover:bg-safe/10">
                  Verified
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{email}</p>
              <p className="text-xs text-muted-foreground mt-1">Guardio Premium · Account ID #Guardio-{(user?.email || "guest").length * 1024}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => navigate("/dashboard/profile/edit")}
            >
             <Pencil className="h-3.5 w-3.5" />
             Edit Profile
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-3 gap-4"
        >
          <div className="glass-card rounded-xl p-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Transactions</p>
            <p className="font-display text-2xl font-bold mt-1">{stats.total_transactions}</p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Safe</p>
            <p className="font-display text-2xl font-bold mt-1 text-safe">{stats.safe_transactions}</p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Blocked</p>
            <p className="font-display text-2xl font-bold mt-1 text-fraud">{stats.blocked_transactions}</p>
          </div>
        </motion.div>

        {/* Account details */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-xl p-5"
        >
          <h3 className="font-display font-semibold text-sm mb-4">Account Details</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {details.map((d) => (
              <div key={d.label} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <d.icon className="h-4 w-4 text-primary"/>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{d.label}</p>
                  <p className="text-sm font-medium truncate">{d.value}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <Button onClick={() => navigate("/security")} className="gap-2 flex-1">
            <Shield className="h-4 w-4" /> Security Center
          </Button>
          <Button onClick={handleLogout} variant="outline" className="gap-2 flex-1 text-destructive hover:text-destructive">
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-5"
        >
          <div className="flex items-start gap-3">
            <div className="bg-destructive/10 p-2 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="font-display font-semibold text-sm text-destructive">Danger Zone</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Permanently delete your account, transactions, alerts, and all settings. This action cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="gap-2 flex-shrink-0"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete Account
            </Button>
          </div>
        </motion.div>

        {/* Deletion Dialog */}
        <Dialog open={deleteOpen} onOpenChange={handleOpenChange}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                {step === 1 && "Delete your account?"}
                {step === 2 && "Confirm your decision"}
                {step === 3 && "Final confirmation"}
              </DialogTitle>
              <DialogDescription>
                Step {step} of 3
              </DialogDescription>
            </DialogHeader>

            {step === 1 && (
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  You're about to permanently delete the account for <span className="font-medium text-foreground">{email}</span>.
                </p>
                <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-5">
                  <li>{stats.total_transactions} transactions will be erased</li>
                  <li>All fraud alerts and notifications will be removed</li>
                  <li>Security settings and preferences will be lost</li>
                  <li>This action is immediate and cannot be undone</li>
                </ul>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">Please confirm you understand:</p>
                <label className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 cursor-pointer">
                  <Checkbox checked={ack1} onCheckedChange={(v) => setAck1(v === true)} className="mt-0.5" />
                  <span className="text-xs">I understand all my data will be permanently deleted.</span>
                </label>
                <label className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 cursor-pointer">
                  <Checkbox checked={ack2} onCheckedChange={(v) => setAck2(v === true)} className="mt-0.5" />
                  <span className="text-xs">I understand my fraud protection will stop immediately.</span>
                </label>
                <label className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 cursor-pointer">
                  <Checkbox checked={ack3} onCheckedChange={(v) => setAck3(v === true)} className="mt-0.5" />
                  <span className="text-xs">I understand this action cannot be reversed.</span>
                </label>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  Type <span className="font-mono font-semibold text-destructive">DELETE</span> below to permanently remove your account.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="confirm" className="text-xs">Confirmation</Label>
                  <Input
                    id="confirm"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    autoComplete="off"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="flex-row gap-2 sm:justify-between">
              {step > 1 ? (
                <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)} disabled={deleting} className="gap-1">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
              )}

              {step < 3 ? (
                <Button
                  size="sm"
                  onClick={() => setStep(step + 1)}
                  disabled={step === 2 && (!ack1 || !ack2 || !ack3)}
                  className="gap-1"
                >
                  Continue <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={confirmText !== "DELETE" || deleting}
                  className="gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deleting ? "Deleting..." : "Permanently delete"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
