import { createContext, useContext, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useGoogleLogin } from "@react-oauth/google";
import { useLocation } from "wouter";
import type { User } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  isExploring: boolean;
  enterExploreMode: () => void;
  exitExploreMode: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isExploring, setIsExploring] = useState(() => {
    return localStorage.getItem("exploring") === "true";
  });
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/session", {
          credentials: "include",
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData.user);
        }
      } catch (error) {
        console.error("Failed to check session:", error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const googleLogin = useGoogleLogin({
    flow: "implicit",
    prompt: "select_account",
    onSuccess: async (codeResponse) => {
      try {
        setIsAuthLoading(true);
        const response = await fetch("/api/auth/google-signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token: codeResponse.access_token }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Sign-in failed");
        }

        const userData = await response.json();
        setUser(userData.user);
        toast({
          title: "Welcome to BkTravel!",
          description: `Signed in as ${userData.user.email}`,
        });
        
        // Navigate to home page after successful sign-in
        setTimeout(() => {
          setLocation("/home");
        }, 100);
      } catch (error: any) {
        console.error("Sign-in error:", error);
        toast({
          title: "Sign-in failed",
          description: error.message || "Unknown error occurred",
          variant: "destructive",
        });
      } finally {
        setIsAuthLoading(false);
      }
    },
    onError: (error) => {
      console.error("Google login error:", error);
      toast({
        title: "Sign-in failed",
        description: "Failed to authenticate with Google",
        variant: "destructive",
      });
      setIsAuthLoading(false);
    },
  });

  const signInWithGoogle = async () => {
    setIsAuthLoading(true);
    googleLogin();
  };

  const signOut = async () => {
    try {
      await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
      });

      setUser(null);
      localStorage.removeItem("exploring");
      localStorage.removeItem("exploreTripData");
      toast({
        title: "Signed out successfully",
        description: "Come back soon!",
      });
    } catch (error: any) {
      console.error("Sign-out error:", error);
      toast({
        title: "Sign-out failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const enterExploreMode = () => {
    setIsExploring(true);
    localStorage.setItem("exploring", "true");
  };

  const exitExploreMode = async () => {
    setIsExploring(false);
    localStorage.removeItem("exploring");
    localStorage.removeItem("exploreTripData");
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthLoading, signInWithGoogle, signOut, isExploring, enterExploreMode, exitExploreMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
