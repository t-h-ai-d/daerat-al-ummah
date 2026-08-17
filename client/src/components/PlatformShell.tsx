import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bell,
  BookOpen,
  Compass,
  Home,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { useLocation } from "wouter";

type NavItem = { label: string; href: string; icon: typeof Home };

const primaryNav: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Explore", href: "/explore", icon: Compass },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Community rules", href: "/rules", icon: BookOpen },
];

function initials(value?: string | null) {
  return (value || "UC")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join("")
    .toUpperCase();
}

export default function PlatformShell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");

  const navigate = (href: string) => {
    setLocation(href);
    setMobileOpen(false);
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (query.trim()) navigate(`/explore?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="min-h-screen bg-[#f5f5ef] text-[#16352d]">
      <header className="sticky top-0 z-40 border-b border-[#dce1d5]/90 bg-[#f9faf6]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[73px] max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate("/")}
            className="group flex shrink-0 items-center gap-2.5 text-left"
            aria-label="Go to Ummah Circle home"
          >
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#0d3b31] text-[#d9b85b] shadow-[0_8px_20px_rgba(13,59,49,0.18)] transition-transform duration-200 group-hover:-rotate-6">
              <Sparkles size={19} strokeWidth={2.3} />
            </span>
            <span className="hidden leading-none sm:block">
              <span className="block font-display text-[19px] font-bold tracking-[-0.045em] text-[#11372d]">Ummah Circle</span>
              <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.19em] text-[#9e7d2c]">Connect with adab</span>
            </span>
          </button>

          <form onSubmit={submitSearch} className="mx-auto hidden w-full max-w-[410px] md:block">
            <label className="relative block">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#80968b]" size={17} />
              <Input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search the circle"
                className="h-10 rounded-xl border-[#dce3d8] bg-white pl-10 pr-3 text-sm shadow-none placeholder:text-[#90a196] focus-visible:border-[#557c6b] focus-visible:ring-[#557c6b]/20"
              />
            </label>
          </form>

          <div className="ml-auto flex items-center gap-2">
            {isAuthenticated ? (
              <button
                onClick={() => navigate("/profile")}
                className="hidden items-center gap-2 rounded-xl p-1.5 pr-3 text-left transition-colors hover:bg-[#eaf0e9] sm:flex"
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#e2c56b] text-xs font-extrabold text-[#173b32]">
                  {initials(user?.name)}
                </span>
                <span className="max-w-28 truncate text-xs font-bold text-[#294a40]">{user?.name || "My profile"}</span>
              </button>
            ) : !loading ? (
              <Button onClick={startLogin} className="hidden h-10 rounded-xl bg-[#0d3b31] px-4 text-xs font-bold shadow-none hover:bg-[#175443] sm:inline-flex">
                Join the circle
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(value => !value)}
              className="h-10 w-10 rounded-xl text-[#234a3d] hover:bg-[#e7eee6] md:hidden"
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
          </div>
        </div>
        {mobileOpen && (
          <div className="border-t border-[#e1e6dc] bg-[#fbfcf8] px-4 py-3 md:hidden">
            <form onSubmit={submitSearch} className="mb-3">
              <label className="relative block">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#80968b]" size={16} />
                <Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search users, posts or #topics" className="h-10 rounded-xl bg-white pl-10" />
              </label>
            </form>
            <nav className="grid grid-cols-2 gap-1">
              {primaryNav.map(item => {
                const Icon = item.icon;
                const active = location === item.href;
                return (
                  <button key={item.href} onClick={() => navigate(item.href)} className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${active ? "bg-[#e9f0e9] text-[#0f4a3a]" : "text-[#557367]"}`}>
                    <Icon size={17} /> {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      <div className="mx-auto flex max-w-[1440px]">
        <aside className="sticky top-[73px] hidden h-[calc(100vh-73px)] w-[248px] shrink-0 border-r border-[#dfe5da] px-5 py-7 lg:block">
          <nav className="space-y-1">
            {primaryNav.map(item => {
              const Icon = item.icon;
              const active = location === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => navigate(item.href)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[14px] font-semibold transition-all ${active ? "bg-[#dfece2] text-[#0c4c39] shadow-[inset_3px_0_0_#c9a44e]" : "text-[#567568] hover:bg-white hover:text-[#193e34]"}`}
                >
                  <Icon size={19} strokeWidth={active ? 2.4 : 1.8} />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div className="mt-8 rounded-2xl border border-[#dbe4d8] bg-[linear-gradient(145deg,#edf3ec,#f9f8ec)] p-4">
            <span className="mb-3 grid h-8 w-8 place-items-center rounded-lg bg-[#c59e43] text-[#14392f]"><ShieldCheck size={17} /></span>
            <p className="text-sm font-bold text-[#24483d]">A safer space by design.</p>
            <p className="mt-1.5 text-xs leading-5 text-[#688176]">No scams. No lies. No brainrot. Respect the sanctity of people and faith.</p>
            <button onClick={() => navigate("/rules")} className="mt-3 text-xs font-extrabold text-[#0f5a43] underline decoration-[#c6a04a] underline-offset-4">Read the rules</button>
          </div>
          <button onClick={() => navigate("/admin")} className="mt-5 flex items-center gap-2 px-3 text-xs font-semibold text-[#84988e] transition-colors hover:text-[#255444]">
            <ShieldCheck size={15} /> Moderator workspace
          </button>
        </aside>

        <main className="min-w-0 flex-1 pb-20 lg:pb-0">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[67px] border-t border-[#dfe5da] bg-[#fbfcf8]/95 px-3 pb-[max(0px,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
        {primaryNav.slice(0, 4).map(item => {
          const Icon = item.icon;
          const active = location === item.href;
          return (
            <button key={item.href} onClick={() => navigate(item.href)} className={`flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-bold ${active ? "text-[#0a4d38]" : "text-[#809288]"}`}>
              <Icon size={19} strokeWidth={active ? 2.5 : 1.8} />
              <span>{item.label.split(" ")[0]}</span>
            </button>
          );
        })}
        <button onClick={() => navigate("/profile")} className={`flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-bold ${location === "/profile" ? "text-[#0a4d38]" : "text-[#809288]"}`}>
          <UserRound size={19} strokeWidth={location === "/profile" ? 2.5 : 1.8} />
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
}
