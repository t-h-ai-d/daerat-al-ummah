import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import AuthPage from "./pages/AuthPage";
import ChatPage from "./pages/ChatPage";
import { CommunitiesPage, CommunityDetailPage } from "./pages/CommunitiesPage";
import NotFound from "./pages/NotFound";
import PlatformPage from "./pages/PlatformPage";
import PrivacyPage from "./pages/PrivacyPage";
import StudioPage from "./pages/StudioPage";
import TermsPage from "./pages/TermsPage";
import { Route, Switch } from "wouter";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/auth"} component={AuthPage} />
      <Route path={"/chat"} component={ChatPage} />
      <Route path={"/communities"} component={CommunitiesPage} />
      <Route path={"/communities/:slug"} component={CommunityDetailPage} />
      <Route path="/explore"><PlatformPage kind="explore" /></Route>
      <Route path="/notifications"><PlatformPage kind="notifications" /></Route>
      <Route path="/rules"><PlatformPage kind="rules" /></Route>
      <Route path="/profile"><PlatformPage kind="profile" /></Route>
      <Route path="/studio" component={StudioPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster richColors position="top-center" /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
