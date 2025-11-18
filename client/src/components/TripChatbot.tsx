import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, X } from "lucide-react";
import type { Trip, BudgetItem, SpendingItem, Member } from "@shared/schema";

interface ChatMessage {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: number;
  options?: ChatOption[];
}

interface ChatOption {
  id: string;
  label: string;
  action: () => void;
  icon?: React.ReactNode;
}

interface TripChatbotProps {
  trip: Trip;
  budgetItems: BudgetItem[];
  spendingItems: SpendingItem[];
  onAddBudget: () => void;
  onDeleteBudget: (item: BudgetItem) => void;
  onAddSpending: (item: BudgetItem) => void;
  onInviteMembers: () => void;
  onViewBalance: () => void;
  onEditTrip: () => void;
  onDeleteTrip: () => void;
  onNavigateToSpending: () => void;
  onNavigateToBudget: () => void;
  onRemoveMember: (member: Member) => void;
  onExportPDF: () => void;
  showFloatingButton?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TripChatbot({
  trip,
  budgetItems,
  spendingItems,
  onAddBudget,
  onDeleteBudget,
  onAddSpending,
  onInviteMembers,
  onViewBalance,
  onEditTrip,
  onDeleteTrip,
  onNavigateToSpending,
  onNavigateToBudget,
  onRemoveMember,
  onExportPDF,
  showFloatingButton = true,
  isOpen: externalIsOpen,
  onOpenChange,
}: TripChatbotProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open);
    } else {
      setInternalIsOpen(open);
    }
  };
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentFlow, setCurrentFlow] = useState<string>("main");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      if (messages.length === 0) {
        showWelcomeMessage();
      }
    } else {
      setMessages([]);
      setCurrentFlow("main");
    }
  }, [isOpen]);

  const addMessage = (text: string, isBot: boolean, options?: ChatOption[]) => {
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      text,
      isBot,
      timestamp: Date.now(),
      options,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const showWelcomeMessage = () => {
    const totalBudget = budgetItems.reduce((sum, item) => sum + item.amount, 0);
    const totalSpent = spendingItems
      .filter(item => item.isCompleted)
      .reduce((sum, item) => sum + item.amount, 0);
    const remaining = totalBudget - totalSpent;

    addMessage(
      `Hello! I'm your travel assistant for "${trip.name}". How can I help you today?`,
      true,
      [
        {
          id: "budget-mgmt",
          label: "Budget Management",
          action: () => handleBudgetManagement(),
        },
        {
          id: "spending-mgmt",
          label: "Spending Management",
          action: () => handleSpendingManagement(),
        },
        {
          id: "member-mgmt",
          label: "Member Management",
          action: () => handleMemberManagement(),
        },
        {
          id: "view-balance",
          label: `View Balance (₹${remaining.toFixed(2)} remaining)`,
          action: () => handleViewBalance(),
        },
        {
          id: "trip-controls",
          label: "Trip Settings",
          action: () => handleTripControls(),
        },
        {
          id: "reports",
          label: "Reports & Export",
          action: () => handleReports(),
        },
      ]
    );
  };

  const handleBudgetManagement = () => {
    setCurrentFlow("budget");
    addMessage("What would you like to do with budgets?", true, [
      {
        id: "add-budget",
        label: "Add New Budget Item",
        action: () => {
          addMessage("Opening budget creation form...", true);
          setTimeout(() => {
            onAddBudget();
            setIsOpen(false);
          }, 500);
        },
      },
      {
        id: "view-budgets",
        label: "View All Budgets",
        action: () => {
          onNavigateToBudget();
          addMessage("Navigating to budget view...", true);
          setTimeout(() => setIsOpen(false), 500);
        },
      },
      {
        id: "delete-budget",
        label: "Delete Budget Item",
        action: () => handleDeleteBudget(),
      },
      {
        id: "back",
        label: "Back to Main Menu",
        action: () => backToMainMenu(),
      },
    ]);
  };

  const handleDeleteBudget = () => {
    if (budgetItems.length === 0) {
      addMessage("You don't have any budget items to delete yet.", true, [
        {
          id: "back",
          label: "Back to Budget Management",
          action: () => handleBudgetManagement(),
        },
      ]);
      return;
    }

    addMessage("Which budget item would you like to delete?", true,
      budgetItems.map((item) => ({
        id: `delete-${item.id}`,
        label: `${item.name} (₹${item.amount})`,
        action: () => {
          addMessage(`Opening confirmation dialog for "${item.name}"...`, true);
          onDeleteBudget(item);
          setTimeout(() => {
            addMessage("Please confirm or cancel the deletion in the dialog above.", true, [
              {
                id: "back",
                label: "Back to Main Menu",
                action: () => backToMainMenu(),
              },
            ]);
          }, 500);
        },
      })).concat([
        {
          id: "back",
          label: "Back to Budget Management",
          action: () => handleBudgetManagement(),
        },
      ])
    );
  };

  const handleSpendingManagement = () => {
    setCurrentFlow("spending");
    addMessage("What would you like to do with spending?", true, [
      {
        id: "add-spending",
        label: "Record New Spending",
        action: () => handleAddSpending(),
      },
      {
        id: "view-spending",
        label: "View All Spending",
        action: () => {
          addMessage("Navigating to spending page...", true);
          setTimeout(() => {
            onNavigateToSpending();
            setIsOpen(false);
          }, 500);
        },
      },
      {
        id: "back",
        label: "Back to Main Menu",
        action: () => backToMainMenu(),
      },
    ]);
  };

  const handleAddSpending = () => {
    if (budgetItems.length === 0) {
      addMessage("You need to create a budget item first before recording spending.", true, [
        {
          id: "create-budget",
          label: "Create Budget Item",
          action: () => {
            onAddBudget();
            setIsOpen(false);
          },
        },
        {
          id: "back",
          label: "Back to Main Menu",
          action: () => backToMainMenu(),
        },
      ]);
      return;
    }

    addMessage("Select a budget item to record spending against:", true,
      budgetItems.map((item) => ({
        id: `spend-${item.id}`,
        label: `${item.name} (₹${item.amount})`,
        action: () => {
          addMessage(`Opening spending form for "${item.name}"...`, true);
          setTimeout(() => {
            onAddSpending(item);
            setIsOpen(false);
          }, 500);
        },
      })).concat([
        {
          id: "back",
          label: "Back to Spending Management",
          action: () => handleSpendingManagement(),
        },
      ])
    );
  };

  const handleMemberManagement = () => {
    setCurrentFlow("members");
    addMessage("What would you like to do with members?", true, [
      {
        id: "invite",
        label: "Invite New Members",
        action: () => {
          addMessage("Opening invitation form...", true);
          setTimeout(() => {
            onInviteMembers();
            setIsOpen(false);
          }, 500);
        },
      },
      {
        id: "remove",
        label: "Remove Member",
        action: () => handleRemoveMember(),
      },
      {
        id: "view",
        label: "View All Members",
        action: () => {
          const memberList = trip.members.map(m => `${m.name} (${m.status})`).join(", ");
          addMessage(`Current members: ${memberList}`, true, [
            {
              id: "back",
              label: "Back to Member Management",
              action: () => handleMemberManagement(),
            },
          ]);
        },
      },
      {
        id: "back",
        label: "Back to Main Menu",
        action: () => backToMainMenu(),
      },
    ]);
  };

  const handleRemoveMember = () => {
    const removableMembers = trip.members.filter(m => m.status !== "owner");
    
    if (removableMembers.length === 0) {
      addMessage("There are no members that can be removed.", true, [
        {
          id: "back",
          label: "Back to Member Management",
          action: () => handleMemberManagement(),
        },
      ]);
      return;
    }

    addMessage("Which member would you like to remove?", true,
      removableMembers.map((member) => ({
        id: `remove-${member.id}`,
        label: `${member.name} (${member.status})`,
        action: () => {
          addMessage(`Opening confirmation dialog for ${member.name}...`, true);
          onRemoveMember(member);
          setTimeout(() => {
            addMessage("Please confirm or cancel the removal in the dialog above.", true, [
              {
                id: "back",
                label: "Back to Main Menu",
                action: () => backToMainMenu(),
              },
            ]);
          }, 500);
        },
      })).concat([
        {
          id: "back",
          label: "Back to Member Management",
          action: () => handleMemberManagement(),
        },
      ])
    );
  };

  const handleViewBalance = () => {
    const totalBudget = budgetItems.reduce((sum, item) => sum + item.amount, 0);
    const totalSpent = spendingItems
      .filter(item => item.isCompleted)
      .reduce((sum, item) => sum + item.amount, 0);
    const remaining = totalBudget - totalSpent;
    const percentageSpent = totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0;

    const balanceDetails = `
Balance Summary for "${trip.name}"

Total Budget: ₹${totalBudget.toFixed(2)}
Total Spent: ₹${totalSpent.toFixed(2)}
Remaining: ₹${remaining.toFixed(2)}
Spent: ${percentageSpent}%

${remaining < 0 ? "Warning: You've exceeded your budget!" : ""}
    `.trim();

    addMessage(balanceDetails, true, [
      {
        id: "view-detailed",
        label: "View Detailed Report",
        action: () => {
          onViewBalance();
          setIsOpen(false);
        },
      },
      {
        id: "back",
        label: "Back to Main Menu",
        action: () => backToMainMenu(),
      },
    ]);
  };

  const handleTripControls = () => {
    setCurrentFlow("trip");
    addMessage("Trip settings and controls:", true, [
      {
        id: "edit-trip",
        label: "✏️ Edit Trip Details",
        action: () => {
          addMessage("Trip editing is coming soon!", true, [
            {
              id: "back",
              label: "⬅️ Back to Trip Settings",
              action: () => handleTripControls(),
            },
          ]);
        },
      },
      {
        id: "delete-trip",
        label: "🗑️ Delete Trip",
        action: () => {
          addMessage(
            `⚠️ Are you sure you want to delete "${trip.name}"? This action cannot be undone.`,
            true,
            [
              {
                id: "confirm-delete",
                label: "✅ Yes, Delete Trip",
                action: () => {
                  addMessage("Deleting trip...", true);
                  setTimeout(() => {
                    onDeleteTrip();
                    setIsOpen(false);
                  }, 500);
                },
              },
              {
                id: "cancel-delete",
                label: "❌ Cancel",
                action: () => handleTripControls(),
              },
            ]
          );
        },
      },
      {
        id: "back",
        label: "⬅️ Back to Main Menu",
        action: () => backToMainMenu(),
      },
    ]);
  };

  const handleReports = () => {
    setCurrentFlow("reports");
    addMessage("Reports and exports:", true, [
      {
        id: "export-pdf",
        label: "📄 Export Trip as PDF",
        action: async () => {
          addMessage("Generating PDF report...", true);
          try {
            await onExportPDF();
            addMessage("Check your downloads for the PDF report!", true, [
              {
                id: "back",
                label: "⬅️ Back to Main Menu",
                action: () => backToMainMenu(),
              },
            ]);
          } catch (error) {
            addMessage("There was an error generating the PDF. Please try again.", true, [
              {
                id: "back",
                label: "⬅️ Back to Main Menu",
                action: () => backToMainMenu(),
              },
            ]);
          }
        },
      },
      {
        id: "view-summary",
        label: "📊 View Spending Summary",
        action: () => {
          handleViewBalance();
        },
      },
      {
        id: "back",
        label: "⬅️ Back to Main Menu",
        action: () => backToMainMenu(),
      },
    ]);
  };

  const backToMainMenu = () => {
    setCurrentFlow("main");
    setMessages([]);
    showWelcomeMessage();
  };

  const handleOptionClick = (option: ChatOption) => {
    addMessage(option.label, false);
    option.action();
  };

  return createPortal(
    <>
      {showFloatingButton && (
        <Button
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40 bg-blue-600 hover:bg-blue-700 text-white transition-all"
          data-testid="button-chatbot-open"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {isOpen && (
        <Card className="fixed bottom-6 right-6 shadow-2xl z-50 flex flex-col border border-blue-200 bg-blue-50"
          style={{
            width: 'min(calc(100vw - 48px), 420px)',
            height: 'min(60vh, 600px)',
            maxHeight: '80vh'
          }}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2 sm:pb-4 px-3 sm:px-6 py-2 sm:py-3 border-b border-blue-700 bg-blue-600 text-white flex-shrink-0">
            <CardTitle className="text-base sm:text-lg text-white truncate">Trip Assistant</CardTitle>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              data-testid="button-chatbot-close"
              className="text-white hover:bg-blue-500/40 h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 sm:space-y-4 bg-blue-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isBot ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-2 sm:p-3 ${
                    message.isBot
                      ? "bg-muted text-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{message.text}</p>
                  {message.options && message.options.length > 0 && (
                    <div className="mt-2 sm:mt-3 space-y-1 sm:space-y-2">
                      {message.options.map((option) => (
                        <Button
                          key={option.id}
                          variant="outline"
                          size="sm"
                          onClick={() => handleOptionClick(option)}
                          className="w-full justify-start text-left text-xs sm:text-sm py-1 sm:py-2 px-2 sm:px-3 h-auto"
                          data-testid={`button-chat-option-${option.id}`}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </CardContent>
        </Card>
      )}
    </>,
    document.body
  );
}
