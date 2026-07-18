import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { guardioApi } from "@/services/api";
import { 
  WeeklySpending, 
  SpendingByCategory, 
  MonthlyTrend 
} from "@/types/guardio";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line 
} from "recharts";
import { motion } from "framer-motion";
import { Brain, TrendingUp, AlertTriangle, DollarSign, Loader2 } from "lucide-react";

// Keeping static contextual logic safely on frontend layout
const insights = [
  { icon: AlertTriangle, color: "text-suspicious", bg: "bg-suspicious/10", text: "Unusual spending detected: Electronics category is 3x higher than your monthly average." },
  { icon: TrendingUp, color: "text-primary", bg: "bg-primary/10", text: "Your spending has increased 18% compared to last month. Travel and shopping are the top drivers." },
  { icon: DollarSign, color: "text-safe", bg: "bg-safe/10", text: "You saved ₹17,500 this month thanks to AI fraud blocking. Keep auto-block enabled." },
];

export default function Analytics() {
  // 1. Establish state hooks to replace local mock arrays
  const [weeklyData, setWeeklyData] = useState<WeeklySpending[]>([]);
  const [categoryData, setCategoryData] = useState<SpendingByCategory[]>([]);
  const [trendData, setTrendData] = useState<MonthlyTrend[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 2. Fetch live data asynchronously from PostgreSQL via Django REST Framework
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        const [weekly, category, trend] = await Promise.all([
          guardioApi.getWeeklySpending(),
          guardioApi.getSpendingByCategory(),
          guardioApi.getMonthlyTrend()
        ]);
        
        setWeeklyData(weekly);
        setCategoryData(category);
        setTrendData(trend);
      } catch (error) {
        console.error("Failed to load backend analytical models:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, []);

  // 3. Fallback state while network data resolution finishes
  if (loading) {
    return (
      <AppLayout title="Analytics & Insights">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">
            Aggregating multi-vector records from PostgreSQL...
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Analytics & Insights">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* AI Insights */}
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="gradient-primary rounded-lg p-2">
              <Brain className="h-4 w-4 text-primary-foreground" />
            </div>
            <h3 className="font-display font-semibold text-sm">AI Insights</h3>
          </div>
          <div className="space-y-3">
            {insights.map((ins, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
              >
                <div className={`p-2 rounded-lg ${ins.bg} flex-shrink-0`}>
                  <ins.icon className={`h-3.5 w-3.5 ${ins.color}`} />
                </div>
                <p className="text-xs leading-relaxed">{ins.text}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Weekly Spending Chart */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-5">
            <h3 className="font-display font-semibold text-sm mb-4">Weekly Spending</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 82%)" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(215, 20%, 40%)" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(215, 20%, 40%)" tickFormatter={(value) => value.toLocaleString("en-IN")} />
                <Tooltip contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(214, 20%, 82%)", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="amount" fill="hsl(210, 46%, 43%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Category Pie Chart */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-xl p-5">
            <h3 className="font-display font-semibold text-sm mb-4">Spending by Category</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                {/* Note: changed dataKey to "amount" to safely support database mappings */}
                <Pie data={categoryData} cx="50%" cy="50%" outerRadius={80} dataKey="amount" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                  {categoryData.map((entry, i) => (
                    // Falls back cleanly to a solid primary tone if backend doesn't serve a specific hex color property
                    <Cell key={i} fill={entry.color || "hsl(210, 46%, 43%)"} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Fraud vs Spending Trend Line Chart */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-xl p-5">
          <h3 className="font-display font-semibold text-sm mb-4">Spending vs Fraud Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 82%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(215, 20%, 40%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(215, 20%, 40%)" tickFormatter={(value) => value.toLocaleString("en-IN")} />
              <Tooltip contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(214, 20%, 82%)", borderRadius: "8px", fontSize: "12px" }} />
              <Line type="monotone" dataKey="spending" stroke="hsl(210, 46%, 43%)" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="fraud" stroke="hsl(0, 60%, 45%)" strokeWidth={2.5} dot={{ r: 4 }} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </AppLayout>
  );
}