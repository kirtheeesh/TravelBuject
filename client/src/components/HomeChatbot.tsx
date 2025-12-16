import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Lightbulb, BookOpen } from "lucide-react";
import { ComprehensiveTutorial } from "./ComprehensiveTutorial";

interface ChatMessage {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: number;
  tips?: string[];
}

interface HomeChatbotProps {
  tripsCount?: number;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const HOME_HINTS = {
  overview: {
    message: "Welcome to Travel Budget Helper! 🌍",
    tips: [
      "Organize group trips effortlessly with friends and family",
      "Create and manage multiple trips simultaneously",
      "Invite members to join your trips",
      "Track expenses and split costs fairly",
      "Export detailed reports anytime",
    ],
  },
  getStarted: {
    message: "Getting Started 🚀",
    tips: [
      "Click 'Create Trip' to start your first trip",
      "Set a name and add members to your trip",
      "Plan your budget with detailed items",
      "Invite members via email to collaborate",
      "Start tracking spending once the trip begins",
    ],
  },
  invitations: {
    message: "Joining Trips 📧",
    tips: [
      "Accept invitations to join existing trips",
      "View all trips you've been invited to",
      "See trip details before deciding to join",
      "Once joined, you can view and add spending",
      "Leave trips anytime from trip details",
    ],
  },
  features: {
    message: "Key Features ✨",
    tips: [
      "Create budgets to plan trip expenses",
      "Add real spending as money is spent",
      "View balance and settlement calculations",
      "See spending breakdowns by category",
      "Export PDF reports for sharing and records",
    ],
  },
};

export function HomeChatbot({
  tripsCount,
  isOpen: externalIsOpen,
  onOpenChange,
}: HomeChatbotProps) {
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const hint = HOME_HINTS.overview;
      addMessage(hint.message, hint.tips);
    }
  }, [isOpen]);

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

  const handleOptionClick = (key: string) => {
    const hint = HOME_HINTS[key as keyof typeof HOME_HINTS];
    if (hint) {
      addMessage(hint.message, hint.tips);
    }
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
                Trip Assistant
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
              <p className="text-xs text-muted-foreground font-semibold">What would you like to know?</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOptionClick("getStarted")}
                  className="text-xs"
                >
                  🚀 Get Started
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOptionClick("invitations")}
                  className="text-xs"
                >
                  📧 Invitations
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOptionClick("features")}
                  className="text-xs"
                >
                  ✨ Features
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowTutorial(true)}
                  className="text-xs"
                >
                  <BookOpen className="h-3 w-3 mr-1" />
                  Tutorial
                </Button>
              </div>
            </div>
          </Card>
        </div>,
        document.body
      )}
    </>
  );
}
