import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Lock, Mail, Eye, EyeOff, Fingerprint, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import api from "@/services/api";

export default function Login() {
  const navigate = useNavigate();
  // Ensure your hook exposes setTokens and setUser directly, or a single 'login' function
  const { isAuthenticated, setTokens, setUser } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");

  // Fix 1: Handle redirects cleanly within a useEffect hook
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>, mode: "login" | "signup") => {
    e.preventDefault();

    // Fix 2: Use FormData to extract values reliably without brittle element matching
    const formData = new FormData(e.currentTarget);
    const email = (formData.get(`${mode}-email`) || formData.get('email')) as string || "";
    const password = (formData.get(`${mode}-password`) || formData.get('password')) as string || "";

    setLoading(true);
    try {
      if (mode === "signup") {
        const nameInput = (formData.get("signup-name") || formData.get("name")) as string || "";
        const [firstName, ...lastNameArr] = nameInput.split(' ');
        const lastName = lastNameArr.join(' ');

        await api.post('/auth/register/', {
          email,
          password,
          first_name: firstName,
          last_name: lastName,
          pan_card: `PAN${Math.floor(Math.random() * 100000)}`,
          phone_number: `+1${Math.floor(Math.random() * 1000000000)}`
        });

        toast.success("Account created! Please log in.");
        setActiveTab("login"); // Fix 3: Controlled state instead of forcing a DOM element click
      } else {
        const res = await api.post('/token/', { email, password });
        const { access, refresh } = res.data;

        // Update your application state gracefully using the hook's returned functions
        setTokens(access, refresh);

        // Fetch profile
        const profileRes = await api.get('/auth/profile/', {
          headers: { Authorization: `Bearer ${access}` }
        });
        setUser(profileRes.data);

        toast.success("Welcome back!");
        navigate("/dashboard");
      }
    } catch (err: any) {
      console.error("Auth error response:", err.response?.data);
      const data = err.response?.data;
      let message = "Authentication failed";
      if (data) {
        if (data.detail) {
          message = data.detail;
        } else {
          // DRF serializer errors are { field: [errors] }
          const firstKey = Object.keys(data)[0];
          if (firstKey && Array.isArray(data[firstKey])) {
            message = `${firstKey}: ${data[firstKey].join(", ")}`;
          }
        }
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Prevent UI flash while redirecting an authenticated user
  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary/8 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-elevated mb-4">
            <Shield className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">Guardio</h1>
          <p className="text-muted-foreground text-sm mt-1">Guardio Fraud Detector</p>
        </div>

        <Card className="glass-card border-border/50 shadow-elevated">
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full mb-6 bg-muted/50">
                <TabsTrigger value="login" className="flex-1 data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground">
                  Login
                </TabsTrigger>
                <TabsTrigger value="signup" className="flex-1 data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground">
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={(e) => handleSubmit(e, "login")} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-foreground text-sm">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="login-email" name="login-email" type="email" placeholder="you@example.com" className="pl-10 bg-muted/30 border-border/50 focus:border-primary" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-foreground text-sm">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="login-password" name="login-password" type={showPassword ? "text" : "password"} placeholder="••••••••" className="pl-10 pr-10 bg-muted/30 border-border/50 focus:border-primary" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button type="button" className="text-xs text-primary hover:underline">Forgot password?</button>
                  </div>
                  <Button type="submit" className="w-full gradient-primary text-primary-foreground font-semibold h-11" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={(e) => handleSubmit(e, "signup")} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-foreground text-sm">Full Name</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-name" name="signup-name" type="text" placeholder="Chandan Mandal" className="pl-10 bg-muted/30 border-border/50 focus:border-primary" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-foreground text-sm">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-email" name="signup-email" type="email" placeholder="you@example.com" className="pl-10 bg-muted/30 border-border/50 focus:border-primary" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-foreground text-sm">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-password" name="signup-password" type={showPassword ? "text" : "password"} placeholder="••••••••" className="pl-10 pr-10 bg-muted/30 border-border/50 focus:border-primary" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full gradient-primary text-primary-foreground font-semibold h-11" disabled={loading}>
                    {loading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-border/50" />
              <span className="text-xs text-muted-foreground">or continue with</span>
              <div className="flex-1 h-px bg-border/50" />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-11 border-border/50 bg-muted/20 hover:bg-muted/40">
                <Fingerprint className="h-4 w-4 mr-2" /> Biometric
              </Button>
              <Button variant="outline" className="flex-1 h-11 border-border/50 bg-muted/20 hover:bg-muted/40">
                <Mail className="h-4 w-4 mr-2" /> OTP
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-4 mt-6 text-muted-foreground">
          <div className="flex items-center gap-1.5 text-xs">
            <Shield className="h-3.5 w-3.5 text-safe" />
            <span>256-bit Encryption</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Lock className="h-3.5 w-3.5 text-safe" />
            <span>PCI DSS Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
}