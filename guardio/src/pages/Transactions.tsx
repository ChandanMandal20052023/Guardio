import { AppLayout } from "@/components/AppLayout";
import { TransactionRow } from "@/components/TransactionRow";
import { useState, useMemo, useEffect } from "react";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Transaction, TransactionStatus } from "@/types/guardio";
import api from "@/services/api";
import { CheckCircle2, AlertTriangle, XCircle, Ban, MapPin, CreditCard, Clock } from "lucide-react";

const statusFilters: { label: string; value: TransactionStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "✅ Safe", value: "safe" },
  { label: "⚠️ Suspicious", value: "suspicious" },
  { label: "❌ Fraud", value: "fraud" },
  { label: "🚫 Blocked", value: "blocked" },
];

export default function Transactions() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | "all">("all");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await api.get('/transactions/');
        const mappedTxns = (res.data?.results || res.data || []).map((t: any) => ({
          id: t.transaction_id,
          merchant: t.merchant,
          amount: parseFloat(t.amount_inr),
          date: t.timestamp,
          status: t.status.toLowerCase(),
          category: t.category, // Mocked until backend category support
          cardLast4: t.card_number ? t.card_number : '0000',
          location: t.location,
          reason: t.prediction_reason,
          confidence: t.confidence_score ? parseFloat(t.confidence_score) : undefined
        }));
        setTransactions(mappedTxns);
      } catch (err) {
        console.error("Failed to load transactions", err);
      }
    };
    fetchTransactions();
  }, []);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch = t.merchant.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, transactions]);

  return (
    <AppLayout title="Transaction History">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Search & Filters */}
        <div className="glass-card rounded-xl p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-muted/50 border-0"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Filter className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            {statusFilters.map((f) => (
              <Badge
                key={f.value}
                variant={statusFilter === f.value ? "default" : "outline"}
                className={`cursor-pointer whitespace-nowrap text-xs transition-colors ${statusFilter === f.value ? "gradient-primary border-0" : "hover:bg-muted"
                  }`}
                onClick={() => setStatusFilter(f.value)}
              >
                {f.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Transaction List */}
        <div className="glass-card rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-2">
            {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
          </p>
          <AnimatePresence mode="popLayout">
            <div className="divide-y divide-border/50">
              {filtered.map((t) => (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <TransactionRow transaction={t} onClick={() => setSelectedTx(t)} />
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              No transactions found
            </p>
          )}
        </div>
      </div>

      {/* Transaction Detail Dialog */}
      <Dialog open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
        <DialogContent className="max-w-md">
          {selectedTx && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">Transaction Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-xl">
                    💳
                  </div>
                  <div>
                    <p className="font-semibold">{selectedTx.merchant}</p>
                    <p className="text-xs text-muted-foreground">{selectedTx.category}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-lg font-display font-bold">
                      -₹{selectedTx.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">Location</span>
                    </div>
                    <p className="text-sm font-medium">{selectedTx.location}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">Date & Time</span>
                    </div>
                    <p className="text-sm font-medium">
                      {new Date(selectedTx.date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <CreditCard className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">Card</span>
                    </div>
                    <p className="text-sm font-medium">····{selectedTx.cardLast4}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      {selectedTx.status === "safe" && <CheckCircle2 className="h-3 w-3 text-safe" />}
                      {selectedTx.status === "suspicious" && <AlertTriangle className="h-3 w-3 text-suspicious" />}
                      {selectedTx.status === "fraud" && <XCircle className="h-3 w-3 text-fraud" />}
                      {selectedTx.status === "blocked" && <Ban className="h-3 w-3 text-blocked" />}
                      <span className="text-[10px] text-muted-foreground">Status</span>
                    </div>
                    <p className="text-sm font-medium capitalize">{selectedTx.status}</p>
                  </div>
                </div>

                {selectedTx.reason && (
                  <div className="bg-fraud/5 border border-fraud/20 rounded-lg p-3">
                    <p className="text-xs font-medium text-fraud mb-1">⚠️ Detection Reason</p>
                    <p className="text-xs text-muted-foreground">{selectedTx.reason}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
