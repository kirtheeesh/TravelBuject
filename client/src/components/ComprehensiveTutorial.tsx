import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, ChevronRight, ChevronLeft, CheckCircle } from "lucide-react";
import { useLocation, useRoute } from "wouter";

interface TutorialStep {
  title: string;
  icon: string;
  content: string[];
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "Welcome",
    icon: "✈️",
    content: [
      "Create and manage group trips easily",
      "Plan budgets for all your expenses",
      "Track real spending during the trip",
      "Split costs fairly with members",
      "Generate reports and settle payments",
    ],
  },
  {
    title: "Create a Trip",
    icon: "📝",
    content: [
      "Click 'Create Trip' button",
      "Enter trip name (e.g., 'Bali Adventure')",
      "Add number of members",
      "Add member names and emails",
      "You become the trip owner automatically",
    ],
  },
  {
    title: "Plan Budget",
    icon: "💰",
    content: [
      "Add budget items (Hotel, Meals, Transport, etc.)",
      "Set the amount for each item",
      "Choose category (Food, Transport, etc.)",
      "Select which members share the expense",
      "Add more items anytime",
    ],
  },
  {
    title: "Add Members",
    icon: "👥",
    content: [
      "Send email invitations to members",
      "Members can accept and join",
      "View member status in dashboard",
      "See each member's expenses",
      "Remove members if needed",
    ],
  },
  {
    title: "Track Spending",
    icon: "📊",
    content: [
      "Go to Spending tab in your trip",
      "Enter actual expenses as you spend",
      "Link spending to budget items",
      "Select which members paid",
      "Mark expenses as paid",
    ],
  },
  {
    title: "Expense Categories",
    icon: "🏷️",
    content: [
      "Food - Meals, snacks, groceries",
      "Accommodation - Hotels, rentals",
      "Transport - Flights, taxis, fuel",
      "Entertainment - Activities, shows",
      "Shopping - Souvenirs, gifts",
      "Other - Miscellaneous expenses",
    ],
  },
  {
    title: "View Results",
    icon: "📈",
    content: [
      "Dashboard shows total budget vs spent",
      "See who owes whom",
      "View cost breakdown by member",
      "Check planned vs actual spending",
      "Export PDF reports",
    ],
  },
  {
    title: "Quick Tips",
    icon: "⚡",
    content: [
      "Add email addresses for invitations",
      "Plan budgets before traveling",
      "Update spending regularly",
      "Use clear item names",
      "Export reports to share with others",
      "Access tutorial anytime from Help menu",
    ],
  },
];

interface ComprehensiveTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTrip?: () => void;
  onCloseChatbot?: () => void;
}

export function ComprehensiveTutorial({
  isOpen,
  onClose,
  onCreateTrip,
  onCloseChatbot,
}: ComprehensiveTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/create-trip");
  const isOnCreateTrip = !!params;

  if (!isOpen) return null;

  const step = TUTORIAL_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateTrip = () => {
    onClose();
    setCurrentStep(0);
    
    if (isOnCreateTrip) {
      if (onCloseChatbot) {
        onCloseChatbot();
      }
    } else {
      setLocation("/create-trip");
      if (onCreateTrip) {
        onCreateTrip();
      }
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50">
      <Card className="w-full max-w-lg max-h-[90vh] flex flex-col">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3 sm:pb-4">
          <div className="flex items-start gap-2 sm:gap-3 flex-1">
            <span className="text-2xl sm:text-3xl flex-shrink-0">{step.icon}</span>
            <div className="min-w-0">
              <CardTitle className="text-lg sm:text-xl">{step.title}</CardTitle>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto px-4 sm:px-6">
          <div className="space-y-2 sm:space-y-3">
            {step.content.map((item, idx) => (
              <div key={idx} className="flex gap-2">
                <div className="text-amber-500 font-bold flex-shrink-0 text-sm">
                  {idx + 1}.
                </div>
                <p className="text-xs sm:text-sm text-foreground">{item}</p>
              </div>
            ))}
          </div>
        </CardContent>

        <div className="border-t p-3 sm:p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground font-semibold whitespace-nowrap">
              {currentStep + 1}/{TUTORIAL_STEPS.length}
            </p>
            <div className="flex gap-1">
              {TUTORIAL_STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    idx === currentStep
                      ? "bg-amber-500"
                      : idx < currentStep
                        ? "bg-green-500"
                        : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={isFirstStep}
              size="sm"
              className="text-xs sm:text-sm"
            >
              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>

            {isLastStep ? (
              <Button
                onClick={handleCreateTrip}
                className="flex-1 bg-green-600 hover:bg-green-700 text-xs sm:text-sm"
                size="sm"
              >
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                Create Trip
              </Button>
            ) : (
              <Button 
                onClick={handleNext} 
                className="flex-1 text-xs sm:text-sm"
                size="sm"
              >
                Next
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
              </Button>
            )}
          </div>

          <Button
            variant="ghost"
            onClick={handleClose}
            className="w-full text-xs"
            size="sm"
          >
            Skip
          </Button>
        </div>
      </Card>
    </div>,
    document.body
  );
}
