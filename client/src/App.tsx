import { Switch, Route, Redirect } from "wouter";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Splash from "@/pages/splash";
import Home from "@/pages/home";
import AuthLoading from "@/pages/auth-loading";
import CreateTrip from "@/pages/create-trip";
import Dashboard from "@/pages/dashboard";
import AddBudgetItem from "@/pages/add-budget-item";
import NotFound from "@/pages/not-found";

// Protected route wrapper
function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  const { user, loading, isExploring } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user && !isExploring) {
    return <Redirect to="/" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Splash} />
      <Route path="/auth-loading" component={AuthLoading} />
      <Route path="/home">
        {() => <ProtectedRoute component={Home} />}
      </Route>
      <Route path="/create-trip">
        {() => <ProtectedRoute component={CreateTrip} />}
      </Route>
      <Route path="/dashboard/:id">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/trip/:id/add-items">
        {() => <ProtectedRoute component={AddBudgetItem} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
