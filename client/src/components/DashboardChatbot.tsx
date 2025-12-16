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

interface DashboardChatbotProps {
  tripName?: string;
  memberCount?: number;
  budgetItemCount?: number;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DASHBOARD_HINTS = {
  overview: {
    message: "Welcome to your Trip Dashboard! 📊",
    tips: [
      "View all trip details and member information",
      "See budget items and spending status",
      "Track how much has been spent vs budgeted",
      "Manage trip members and invitations",
      "Use the chatbot to navigate through options",
    ],
  },
  members: {
    message: "Team Members 👥",
    tips: [
      "View all members and their status (owner, joined, invited, pending)",
      "Click a member to see their shared expenses",
      "Invite new members by email",
      "Remove members you added to the trip",
      "Owner can manage all trip settings",
    ],
  },
  budget: {
    message: "Budget Items 💰",
    tips: [
      "View all planned expenses for your trip",
      "See which members share each expense",
      "Add new budget items to plan expenses",
      "Delete items you no longer need",
      "Budget shows total planned vs actual spending",
    ],
  },
  balance: {
    message: "Settlement & Balance 💸",
    tips: [
      "View who owes whom for shared expenses",
      "See detailed breakdown by member",
      "Understand expense splitting calculations",
      "View balance for each trip member",
      "Track unplanned vs planned spending",
    ],
  },
};

export function DashboardChatbot({
  tripName,
  memberCount,
  budgetItemCount,
  isOpen: externalIsOpen,
  onOpenChange,
}: DashboardChatbotProps) {
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
      const hint = DASHBOARD_HINTS.overview;
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
    const hint = DASHBOARD_HINTS[key as keyof typeof DASHBOARD_HINTS];
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
              <p className="text-xs text-muted-foreground font-semibold">What would you like help with?</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOptionClick("members")}
                  className="text-xs"
                >
                  👥 Members
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOptionClick("budget")}
                  className="text-xs"
                >
                  💰 Budget
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOptionClick("balance")}
                  className="text-xs"
                >
                  💸 Settlement
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
