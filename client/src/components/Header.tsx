import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plane, LogOut, LogIn } from "lucide-react";
import { useLocation } from "wouter";

export function Header() {
  const { user, signInWithGoogle, signOut, isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();

  const handleSignOut = async () => {
    await signOut();
    setLocation("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
        <button
          onClick={() => setLocation(user ? "/home" : "/")}
          className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-lg px-3 py-2 transition-all"
          data-testid="button-logo"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Plane className="h-5 w-5" />
          </div>
          <span className="text-xl font-semibold">BkTravel</span>
        </button>

        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full"
                  data-testid="button-profile"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.picture || undefined} alt={user.name || "User"} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name || "User"}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} data-testid="button-signout">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              onClick={() => signInWithGoogle()}
              disabled={isAuthLoading}
              className="gap-2"
              data-testid="button-signin-header"
            >
              <LogIn className="h-4 w-4" />
              {isAuthLoading ? "Signing in..." : "Sign In"}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
