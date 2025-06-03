import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import TaskPlanning from "@/pages/task-planning";
import Timesheet from "@/pages/timesheet";
import Admin from "@/pages/admin";
import Profile from "@/pages/profile";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

function AuthenticatedApp() {
  const { user } = useAuth();

  return (
    <Switch>
      <Route path="/admin">
        {user?.role === 'admin' ? <Admin /> : <TaskPlanning />}
      </Route>
      <Route path="/profile" component={Profile} />
      <Route>
        <div className="flex h-screen bg-gray-50">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto">
              <Switch>
                <Route path="/" component={TaskPlanning} />
                <Route path="/task-planning" component={TaskPlanning} />
                <Route path="/timesheet" component={Timesheet} />
                <Route component={NotFound} />
              </Switch>
            </main>
          </div>
        </div>
      </Route>
    </Switch>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login">
        {isAuthenticated ? <AuthenticatedApp /> : <Login />}
      </Route>
      <Route path="*">
        {isAuthenticated ? <AuthenticatedApp /> : <Login />}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
