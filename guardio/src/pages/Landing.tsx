import { Link, useNavigate } from "react-router-dom";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Shield, Lock, BarChart3, Bell, ArrowRight, CreditCard, Zap,
  Play, Activity, Sparkles, TrendingUp, AlertTriangle, CheckCircle2,
  Brain, Eye, Fingerprint, Wallet, PieChart, Cpu, KeyRound,
  Twitter, Github, Linkedin, Mail, Plug, Search, Lightbulb, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
gsap.registerPlugin(ScrollTrigger);

/* ---------- GSAP scroll-reveal hook ----------
   Animates elements tagged with `data-reveal` inside scopeRef.
   - data-reveal="card"          → fade + rise, batched stagger
   - data-reveal="chart"         → fade + slight scale-in
   - data-reveal="timeline"      → left-to-right staggered slide
   - data-reveal="timeline-line" → horizontal draw
   Respects prefers-reduced-motion.
----------------------------------------------- */
function useGsapReveals(scopeRef: React.RefObject<HTMLElement>) {
  useLayoutEffect(() => {
    if (!scopeRef.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      if (reduce) {
        gsap.set("[data-reveal]", { opacity: 1, y: 0, x: 0, scale: 1, clearProps: "all" });
        return;
      }

      gsap.set('[data-reveal="card"]', { opacity: 0, y: 36 });
      ScrollTrigger.batch('[data-reveal="card"]', {
        start: "top 88%",
        onEnter: (els) =>
          gsap.to(els, {
            opacity: 1, y: 0, duration: 0.8, ease: "power3.out",
            stagger: 0.09, overwrite: true,
          }),
        once: true,
      });

      gsap.utils.toArray<HTMLElement>('[data-reveal="chart"]').forEach((el) => {
        gsap.fromTo(el,
          { opacity: 0, y: 28, scale: 0.96 },
          {
            opacity: 1, y: 0, scale: 1, duration: 1, ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 85%", once: true }
          });
      });

      const timelineItems = gsap.utils.toArray<HTMLElement>('[data-reveal="timeline"]');
      if (timelineItems.length) {
        gsap.set(timelineItems, { opacity: 0, x: -32 });
        gsap.to(timelineItems, {
          opacity: 1, x: 0, duration: 0.7, ease: "power3.out", stagger: 0.15,
          scrollTrigger: { trigger: timelineItems[0], start: "top 85%", once: true },
        });
      }
      gsap.utils.toArray<HTMLElement>('[data-reveal="timeline-line"]').forEach((el) => {
        gsap.fromTo(el,
          { scaleX: 0, transformOrigin: "0% 50%" },
          {
            scaleX: 1, duration: 1.2, ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 88%", once: true }
          });
      });

      ScrollTrigger.refresh();
    }, scopeRef);
    return () => ctx.revert();
  }, [scopeRef]);
}

/* ===========================================================
   Guardio — Landing Page (Light-mode first, section-themed)
   Color identity per section:
   - Hero: Navy → Blue → Indigo
   - Fraud: Red / Orange
   - Expense: Green / Teal (MOST interactive)
   - AI: Purple / Indigo
   - Trust: Navy
   =========================================================== */

const C = {
  // neutrals (light)
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  text: "#0F172A",
  sub: "#475569",
  navy: "#00142f",
  // brand
  blue: "#2563EB",
  indigo: "#7C3AED",
  red: "#DC2626",
  redSoft: "#FEE2E2",
  orange: "#F97316",
  green: "#10B981",
  greenBright: "#22C55E",
  greenSoft: "#D1FAE5",
  greenDeep: "#064E3B",
  teal: "#14B8A6",
  purple: "#8B5CF6",
  purpleSoft: "#EDE9FE",
  indigo2: "#6366F1",
};

const EASE = [0.16, 1, 0.3, 1] as const;

function useReveal() {
  const reduce = useReducedMotion();
  return reduce
    ? { initial: false, animate: { opacity: 1, y: 0 }, transition: { duration: 0 } }
    : {
      initial: { opacity: 0, y: 28 },
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true, margin: "-80px" },
      transition: { duration: 0.7, ease: EASE },
    };
}

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

