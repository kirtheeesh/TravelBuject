import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Users, Calendar, RefreshCw } from "lucide-react";
import { IndianRupee } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Trip } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { subscribeToTrips, getTrips } from "@/lib/mongodb-operations";
import { useEffect, useState } from "react";

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
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
      try {
        setIsLoading(true);
        // Add a small delay to ensure session is fully established after sign-in
        await new Promise(resolve => setTimeout(resolve, 200));
        // Initial immediate fetch
        const initialTrips = await getTrips(user.id);
        setTrips(initialTrips);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching initial trips:", error);
        setIsLoading(false);
      }

      // Then set up polling for real-time updates
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
  }, [user?.id, isExploring]);

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
        ) : trips.length === 0 ? (
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
            {trips.map((trip) => (
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
                  {/* Members */}
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {trip.members.length} {trip.members.length === 1 ? "member" : "members"}
                    </span>
                    <div className="ml-auto flex -space-x-2">
                      {trip.members.slice(0, 3).map((member, idx) => (
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

                  {/* Quick Stats */}
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
