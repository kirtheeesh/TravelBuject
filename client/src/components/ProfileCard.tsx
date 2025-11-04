import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogIn, User } from "lucide-react";

export function ProfileCard() {
  const { user, signInWithGoogle, isAuthLoading } = useAuth();

  if (user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
          <CardDescription>Account information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.picture || undefined} alt={user.name || "User"} />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">Signed in as</p>
              <p className="text-lg font-semibold">{user.name || "User"}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Sign In to Your Account
        </CardTitle>
        <CardDescription>Save your trips and access them anywhere</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sign in with your Google account to save your travel budgets and access them from any device.
          </p>
          <Button
            onClick={() => signInWithGoogle()}
            disabled={isAuthLoading}
            className="w-full gap-2"
            size="lg"
          >
            <LogIn className="h-4 w-4" />
            {isAuthLoading ? "Signing in..." : "Sign In with Google"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
