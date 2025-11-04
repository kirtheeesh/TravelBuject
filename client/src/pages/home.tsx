import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Users, Calendar, RefreshCw, XCircle } from "lucide-react";
import { IndianRupee } from "lucide-react";
import { useLocation } from "wouter";
import type { Trip } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { subscribeToTrips, getTrips, rejectInvitation } from "@/lib/mongodb-operations";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";

// Member color palette for avatars
const MEMBER_COLORS = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
];

export default function Home() {
  const { user, isExploring } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [hasPendingJoin, setHasPendingJoin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [justJoinedTrip, setJustJoinedTrip] = useState<{ tripName: string; timestamp: number } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasShownInvitationToast, setHasShownInvitationToast] = useState(false);
  const [hasShownJoinToast, setHasShownJoinToast] = useState(false);
  const [isRejecting, setIsRejecting] = useState<string | null>(null);

  const pendingInvitations = useMemo(() => {
    if (!user?.email) return [];
    return trips.filter((trip) =>
      trip.members.some((member) => member.email === user.email && member.status === "invited")
    );
  }, [trips, user?.email]);

  const visibleTrips = useMemo(() => {
    if (isExploring) {
      return trips;
    }

    return trips.filter((trip) => {
      if (user?.id && trip.userId === user.id) {
        return true;
      }

      if (!user?.email) {
        return false;
      }

      const member = trip.members.find((item) => item.email === user.email);
      if (!member) {
        return false;
      }

      return member.status === "owner" || member.status === "joined";
    });
  }, [trips, isExploring, user?.id, user?.email]);

  // Force refresh trips
  const refreshTrips = async () => {
    if (!user?.id) return;
    setIsRefreshing(true);
    try {
      const updatedTrips = await getTrips(user.id);
      setTrips(updatedTrips);
    } catch (error) {
      console.error("Error refreshing trips:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const lastJoin = localStorage.getItem("justJoinedTrip");
    if (!lastJoin) {
      setHasPendingJoin(false);
      setJustJoinedTrip(null);
      return;
    }

    try {
      const parsedJoin = JSON.parse(lastJoin);
      const joinTimestamp = typeof parsedJoin?.timestamp === "number" ? parsedJoin.timestamp : 0;
      if (parsedJoin?.tripName && joinTimestamp > 0 && Date.now() - joinTimestamp < 1000 * 60 * 5) {
        if (!justJoinedTrip || justJoinedTrip.timestamp !== joinTimestamp) {
          setJustJoinedTrip({ tripName: parsedJoin.tripName, timestamp: joinTimestamp });
          setHasShownJoinToast(false);
        }
        setHasPendingJoin(true);
      } else {
        setHasPendingJoin(false);
        setJustJoinedTrip(null);
        localStorage.removeItem("justJoinedTrip");
      }
    } catch (error) {
      setHasPendingJoin(false);
      setJustJoinedTrip(null);
      localStorage.removeItem("justJoinedTrip");
    }
  }, [justJoinedTrip]);

  // Real-time listener for trips
  useEffect(() => {
    if (isExploring) {
      const exploreTrips = localStorage.getItem("exploreTripData");
      if (exploreTrips) {
        try {
          setTrips(JSON.parse(exploreTrips));
        } catch (error) {
          console.error("Error parsing explore trips:", error);
          setTrips([]);
        }
      }
      setIsLoading(false);
      return;
    }

    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    // Fetch trips immediately and then set up polling
    const fetchAndSubscribe = async () => {
      setIsLoading(true);
      
      // Start polling subscription which handles retries internally
      const unsubscribe = subscribeToTrips(
        user.id,
        (updatedTrips) => {
          setTrips(updatedTrips);
          setIsLoading(false);
        },
        (error) => {
          console.error("Error loading trips:", error);
          setIsLoading(false);
        }
      );

      return unsubscribe;
    };

    let unsubscribe: (() => void) | null = null;
    
    fetchAndSubscribe().then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.id, isExploring, hasShownJoinToast]);

  // Show notification for pending invitations
  useEffect(() => {
    if (!isLoading && pendingInvitations.length > 0 && !hasShownInvitationToast) {
      toast({
        title: "Trip Invitations",
        description: `You have ${pendingInvitations.length} pending invitation${pendingInvitations.length > 1 ? 's' : ''}: ${pendingInvitations.map(trip => `"${trip.name}"`).join(', ')}`,
        duration: 8000,
      });
      setHasShownInvitationToast(true);
    }
  }, [isLoading, pendingInvitations, hasShownInvitationToast, toast]);

  useEffect(() => {
    if (!isLoading && hasPendingJoin && !hasShownJoinToast && justJoinedTrip) {
      toast({
        title: "Successfully joined!",
        description: `You have joined "${justJoinedTrip.tripName}".`,
      });
      setHasShownJoinToast(true);
      setHasPendingJoin(false);
      setJustJoinedTrip(null);
      localStorage.removeItem("justJoinedTrip");
    }
  }, [isLoading, hasPendingJoin, hasShownJoinToast, justJoinedTrip, toast]);

  const handleRejectInvitation = async (tripId: string, invitationCode: string) => {
    if (!user?.id) return;
    try {
      setIsRejecting(tripId);
      await rejectInvitation(invitationCode);
      toast({
        title: "Invitation rejected",
        description: "You won't appear in this trip anymore.",
      });
      await refreshTrips();
    } catch (error: any) {
      toast({
        title: "Failed to reject",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRejecting(null);
    }
  };

  const handleCreateTrip = () => {
    setLocation("/create-trip");
  };

  const handleViewDashboard = (tripId: string) => {
    setLocation(`/dashboard/${tripId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 md:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold md:text-4xl">
            Welcome {isExploring ? "to the Explorer" : "back"}, {user?.name?.split(" ")[0] || "Traveler"}!
          </h1>
          <p className="text-muted-foreground">
            {isExploring 
              ? "Explore the app and create sample budgets. Sign in to save your data."
              : "Manage your travel budgets and split expenses with ease"}
          </p>
        </div>

        {/* Pending Invitations Notification */}
        {!isLoading && pendingInvitations.length > 0 && (
          <div className="mb-6">
            <div className="relative rounded-lg border-2 border-orange-300 bg-gradient-to-r from-orange-50 to-orange-100 p-4 shadow-lg">
              <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                {pendingInvitations.length}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-200 shadow-sm">
                    <Users className="h-5 w-5 text-orange-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-orange-900">
                      Trip Invitation{pendingInvitations.length > 1 ? 's' : ''} Available!
                    </p>
                    <p className="text-sm text-orange-800">
                      {pendingInvitations.map(trip => `Invited to "${trip.name}"`).join(' • ')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {pendingInvitations.slice(0, 2).map((trip) => {
                    const member = trip.members.find(m => m.email === user?.email && m.status === "invited");
                    if (!member) return null;
                    return (
                      <div key={trip.id} className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className="bg-orange-600 hover:bg-orange-700 shadow-sm"
                          onClick={() => {
                            if (member.invitationCode) {
                              setLocation(`/invite/${member.invitationCode}`);
                            }
                          }}
                        >
                          Join {trip.name}
                        </Button>
                        {member.invitationCode && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-300 text-red-600 hover:bg-red-50"
                                disabled={isRejecting === trip.id}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                {isRejecting === trip.id ? "Rejecting..." : "Reject"}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Reject Invitation</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to decline the invitation to "{trip.name}"? You can only rejoin if invited again.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="flex justify-end gap-2">
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRejectInvitation(trip.id, member.invitationCode || "")}>
                                  Reject
                                </AlertDialogAction>
                              </div>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    );
                  })}
                  {pendingInvitations.length > 2 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-orange-400 text-orange-700 hover:bg-orange-100"
                      onClick={() => {
                        const element = document.getElementById('pending-invitations');
                        element?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      View All
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row">
          <Button
            size="lg"
            className="h-12 gap-2"
            onClick={handleCreateTrip}
            data-testid="button-create-trip"
          >
            <Plus className="h-5 w-5" />
            Create New Trip
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12 gap-2"
            onClick={refreshTrips}
            disabled={isRefreshing}
            data-testid="button-refresh-trips"
          >
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {/* Trips Grid */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : visibleTrips.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <Users className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">No trips yet</h3>
              <p className="mb-6 text-center text-muted-foreground">
                Create your first trip to start tracking expenses with your travel companions
              </p>
              <Button onClick={handleCreateTrip} data-testid="button-create-first-trip">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Trip
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {visibleTrips.map((trip) => (
              <Card
                key={trip.id}
                className="cursor-pointer transition-all hover:shadow-lg hover-elevate active-elevate-2"
                onClick={() => handleViewDashboard(trip.id)}
                data-testid={`card-trip-${trip.id}`}
              >
                <CardHeader className="space-y-0 pb-4">
                  <CardTitle className="text-xl">{trip.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1 text-xs">
                    <Calendar className="h-3 w-3" />
                    {new Date(trip.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {trip.members.length} {trip.members.length === 1 ? "member" : "members"}
                    </span>
                    <div className="ml-auto flex -space-x-2">
                      {trip.members.slice(0, 3).map((member) => (
                        <Avatar key={member.id} className={`h-8 w-8 border-2 border-background ${member.color}`}>
                          <AvatarFallback className="text-xs text-white">
                            {member.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {trip.members.length > 3 && (
                        <Avatar className="h-8 w-8 border-2 border-background bg-muted">
                          <AvatarFallback className="text-xs">
                            +{trip.members.length - 3}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Click to view budget details</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
