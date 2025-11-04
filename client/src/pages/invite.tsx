import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { joinTrip } from "@/lib/mongodb-operations";
import { useToast } from "@/hooks/use-toast";
import { LogIn, CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function InvitePage() {
  const [, params] = useRoute("/invite/:code");
  const [, setLocation] = useLocation();
  const { user, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const [isJoining, setIsJoining] = useState(false);
  const [joinResult, setJoinResult] = useState<{ success: boolean; tripName?: string; message?: string } | null>(null);

  const invitationCode = params?.code;

  useEffect(() => {
    if (!invitationCode) {
      setLocation("/");
    }
  }, [invitationCode, setLocation]);

  const handleJoinTrip = async () => {
    if (!user) {
      // Redirect to sign in first
      signInWithGoogle();
      return;
    }

    if (!invitationCode) return;

    setIsJoining(true);
    try {
      const result = await joinTrip(invitationCode);
      setJoinResult({ success: true, tripName: result.tripName });
      toast({
        title: "Successfully joined!",
        description: `You have joined "${result.tripName}".`,
      });

      // Set flag for home page success notification
      localStorage.setItem("justJoinedTrip", JSON.stringify({
        tripName: result.tripName,
        timestamp: Date.now()
      }));

      // Redirect to home after a short delay
      setTimeout(() => {
        setLocation("/home");
      }, 2000);
    } catch (error: any) {
      setJoinResult({ success: false, message: error.message });
      toast({
        title: "Failed to join trip",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  if (!invitationCode) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Avatar className="h-16 w-16 bg-primary">
              <AvatarFallback className="text-white text-2xl">
                <LogIn className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
          </div>
          <CardTitle className="text-2xl">Trip Invitation</CardTitle>
          <CardDescription>
            You've been invited to join a travel budget trip
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {joinResult ? (
            <div className="text-center space-y-4">
              {joinResult.success ? (
                <>
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold text-green-700">Successfully Joined!</h3>
                    <p className="text-muted-foreground">
                      You are now a member of "{joinResult.tripName}"
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Redirecting to your trips...
                  </p>
                </>
              ) : (
                <>
                  <XCircle className="h-12 w-12 text-red-500 mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold text-red-700">Failed to Join</h3>
                    <p className="text-muted-foreground">
                      {joinResult.message}
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Click the button below to join this trip and start managing shared expenses.
                </p>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={isJoining}
                    className="w-full"
                    size="lg"
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    Join Trip
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Join Trip</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to join this trip? You'll be able to participate in budget planning and expense tracking.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="flex gap-2 justify-end">
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleJoinTrip} disabled={isJoining}>
                      {isJoining ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Joining...
                        </>
                      ) : (
                        "Join Trip"
                      )}
                    </AlertDialogAction>
                  </div>
                </AlertDialogContent>
              </AlertDialog>

              {!user && (
                <p className="text-xs text-center text-muted-foreground">
                  You'll need to sign in with Google to join this trip.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}