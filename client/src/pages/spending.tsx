import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Calendar, IndianRupee, Download, Trash2 } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import type { Trip, SpendingItem } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { subscribeToTrip, subscribeToSpendingItems, deleteSpendingItem } from "@/lib/mongodb-operations";
import { useEffect, useState, useRef } from "react";
import { generateTripPDF } from "@/lib/generate-trip-pdf";
import { useToast } from "@/hooks/use-toast";

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

export default function Spending() {
  const [, params] = useRoute("/spending/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isExploring } = useAuth();
  const tripId = params?.id;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [spendingItems, setSpendingItems] = useState<SpendingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [itemToDelete, setItemToDelete] = useState<SpendingItem | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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

  // Real-time listener for spending items
  useEffect(() => {
    if (!tripId || isExploring) return;

    const unsubscribe = subscribeToSpendingItems(
      tripId,
      (updatedItems, changes) => {
        setSpendingItems(updatedItems);
      },
      (error) => {
        console.error("Error loading spending items:", error);
      }
    );

    return () => unsubscribe();
  }, [tripId, isExploring]);

  // Calculate statistics
  const totalSpent = spendingItems
    .filter(item => item.isCompleted)
    .reduce((sum, item) => sum + item.amount, 0);

  // Category breakdown for pie chart
  const categoryData = Object.entries(
    spendingItems
      .filter(item => item.isCompleted)
      .reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + item.amount;
        return acc;
      }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  // Member spending for bar chart
  const memberSpending = trip?.members.map((member) => {
    const total = spendingItems
      .filter(item => item.isCompleted && item.memberIds.includes(member.id))
      .reduce((sum, item) => sum + item.amount / item.memberIds.length, 0);
    return { name: member.name, amount: total };
  }) || [];

  const handleDownloadPDF = () => {
    if (!trip) return;

    try {
      generateTripPDF({
        trip,
        budgetItems: spendingItems.filter(item => item.isCompleted) as any, // Type assertion for PDF generation
      });

      toast({
        title: "PDF downloaded",
        description: "Your spending report has been downloaded successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to generate PDF",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteSpending = async () => {
    if (!itemToDelete || !tripId) return;

    try {
      await deleteSpendingItem(tripId, itemToDelete.id);

      toast({
        title: "Spending item deleted",
        description: `${itemToDelete.name} has been removed from spending history.`,
      });

      setShowDeleteDialog(false);
      setItemToDelete(null);
    } catch (error: any) {
      toast({
        title: "Failed to delete spending item",
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
            onClick={() => setLocation(`/dashboard/${tripId}`)}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold">{trip.name} - Actual Spending</h1>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(trip.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span className="font-medium text-green-700">₹{totalSpent.toFixed(2)} actually spent</span>
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">
                    Track what you've really paid for during your trip
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleDownloadPDF}
                data-testid="button-download-pdf"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Budget vs Actual Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Budget vs Actual Spending</CardTitle>
            <CardDescription>How your planned budget compares to what you've actually spent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="text-2xl font-bold text-blue-700">₹{(() => {
                  const totalBudgeted = trip.budgetItems?.reduce((sum, item) => sum + item.amount, 0) || 0;
                  return totalBudgeted.toFixed(2);
                })()}</div>
                <div className="text-sm text-blue-600 font-medium">Total Budgeted</div>
                <div className="text-xs text-blue-500 mt-1">What you planned to spend</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="text-2xl font-bold text-green-700">₹{totalSpent.toFixed(2)}</div>
                <div className="text-sm text-green-600 font-medium">Actually Spent</div>
                <div className="text-xs text-green-500 mt-1">What you've really paid</div>
              </div>
              <div className={`text-center p-4 rounded-lg border ${(() => {
                const totalBudgeted = trip.budgetItems?.reduce((sum, item) => sum + item.amount, 0) || 0;
                const difference = totalBudgeted - totalSpent;
                return difference >= 0
                  ? 'bg-orange-50 border-orange-200'
                  : 'bg-red-50 border-red-200';
              })()}`}>
                <div className={`text-2xl font-bold ${(() => {
                  const totalBudgeted = trip.budgetItems?.reduce((sum, item) => sum + item.amount, 0) || 0;
                  const difference = totalBudgeted - totalSpent;
                  return difference >= 0 ? 'text-orange-700' : 'text-red-700';
                })()}`}>
                  ₹{(() => {
                    const totalBudgeted = trip.budgetItems?.reduce((sum, item) => sum + item.amount, 0) || 0;
                    return Math.abs(totalBudgeted - totalSpent).toFixed(2);
                  })()}
                </div>
                <div className={`text-sm font-medium ${(() => {
                  const totalBudgeted = trip.budgetItems?.reduce((sum, item) => sum + item.amount, 0) || 0;
                  const difference = totalBudgeted - totalSpent;
                  return difference >= 0 ? 'text-orange-600' : 'text-red-600';
                })()}`}>
                  {(() => {
                    const totalBudgeted = trip.budgetItems?.reduce((sum, item) => sum + item.amount, 0) || 0;
                    const difference = totalBudgeted - totalSpent;
                    return difference >= 0 ? 'Under Budget' : 'Over Budget';
                  })()}
                </div>
                <div className={`text-xs mt-1 ${(() => {
                  const totalBudgeted = trip.budgetItems?.reduce((sum, item) => sum + item.amount, 0) || 0;
                  const difference = totalBudgeted - totalSpent;
                  return difference >= 0 ? 'text-orange-500' : 'text-red-500';
                })()}`}>
                  {(() => {
                    const totalBudgeted = trip.budgetItems?.reduce((sum, item) => sum + item.amount, 0) || 0;
                    const difference = totalBudgeted - totalSpent;
                    return difference >= 0 ? 'Saved money!' : 'Spent more than planned';
                  })()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Members */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Trip Members & Individual Spending</CardTitle>
            <CardDescription>How much each person has actually spent so far</CardDescription>
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
                      ₹{memberSpending[idx]?.amount.toFixed(2) || "0.00"} spent
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        {spendingItems.filter(item => item.isCompleted).length > 0 && (
          <div className="mb-6 grid gap-6 md:grid-cols-2">
            {/* Pie Chart - Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Spending by Category</CardTitle>
                <CardDescription>Actual spending breakdown by expense type</CardDescription>
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
                <CardDescription>Total amount each member has spent</CardDescription>
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

        {/* Spending History */}
        <Card>
          <CardHeader>
            <CardTitle>Actual Spending History</CardTitle>
            <CardDescription>
              Complete record of what you've actually paid for during your trip.
              <span className="block mt-1 text-xs">
                💡 <strong>Note:</strong> These are expenses you've marked as completed in your budget list.
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {spendingItems.filter(item => item.isCompleted).length === 0 ? (
              <div className="py-12 text-center">
                <p className="mb-4 text-muted-foreground">No spending recorded yet</p>
                <p className="text-sm text-muted-foreground">Go back to the dashboard and check items as spent to see them here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date Spent</TableHead>
                      <TableHead>Expense Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Who's Paying</TableHead>
                      <TableHead className="text-right">Each Pays</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
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
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setItemToDelete(item);
                                setShowDeleteDialog(true);
                              }}
                              data-testid={`button-delete-spending-${item.id}`}
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

        {/* Delete Spending Item Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Spending Item</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{itemToDelete?.name}" from spending history? This will also unmark it as spent in the budget list. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-2 justify-end">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteSpending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}