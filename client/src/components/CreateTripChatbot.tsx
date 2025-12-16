import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, X, Lightbulb, BookOpen } from "lucide-react";
import { ComprehensiveTutorial } from "./ComprehensiveTutorial";

interface ChatMessage {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: number;
  tips?: string[];
}

interface CreateTripChatbotProps {
  currentStep?: "tripName" | "memberCount" | "memberDetails" | "budgetItems" | "review";
  tripName?: string;
  memberCount?: number;
  hasBudgetItems?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const TUTORIAL_HINTS: Record<string, { message: string; tips: string[] }> = {
  tripName: {
    message: "Let's start with your trip name! 🌍 This helps you identify your trip later.",
    tips: [
      "Use a descriptive name like 'Bali Adventure 2024' or 'Paris Weekend'",
      "Must be at least 3 characters long",
      "You can always update it later if needed",
    ],
  },
  memberCount: {
    message: "Now, how many people are joining your trip? 👥",
    tips: [
      "Enter the total number of members including yourself",
      "You'll automatically be the first member (trip owner)",
      "You can invite others using email addresses",
      "Can add up to 100 members per trip",
    ],
  },
  memberDetails: {
    message: "Great! Now let's add details for each member. 👤",
    tips: [
      "Member names are optional - defaults to 'Member N' if left blank",
      "Email addresses are optional too",
      "Adding emails lets you send digital invitations",
      "Your name and email are auto-filled as the trip owner",
      "You can add more members later from trip settings",
    ],
  },
  budgetItems: {
    message: "Perfect! Now let's set up your budget items. 💰",
    tips: [
      "Add expenses like Hotel, Meals, Transport, Activities, etc.",
      "Each item needs: Name, Amount, Category, and Member selection",
      "The app calculates how much each person owes automatically",
      "Use 'Select All' for expenses shared by everyone",
      "You can add items from common suggestions (Hotel, Tea, etc.)",
    ],
  },
  review: {
    message: "Almost done! Let's review everything before saving. ✅",
    tips: [
      "Check your trip name is correct",
      "Verify all members are added",
      "Confirm budget items and amounts",
      "Click 'Save Trip' to create your budget",
      "You'll see it on your home page once saved",
    ],
  },
};

export function CreateTripChatbot({
  currentStep = "tripName",
  tripName,
  memberCount,
  hasBudgetItems = false,
  isOpen: externalIsOpen,
  onOpenChange,
}: CreateTripChatbotProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(true);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open);
    } else {
      setInternalIsOpen(open);
    }
  };

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showTutorial, setShowTutorial] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [prevStep, setPrevStep] = useState<string>(currentStep);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      showStepMessage();
    }
  }, [isOpen]);

  useEffect(() => {
    if (currentStep !== prevStep && isOpen) {
      showStepMessage();
      setPrevStep(currentStep);
    }
  }, [currentStep, prevStep, isOpen]);

  const showStepMessage = () => {
    const hint = TUTORIAL_HINTS[currentStep];
    if (hint) {
      addMessage(hint.message, hint.tips);
    }
  };

  const addMessage = (text: string, tips?: string[]) => {
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      text,
      isBot: true,
      timestamp: Date.now(),
      tips,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleDismiss = () => {
    setIsOpen(false);
    setMessages([]);
  };

  if (!isOpen) {
    return createPortal(
      <div className="fixed bottom-4 right-4 z-40">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg"
          title="Open Tutorial Assistant"
        >
          <Lightbulb className="h-6 w-6" />
        </Button>
      </div>,
      document.body
    );
  }

  const handleCloseChatbot = () => {
    setIsOpen(false);
    setMessages([]);
  };

  return (
    <>
      <ComprehensiveTutorial
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        onCloseChatbot={handleCloseChatbot}
      />
      {createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 pointer-events-none">
          <Card className="w-full max-w-sm shadow-2xl pointer-events-auto max-h-[600px] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Trip Creation Guide
              </CardTitle>
              <button
                onClick={handleDismiss}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id} className="space-y-2">
                    <p className="text-sm font-medium text-foreground">{msg.text}</p>
                    {msg.tips && msg.tips.length > 0 && (
                      <div className="bg-amber-50 dark:bg-amber-950 rounded-lg p-3 space-y-2">
                        {msg.tips.map((tip, idx) => (
                          <div key={idx} className="flex gap-2">
                            <span className="text-amber-600 dark:text-amber-400 font-bold flex-shrink-0">
                              •
                            </span>
                            <span className="text-xs text-amber-900 dark:text-amber-100">
                              {tip}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </CardContent>

            <div className="border-t p-3 space-y-2">
              <p className="text-xs text-muted-foreground text-center">
                Current step: <strong className="capitalize">{currentStep.replace(/([A-Z])/g, " $1")}</strong>
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowTutorial(true)}
                className="w-full text-xs"
              >
                <BookOpen className="h-3 w-3 mr-1" />
                Tutorial
              </Button>
            </div>
          </Card>
        </div>,
        document.body
      )}
    </>
  );
}
