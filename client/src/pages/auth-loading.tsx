import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { Loader } from "lucide-react";

export default function AuthLoading() {
  const { user, isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user && !isAuthLoading) {
      setLocation("/home");
    }
  }, [user, isAuthLoading, setLocation]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <Loader className="h-12 w-12 animate-spin text-primary" />
          </div>
          <h2 className="mb-2 text-2xl font-semibold">Enhancing Your Experience</h2>
          <p className="text-muted-foreground">Loading your account and trips...</p>
        </div>
      </main>
    </div>
  );
}