/* ---------- Navbar ---------- */
function Navbar() {
  const { isAuthenticated } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navTextColor = scrolled ? C.text : "#FFFFFF";
  const logoTextColor = scrolled ? C.navy : "#FFFFFF";
  const linkHoverColor = scrolled ? C.navy : C.blue;

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.0)",
        backdropFilter: scrolled ? "saturate(180%) blur(14px)" : "none",
        borderBottom: scrolled ? `1px solid ${C.border}` : "1px solid transparent",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl flex overflow-hidden items-center justify-center" >
            <img src="/logo.jpeg" alt="Guardio logo" className="object-contain w-full h-full scale-110" />
          </div>
          <span className="font-bold text-lg tracking-tight" style={{ color: logoTextColor }}>Guardio</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm" style={{ color: navTextColor }}>
          <a
            href="#fraud"
            className="hover:text-[color:var(--n)]"
            style={{ ["--n" as any]: linkHoverColor }}
          >
            Fraud Detection
          </a>
          <a
            href="#expense"
            className="hover:text-[color:var(--n)]"
            style={{ ["--n" as any]: linkHoverColor }}
          >
            Expenses
          </a>
          <a
            href="#ai"
            className="hover:text-[color:var(--n)]"
            style={{ ["--n" as any]: linkHoverColor }}
          >
            AI Insights
          </a>
          <a
            href="#pricing"
            className="hover:text-[color:var(--n)]"
            style={{ ["--n" as any]: linkHoverColor }}
          >
            Pricing
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            to={isAuthenticated ? "/dashboard" : "/login"}
            className="text-sm font-medium hidden sm:inline"
            style={{ color: navTextColor }}
          >
            {isAuthenticated ? "Dashboard" : "Sign in"}
          </Link>
          <Link to={isAuthenticated ? "/dashboard" : "/login"}>
            <Button
              className="rounded-full text-white border-0 shadow-md hover:shadow-lg transition-all"
              style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.indigo})` }}
            >
              Start Free Trial
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ---------- Hero card visual ---------- */
function PaytechCard({
  name, tone, className = "", style,
}: { name: string; tone: "blue" | "dark"; className?: string; style?: React.CSSProperties }) {
  const face =
    tone === "blue"
      ? "linear-gradient(135deg, #1E63C8 0%, #2F86E8 45%, #7FB6F5 100%)"
      : "linear-gradient(135deg, #1a1a1f 0%, #2a2a33 60%, #3a3a45 100%)";
  return (
    <div
      role="img"
      aria-label={`${tone === "blue" ? "Blue" : "Dark"} Visa card belonging to ${name}`}
      className={`rounded-2xl p-5 text-white ${className}`}
      style={{
        background: face,
        width: 300,
        height: 190,
        boxShadow: "0 40px 80px -20px rgba(0,0,0,0.55), 0 12px 30px -12px rgba(0,0,0,0.5)",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* abstract facets */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background:
            "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.25) 45%, transparent 55%), linear-gradient(200deg, transparent 40%, rgba(0,0,0,0.35) 90%)",
        }}
      />
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-2">
          {/* chip */}
          <div className="h-6 w-8 rounded-[4px]" style={{ background: "linear-gradient(135deg,#d9d9d9,#8a8a8a)" }} />
          {/* nfc */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
            <path d="M6 8a8 8 0 0 1 0 8" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity=".85" />
            <path d="M10 6a12 12 0 0 1 0 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity=".7" />
            <path d="M14 4a16 16 0 0 1 0 16" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity=".55" />
          </svg>
        </div>
        <div className="h-5 w-5 rounded-sm grid grid-cols-3 gap-[2px] opacity-90">
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} className="rounded-[1px] bg-white/90" />
          ))}
        </div>
      </div>

      <div className="absolute left-5 right-5 bottom-5">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[13px] tracking-[0.25em] font-medium opacity-95 tabular-nums">
              2918 2610 4629 1826
            </div>
            <div className="mt-1 text-[13px] font-medium opacity-95">{name}</div>
          </div>
          <span className="text-sm italic font-semibold tracking-wide opacity-90">VISA</span>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  const { isAuthenticated } = useAuth();
  const r = useReveal();
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden pt-28 pb-24"
      style={{
        background:
          "radial-gradient(80% 60% at 100% 0%, #1a1e3a 0%, transparent 55%), radial-gradient(60% 50% at 0% 100%, #2a1a3a 0%, transparent 55%), linear-gradient(180deg, #0a0b12 0%, #0d0f1a 100%)",
        color: "white",
      }}
    >
      {/* subtle grid */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
        }}
      />
      {/* ambient glows */}
      <div aria-hidden="true" className="absolute -top-32 -right-24 w-[520px] h-[520px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(closest-side, rgba(120,150,255,0.25), transparent 70%)" }} />
      <div aria-hidden="true" className="absolute -bottom-32 -left-24 w-[520px] h-[520px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(closest-side, rgba(230,180,150,0.18), transparent 70%)" }} />

      <div className="relative max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-10 items-center">
        {/* Copy */}
        <motion.div {...r}>
          <h1
            id="hero-heading"
            className="text-5xl sm:text-6xl lg:text-7xl font-light tracking-tight leading-[1.05]"
            style={{ fontFamily: "'Instrument Serif', 'Playfair Display', Georgia, serif", color: "#f3ede4" }}
          >
            The{" "}
            <span className="relative inline-block">
              <span style={{ color: "#cfe6e2" }}>future</span>
              {/* hand-drawn circle */}
              <svg
                aria-hidden="true"
                focusable="false"
                className="absolute -inset-x-3 -inset-y-2 w-[calc(100%+24px)] h-[calc(100%+16px)] pointer-events-none"
                viewBox="0 0 200 90" fill="none" preserveAspectRatio="none"
              >
                <path
                  d="M100 8 C 40 8, 8 25, 10 50 C 12 78, 70 84, 120 82 C 170 80, 194 62, 190 40 C 186 18, 150 10, 100 12"
                  stroke="#ff8a6b" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.9"
                />
              </svg>
            </span>{" "}
            of<br />
            high-tech finance<br />
            has arrived
          </h1>

          <dl className="mt-14 flex items-stretch gap-8" aria-label="Company milestones">
            <div className="rounded-2xl px-6 py-5 border" style={{ borderColor: "rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.03)" }}>
              <dt className="sr-only">Transactions annually</dt>
              <dd className="text-3xl sm:text-4xl font-light tabular-nums" style={{ color: "#f3ede4" }}>23.41B+</dd>
              <p className="text-xs mt-1 text-white/85">transactions<br />annually</p>
            </div>
            <div className="pl-8 border-l" style={{ borderColor: "rgba(255,255,255,0.18)" }}>
              <dt className="sr-only">Share of world transactions</dt>
              <dd className="text-3xl sm:text-4xl font-light tabular-nums" style={{ color: "#f3ede4" }}>57%+</dd>
              <p className="text-xs mt-1 text-white/85">of the world's<br />transactions</p>
            </div>
            <div className="pl-8 border-l" style={{ borderColor: "rgba(255,255,255,0.18)" }}>
              <dt className="sr-only">Customer satisfaction</dt>
              <dd className="text-3xl sm:text-4xl font-light tabular-nums" style={{ color: "#f3ede4" }}>94%+</dd>
              <p className="text-xs mt-1 text-white/85">customer's<br />satisfaction</p>
            </div>
          </dl>

          <div className="mt-10 flex items-center gap-4">
            <Link to={isAuthenticated ? "/dashboard" : "/login"} aria-label="Get started with Guardio">
              <Button
                size="lg"
                className="rounded-full border-0 px-7 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0f1a] focus-visible:ring-[#ff8a6b]"
                style={{ background: "#f3ede4", color: "#0d0f1a" }}
              >
                Get Started <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
              </Button>
            </Link>
            <a
              href="#fraud"
              aria-label="Scroll down to learn more"
              className="flex items-center gap-2 text-xs text-white/85 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8a6b] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0f1a] px-1 py-0.5 hover:text-white transition-colors"
            >
              <span aria-hidden="true" className="inline-flex items-center justify-center w-6 h-6 rounded-full border" style={{ borderColor: "rgba(255,255,255,0.4)" }}>
                <span className="w-1 h-1 rounded-full bg-white/90" />
              </span>
              <span>Scroll down<br className="hidden sm:block" /> to learn more</span>
            </a>
          </div>
        </motion.div>

        {/* Floating cards */}
        <motion.div
          aria-hidden="true"
          className="relative h-[520px]"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
        >
          <motion.div
            className="absolute right-0 top-2 z-30"
            style={{ transform: "rotate(-8deg)" }}
            animate={{ y: [0, -12, 0], rotate: [-8, -6, -8] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          >
            <PaytechCard name="Simon Wales" tone="blue" />
          </motion.div>

          <motion.div
            className="absolute right-24 top-40 z-20"
            style={{ transform: "rotate(6deg)" }}
            animate={{ y: [0, 10, 0], rotate: [6, 8, 6] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          >
            <PaytechCard name="Claude Bennet" tone="dark" />
          </motion.div>

          <motion.div
            className="absolute right-6 bottom-6 z-10"
            style={{ transform: "rotate(-4deg)" }}
            animate={{ y: [0, -8, 0], rotate: [-4, -2, -4] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
          >
            <PaytechCard name="Jennifer Trump" tone="dark" />
          </motion.div>

          <div
            className="absolute inset-0 -z-10 rounded-[40px]"
            style={{
              background: "radial-gradient(60% 60% at 60% 40%, rgba(120,150,255,0.28), transparent 70%)",
              filter: "blur(30px)",
            }}
          />
        </motion.div>
      </div>
    </section>
  );
}

/* ---------- Logo strip ---------- */
function LogoStrip() {
  return (
    <section className="py-10 border-y" style={{ borderColor: C.border, background: "white" }}>
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-center text-xs uppercase tracking-widest mb-6" style={{ color: C.sub }}>
          Trusted by finance teams at
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 opacity-70">
          {["NORTHWIND", "ACME PAY", "ZENITH", "LUMEN", "ORBITAL", "MERIDIAN"].map((n) => (
            <span key={n} className="font-bold tracking-wider text-sm" style={{ color: C.navy }}>{n}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Fraud section (RED) ---------- */
function FraudSection() {
  const r = useReveal();
  const alerts = [
    { t: "Card-not-present · Singapore", a: 18900, s: "Blocked" },
    { t: "Velocity spike · 4 tx in 60s", a: 7250, s: "Flagged" },
    { t: "New device fingerprint", a: 2100, s: "Verified" },
  ];
  return (
    <section id="fraud" className="relative py-28 overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: `linear-gradient(180deg, ${C.bg} 0%, #FFF5F5 40%, #FFF7ED 100%)`,
        }}
      />
      <div
        className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full -z-10 opacity-50"
        style={{ background: `radial-gradient(circle, ${C.red}33, transparent 70%)` }}
      />

      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-14 items-center">
        <motion.div {...r}>
          <span
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-5"
            style={{ background: C.redSoft, color: C.red }}
          >
            <Shield className="w-3.5 h-3.5" /> FRAUD DETECTION
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight" style={{ color: C.navy }}>
            Threats stopped <span style={{ color: C.red }}>in milliseconds</span>, not days.
          </h2>
          <p className="mt-5 text-lg" style={{ color: C.sub }}>
            Real-time risk scoring, device fingerprinting, and behavioral anomaly detection — every
            swipe is verified before the charge clears.
          </p>
          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            {[
              { i: AlertTriangle, t: "Real-time alerts" },
              { i: Fingerprint, t: "Device fingerprint" },
              { i: Eye, t: "Behavioral analysis" },
              { i: Zap, t: "Instant block" },
            ].map(({ i: Icon, t }) => (
              <div
                key={t}
                className="flex items-center gap-3 rounded-xl p-3 bg-white"
                style={{ border: `1px solid ${C.red}22` }}
              >
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center text-white"
                  style={{ background: `linear-gradient(135deg, ${C.red}, ${C.orange})` }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium" style={{ color: C.navy }}>{t}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div {...r} className="space-y-3">
          {alerts.map((al, i) => (
            <motion.div
              key={i}
              data-reveal="card"
              animate={i === 0 ? { boxShadow: [`0 0 0 0 ${C.red}55`, `0 0 0 14px ${C.red}00`] } : undefined}
              transition={{ duration: 1.8, repeat: Infinity }}
              className="rounded-2xl bg-white p-4 flex items-center gap-4"
              style={{ border: `1px solid ${C.red}33` }}
            >
              <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white" style={{ background: C.red }}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold" style={{ color: C.navy }}>{al.t}</div>
                <div className="text-sm tabular-nums" style={{ color: C.sub }}>{inr(al.a)}</div>
              </div>
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{
                  background: al.s === "Blocked" ? C.red : al.s === "Flagged" ? C.orange : C.green,
                  color: "white",
                }}
              >
                {al.s}
              </span>
            </motion.div>
          ))}
          <div className="rounded-2xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${C.red}, ${C.orange})` }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider opacity-80">Blocked this month</div>
                <div className="text-3xl font-bold tabular-nums">{inr(284750)}</div>
              </div>
              <Shield className="w-10 h-10 opacity-80" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------- Expense section (GREEN — most interactive) ---------- */
function ExpenseSection() {
  const r = useReveal();
  const cats = [
    { name: "Food", val: 12480, pct: 28 },
    { name: "Travel", val: 8920, pct: 20 },
    { name: "Shopping", val: 15600, pct: 35 },
    { name: "Bills", val: 6230, pct: 14 },
    { name: "Other", val: 1320, pct: 3 },
  ];
  const [active, setActive] = useState<number | null>(null);
  const [savings, setSavings] = useState(0);
  useEffect(() => {
    const target = 12480;
    let cur = 0;
    const step = setInterval(() => {
      cur += target / 60;
      if (cur >= target) { cur = target; clearInterval(step); }
      setSavings(Math.round(cur));
    }, 24);
    return () => clearInterval(step);
  }, []);

  return (
    <section id="expense" className="relative py-28 overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{ background: `linear-gradient(180deg, #FFF7ED 0%, ${C.greenSoft} 50%, #F0FDFA 100%)` }}
      />
      <div
        className="absolute top-20 -left-32 w-[600px] h-[600px] rounded-full -z-10 opacity-40"
        style={{ background: `radial-gradient(circle, ${C.green}55, transparent 70%)` }}
      />

      <div className="max-w-7xl mx-auto px-6">
        <motion.div {...r} className="text-center max-w-2xl mx-auto mb-14">
          <span
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-5"
            style={{ background: "white", color: C.greenDeep, border: `1px solid ${C.green}66` }}
          >
            <Wallet className="w-3.5 h-3.5" /> EXPENSE TRACKING
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight" style={{ color: C.navy }}>
            Watch your money{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: `linear-gradient(135deg, ${C.green}, ${C.teal})` }}
            >
              come alive.
            </span>
          </h2>
          <p className="mt-4 text-lg" style={{ color: C.sub }}>
            Categories that respond to your eyes. Charts that breathe. Numbers that count themselves.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Big interactive chart card */}
          <div
            data-reveal="chart"
            className="lg:col-span-2 rounded-3xl p-7 bg-white"
            style={{ border: `1px solid ${C.border}`, boxShadow: `0 20px 60px -25px ${C.green}55` }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-xs uppercase tracking-wider font-semibold" style={{ color: C.sub }}>Monthly spend</div>
                <div className="text-3xl font-bold tabular-nums" style={{ color: C.navy }}>{inr(44550)}</div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: C.greenSoft, color: C.greenDeep }}>
                ↓ 8.2% vs last month
              </span>
            </div>

            {/* Category bars */}
            <div className="space-y-4">
              {cats.map((c, i) => {
                const dim = active !== null && active !== i;
                const on = active === i;
                return (
                  <div
                    key={c.name}
                    onMouseEnter={() => setActive(i)}
                    onMouseLeave={() => setActive(null)}
                    className="cursor-pointer transition-all"
                    style={{ opacity: dim ? 0.35 : 1, transform: on ? "translateX(4px)" : "none" }}
                  >
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-medium" style={{ color: C.navy }}>{c.name}</span>
                      <span className="tabular-nums font-semibold" style={{ color: on ? C.green : C.sub }}>{inr(c.val)}</span>
                    </div>
                    <div className="h-3 rounded-full overflow-hidden" style={{ background: "#F1F5F9" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${c.pct * 2.5}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9, delay: i * 0.08, ease: EASE }}
                        animate={on ? { boxShadow: `0 0 18px ${C.greenBright}` } : { boxShadow: "0 0 0px transparent" }}
                        className="h-full rounded-full"
                        style={{
                          background: on
                            ? `linear-gradient(90deg, ${C.greenBright}, ${C.teal})`
                            : `linear-gradient(90deg, ${C.green}, ${C.teal})`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Savings counter + budget */}
          <motion.div {...r} className="space-y-6">
            <div
              className="rounded-3xl p-7 text-white relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${C.greenDeep}, ${C.green}, ${C.teal})` }}
            >
              <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -top-10 -right-10 w-40 h-40 rounded-full"
                style={{ background: C.greenBright, filter: "blur(40px)" }}
              />
              <div className="relative">
                <div className="text-xs uppercase tracking-wider opacity-80">Saved this month</div>
                <div className="text-4xl font-bold tabular-nums mt-1">{inr(savings)}</div>
                <div className="mt-4 flex items-center gap-2 text-sm opacity-90">
                  <TrendingUp className="w-4 h-4" /> On track to hit ₹50K goal
                </div>
              </div>
            </div>

            <div
              className="rounded-3xl p-6 bg-white"
              style={{ border: `1px solid ${C.border}` }}
            >
              <div className="text-xs uppercase tracking-wider font-semibold mb-4" style={{ color: C.sub }}>
                Budget health
              </div>
              {[
                { l: "Food", v: 78 },
                { l: "Travel", v: 45 },
                { l: "Shopping", v: 92 },
              ].map((b) => (
                <div key={b.l} className="mb-3 last:mb-0">
                  <div className="flex justify-between text-sm mb-1" style={{ color: C.navy }}>
                    <span>{b.l}</span>
                    <span className="tabular-nums font-medium">{b.v}%</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: "#F1F5F9" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${b.v}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, ease: EASE }}
                      className="h-full rounded-full"
                      style={{
                        background:
                          b.v > 85 ? C.red : b.v > 60 ? C.orange : `linear-gradient(90deg, ${C.green}, ${C.teal})`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ---------- AI Insights (PURPLE) ---------- */
function AISection() {
  const r = useReveal();
  const items = [
    { i: Brain, t: "Spend prediction", d: "Forecast next month's spend by category with 94% accuracy." },
    { i: Sparkles, t: "Anomaly detection", d: "Spot outliers your eyes miss — before they become a problem." },
    { i: Lightbulb, t: "Smart suggestions", d: "Cut waste with category-specific recommendations every week." },
    { i: Cpu, t: "Always-on assistant", d: "Ask Guardio anything about your money in plain English." },
  ];
  return (
    <section id="ai" className="relative py-28 overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{ background: `linear-gradient(180deg, #F0FDFA 0%, ${C.purpleSoft} 50%, #F5F3FF 100%)` }}
      />
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 6, repeat: Infinity }}
        className="absolute top-32 right-10 w-96 h-96 rounded-full -z-10"
        style={{ background: `radial-gradient(circle, ${C.purple}44, transparent 70%)` }}
      />

      <div className="max-w-7xl mx-auto px-6">
        <motion.div {...r} className="text-center max-w-2xl mx-auto mb-14">
          <span
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-5"
            style={{ background: "white", color: C.indigo, border: `1px solid ${C.purple}55` }}
          >
            <Brain className="w-3.5 h-3.5" /> AI INTELLIGENCE
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight" style={{ color: C.navy }}>
            An AI co-pilot for{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: `linear-gradient(135deg, ${C.purple}, ${C.indigo2})` }}
            >
              every transaction.
            </span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map(({ i: Icon, t, d }, idx) => (
            <motion.div
              key={t}
              data-reveal="card"
              whileHover={{ y: -6 }}
              className="rounded-2xl p-6 bg-white relative overflow-hidden group"
              style={{ border: `1px solid ${C.purple}22`, boxShadow: `0 10px 30px -15px ${C.purple}55` }}
            >
              <div
                className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-0 group-hover:opacity-60 transition-opacity"
                style={{ background: `radial-gradient(circle, ${C.purple}66, transparent 70%)` }}
              />
              <div
                className="h-11 w-11 rounded-xl flex items-center justify-center text-white mb-4"
                style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.indigo2})` }}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="font-semibold" style={{ color: C.navy }}>{t}</div>
              <div className="text-sm mt-1" style={{ color: C.sub }}>{d}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- How it works ---------- */
function HowItWorks() {
  const r = useReveal();
  const steps = [
    { i: Plug, t: "Connect cards", d: "Securely link your credit & debit cards in seconds." },
    { i: Activity, t: "Monitor 24/7", d: "Every transaction scored in real time." },
    { i: Shield, t: "Detect & block fraud", d: "Suspicious charges blocked before they post." },
    { i: BarChart3, t: "Generate insights", d: "Get AI-powered reports every week." },
  ];
  return (
    <section className="relative py-28" style={{ background: "white" }}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div {...r} className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight" style={{ color: C.navy }}>
            How Guardio works
          </h2>
          <p className="mt-3 text-lg" style={{ color: C.sub }}>Four steps to financial peace of mind.</p>
        </motion.div>
        <div className="grid md:grid-cols-4 gap-5 relative">
          {steps.map(({ i: Icon, t, d }, idx) => (
            <div
              key={t}
              data-reveal="timeline"
              className="relative rounded-2xl p-6"
              style={{ background: C.bg, border: `1px solid ${C.border}` }}
            >
              <div
                className="absolute -top-4 left-6 h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.indigo})` }}
              >
                {idx + 1}
              </div>
              <Icon className="w-6 h-6 mb-3" style={{ color: C.blue }} />
              <div className="font-semibold" style={{ color: C.navy }}>{t}</div>
              <div className="text-sm mt-1" style={{ color: C.sub }}>{d}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Testimonials ---------- */
function Testimonials() {
  const r = useReveal();
  const items = [
    { q: "Guardio caught a ₹40K fraud attempt at 3 AM. I slept through it; my card slept through it too.", n: "Priya S.", role: "Founder, Loom Studio" },
    { q: "I finally know where my money goes. The category chart is addictive.", n: "Rahul M.", role: "Product Designer" },
    { q: "The AI suggestions saved me ₹8,200 last month. Pays for itself many times over.", n: "Ananya K.", role: "Consultant" },
  ];
  return (
    <section className="py-24" style={{ background: C.bg }}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.h2 {...r} className="text-3xl sm:text-4xl font-bold text-center mb-12 tracking-tight" style={{ color: C.navy }}>
          Loved by people who care about their money
        </motion.h2>
        <div className="grid md:grid-cols-3 gap-6">
          {items.map((it, i) => (
            <motion.div
              key={i}
              data-reveal="card"
              whileHover={{ y: -4 }}
              className="rounded-2xl p-6 bg-white"
              style={{ border: `1px solid ${C.border}`, boxShadow: "0 10px 30px -20px rgba(15,23,42,0.3)" }}
            >
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, k) => (
                  <Star key={k} className="w-4 h-4 fill-current" style={{ color: C.orange }} />
                ))}
              </div>
              <p className="text-base leading-relaxed" style={{ color: C.navy }}>"{it.q}"</p>
              <div className="mt-5 text-sm">
                <div className="font-semibold" style={{ color: C.navy }}>{it.n}</div>
                <div style={{ color: C.sub }}>{it.role}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Pricing ---------- */
function Pricing() {
  const r = useReveal();
  const tiers = [
    { n: "Starter", p: "₹0", d: "For individuals testing the waters.", f: ["1 card", "Basic alerts", "Monthly insights"], cta: "Get started" },
    { n: "Pro", p: "₹299", d: "For people serious about their money.", f: ["Up to 5 cards", "Real-time fraud blocking", "AI insights & predictions", "Priority support"], cta: "Start free trial", pop: true },
    { n: "Family", p: "₹599", d: "Protect everyone you love.", f: ["Up to 10 cards", "Multi-user dashboard", "Shared budgets", "Dedicated manager"], cta: "Contact sales" },
  ];
  return (
    <section id="pricing" className="py-28" style={{ background: "white" }}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div {...r} className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight" style={{ color: C.navy }}>Simple, honest pricing</h2>
          <p className="mt-3 text-lg" style={{ color: C.sub }}>Pick a plan that fits. Change anytime.</p>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((t, i) => (
            <div
              key={t.n}
              data-reveal="card"
              className="rounded-2xl p-7 relative"
              style={{
                background: t.pop ? `linear-gradient(180deg, ${C.blue}, ${C.indigo})` : "white",
                color: t.pop ? "white" : C.navy,
                border: `1px solid ${t.pop ? "transparent" : C.border}`,
                boxShadow: t.pop ? `0 20px 60px -20px ${C.indigo}66` : "0 4px 20px -10px rgba(15,23,42,0.1)",
              }}
            >
              {t.pop && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold px-3 py-1 rounded-full bg-white" style={{ color: C.indigo }}>
                  MOST POPULAR
                </span>
              )}
              <div className="text-sm font-semibold uppercase tracking-wider opacity-80">{t.n}</div>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-4xl font-bold tabular-nums">{t.p}</span>
                <span className="opacity-70 text-sm mb-1">/ month</span>
              </div>
              <p className="text-sm mt-2 opacity-80">{t.d}</p>
              <ul className="mt-5 space-y-2 text-sm">
                {t.f.map((x) => (
                  <li key={x} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" style={{ color: t.pop ? "white" : C.green }} /> {x}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-6 w-full rounded-full"
                style={{
                  background: t.pop ? "white" : `linear-gradient(135deg, ${C.blue}, ${C.indigo})`,
                  color: t.pop ? C.indigo : "white",
                  border: "none",
                }}
              >
                {t.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Security strip ---------- */
function SecurityStrip() {
  const r = useReveal();
  const orbitBadges = [
    { i: Lock, label: "AES-256", angle: -90 },
    { i: KeyRound, label: "MFA", angle: -18 },
    { i: Fingerprint, label: "Biometric", angle: 54 },
    { i: Eye, label: "24/7 SOC", angle: 126 },
    { i: CheckCircle2, label: "PCI DSS", angle: 198 },
  ];
  const pillars = [
    { i: Lock, t: "AES-256 Encryption", d: "End-to-end encryption at rest and in transit across every service." },
    { i: KeyRound, t: "Multi-Factor Auth", d: "TOTP, WebAuthn and biometric factors enforced on every session." },
    { i: CheckCircle2, t: "PCI DSS Level 1", d: "The highest tier of card-data protection, independently audited." },
    { i: Shield, t: "SOC 2 Type II", d: "Continuous controls monitoring across security, availability and privacy." },
  ];
  const stats = [
    { k: "99.99%", v: "Uptime SLA" },
    { k: "<50ms", v: "Fraud decisioning" },
    { k: "0", v: "Reported breaches" },
    { k: "24/7", v: "SOC monitoring" },
  ];

  return (
    <section className="relative py-24 overflow-hidden" style={{ background: C.bg }}>
      {/* backdrop */}
      <div
        className="absolute inset-0 -z-10 opacity-60"
        style={{
          background: `radial-gradient(60% 50% at 20% 30%, ${C.blue}14, transparent 60%), radial-gradient(50% 50% at 85% 80%, ${C.indigo}12, transparent 60%)`,
        }}
      />

      <div className="max-w-7xl mx-auto px-6">
        <motion.div {...r} className="text-center max-w-2xl mx-auto mb-14">
          <span
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4"
            style={{ background: "white", color: C.navy, border: `1px solid ${C.border}` }}
          >
            <Shield className="w-3.5 h-3.5" style={{ color: C.blue }} /> TRUST &amp; COMPLIANCE
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight" style={{ color: C.navy }}>
            Bank-grade security, by default.
          </h2>
          <p className="mt-4 text-lg" style={{ color: C.sub }}>
            Your data lives inside encrypted, independently audited infrastructure.
            We're compliant with the same standards that guard global card networks — so you don't have to be.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Vault visual */}
          <div className="relative flex items-center justify-center h-[420px]">
            {/* orbit rings */}
            {[220, 300, 380].map((s, i) => (
              <div
                key={s}
                className="absolute rounded-full"
                style={{
                  width: s, height: s,
                  border: `1px dashed ${C.border}`,
                  opacity: 0.9 - i * 0.25,
                }}
              />
            ))}

            {/* pulsing glow */}
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.6, 0.35] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute w-64 h-64 rounded-full"
              style={{ background: `radial-gradient(circle, ${C.blue}66, transparent 70%)`, filter: "blur(4px)" }}
            />

            {/* shield core */}
            <div
              className="relative h-40 w-40 rounded-[32px] flex items-center justify-center text-white z-10"
              style={{
                background: `linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 100%)`,
                boxShadow: `0 30px 70px -20px ${C.blue}80, inset 0 1px 0 rgba(255,255,255,0.2)`,
              }}
            >
              <Shield className="w-20 h-20" strokeWidth={1.5} />
              <div
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: C.green, color: "white", boxShadow: "0 6px 16px -4px rgba(16,185,129,0.6)" }}
              >
                ● VERIFIED
              </div>
            </div>

            {/* orbiting badges */}
            {orbitBadges.map(({ i: Icon, label, angle }, idx) => {
              const rad = (angle * Math.PI) / 180;
              const R = 190;
              const x = Math.cos(rad) * R;
              const y = Math.sin(rad) * R;
              return (
                <motion.div
                  key={label}
                  className="absolute z-20"
                  style={{ left: "50%", top: "50%", x, y }}
                  initial={{ opacity: 0, scale: 0.6 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 + idx * 0.08, duration: 0.5, ease: EASE }}
                >
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 3 + idx * 0.3, repeat: Infinity, ease: "easeInOut" }}
                    className="-translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-xs font-semibold whitespace-nowrap"
                    style={{ border: `1px solid ${C.border}`, color: C.navy, boxShadow: "0 8px 24px -8px rgba(15,23,42,0.15)" }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: C.blue }} />
                    {label}
                  </motion.div>
                </motion.div>
              );
            })}
          </div>

          {/* Pillars grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            {pillars.map(({ i: Icon, t, d }) => (
              <div
                key={t}
                data-reveal="card"
                className="rounded-2xl p-5 bg-white transition-all hover:-translate-y-0.5"
                style={{ border: `1px solid ${C.border}`, boxShadow: "0 4px 20px -12px rgba(15,23,42,0.15)" }}
              >
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: `${C.blue}14`, color: C.blue }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="font-semibold text-[15px]" style={{ color: C.navy }}>{t}</div>
                <p className="mt-1 text-sm leading-relaxed" style={{ color: C.sub }}>{d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats bar */}
        <div
          className="mt-14 rounded-2xl bg-white grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0"
          style={{ border: `1px solid ${C.border}`, boxShadow: "0 10px 40px -20px rgba(15,23,42,0.15)", borderColor: C.border }}
        >
          {stats.map((s) => (
            <div key={s.v} className="p-6 text-center">
              <div className="text-3xl font-bold tabular-nums" style={{ color: C.navy }}>{s.k}</div>
              <div className="mt-1 text-xs uppercase tracking-wider" style={{ color: C.sub }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Final CTA ---------- */
function FinalCTA() {
  const { isAuthenticated } = useAuth();
  return (
    <section className="relative isolate overflow-hidden py-24 sm:py-32">
      <div
        className="absolute inset-0 z-0"
        style={{
          background: `linear-gradient(135deg, ${C.navy} 0%, #123B63 46%, ${C.greenDeep} 100%)`,
        }}
      />
      <div
        className="absolute inset-0 z-0 opacity-70"
        style={{
          background:
            "radial-gradient(circle at 18% 18%, rgba(255,255,255,0.18), transparent 26%), radial-gradient(circle at 82% 78%, rgba(20,184,166,0.26), transparent 30%)",
        }}
      />
      <motion.div
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
        className="absolute top-6 left-8 z-0 h-72 w-72 rounded-full opacity-35 blur-2xl"
        style={{ background: `radial-gradient(circle, ${C.blue}, transparent 70%)` }}
      />
      <motion.div
        animate={{ x: [0, -40, 0], y: [0, 20, 0] }}
        transition={{ duration: 9, repeat: Infinity }}
        className="absolute bottom-6 right-8 z-0 h-80 w-80 rounded-full opacity-40 blur-2xl"
        style={{ background: `radial-gradient(circle, ${C.teal}, transparent 70%)` }}
      />

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center" style={{ color: C.card }}>
        <div
          className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em]"
          style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)", color: "rgba(255,255,255,0.88)" }}
        >
          <Shield className="h-4 w-4" /> Bank-ready fraud protection
        </div>
        <h2 className="text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
          Take control of every transaction with Guardio.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 sm:text-lg" style={{ color: "rgba(255,255,255,0.78)" }}>
          Join thousands keeping their money safe and their spending sharp.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to={isAuthenticated ? "/dashboard" : "/login"}>
            <Button
              size="lg"
              className="h-12 rounded-full px-7 shadow-xl transition-transform hover:-translate-y-0.5"
              style={{ background: C.card, color: C.navy, boxShadow: "0 20px 45px -18px rgba(255,255,255,0.5)" }}
            >
              Start Free Trial <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
          <Button
            size="lg"
            variant="outline"
            className="h-12 rounded-full bg-transparent px-7 transition-transform hover:-translate-y-0.5 hover:bg-transparent"
            style={{ borderColor: "rgba(255,255,255,0.38)", color: C.card }}
          >
            Book a demo
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */
function Footer() {
  return (
    <footer className="py-14" style={{ background: C.navy, color: "#CBD5E1" }}>
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-xl overflow-hidden flex items-center justify-center ">
              <img src="/logo.jpeg" alt="Guardio logo" className="object-contain w-full h-full scale-110" />
            </div>
            <span className="text-white font-bold text-lg">Guardio</span>
          </div>
          <p className="text-sm opacity-70">AI-powered fraud detection and expense intelligence.</p>
          <div className="flex gap-3 mt-4">
            {[Twitter, Github, Linkedin, Mail].map((I, i) => (
              <a key={i} href="#" className="h-8 w-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 transition">
                <I className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
        {[
          { h: "Product", l: ["Fraud Detection", "Expense Tracker", "AI Insights", "Pricing"] },
          { h: "Company", l: ["About", "Blog", "Careers", "Press"] },
          { h: "Legal", l: ["Privacy", "Terms", "Security", "Compliance"] },
        ].map((col) => (
          <div key={col.h}>
            <div className="text-white text-sm font-semibold mb-3">{col.h}</div>
            <ul className="space-y-2 text-sm opacity-80">
              {col.l.map((x) => <li key={x}><a href="#" className="hover:text-white">{x}</a></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-10 pt-6 border-t border-white/10 text-xs flex flex-wrap items-center justify-between gap-3 opacity-70">
        <div>© {new Date().getFullYear()} Guardio. All rights reserved.</div>
        <div className="flex gap-4">
          <span>PCI DSS</span><span>SOC 2</span><span>256-bit Encrypted</span>
        </div>
      </div>
    </footer>
  );
}

/* ---------- Page ---------- */
export default function Landing() {
  const scope = useRef<HTMLDivElement>(null);
  useGsapReveals(scope);
  return (
    <div ref={scope} className="min-h-screen" style={{ background: C.bg, color: C.text, fontFeatureSettings: '"tnum"' }}>
      <Navbar />
      <Hero />
      <LogoStrip />
      <FraudSection />
      <ExpenseSection />
      <AISection />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <SecurityStrip />
      <FinalCTA />
      <Footer />
    </div>
  );
}