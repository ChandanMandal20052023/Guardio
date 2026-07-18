import { Transaction, TransactionStatus } from "@/types/mockData";
import { CheckCircle2, AlertTriangle, XCircle, Ban, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const statusConfig: Record<TransactionStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  safe: { label: "Safe", icon: CheckCircle2, className: "status-safe" },
  suspicious: { label: "Suspicious", icon: AlertTriangle, className: "status-suspicious" },
  fraud: { label: "Fraud", icon: XCircle, className: "status-fraud" },
  blocked: { label: "Blocked", icon: Ban, className: "status-blocked" },
};

const categoryEmoji: Record<string, string> = {
  Shopping: "🛍️",
  "Food & Drink": "☕",
  Transport: "🚗",
  Entertainment: "🎬",
  Electronics: "💻",
  Groceries: "🥑",
  Finance: "💰",
  Transfer: "💸",
  Cash: "💵",
  Auto: "⛽",
  Unknown: "❓",
};

interface TransactionRowProps {
  transaction: Transaction;
  onClick?: () => void;
}

export function TransactionRow({ transaction, onClick }: TransactionRowProps) {
  const config = statusConfig[transaction.status];
  const StatusIcon = config.icon;

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
    >
      <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-lg flex-shrink-0">
        {categoryEmoji[transaction.category] || "💳"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{transaction.merchant}</p>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${config.className} border-0`}>
            <StatusIcon className="h-2.5 w-2.5 mr-0.5" />
            {config.label}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <MapPin className="h-2.5 w-2.5 text-muted-foreground/60" />
          <p className="text-[11px] text-muted-foreground truncate">
            {transaction.location} · {new Date(transaction.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-semibold font-display ${transaction.status === "fraud" || transaction.status === "blocked"
            ? "text-fraud line-through"
            : ""
          }`}>
          -₹{transaction.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </p>
        <p className="text-[10px] text-muted-foreground">
          ····{transaction.cardLast4}
        </p>
      </div>
    </div>
  );
}
