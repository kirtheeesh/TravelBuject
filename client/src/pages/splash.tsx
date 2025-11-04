import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plane, Users, TrendingUp, Shield, LogIn } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { IndianRupee } from "lucide-react";

export default function Splash() {
  const { user, loading, signInWithGoogle, isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user && !loading) {
      setLocation("/home");
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-4 top-20 h-72 w-72 rounded-full bg-white opacity-20 blur-3xl" />
        <div className="absolute right-10 top-40 h-96 w-96 rounded-full bg-blue-400 opacity-20 blur-3xl" />
        <div className="absolute bottom-20 left-1/3 h-80 w-80 rounded-full bg-indigo-400 opacity-20 blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-12 md:px-8 md:py-20">
        {/* Logo & Title */}
        <div className="mb-12 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-2xl md:h-24 md:w-24">
              <Plane className="h-10 w-10 text-blue-600 md:h-12 md:w-12" />
            </div>
          </div>
          <h1 className="mb-4 text-4xl font-bold text-blue-600 md:text-6xl lg:text-7xl">
            BkTravel Budget Manager
          </h1>
          <p className="text-lg text-blue-500 md:text-xl">
            Plan, Track & Split Your Travel Expenses Effortlessly!
          </p>
        </div>

        {/* Main CTA Cards */}
        <div className="mb-16 grid gap-6 md:grid-cols-1 max-w-md mx-auto">
          {/* Sign In Card */}
          <Card className="group relative overflow-hidden border-0 bg-white p-8 shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-blue-500/50">
            <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-gradient-to-br from-blue-400 to-blue-600 opacity-10" />
            <div className="relative">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <h3 className="mb-2 text-2xl font-bold text-gray-900">Save Forever</h3>
              <p className="mb-6 text-gray-600">
                Sign in with Google to save your trips permanently and access them anytime.
              </p>
              <div className="mb-6 rounded-lg bg-blue-50 p-3">
              </div>
              <Button
                size="lg"
                onClick={signInWithGoogle}
                disabled={isAuthLoading}
                className="h-12 w-full bg-gradient-to-r from-blue-600 to-blue-700 text-base font-semibold shadow-lg transition-all hover:from-blue-700 hover:to-blue-800"
                data-testid="button-sign-in"
              >
                {isAuthLoading ? (
                  <>
                    <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-5 w-5" />
                    Sign In with Google
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>

        {/* Features Section */}
        <div className="rounded-3xl bg-blue-50 p-8 md:p-12">
          <h2 className="mb-8 text-center text-3xl font-bold text-blue-600 md:text-4xl">
            Powerful Features for Your Travels
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <Users className="h-8 w-8 text-white" />
                </div>
              </div>
              <h3 className="mb-2 text-xl font-bold text-blue-600">Group Trips</h3>
              <p className="text-blue-500">
                Add unlimited members and track expenses for everyone in your group
              </p>
            </div>

            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <IndianRupee className="h-8 w-8 text-white" />
                </div>
              </div>
              <h3 className="mb-2 text-xl font-bold text-blue-600">Smart Splitting</h3>
              <p className="text-blue-500">
                Automatically calculate and split costs among selected members
              </p>
            </div>

            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
              </div>
              <h3 className="mb-2 text-xl font-bold text-blue-600">Visual Analytics</h3>
              <p className="text-blue-500">
                Beautiful charts and graphs to visualize your spending patterns
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
