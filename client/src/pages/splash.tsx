import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Plane, Users, TrendingUp } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { IndianRupee } from "lucide-react";

export default function Splash() {
  const { user, loading, signInWithGoogle, isExploring, enterExploreMode } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user && !loading) {
      setLocation("/home");
    }
  }, [user, loading, setLocation]);

  useEffect(() => {
    if (isExploring && !loading) {
      setLocation("/home");
    }
  }, [isExploring, loading, setLocation]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section with Gradient Background */}
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700">

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center md:px-8">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary shadow-2xl backdrop-blur-sm">
              <Plane className="h-12 w-12 text-primary-foreground" />
            </div>
          </div>

          {/* App Name */}
          <h1 className="mb-4 text-5xl font-bold text-white md:text-6xl lg:text-7xl">
            BkTravel Budget Manager
          </h1>

          {/* Tagline */}
          <p className="mb-12 text-xl text-white/90 md:text-2xl">
            Plan, Track & Split Your Travel Budget Effortlessly!
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              className="h-14 rounded-full px-8 text-lg font-semibold shadow-2xl"
              onClick={enterExploreMode}
              data-testid="button-explore"
            >
              Explore the App
            </Button>
          </div>

          {/* Features */}
          <div className="mt-20 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-md">
              <div className="mb-3 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20 backdrop-blur-sm">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">Group Trips</h3>
              <p className="text-sm text-white/80">
                Add members and track expenses for everyone
              </p>
            </div>

            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-md">
              <div className="mb-3 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20 backdrop-blur-sm">
                  <IndianRupee className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">Smart Splitting</h3>
              <p className="text-sm text-white/80">
                Automatically split costs among selected members
              </p>
            </div>

            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-md">
              <div className="mb-3 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20 backdrop-blur-sm">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">Track Everything</h3>
              <p className="text-sm text-white/80">
                Visualize spending with charts and history
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
