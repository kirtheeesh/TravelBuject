import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ChevronRight, CheckCircle2, Users, IndianRupee, Zap, X, Volume2 } from "lucide-react";
import { useTutorial } from "@/contexts/TutorialContext";

interface Step {
  title: string;
  description: string;
  icon: React.ReactNode;
  details: string[];
}

const TUTORIAL_STEPS: Step[] = [
  {
    title: "Welcome to Travel Budget Helper",
    description: "Your personal travel expense tracker",
    icon: <Zap className="h-8 w-8" />,
    details: [
      "Track expenses during your trips",
      "Split costs with travel companions",
      "Manage budgets and spending",
      "Get a clear view of who owes whom"
    ],
  },
  {
    title: "Step 1: Create a Trip",
    description: "Start by creating your first trip",
    icon: <Users className="h-8 w-8" />,
    details: [
      "Click the 'Create New Trip' button on the home page",
      "Give your trip a memorable name (e.g., 'Bali Adventure 2024')",
      "Specify how many people are joining",
      "Add names and emails of trip members (optional for some)"
    ],
  },
  {
    title: "Step 2: Add Trip Members",
    description: "Include everyone sharing expenses",
    icon: <Users className="h-8 w-8" />,
    details: [
      "You'll automatically be the trip owner/first member",
      "Add email addresses to send invitations to others",
      "Members without emails will be marked as 'joined'",
      "Members with emails will receive invitation codes"
    ],
  },
  {
    title: "Step 3: Set Up Budget Items",
    description: "Define your planned expenses",
    icon: <IndianRupee className="h-8 w-8" />,
    details: [
      "Add budget items (e.g., Hotel, Meals, Transport)",
      "Set the amount for each expense",
      "Choose a category (Food, Accommodation, etc.)",
      "Select which members share each expense"
    ],
  },
  {
    title: "Step 4: Track Spending",
    description: "Record actual expenses as you go",
    icon: <IndianRupee className="h-8 w-8" />,
    details: [
      "Go to the 'Spending' section in your trip",
      "Record actual expenses against budget items",
      "Track unplanned spending separately",
      "Mark spending as completed when paid"
    ],
  },
  {
    title: "Step 5: View & Share Results",
    description: "Settle up with your travel companions",
    icon: <CheckCircle2 className="h-8 w-8" />,
    details: [
      "View the balance summary showing total budget vs spent",
      "See how much each person owes or is owed",
      "Share the trip code (6 characters) with members to invite them",
      "Export reports for your records"
    ],
  },
];

interface OnboardingTutorialProps {
  onComplete: () => void;
  onStartTrip: () => void;
}

export function OnboardingTutorial({ onComplete, onStartTrip }: OnboardingTutorialProps) {
  const { disableTutorial } = useTutorial();
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(true);
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      setIsOpen(false);
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleStopTutorial = () => {
    disableTutorial();
    setIsOpen(false);
    onComplete();
  };

  const handleCreateTrip = () => {
    setIsOpen(false);
    onComplete();
    onStartTrip();
  };

  if (!isOpen) return null;

  return (
    <>
      <AlertDialog open={showStopConfirm} onOpenChange={setShowStopConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-orange-600" />
              Stop Tutorial?
            </AlertDialogTitle>
            <AlertDialogDescription>
              If you stop the tutorial now, it won't appear again. You can restart it anytime from the Help menu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Continue Tutorial</AlertDialogCancel>
            <AlertDialogAction onClick={handleStopTutorial} className="bg-orange-600 hover:bg-orange-700">
              Stop Tutorial
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <Card className="w-full max-w-2xl shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {step.icon}
                </div>
                <div>
                  <CardTitle className="text-2xl">{step.title}</CardTitle>
                  <CardDescription className="text-base">{step.description}</CardDescription>
                </div>
              </div>
              <button
                onClick={() => setShowStopConfirm(true)}
                className="text-muted-foreground hover:text-foreground"
                title="Stop Tutorial"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-3">
              {step.details.map((detail, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                  <p className="text-sm text-foreground">{detail}</p>
                </div>
              ))}
            </div>

            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${((currentStep + 1) / TUTORIAL_STEPS.length) * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-muted-foreground">
                Step {currentStep + 1} of {TUTORIAL_STEPS.length}
              </span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
              >
                Previous
              </Button>

              {currentStep === 0 ? (
                <Button
                  onClick={handleCreateTrip}
                  className="gap-2"
                >
                  Create Your First Trip
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  className="gap-2"
                >
                  {isLastStep ? "Get Started" : "Next"}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
