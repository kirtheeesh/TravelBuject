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
import { ArrowLeft, Plus, Calendar, IndianRupee, LogIn, Trash2, Download, Receipt, LogOut } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Trip, BudgetItem, SpendingItem } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { subscribeToTrip, subscribeToBudgetItems, subscribeToSpendingItems, deleteBudgetItem, deleteTrip, addSpendingItem, updateSpendingItem, inviteMembers, leaveTrip, joinTrip } from "@/lib/mongodb-operations";
import { useEffect, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { generateTripPDF } from "@/lib/generate-trip-pdf";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

const MEMBER_COLORS = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"];
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
  const [invitationCodes, setInvitationCodes] = useState<Array<{ name: string; email: string; code: string }>>([]);
  const [showInvitationCodesDialog, setShowInvitationCodesDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const isInitialMount = useRef(true);

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
      const currentMember = trip.members.find((member) => member.email === user?.email);
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
      // Prevent multiple dialogs for the same item
      if (showSpendDialog && itemToSpend?.id === budgetItem.id) return;

      // Show confirmation dialog for spending
      setItemToSpend(budgetItem);
      setShowSpendDialog(true);
    } else {
      // Directly unmark as spent (no confirmation needed for unchecking)
      handleConfirmUnspend(budgetItem);
    }
  };

  const handleConfirmSpend = async () => {
    if (!itemToSpend || !tripId) return;

    setIsSpending(true);

    // Optimistic update - immediately update local state
    const existingSpendingItem = spendingItems.find(item => item.budgetItemId === itemToSpend.id);
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
        budgetItemId: itemToSpend.id,
        name: itemToSpend.name,
        amount: itemToSpend.amount,
        category: itemToSpend.category,
        memberIds: itemToSpend.memberIds,
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
          budgetItemId: itemToSpend.id,
          name: itemToSpend.name,
          amount: itemToSpend.amount,
          category: itemToSpend.category,
          memberIds: itemToSpend.memberIds,
        });
      }

      toast({
        title: "Item marked as spent",
        description: `${itemToSpend.name} has been recorded as spent.`,
      });

      // Close dialog immediately after success
      setShowSpendDialog(false);
      setItemToSpend(null);
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

            <Dialog open={showInvitationCodesDialog} onOpenChange={setShowInvitationCodesDialog}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Invitation Links</DialogTitle>
                  <DialogDescription>
                    Share these links with the invited members so they can join the trip.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {invitationCodes.map((invitation, index) => {
                    const invitationUrl = `https://bktravelbud.onrender.com/invite/${invitation.code}`;
                    return (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="font-medium">{invitation.name}</div>
                        <div className="text-sm text-muted-foreground">{invitation.email}</div>
                        <div className="mt-2 p-2 bg-gray-100 rounded text-sm font-mono break-all">
                          {invitationUrl}
                        </div>
                        <div className="flex gap-2 mt-2">
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
                                  description: "Share this link with the invited member.",
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

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="gap-2" onClick={handleAddMore} data-testid="button-add-budget">
                <Plus className="h-4 w-4" />
                Add Budget Items
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setLocation(`/spending/${tripId}`)}
                data-testid="button-view-spending"
              >
                <Receipt className="h-4 w-4" />
                View Spending
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleDownloadPDF}
                data-testid="button-download-pdf"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              {!isExploring && (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setShowLeaveDialog(true)}
                  disabled={isLeaving}
                >
                  <LogOut className="h-4 w-4" />
                  {isLeaving ? "Leaving..." : "Leave Trip"}
                </Button>
              )}
              <Button
                variant="destructive"
                className="gap-2"
                onClick={() => setShowDeleteDialog(true)}
                data-testid="button-delete-trip"
              >
                <Trash2 className="h-4 w-4" />
                Delete Trip
              </Button>
            </div>
          </div>
        </div>

        {/* Members */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Trip Members</CardTitle>
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
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {trip.members.map((member, idx) => {
                const memberInfo = memberData[idx];
                return (
                  <div key={member.id} className="flex items-center gap-2">
                    <Avatar className={`h-10 w-10 ${member.color}`}>
                      <AvatarFallback className="text-white">
                        {member.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{member.name}</p>
                        {member.status === "invited" && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                            Invited
                          </span>
                        )}
                        {member.status === "joined" && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                            Joined
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>Budget: ₹{memberInfo?.budgeted.toFixed(2) || "0.00"}</p>
                        <p>Spent: ₹{memberInfo?.spent.toFixed(2) || "0.00"}</p>
                        <p className={memberInfo?.remaining < 0 ? "text-red-500" : ""}>
                          Remaining: ₹{memberInfo?.remaining.toFixed(2) || "0.00"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        {budgetItems.length > 0 && (
          <div className="mb-6 grid gap-6 md:grid-cols-2">
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

        {/* Budget History */}
        <Card>
          <CardHeader>
            <CardTitle>Budget Items</CardTitle>
            <CardDescription>
              Plan your trip expenses and mark them as spent when you actually pay for them.
              <span className="block mt-1 text-xs">
                💡 <strong>Tip:</strong> Check the box when you've completed the purchase to track actual spending.
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {budgetItems.length === 0 ? (
              <div className="py-12 text-center">
                <p className="mb-4 text-muted-foreground">No budget items yet</p>
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
                      <TableHead>Date Added</TableHead>
                      <TableHead>Expense Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Who's Paying</TableHead>
                      <TableHead className="text-right">Each Pays</TableHead>
                      <TableHead className="text-center">Mark as Spent</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {budgetItems
                      .sort((a, b) => b.createdAt - a.createdAt)
                      .map((item) => (
                        <TableRow key={item.id} data-testid={`row-budget-item-${item.id}`}>
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
                                      {member.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                ) : null;
                              })}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            ₹{(item.amount / item.memberIds.length).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={spendingItems.some(spending => spending.budgetItemId === item.id && spending.isCompleted)}
                              onCheckedChange={(checked) => handleMarkAsSpent(item, checked as boolean)}
                              disabled={isExploring}
                            />
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
                                      {member.name.charAt(0).toUpperCase()}
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
                onClick={handleConfirmSpend}
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
    </div>
  );
}
