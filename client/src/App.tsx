import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import AuthPage from "./pages/AuthPage";
import ChatPage from "./pages/ChatPage";
import NotFound from "./pages/NotFound";
import PlatformPage from "./pages/PlatformPage";
import { Route, Switch } from "wouter";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/auth"} component={AuthPage} />
      <Route path={"/chat"} component={ChatPage} />
      <Route path="/explore"><PlatformPage kind="explore" /></Route>
      <Route path="/notifications"><PlatformPage kind="notifications" /></Route>
      <Route path="/rules"><PlatformPage kind="rules" /></Route>
      <Route path="/profile"><PlatformPage kind="profile" /></Route>
      <Route path="/admin"><PlatformPage kind="admin" /></Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster richColors position="top-center" /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
