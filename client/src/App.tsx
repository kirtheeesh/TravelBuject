import { Switch, Route, Redirect } from "wouter";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { TutorialProvider } from "@/contexts/TutorialContext";
import { Suspense, lazy } from "react";

// Lazy load page components for better performance
const Splash = lazy(() => import("@/pages/splash"));
const Home = lazy(() => import("@/pages/home"));
const AuthLoading = lazy(() => import("@/pages/auth-loading"));
const CreateTrip = lazy(() => import("@/pages/create-trip"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const AddBudgetItem = lazy(() => import("@/pages/add-budget-item"));
const Spending = lazy(() => import("@/pages/spending"));
const InvitePage = lazy(() => import("@/pages/invite"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Protected route wrapper
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
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
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <Switch>
        <Route path="/" component={Splash} />
        <Route path="/auth-loading" component={AuthLoading} />
        <Route path="/invite/:code" component={InvitePage} />
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
        <Route path="/spending/:id">
          {() => <ProtectedRoute component={Spending} />}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <TutorialProvider>
              <Toaster />
              <Router />
            </TutorialProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
