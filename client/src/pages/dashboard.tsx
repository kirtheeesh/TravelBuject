import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, Calendar, IndianRupee, LogIn, Trash2, Download } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Trip, BudgetItem } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { subscribeToTrip, subscribeToBudgetItems, deleteBudgetItem } from "@/lib/mongodb-operations";
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
  const { isExploring, signInWithGoogle } = useAuth();
  const tripId = params?.id;
  
  const [trip, setTrip] = useState<Trip | null>(null);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<BudgetItem | null>(null);
  const [showDeleteItemDialog, setShowDeleteItemDialog] = useState(false);
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
        // TODO: Add Firebase deletion logic when Firebase is enabled
        console.log("Firebase deletion not implemented yet");
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

  // Calculate statistics
  const totalSpent = budgetItems.reduce((sum, item) => sum + item.amount, 0);

  // Category breakdown for pie chart
  const categoryData = Object.entries(
    budgetItems.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.amount;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  // Member spending for bar chart
  const memberSpending = trip?.members.map((member) => {
    const total = budgetItems.reduce((sum, item) => {
      if (item.memberIds.includes(member.id)) {
        return sum + item.amount / item.memberIds.length;
      }
      return sum;
    }, 0);
    return { name: member.name, amount: total };
  }) || [];

  const handleAddMore = () => {
    setLocation(`/trip/${tripId}/add-items`);
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
          <Button
            variant="ghost"
            className="mb-4 gap-2"
            onClick={() => setLocation("/home")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Trips
          </Button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold">{trip.name}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(trip.createdAt).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <IndianRupee className="h-4 w-4" />
                  ₹{totalSpent.toFixed(2)} total
                </span>
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
                onClick={handleDownloadPDF}
                data-testid="button-download-pdf"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
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
            <CardTitle>Trip Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {trip.members.map((member, idx) => (
                <div key={member.id} className="flex items-center gap-2">
                  <Avatar className={`h-10 w-10 ${member.color}`}>
                    <AvatarFallback className="text-white">
                      {member.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{member.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ₹{memberSpending[idx]?.amount.toFixed(2) || "0.00"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        {budgetItems.length > 0 && (
          <div className="mb-6 grid gap-6 md:grid-cols-2">
            {/* Pie Chart - Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Spending by Category</CardTitle>
                <CardDescription>Budget breakdown by expense type</CardDescription>
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

            {/* Bar Chart - Member Spending */}
            <Card>
              <CardHeader>
                <CardTitle>Member Spending</CardTitle>
                <CardDescription>Total amount each member owes</CardDescription>
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
            <CardTitle>Budget History</CardTitle>
            <CardDescription>All expenses for this trip</CardDescription>
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
                      <TableHead>Date</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Split Between</TableHead>
                      <TableHead className="text-right">Per Person</TableHead>
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
