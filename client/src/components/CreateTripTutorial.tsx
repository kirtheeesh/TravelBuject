import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ChevronRight, X, Volume2, Users, IndianRupee, Settings } from "lucide-react";
import { useTutorial } from "@/contexts/TutorialContext";

interface Step {
  title: string;
  description: string;
  icon: React.ReactNode;
  details: string[];
}

const TUTORIAL_STEPS: Step[] = [
  {
    title: "Creating Your Trip",
    description: "Let's set up your travel budget step by step",
    icon: <Settings className="h-8 w-8" />,
    details: [
      "Give your trip a memorable name",
      "Specify how many people are joining",
      "Add member details and emails",
      "Set up initial budget items"
    ],
  },
  {
    title: "Trip Name & Details",
    description: "Start with the basics",
    icon: <Settings className="h-8 w-8" />,
    details: [
      "Enter a trip name (minimum 3 characters)",
      "Examples: 'Bali Adventure 2024', 'Paris Weekend'",
      "Make it descriptive so you can find it easily",
      "You can update the name later if needed"
    ],
  },
  {
    title: "Add Trip Members",
    description: "Who will be sharing expenses?",
    icon: <Users className="h-8 w-8" />,
    details: [
      "Enter the number of people joining the trip",
      "You'll automatically be the first member (owner)",
      "Add names and emails for other members (optional)",
      "Members with emails will get invitation links"
    ],
  },
  {
    title: "Member Emails (Optional)",
    description: "Invite members to join digitally",
    icon: <Users className="h-8 w-8" />,
    details: [
      "Email is optional - members without emails default to 'joined'",
      "Email addresses allow you to send invitation codes",
      "Members can join the trip and view shared expenses",
      "You can add emails later through the trip settings"
    ],
  },
  {
    title: "Budget Items",
    description: "Plan your expenses",
    icon: <IndianRupee className="h-8 w-8" />,
    details: [
      "Add expenses like Hotel, Meals, Transport, etc.",
      "Enter the total amount and select a category",
      "Choose which members will split each expense",
      "Use 'Select All' for expenses shared by everyone"
    ],
  },
  {
    title: "Budget Item Details",
    description: "Breaking down each expense",
    icon: <IndianRupee className="h-8 w-8" />,
    details: [
      "Item Name: What the expense is for",
      "Amount: Total cost in rupees",
      "Category: Food, Transport, Accommodation, etc.",
      "The amount per person is calculated automatically"
    ],
  },
  {
    title: "Save & Get Started",
    description: "You're all set!",
    icon: <ChevronRight className="h-8 w-8" />,
    details: [
      "Click 'Save Trip' to create your budget",
      "You'll see your trip on the home page",
      "Share the trip code with members to invite them",
      "Start tracking expenses right away"
    ],
  },
];

interface CreateTripTutorialProps {
  onComplete: () => void;
}

export function CreateTripTutorial({ onComplete }: CreateTripTutorialProps) {
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

      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 pointer-events-auto">
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

              <Button
                onClick={handleNext}
                className="gap-2"
              >
                {isLastStep ? "Let's Create a Trip!" : "Next"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
