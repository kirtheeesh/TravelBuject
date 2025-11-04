import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Plane, CheckCircle } from "lucide-react";

interface LoginPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginPromptDialog({ open, onOpenChange }: LoginPromptDialogProps) {
  const { signInWithGoogle, exitExploreMode } = useAuth();

  const handleSignIn = async () => {
    onOpenChange(false);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Sign-in error:", error);
    }
  };

  const handleContinueExploring = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <DialogTitle>Trip Saved!</DialogTitle>
          <DialogDescription className="pt-2">
            Your budget has been saved to your device. Sign in with Google to save it permanently to the cloud.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6 flex flex-col gap-3">
          <Button
            size="lg"
            className="w-full"
            onClick={handleSignIn}
            data-testid="button-login-prompt"
          >
            Sign In with Google
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            onClick={handleContinueExploring}
            data-testid="button-continue-exploring"
          >
            Continue Exploring
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
