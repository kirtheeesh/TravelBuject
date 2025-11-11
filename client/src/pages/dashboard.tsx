import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Calendar, IndianRupee, LogIn, Trash2, Download, Receipt, LogOut, Share2, Copy, Check, Pencil, UserCog, MessageCircle } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Trip, BudgetItem, SpendingItem, Member } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { subscribeToTrip, subscribeToBudgetItems, subscribeToSpendingItems, deleteBudgetItem, deleteTrip, addSpendingItem, updateSpendingItem, inviteMembers, leaveTrip, removeTripMember, joinTrip, updateTripMember } from "@/lib/mongodb-operations";
import { useEffect, useState, useRef, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { generateTripPDF } from "@/lib/generate-trip-pdf";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { TripChatbot } from "@/components/TripChatbot";

const MEMBER_COLORS = ["bg-red-500", "bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-purple-500", "bg-pink-500", "bg-indigo-500", "bg-teal-500"];
const LIGHT_MEMBER_COLORS = ["bg-yellow-500"]; // Colors that need dark text for contrast
const CHART_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

const CATEGORY_COLORS: Record<string, string> = {
  Food: CHART_COLORS[0],
  Accommodation: CHART_COLORS[1],
  Transport: CHART_COLORS[2],
  Entertainment: CHART_COLORS[3],
  Shopping: CHART_COLORS[4],
  Miscellaneous: CHART_COLORS[0],
};

export default function Dashboard() {
  const [, params] = useRoute("/dashboard/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isExploring, signInWithGoogle } = useAuth();
  const tripId = params?.id;
  
  const [trip, setTrip] = useState<Trip | null>(null);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [spendingItems, setSpendingItems] = useState<SpendingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<BudgetItem | null>(null);
  const [showDeleteItemDialog, setShowDeleteItemDialog] = useState(false);
  const [itemToSpend, setItemToSpend] = useState<BudgetItem | null>(null);
  const [showSpendDialog, setShowSpendDialog] = useState(false);
  const [isSpending, setIsSpending] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [invitationCodes, setInvitationCodes] = useState<Array<{ name: string; email?: string; code: string }>>([]);
  const [showInvitationCodesDialog, setShowInvitationCodesDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinCodeCopied, setJoinCodeCopied] = useState(false);
  const [showRemoveMemberDialog, setShowRemoveMemberDialog] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Trip["members"][number] | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const [showRenameMemberDialog, setShowRenameMemberDialog] = useState(false);
  const [memberToRename, setMemberToRename] = useState<Trip["members"][number] | null>(null);
  const [renameMemberName, setRenameMemberName] = useState("");
  const [isRenamingMember, setIsRenamingMember] = useState(false);
  const [showChangeStatusDialog, setShowChangeStatusDialog] = useState(false);
  const [memberToChangeStatus, setMemberToChangeStatus] = useState<Trip["members"][number] | null>(null);
  const [newMemberStatus, setNewMemberStatus] = useState<Member['status'] | undefined>(undefined);
  const [isChangingMemberStatus, setIsChangingMemberStatus] = useState(false);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [showRecordSpendingDialog, setShowRecordSpendingDialog] = useState(false);
  const [selectedBudgetItem, setSelectedBudgetItem] = useState<BudgetItem | null>(null);
  const [spendingAmount, setSpendingAmount] = useState("");

  const [isRecordingSpending, setIsRecordingSpending] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const isInitialMount = useRef(true);

  const currentMember = trip?.members.find((member) => member.email === user?.email);
  const isCurrentUserOwner = currentMember?.status === "owner";
  const isCurrentUserOrganizer = currentMember?.status === "owner" || currentMember?.status === "co-organizer";

  const defaultInvitationCodes = useMemo(() => {
    if (!trip) return [] as Array<{ name: string; email?: string; code: string }>;
    return trip.members
      .filter((member) => member.status === "invited" && member.invitationCode)
      .map((member) => ({
        name: member.name,
        email: member.email,
        code: member.invitationCode as string,
      }));
  }, [trip]);

  const activeInvitationCodes = invitationCodes.length > 0 ? invitationCodes : defaultInvitationCodes;

  // Calculate remaining balance for a budget item
  const getRemainingBalance = (budgetItem: BudgetItem) => {
    const spentAmount = spendingItems
      .filter(item => item.isCompleted && (
        item.budgetItemId === budgetItem.id ||
        (!item.budgetItemId && item.name.toLowerCase() === budgetItem.name.toLowerCase())
      ))
      .reduce((sum, item) => sum + item.amount, 0);
    return budgetItem.amount - spentAmount;
  };

  // Real-time listener for trip
  useEffect(() => {
    if (!tripId) {
      setIsLoading(false);
      return;
    }

    if (isExploring) {
      const exploreTrips = localStorage.getItem("exploreTripData");
      if (exploreTrips) {
        try {
          const trips = JSON.parse(exploreTrips) as Trip[];
          const foundTrip = trips.find(t => t.id === tripId);
          setTrip(foundTrip || null);
          setBudgetItems(foundTrip?.budgetItems || []);
        } catch (error) {
          console.error("Error parsing explore trips:", error);
          setTrip(null);
        }
      }
      setIsLoading(false);
      return;
    }

    // Subscribe to trip updates
    const unsubscribe = subscribeToTrip(
      tripId,
      (updatedTrip) => {
        setTrip(updatedTrip);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error loading trip:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [tripId, isExploring]);

  // Real-time listener for budget items with notifications
  useEffect(() => {
    if (!tripId || isExploring) return;

    const unsubscribe = subscribeToBudgetItems(
      tripId,
      (updatedItems, changes) => {
        setBudgetItems(updatedItems);
        
        // Show notifications for new items (skip on initial load)
        if (!isInitialMount.current && changes?.added && changes.added.length > 0) {
          changes.added.forEach((item) => {
            toast({
              title: "Budget Added",
              description: `${item.name}: ₹${item.amount.toFixed(2)}`,
              duration: 4000,
            });
          });
        }
        
        if (isInitialMount.current) {
          isInitialMount.current = false;
        }
      },
      (error) => {
        console.error("Error loading budget items:", error);
      }
    );

    return () => unsubscribe();
  }, [tripId, isExploring, toast]);

  // Real-time listener for spending items
  useEffect(() => {
    if (!tripId || isExploring) return;

    const unsubscribe = subscribeToSpendingItems(
      tripId,
      (updatedItems, changes) => {
        // Replace local state with server data (removes optimistic updates)
        setSpendingItems(updatedItems);

        // Show notifications for new spending items (skip on initial load and optimistic updates)
        if (!isInitialMount.current && changes?.added && changes.added.length > 0) {
          changes.added.forEach((item) => {
            // Skip notifications for optimistic items that were just confirmed
            if (!item.id.startsWith('temp-')) {
              toast({
                title: "Spending Recorded",
                description: `${item.name}: ₹${item.amount.toFixed(2)}`,
                duration: 4000,
              });
            }
          });
        }
      },
      (error) => {
        console.error("Error loading spending items:", error);
      }
    );

    return () => unsubscribe();
  }, [tripId, isExploring, toast]);

  const deleteItemMutation = useMutation({
    mutationFn: async (item: BudgetItem) => {
      if (!tripId) throw new Error("Trip ID is required");
      if (isExploring) {
        const exploreTrips = localStorage.getItem("exploreTripData");
        if (exploreTrips) {
          const trips = JSON.parse(exploreTrips) as Trip[];
          const tripIndex = trips.findIndex(t => t.id === tripId);
          if (tripIndex !== -1) {
            trips[tripIndex].budgetItems = trips[tripIndex].budgetItems?.filter(
              (i) => i.id !== item.id
            ) || [];
            localStorage.setItem("exploreTripData", JSON.stringify(trips));
          }
        }
      } else {
        await deleteBudgetItem(tripId, item.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgetItems", tripId] });
      toast({
        title: "Budget item deleted",
        description: "The budget item has been successfully deleted.",
      });
      setShowDeleteItemDialog(false);
      setItemToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteTrip = async () => {
    setIsDeleting(true);
    try {
      if (isExploring) {
        const exploreTrips = localStorage.getItem("exploreTripData");
        if (exploreTrips) {
          const trips = JSON.parse(exploreTrips) as Trip[];
          const updatedTrips = trips.filter(t => t.id !== tripId);
          localStorage.setItem("exploreTripData", JSON.stringify(updatedTrips));
        }
      } else {
        await deleteTrip(tripId!);
      }

      toast({
        title: "Trip deleted",
        description: "The trip has been successfully deleted.",
      });
      setShowDeleteDialog(false);
      setLocation("/home");
    } catch (error: any) {
      toast({
        title: "Failed to delete trip",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyJoinCode = async () => {
    if (!trip?.joinCode) {
      return;
    }
    try {
      await navigator.clipboard.writeText(trip.joinCode);
      setJoinCodeCopied(true);
      setTimeout(() => setJoinCodeCopied(false), 2000);
    } catch (error: any) {
      toast({
        title: "Failed to copy code",
        description: error?.message || "Copy the code manually.",
        variant: "destructive",
      });
    }
  };

  const handleInviteMember = () => {
    if (!tripId || !inviteName.trim() || !inviteEmail.trim()) {
      toast({
        title: "Invalid input",
        description: "Please provide both name and email.",
        variant: "destructive",
      });
      return;
    }

    setIsInviting(true);
    inviteMembers(tripId, [{ name: inviteName.trim(), email: inviteEmail.trim() }])
      .then((result) => {
        toast({
          title: "Member invited",
          description: "Invitation sent successfully.",
        });
        setInvitationCodes(result.invitationCodes);
        setInviteName("");
        setInviteEmail("");
        setShowInviteDialog(false);
        setShowInvitationCodesDialog(true);
      })
      .catch((error: any) => {
        toast({
          title: "Failed to invite member",
          description: error.message,
          variant: "destructive",
        });
      })
      .finally(() => {
        setIsInviting(false);
      });
  };

  const handleJoinTrip = async () => {
    if (!joinCode.trim()) {
      toast({
        title: "Invalid input",
        description: "Please enter a joining code.",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);
    try {
      const result = await joinTrip(joinCode.trim());
      toast({
        title: "Joined trip successfully!",
        description: `You have joined "${result.tripName}".`,
      });
      setJoinCode("");
      setShowJoinDialog(false);
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Failed to join trip",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  // Calculate statistics
  const totalBudgeted = budgetItems.reduce((sum, item) => sum + item.amount, 0);
  const totalSpent = spendingItems
    .filter(item => item.isCompleted)
    .reduce((sum, item) => sum + item.amount, 0);
  const remainingBudget = totalBudgeted - totalSpent;

  // Category breakdown for pie chart (budget data)
  const categoryData = Object.entries(
    budgetItems.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.amount;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  // Member spending and budget calculations
  const memberData = trip?.members.map((member) => {
    const budgeted = budgetItems
      .filter(item => item.memberIds.includes(member.id))
      .reduce((sum, item) => sum + item.amount / item.memberIds.length, 0);

    const spent = spendingItems
      .filter(item => item.isCompleted && item.memberIds.includes(member.id))
      .reduce((sum, item) => sum + item.amount / item.memberIds.length, 0);

    const remaining = budgeted - spent;

    return {
      name: member.name,
      budgeted,
      spent,
      remaining
    };
  }) || [];

  // Member remaining balance for bar chart (budgeted - spent)
  const memberSpending = memberData.map(member => ({
    name: member.name,
    amount: member.remaining
  }));

  const handleAddMore = () => {
    setLocation(`/trip/${tripId}/add-items`);
  };

  const handleLeaveTrip = async () => {
    if (isExploring) return;
    if (!trip || !tripId) return;
    setIsLeaving(true);
    try {
      if (!currentMember?.id) {
        throw new Error("Member record not found");
      }
      await leaveTrip(tripId, currentMember.id);
      toast({
        title: "You left the trip",
        description: `You are no longer part of "${trip.name}".`,
      });
      setShowLeaveDialog(false);
      setLocation("/home");
    } catch (error: any) {
      toast({
        title: "Failed to leave",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLeaving(false);
    }
  };

  const handleRemoveMember = (member: Trip["members"][number]) => {
    if (isExploring) return;
    if (member.status === "owner" || member.id === currentMember?.id || !member.id) {
      return;
    }
    setMemberToRemove(member);
    setShowRemoveMemberDialog(true);
  };

  const handleRenameMember = (member: Trip["members"][number]) => {
    if (isExploring || !member.id) {
      return;
    }
    setMemberToRename(member);
    setRenameMemberName(member.name || "");
    setShowRenameMemberDialog(true);
  };

  const handleChangeMemberStatus = (member: Trip["members"][number]) => {
    if (isExploring || !member.id || member.status === "owner") {
      return;
    }
    setMemberToChangeStatus(member);
    setNewMemberStatus(member.status);
    setShowChangeStatusDialog(true);
  };

  const handleConfirmRenameMember = async () => {
    if (!tripId || !memberToRename || !memberToRename.id) {
      return;
    }
    const trimmedName = renameMemberName.trim();
    if (!trimmedName) {
      toast({
        title: "Invalid name",
        description: "Member name cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    setIsRenamingMember(true);
    try {
      const updatedMember = await updateTripMember(tripId, memberToRename.id, { name: trimmedName });
      setTrip(prev => prev ? { ...prev, members: prev.members.map((member) => member.id === updatedMember.id ? updatedMember : member) } : prev);
      toast({
        title: "Member updated",
        description: `${trimmedName} has been updated.`,
      });
      setShowRenameMemberDialog(false);
      setMemberToRename(null);
      setRenameMemberName("");
    } catch (error: any) {
      toast({
        title: "Failed to update member",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRenamingMember(false);
    }
  };

  const handleConfirmRemoveMember = async () => {
    if (!tripId || !memberToRemove) return;
    setIsRemovingMember(true);
    try {
      await removeTripMember(tripId, memberToRemove.id);
      toast({
        title: "Member removed",
        description: `${memberToRemove.name} has been removed from "${trip?.name}".`,
      });
      setShowRemoveMemberDialog(false);
      setMemberToRemove(null);
    } catch (error: any) {
      toast({
        title: "Failed to remove member",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRemovingMember(false);
    }
  };

  const handleConfirmChangeMemberStatus = async () => {
    if (!tripId || !memberToChangeStatus || !memberToChangeStatus.id) {
      return;
    }
    setIsChangingMemberStatus(true);
    try {
      const updatedMember = await updateTripMember(tripId, memberToChangeStatus.id, { name: memberToChangeStatus.name, status: newMemberStatus! });
      setTrip(prev => prev ? { ...prev, members: prev.members.map((member) => member.id === updatedMember.id ? updatedMember : member) } : prev);
      toast({
        title: "Member status updated",
        description: `${memberToChangeStatus.name} is now a ${newMemberStatus === "co-organizer" ? "co-organizer" : newMemberStatus}.`,
      });
      setShowChangeStatusDialog(false);
      setMemberToChangeStatus(null);
      setNewMemberStatus(undefined);
    } catch (error: any) {
      toast({
        title: "Failed to update member status",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsChangingMemberStatus(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!trip) return;

    try {
      generateTripPDF({
        trip,
        budgetItems,
      });

      toast({
        title: "PDF downloaded",
        description: "Your trip report has been downloaded successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to generate PDF",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleMarkAsSpent = (budgetItem: BudgetItem, isSpent: boolean) => {
    if (!tripId || isExploring) return;

    if (isSpent) {
      // Directly mark as spent without confirmation dialog
      handleConfirmSpend(budgetItem);
    } else {
      // Directly unmark as spent (no confirmation needed for unchecking)
      handleConfirmUnspend(budgetItem);
    }
  };

  const handleConfirmSpend = async (budgetItem?: BudgetItem) => {
    const itemToProcess = budgetItem || itemToSpend;
    if (!itemToProcess || !tripId) return;

    setIsSpending(true);

    // Optimistic update - immediately update local state
    const existingSpendingItem = spendingItems.find(item => item.budgetItemId === itemToProcess.id);
    if (existingSpendingItem) {
      // Update existing item to completed
      setSpendingItems(prev => prev.map(item =>
        item.id === existingSpendingItem.id
          ? { ...item, isCompleted: true }
          : item
      ));
    } else {
      // Create optimistic spending item
      const optimisticItem: SpendingItem = {
        id: `temp-${Date.now()}`,
        tripId,
        budgetItemId: itemToProcess.id,
        name: itemToProcess.name,
        amount: itemToProcess.amount,
        category: itemToProcess.category,
        memberIds: itemToProcess.memberIds,
        createdAt: Date.now(),
        isCompleted: true,
      };
      setSpendingItems(prev => [...prev, optimisticItem]);
    }

    try {
      if (existingSpendingItem) {
        // Mark as completed
        await updateSpendingItem(tripId, existingSpendingItem.id, { isCompleted: true });
      } else {
        // Create new spending item
        await addSpendingItem(tripId, {
          budgetItemId: itemToProcess.id,
          name: itemToProcess.name,
          amount: itemToProcess.amount,
          category: itemToProcess.category,
          memberIds: itemToProcess.memberIds,
        });
      }

      // Close dialog immediately after success (only if using dialog)
      if (!budgetItem) {
        setShowSpendDialog(false);
        setItemToSpend(null);
      }
    } catch (error: any) {
      // Revert optimistic update on error
      if (existingSpendingItem) {
        setSpendingItems(prev => prev.map(item =>
          item.id === existingSpendingItem.id
            ? { ...item, isCompleted: false }
            : item
        ));
      } else {
        setSpendingItems(prev => prev.filter(item => !item.id.startsWith('temp-')));
      }

      toast({
        title: "Failed to mark as spent",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSpending(false);
    }
  };

  const handleConfirmUnspend = async (budgetItem: BudgetItem) => {
    if (!tripId) return;

    // Optimistic update - immediately update local state
    const spendingItem = spendingItems.find(item => item.budgetItemId === budgetItem.id);
    if (spendingItem) {
      setSpendingItems(prev => prev.map(item =>
        item.id === spendingItem.id
          ? { ...item, isCompleted: false }
          : item
      ));
    }

    try {
      if (spendingItem) {
        await updateSpendingItem(tripId, spendingItem.id, { isCompleted: false });
      }

      toast({
        title: "Item unmarked as spent",
        description: `${budgetItem.name} has been unmarked.`,
      });
    } catch (error: any) {
      // Revert optimistic update on error
      if (spendingItem) {
        setSpendingItems(prev => prev.map(item =>
          item.id === spendingItem.id
            ? { ...item, isCompleted: true }
            : item
        ));
      }

      toast({
        title: "Failed to unmark as spent",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 md:px-8">
          <Skeleton className="mb-8 h-12 w-64" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </main>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 md:px-8">
          <Card>
            <CardContent className="py-16 text-center">
              <h3 className="mb-2 text-xl font-semibold">Trip not found</h3>
              <p className="mb-6 text-muted-foreground">This trip doesn't exist or you don't have access to it.</p>
              <Button onClick={() => setLocation("/home")}>Back to Home</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 md:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              className="gap-2"
              onClick={() => setLocation("/home")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Trips
            </Button>

            <div className="flex items-center gap-2">
              {trip && !isLoading && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsChatbotOpen(true)}
                  data-testid="button-chatbot-header"
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
              )}
              {isCurrentUserOrganizer && !isExploring && (
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={isGeneratingShare}
                  onClick={async () => {
                    if (!tripId) return;
                    if (invitationCodes.length === 0 && defaultInvitationCodes.length === 0) {
                      try {
                        setIsGeneratingShare(true);
                        const placeholderName = trip?.name ? `${trip.name} Guest` : "Trip Member";
                        const result = await inviteMembers(tripId, [{ name: placeholderName }]);
                        const codes = result.invitationCodes || [];
                        if (codes.length === 0) {
                          toast({
                            title: "Unable to create link",
                            description: "Please try again in a moment.",
                            variant: "destructive",
                          });
                        } else {
                          setInvitationCodes(codes);
                          setShowInvitationCodesDialog(true);
                        }
                      } catch (error: any) {
                        toast({
                          title: "Failed to generate link",
                          description: error.message || "Unknown error occurred",
                          variant: "destructive",
                        });
                      } finally {
                        setIsGeneratingShare(false);
                      }
                      return;
                    }
                    if (invitationCodes.length === 0 && defaultInvitationCodes.length > 0) {
                      setInvitationCodes(defaultInvitationCodes);
                    }
                    setShowInvitationCodesDialog(true);
                  }}
                >
                  <Share2 className="h-4 w-4" />
                  {isGeneratingShare ? "Generating..." : "Invite by Share"}
                </Button>
              )}
              <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <LogIn className="h-4 w-4 mr-2" />
                    Join Trip
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Join a Trip</DialogTitle>
                    <DialogDescription>
                      Enter the invitation code you received to join a trip.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="join-code">Invitation Code</Label>
                      <Input
                        id="join-code"
                        placeholder="Enter invitation code"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowJoinDialog(false)}
                        disabled={isJoining}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleJoinTrip} disabled={isJoining}>
                        {isJoining ? "Joining..." : "Join Trip"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Dialog
              open={showInvitationCodesDialog}
              onOpenChange={(open) => {
                if (!open) {
                  setInvitationCodes([]);
                }
                setShowInvitationCodesDialog(open);
              }}
            >
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Invitation Links</DialogTitle>
                  <DialogDescription>
                    Share these links with anyone you’d like to join your trip.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {activeInvitationCodes.length === 0 && (
                    <div className="p-4 border rounded-lg text-sm text-muted-foreground">
                      No pending invitations. Add members to generate invitation links.
                    </div>
                  )}
                  {activeInvitationCodes.map((invitation, index) => {
                    const invitationUrl = `https://bktravelbud.onrender.com/invite/${invitation.code}`;
                    return (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="font-medium">Shareable Link {index + 1}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Anyone with this link can join "{trip?.name}" after signing in.
                        </div>
                        <div className="mt-3 p-2 bg-gray-100 rounded text-sm font-mono break-all">
                          {invitationUrl}
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              navigator.clipboard.writeText(invitationUrl);
                              toast({
                                title: "Copied!",
                                description: "Invitation link copied to clipboard.",
                              });
                            }}
                          >
                            Copy Link
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              if (navigator.share) {
                                navigator.share({
                                  title: `Join ${trip?.name} Trip`,
                                  text: `You've been invited to join the "${trip?.name}" trip. Click the link to join:`,
                                  url: invitationUrl,
                                });
                              } else {
                                navigator.clipboard.writeText(invitationUrl);
                                toast({
                                  title: "Link copied!",
                                  description: "Share this link with anyone you'd like to invite.",
                                });
                              }
                            }}
                          >
                            Share
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex justify-end">
                    <Button onClick={() => setShowInvitationCodesDialog(false)}>
                      Done
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Invitation Code Display */}
          {trip.joinCode && (
            <div className="mb-6 p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-medium">
                    Your invitation code is: <span className="font-bold text-xl tracking-wider">{trip.joinCode}</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Share this code with others to let them join your trip with their name and email.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 ml-4"
                  onClick={handleCopyJoinCode}
                  disabled={joinCodeCopied}
                >
                  {joinCodeCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {joinCodeCopied ? "Copied!" : "Copy Code"}
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold">{trip.name}</h1>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {new Date(trip.createdAt).toLocaleDateString()}
                </span>
                <div className="flex flex-col gap-1">
                  <div className="text-sm font-medium">Trip Budget Overview</div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      <span className="font-medium text-green-700">₹{totalSpent.toFixed(2)} spent</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                      <span className="font-medium text-blue-700">₹{totalBudgeted.toFixed(2)} budgeted</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <div className={`h-2 w-2 rounded-full ${remainingBudget >= 0 ? 'bg-orange-500' : 'bg-red-500'}`}></div>
                      <span className={`font-medium ${remainingBudget >= 0 ? 'text-orange-700' : 'text-red-700'}`}>
                        ₹{Math.abs(remainingBudget).toFixed(2)} {remainingBudget >= 0 ? 'remaining' : 'over budget'}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button className="gap-2 w-full sm:w-auto" onClick={handleAddMore} data-testid="button-add-budget">
                <Plus className="h-4 w-4" />
                Add Budget Items
              </Button>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  variant="outline"
                  className="gap-2 flex-1 sm:flex-none"
                  onClick={() => setLocation(`/spending/${tripId}`)}
                  data-testid="button-view-spending"
                >
                  <IndianRupee className="h-4 w-4" />
                  <span className="hidden sm:inline">View Spending</span>
                  <span className="sm:hidden">Spending</span>
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 flex-1 sm:flex-none"
                  onClick={handleDownloadPDF}
                  data-testid="button-download-pdf"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Download PDF</span>
                  <span className="sm:hidden">PDF</span>
                </Button>
                {!isExploring && (
                  <Button
                    variant="outline"
                    className="gap-2 flex-1 sm:flex-none"
                    onClick={() => setShowLeaveDialog(true)}
                    disabled={isLeaving}
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">{isLeaving ? "Leaving..." : "Leave Trip"}</span>
                    <span className="sm:hidden">{isLeaving ? "Leaving..." : "Leave"}</span>
                  </Button>
                )}
                <Button
                  variant="destructive"
                  className="gap-2 flex-1 sm:flex-none"
                  onClick={() => setShowDeleteDialog(true)}
                  data-testid="button-delete-trip"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Delete Trip</span>
                  <span className="sm:hidden">Delete</span>
                </Button>
              </div>
            </div>
          </div>
        </div>



        {/* Members */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Trip Members</CardTitle>
              <div className="flex items-center gap-2">
                {isCurrentUserOrganizer && !isExploring && defaultInvitationCodes.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setInvitationCodes(defaultInvitationCodes);
                      setShowInvitationCodesDialog(true);
                    }}
                  >
                    View Invitation Links
                  </Button>
                )}
                <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Invite Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite New Member</DialogTitle>
                    <DialogDescription>
                      Add a new member to your trip using their Google account email.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="invite-name">Name</Label>
                      <Input
                        id="invite-name"
                        placeholder="Enter member's name"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="invite-email">Google Email</Label>
                      <Input
                        id="invite-email"
                        type="email"
                        placeholder="member@gmail.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowInviteDialog(false)}
                        disabled={isInviting}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleInviteMember} disabled={isInviting}>
                        {isInviting ? "Inviting..." : "Send Invitation"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {trip.members.map((member, idx) => {
                const memberInfo = memberData[idx];
                const canRemoveMember = Boolean(
                  isCurrentUserOrganizer &&
                  !isExploring &&
                  member.status !== "owner" &&
                  member.id &&
                  member.id !== currentMember?.id
                );
                const canRenameMember = Boolean(
                  isCurrentUserOrganizer &&
                  !isExploring &&
                  member.id
                );
                return (
                  <div key={member.id ?? idx} className="flex items-start gap-3 p-3 border rounded-lg bg-card">
                    <Avatar className={`h-8 w-8 ${member.color}`}>
                      <AvatarFallback className={`${LIGHT_MEMBER_COLORS.includes(member.color) ? 'text-black' : 'text-white'} text-sm font-semibold`}>
                        {member.name?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{member.name}</p>
                        {member.status === "owner" && (
                          <span className="text-xs bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-full">
                            Owner
                          </span>
                        )}
                        {member.status === "co-organizer" && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                            Co-organizer
                          </span>
                        )}
                        {member.status === "invited" && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full">
                            Invited
                          </span>
                        )}
                        {member.status === "joined" && (
                          <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">
                            Joined
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <div className="flex justify-between">
                          <span>Budget:</span>
                          <span>₹{memberInfo?.budgeted.toFixed(2) || "0.00"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Spent:</span>
                          <span>₹{memberInfo?.spent.toFixed(2) || "0.00"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={memberInfo?.remaining < 0 ? "text-red-500" : ""}>Remaining:</span>
                          <span className={memberInfo?.remaining < 0 ? "text-red-500" : ""}>
                            ₹{memberInfo?.remaining.toFixed(2) || "0.00"}
                          </span>
                        </div>
                      </div>
                    </div>
                    {(canRenameMember || canRemoveMember || (isCurrentUserOwner && member.status !== "owner")) && (
                      <div className="ml-auto flex items-start gap-1">
                        {canRenameMember && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleRenameMember(member)}
                            aria-label={`Rename ${member.name}`}
                            disabled={isRenamingMember}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                        {isCurrentUserOwner && member.status !== "owner" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleChangeMemberStatus(member)}
                            aria-label={`Change status for ${member.name}`}
                            disabled={isChangingMemberStatus}
                          >
                            <UserCog className="h-3 w-3" />
                          </Button>
                        )}
                        {canRemoveMember && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="self-start text-destructive hover:text-destructive h-6 w-6"
                            onClick={() => handleRemoveMember(member)}
                            aria-label={`Remove ${member.name}`}
                            disabled={isRemovingMember}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        {budgetItems.length > 0 && (
          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            {/* Pie Chart - Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Budget by Category</CardTitle>
                <CardDescription>Planned budget breakdown by expense type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || CHART_COLORS[0]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Bar Chart - Member Balance */}
            <Card>
              <CardHeader>
                <CardTitle>Member Balance</CardTitle>
                <CardDescription>Remaining budget balance for each member</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={memberSpending}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                    <Bar dataKey="amount" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Remaining Budget Items */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Remaining Budget Items</CardTitle>
            <CardDescription>
              Budget items that still have remaining balance to spend.
              <span className="block mt-1 text-xs">
                💡 <strong>Tip:</strong> These items haven't been fully spent yet. Use "Record" to add spending.
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {budgetItems.filter(item => getRemainingBalance(item) > 0).length === 0 ? (
              <div className="py-12 text-center">
                <p className="mb-4 text-muted-foreground">All budget items are fully spent!</p>
                <p className="text-sm text-muted-foreground">Great job staying within your budget.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="hidden sm:table-cell">Date Added</TableHead>
                      <TableHead>Expense Item</TableHead>
                      <TableHead className="hidden md:table-cell">Category</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead className="hidden lg:table-cell">Who's Paying</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Each Pays</TableHead>
                      <TableHead className="text-center">Record Spending</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {budgetItems
                      .filter(item => getRemainingBalance(item) > 0)
                      .sort((a, b) => b.amount - a.amount)
                      .map((item) => (
                        <TableRow key={item.id} data-testid={`row-remaining-budget-item-${item.id}`}>
                          <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                              <div className="flex items-center gap-2">
                                <span>{item.name}</span>
                                {item.isUnplanned && (
                                  <span className="inline-flex items-center rounded-full bg-orange-100 text-orange-800 px-2 py-0.5 text-xs font-medium">
                                    Unplanned
                                  </span>
                                )}
                              </div>
                              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium sm:hidden">
                                {item.category}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                              {item.category}
                            </span>
                          </TableCell>
                          <TableCell className="font-semibold">
                            <span className={`text-sm ${getRemainingBalance(item) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ₹{getRemainingBalance(item).toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex -space-x-2">
                              {item.memberIds.map((memberId) => {
                                const member = trip.members.find((m) => m.id === memberId);
                                return member ? (
                                  <Avatar key={memberId} className={`h-7 w-7 border-2 border-background ${member.color}`}>
                                    <AvatarFallback className="text-xs text-white">
                                      {member.name?.charAt(0)?.toUpperCase() || "?"}
                                    </AvatarFallback>
                                  </Avatar>
                                ) : null;
                              })}
                            </div>
                          </TableCell>
                          <TableCell className="text-right hidden sm:table-cell">
                            ₹{(item.amount / item.memberIds.length).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedBudgetItem(item);
                                setSpendingAmount("");
                                setShowRecordSpendingDialog(true);
                              }}
                              disabled={isExploring}
                            >
                              Record
                            </Button>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setItemToDelete(item);
                                setShowDeleteItemDialog(true);
                              }}
                              disabled={deleteItemMutation.isPending}
                              data-testid={`button-delete-remaining-item-${item.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actual Budgeted Items */}
        <Card>
          <CardHeader>
            <CardTitle>Actual Budgeted Items</CardTitle>
            <CardDescription>
              Complete list of all budgeted items - both planned at trip start and unplanned expenses added during the trip.
              <span className="block mt-1 text-xs">
                💡 <strong>Tip:</strong> Use the "Remaining Budget Items" section above to record spending.
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {budgetItems.length === 0 ? (
              <div className="py-12 text-center">
                <p className="mb-4 text-muted-foreground">No budgeted items yet</p>
                <Button onClick={handleAddMore} data-testid="button-add-first-budget">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Budget Item
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="hidden sm:table-cell">Date Added</TableHead>
                      <TableHead>Expense Item</TableHead>
                      <TableHead className="hidden md:table-cell">Category</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead className="hidden lg:table-cell">Who's Paying</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Each Pays</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {budgetItems
                      .sort((a, b) => {
                        // First sort by category, then by created date (newest first within category)
                        if (a.category !== b.category) {
                          return a.category.localeCompare(b.category);
                        }
                        return b.createdAt - a.createdAt;
                      })
                      .map((item) => (
                        <TableRow key={item.id} data-testid={`row-budget-item-${item.id}`}>
                          <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                              <div className="flex items-center gap-2">
                                <span>{item.name}</span>
                                {item.isUnplanned && (
                                  <span className="inline-flex items-center rounded-full bg-orange-100 text-orange-800 px-2 py-0.5 text-xs font-medium">
                                    Unplanned
                                  </span>
                                )}
                              </div>
                              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium sm:hidden">
                                {item.category}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                              {item.category}
                            </span>
                          </TableCell>
                          <TableCell className="font-semibold">
                            <div className="flex flex-col">
                              <span>₹{item.amount.toFixed(2)}</span>
                              <span className="text-xs text-muted-foreground sm:hidden">
                                ₹{(item.amount / item.memberIds.length).toFixed(2)} each
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex -space-x-2">
                              {item.memberIds.map((memberId) => {
                                const member = trip.members.find((m) => m.id === memberId);
                                return member ? (
                                  <Avatar key={memberId} className={`h-7 w-7 border-2 border-background ${member.color}`}>
                                    <AvatarFallback className="text-xs text-white">
                                      {member.name?.charAt(0)?.toUpperCase() || "?"}
                                    </AvatarFallback>
                                  </Avatar>
                                ) : null;
                              })}
                            </div>
                          </TableCell>
                          <TableCell className="text-right hidden sm:table-cell">
                            ₹{(item.amount / item.memberIds.length).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setItemToDelete(item);
                                setShowDeleteItemDialog(true);
                              }}
                              disabled={deleteItemMutation.isPending}
                              data-testid={`button-delete-item-${item.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Spending History */}
        {spendingItems.filter(item => item.isCompleted).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Spending History</CardTitle>
              <CardDescription>Actual expenses recorded for this trip</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Split Between</TableHead>
                      <TableHead className="text-right">Per Person</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {spendingItems
                      .filter(item => item.isCompleted)
                      .sort((a, b) => b.createdAt - a.createdAt)
                      .map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                              {item.category}
                            </span>
                          </TableCell>
                          <TableCell className="font-semibold">₹{item.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            <div className="flex -space-x-2">
                              {item.memberIds.map((memberId) => {
                                const member = trip.members.find((m) => m.id === memberId);
                                return member ? (
                                  <Avatar key={memberId} className={`h-7 w-7 border-2 border-background ${member.color}`}>
                                    <AvatarFallback className="text-xs text-white">
                                      {member.name?.charAt(0)?.toUpperCase() || "?"}
                                    </AvatarFallback>
                                  </Avatar>
                                ) : null;
                              })}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            ₹{(item.amount / item.memberIds.length).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {!isExploring && (
          <Dialog
            open={showRenameMemberDialog}
            onOpenChange={(open) => {
              if (!isRenamingMember) {
                setShowRenameMemberDialog(open);
                if (!open) {
                  setMemberToRename(null);
                  setRenameMemberName("");
                }
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rename Member</DialogTitle>
                <DialogDescription>
                  Update the member's display name for this trip.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="rename-member-name">Name</Label>
                  <Input
                    id="rename-member-name"
                    value={renameMemberName}
                    onChange={(event) => setRenameMemberName(event.target.value)}
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!isRenamingMember) {
                        setShowRenameMemberDialog(false);
                        setMemberToRename(null);
                        setRenameMemberName("");
                      }
                    }}
                    disabled={isRenamingMember}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleConfirmRenameMember} disabled={isRenamingMember}>
                    {isRenamingMember ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {!isExploring && (
          <AlertDialog
            open={showRemoveMemberDialog}
            onOpenChange={(open) => {
              if (!isRemovingMember) {
                setShowRemoveMemberDialog(open);
                if (!open) {
                  setMemberToRemove(null);
                }
              }
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Member</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove "{memberToRemove?.name}" from "{trip?.name}"? They will immediately lose access to this trip.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex gap-2 justify-end">
                <AlertDialogCancel
                  disabled={isRemovingMember}
                  onClick={() => {
                    if (!isRemovingMember) {
                      setMemberToRemove(null);
                    }
                  }}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmRemoveMember}
                  disabled={isRemovingMember}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isRemovingMember ? "Removing..." : "Remove"}
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {!isExploring && (
          <Dialog
            open={showChangeStatusDialog}
            onOpenChange={(open) => {
              if (!isChangingMemberStatus) {
                setShowChangeStatusDialog(open);
                if (!open) {
                  setMemberToChangeStatus(null);
                  setNewMemberStatus(undefined);
                }
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Change Member Status</DialogTitle>
                <DialogDescription>
                  Update the member's role in this trip. Co-organizers have the same permissions as the trip owner.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="member-status">Status</Label>
                  <Select value={newMemberStatus || ""} onValueChange={(value) => setNewMemberStatus(value as Member['status'])}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="joined">Member</SelectItem>
                      <SelectItem value="co-organizer">Co-organizer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!isChangingMemberStatus) {
                        setShowChangeStatusDialog(false);
                        setMemberToChangeStatus(null);
                        setNewMemberStatus(undefined);
                      }
                    }}
                    disabled={isChangingMemberStatus}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleConfirmChangeMemberStatus} disabled={isChangingMemberStatus || !newMemberStatus}>
                    {isChangingMemberStatus ? "Updating..." : "Update Status"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Leave Trip Dialog */}
        {!isExploring && (
          <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Leave Trip</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to leave "{trip?.name}"? You will lose access to its budgets and spending and will need a new invitation to rejoin.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex gap-2 justify-end">
                <AlertDialogCancel disabled={isLeaving}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleLeaveTrip}
                  disabled={isLeaving}
                >
                  {isLeaving ? "Leaving..." : "Leave"}
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Delete Budget Item Dialog */}
        <AlertDialog open={showDeleteItemDialog} onOpenChange={setShowDeleteItemDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Budget Item</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-2 justify-end">
              <AlertDialogCancel disabled={deleteItemMutation.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  if (itemToDelete) {
                    deleteItemMutation.mutate(itemToDelete);
                  }
                }}
                disabled={deleteItemMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteItemMutation.isPending ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Trip Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Trip</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{trip?.name}"? This action cannot be undone. All budget items and data for this trip will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-2 justify-end">
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteTrip}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Spend Confirmation Dialog */}
        <AlertDialog open={showSpendDialog} onOpenChange={(open) => {
          if (!isSpending) {
            setShowSpendDialog(open);
            if (!open) {
              setItemToSpend(null);
            }
          }
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Spending</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to mark "{itemToSpend?.name}" as spent? This will record ₹{itemToSpend?.amount.toFixed(2)} as actual expenditure.
                {itemToSpend && itemToSpend.memberIds.length > 1 && (
                  <span className="block mt-2">
                    This amount will be split among {itemToSpend.memberIds.length} member(s): ₹{(itemToSpend.amount / itemToSpend.memberIds.length).toFixed(2)} each.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-2 justify-end">
              <AlertDialogCancel disabled={isSpending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleConfirmSpend()}
                disabled={isSpending}
              >
                {isSpending ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Processing...
                  </>
                ) : (
                  "Confirm Spend"
                )}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Record Spending Dialog */}
        <Dialog open={showRecordSpendingDialog} onOpenChange={setShowRecordSpendingDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Record Spending</DialogTitle>
              <DialogDescription>
                Record how much you actually spent on this budget item.
              </DialogDescription>
            </DialogHeader>
            {selectedBudgetItem && (
              <div className="space-y-4">
                <div className="rounded-lg border p-4 bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{selectedBudgetItem.name}</h4>
                      <p className="text-sm text-muted-foreground">{selectedBudgetItem.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">Budget: ₹{selectedBudgetItem.amount.toFixed(2)}</p>
                      <p className={`text-sm ${getRemainingBalance(selectedBudgetItem) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Balance: ₹{getRemainingBalance(selectedBudgetItem).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>



                <div className="space-y-2">
                  <Label htmlFor="spending-amount">Amount Spent (₹)</Label>
                  <Input
                    id="spending-amount"
                    type="number"
                    placeholder="Enter amount"
                    value={spendingAmount}
                    onChange={(e) => setSpendingAmount(e.target.value)}
                    max={getRemainingBalance(selectedBudgetItem)}
                  />
                  {getRemainingBalance(selectedBudgetItem) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Maximum: ₹{getRemainingBalance(selectedBudgetItem).toFixed(2)} remaining
                    </p>
                  )}
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRecordSpendingDialog(false);
                      setSelectedBudgetItem(null);
                      setSpendingAmount("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!selectedBudgetItem || !spendingAmount || !tripId) return;

                      const amount = parseFloat(spendingAmount);
                      if (amount <= 0 || amount > getRemainingBalance(selectedBudgetItem)) {
                        toast({
                          title: "Invalid amount",
                          description: "Please enter a valid amount within the remaining balance.",
                          variant: "destructive",
                        });
                        return;
                      }

                      setIsRecordingSpending(true);
                      try {
                        await addSpendingItem(tripId, {
                          budgetItemId: selectedBudgetItem.id,
                          name: selectedBudgetItem.name,
                          amount: amount,
                          category: selectedBudgetItem.category,
                          memberIds: selectedBudgetItem.memberIds,
                        });

                        setShowRecordSpendingDialog(false);
                        setSelectedBudgetItem(null);
                        setSpendingAmount("");
                      } catch (error: any) {
                        toast({
                          title: "Failed to record spending",
                          description: error.message,
                          variant: "destructive",
                        });
                      } finally {
                        setIsRecordingSpending(false);
                      }
                    }}
                    disabled={isRecordingSpending || !spendingAmount}
                  >
                    {isRecordingSpending ? "Recording..." : "Record Spending"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Sign in prompt for explore mode */}
        {isExploring && (
          <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-blue-900">Save Your Trip Data</h3>
                <p className="text-sm text-blue-700">Sign in with Google to save this trip permanently</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setLocation("/home")}
                  data-testid="button-back-footer"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Button>
                <Button
                  onClick={() => signInWithGoogle()}
                  data-testid="button-sign-in-footer"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign in with Google
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Chatbot - Only show when trip is loaded */}
      {trip && !isLoading && (
        <TripChatbot
          trip={trip}
          budgetItems={budgetItems}
          spendingItems={spendingItems}
          onAddBudget={() => setLocation(`/trip/${tripId}/add-items`)}
          onDeleteBudget={(item) => {
            setItemToDelete(item);
            setShowDeleteItemDialog(true);
          }}
          onAddSpending={(item) => {
            setSelectedBudgetItem(item);
            setShowRecordSpendingDialog(true);
          }}
          onInviteMembers={() => setShowInviteDialog(true)}
          onViewBalance={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onEditTrip={() => {
            toast({
              title: "Coming Soon",
              description: "Trip editing feature will be available soon!",
            });
          }}
          onDeleteTrip={() => setShowDeleteDialog(true)}
          onNavigateToSpending={() => setLocation(`/spending/${tripId}`)}
          onNavigateToBudget={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onRemoveMember={(member) => {
            setMemberToRemove(member);
            setShowRemoveMemberDialog(true);
          }}
          onExportPDF={async () => {
            if (!trip) throw new Error("Trip not loaded");
            setIsGeneratingShare(true);
            try {
              generateTripPDF({ trip, budgetItems });
              toast({
                title: "PDF Generated",
                description: "Your trip report has been downloaded.",
              });
            } catch (error) {
              toast({
                title: "Failed to generate PDF",
                description: "Please try again later.",
                variant: "destructive",
              });
              throw error;
            } finally {
              setIsGeneratingShare(false);
            }
          }}
          showFloatingButton={false}
          isOpen={isChatbotOpen}
          onOpenChange={setIsChatbotOpen}
        />
      )}
    </div>
  );
}
