import { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router";
import {
  LayoutDashboard,
  Container,
  ListChecks,
  Sparkles,
  Clock,
  FlaskConical,
  Settings,
  Layers,
  Bell,
  Building2,
  Menu,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { cn } from "@/app/components/ui/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/app/components/ui/sheet";
import { useLocationContext } from "@/app/contexts/LocationContext";
import { useAIAssistant } from "@/app/contexts/AIAssistantContext";
import { AIAssistantWidget } from "@/app/components/ai-assistant-widget";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Yard View", href: "/yard", icon: Layers },
  { name: "Container Movement", href: "/containers", icon: Container },
  { name: "Recommendations", href: "/recommendations", icon: Sparkles, badge: 12 },
  { name: "Timeline", href: "/timeline", icon: Clock },
  { name: "Simulator", href: "/simulator", icon: FlaskConical },
  { name: "Configuration", href: "/configuration", icon: Settings },
];

export function RootLayout() {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { selectedLocation, setSelectedLocation } = useLocationContext();
  const { setCurrentScreen } = useAIAssistant();

  // Update AI Assistant context based on current route
  useEffect(() => {
    const currentNav = navigation.find((item) => {
      if (item.href === "/") return location.pathname === "/";
      return location.pathname.startsWith(item.href);
    });

    if (currentNav) {
      setCurrentScreen(currentNav.name);
    }
  }, [location.pathname, setCurrentScreen]);

  const NavLink = ({ item, mobile = false }: { item: typeof navigation[0]; mobile?: boolean }) => {
    const isActive = location.pathname === item.href || (item.href !== "/" && location.pathname.startsWith(item.href));
    
    return (
      <Link
        to={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-blue-50 text-blue-700"
            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
          mobile && "text-base",
          isCollapsed && !mobile && "justify-center"
        )}
        title={isCollapsed && !mobile ? item.name : undefined}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        {(!isCollapsed || mobile) && <span>{item.name}</span>}
        {item.badge && !isCollapsed && !mobile && (
          <Badge variant="default" className="ml-auto bg-blue-600 text-white">
            {item.badge}
          </Badge>
        )}
        {item.badge && isCollapsed && !mobile && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-blue-600" />
        )}
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Desktop */}
      <aside className={cn(
        "hidden md:flex flex-col border-r border-gray-200 bg-white transition-all duration-300",
        isCollapsed ? "w-20" : "w-64"
      )}>
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6 justify-between">
          {!isCollapsed && (
            <>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                  <Layers className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">YardOptimize</div>
                  <div className="text-xs text-gray-500">AI Yard Management</div>
                </div>
              </div>
            </>
          )}
          {isCollapsed && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 mx-auto">
              <Layers className="h-5 w-5 text-white" />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "h-8 w-8 shrink-0",
              isCollapsed && "mx-auto mt-2"
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navigation.map((item) => (
            <NavLink key={item.name} item={item} />
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          {isCollapsed ? (
            <div className="flex items-center justify-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                OP
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                OP
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">Operations Team</div>
                <div className="text-xs text-gray-500 truncate">ops@terminal.com</div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                  <Layers className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">YardOptimize</div>
                  <div className="text-xs text-gray-500">AI Yard Management</div>
                </div>
              </div>
              <nav className="space-y-1 p-4">
                {navigation.map((item) => (
                  <NavLink key={item.name} item={item} mobile />
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <h1 className="text-lg font-semibold text-gray-900">
                {navigation.find((item) => {
                  if (item.href === "/") return location.pathname === "/";
                  return location.pathname.startsWith(item.href);
                })?.name || "Dashboard"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-600" />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* AI Assistant Widget */}
      <AIAssistantWidget />
    </div>
  );
}