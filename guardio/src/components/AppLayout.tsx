import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Bell, Search,CreditCard, LogOut, User as UserIcon, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";
import Notifications from "@/pages/Notifications";
interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const name = user?.name || "Guest User";
  const email = user?.email || "guest@ccfd.app";
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border/50 px-4 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <h2 className="font-display text-lg font-semibold">{title}</h2>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                <Search className="h-4 w-4 text-muted-foreground" />
              </button>
              <button
                onClick={() => navigate("/notifications")}
                className="p-2 rounded-lg hover:bg-muted transition-colors relative"
              >
                <Bell className="h-4 w-4 text-muted-foreground" />
                <Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 p-0 flex items-center justify-center text-[9px] gradient-primary border-0">
                  {Notifications?.length ?? 0}
                </Badge>
              </button>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    title={`${name} (${email})`}
                    className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-semibold hover:opacity-90 hover:ring-2 hover:ring-primary/30 transition-all cursor-pointer"
                  >
                    {initials}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 p-0 overflow-hidden">
                  <div className="p-4 gradient-primary text-primary-foreground">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-sm font-semibold">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{name}</p>
                        <p className="text-[11px] opacity-80 truncate">{email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => navigate("/profile")}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors text-left"
                    >
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      My Profile
                    </button>
                    <button
                      onClick={() => navigate("/add-card")}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors text-left"
                    >
                     <CreditCard className="h-4 w-4 text-muted-foreground" />
                     Add Card
                    </button>
                    <div className="h-px bg-border my-1" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
