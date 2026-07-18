import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { TransactionRow } from "@/components/TransactionRow";
import { FraudStatusIndicator } from "@/components/FraudStatusIndicator";
import { CreditCard, ShieldCheck, ShieldX, AlertTriangle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { motion } from "framer-motion";
import api from "@/services/api";
import { Transaction } from "@/types/guardio";

export default function Dashboard() {
  const [stats, setStats] = useState({ total_spend: 0, total_transactions: 0, flagged_spend: 0, flagged_transactions: 0 });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);
  const [spendingByCategory, setSpendingByCategory] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewRes, recentRes, monthRes, merchantRes] = await Promise.all([
          api.get('/transactions/summary/overview/'),
          api.get('/transactions/'),
          api.get('/transactions/summary/by-month/'),
          api.get('/transactions/summary/by-merchant/')
        ]);

        setStats(overviewRes.data);

        // Map backend transactions to frontend shape
        const mappedTxns = (recentRes.data?.results || recentRes.data || []).slice(0, 5).map((t: any) => ({
          id: t.transaction_id,
          merchant: t.merchant,
          amount: parseFloat(t.amount_inr),
          date: t.timestamp,
          status: t.status.toLowerCase(),
          category: 'Shopping', // Backend doesn't have category yet
          cardLast4: t.card_number ? t.card_number.slice(-4) : '0000',
          location: t.location,
          reason: t.prediction_reason,
          confidence: t.confidence_score ? parseFloat(t.confidence_score) : undefined
        }));
        setRecentTransactions(mappedTxns);

        setMonthlyTrend(monthRes.data.map((item: any) => ({
          month: item.label,
          spending: parseFloat(item.total_amount),
          fraud: 0 // Mock for now if not provided per month by backend
        })));

        const colors = ["hsl(210, 46%, 43%)", "hsl(142, 71%, 45%)", "hsl(28, 99%, 54%)", "hsl(271, 81%, 56%)", "hsl(0, 0%, 70%)"];
        setSpendingByCategory(merchantRes.data.slice(0, 5).map((item: any, i: number) => ({
          name: item.label,
          value: parseFloat(item.total_amount),
          color: colors[i % colors.length]
        })));

      } catch (err) {
        console.error("Failed to load dashboard data", err);
      }
    };
    fetchData();
  }, []);

  const fraudLevel = stats.flagged_transactions > 0 ? "alert" : "safe";


  return (
    <AppLayout title="Dashboard">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Fraud Status */}
        <FraudStatusIndicator level={fraudLevel} />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Spending"
            value={`₹${stats.total_spend.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
            subtitle="This month"
            icon={CreditCard}
            trend={{ value: "+12%", positive: true }}
          />
          <StatCard
            title="Total Transactions"
            value={stats.total_transactions.toString()}
            subtitle="All time"
            icon={ShieldCheck}
            trend={{ value: "12 this week", positive: true }}
          />
          <StatCard
            title="Suspicious Detected"
            value={stats.flagged_transactions.toString()}
            subtitle="Requires review"
            icon={AlertTriangle}
            variant="danger"
          />
          <StatCard
            title="Fraud Blocked"
            value="0"
            subtitle="Auto-blocked by AI"
            icon={ShieldX}
            variant="success"
            trend={{ value: `₹${stats.flagged_spend.toLocaleString("en-IN")} saved`, positive: true }}
          />
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Spending Trend */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 glass-card rounded-xl p-5"
          >
            <h3 className="font-display font-semibold text-sm mb-4">Monthly Trend</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(210, 46%, 43%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(210, 46%, 43%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fraudGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(0, 60%, 45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(0, 60%, 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 82%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(215, 20%, 40%)" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(215, 20%, 40%)" tickFormatter={(value) => value.toLocaleString("en-IN")} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(0, 0%, 100%)",
                    border: "1px solid hsl(214, 20%, 82%)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Area type="monotone" dataKey="spending" stroke="hsl(210, 46%, 43%)" fill="url(#spendGradient)" strokeWidth={2} />
                <Area type="monotone" dataKey="fraud" stroke="hsl(0, 60%, 45%)" fill="url(#fraudGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Category Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-xl p-5"
          >
            <h3 className="font-display font-semibold text-sm mb-4">By Category</h3>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={spendingByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {spendingByCategory.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `₹${value.toLocaleString("en-IN")}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {spendingByCategory.slice(0, 4).map((cat) => (
                <div key={cat.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                  <span className="text-[10px] text-muted-foreground truncate">{cat.name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-sm">Recent Transactions</h3>
            <Link
              to="/transactions"
              className="text-xs text-primary flex items-center gap-1 hover:underline"
            >
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-border/50">
            {recentTransactions.map((t) => (
              <TransactionRow key={t.id} transaction={t} />
            ))}
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
