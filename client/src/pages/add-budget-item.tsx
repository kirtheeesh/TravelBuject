import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, ArrowLeft, IndianRupee, Trash2, Check } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { subscribeToTrip, addBudgetItem } from "@/lib/mongodb-operations";
import { cn } from "@/lib/utils";
import type { Trip, BudgetItem } from "@shared/schema";

const CATEGORIES = ["Food", "Accommodation", "Transport", "Entertainment", "Shopping", "Miscellaneous"] as const;

const BUDGET_ITEMS = [
  "Tea",
  "Coffee",
  "Cigarettes",
  "Alcohol",
  "Cool drinks",
  "Paper (notebooks, napkins)",
  "Biscuits",
  "Snacks",
  "Chocolates",
  "Candy",
  "Meals - Breakfast",
  "Meals - Lunch",
  "Meals - Dinner",
  "Street food",
  "Bottled water",
  "Juice",
  "Smoothies",
  "Milk",
  "Sugar",
  "Creamer",
  "Airfare",
  "Airline fees (baggage, change fees)",
  "Train tickets",
  "Bus fare",
  "Taxi/Auto rickshaw fares",
  "Rideshare fares (Uber/Ola)",
  "Car rental",
  "Fuel for car rental",
  "Parking fees",
  "Toll charges",
  "Hotel lodging",
  "Hostel stays",
  "Airbnb/Alternative lodgings",
  "Hotel taxes and service charges",
  "Laundry services",
  "Toiletries (soap, shampoo, toothbrush)",
  "Toilet paper/paper napkins",
  "Sanitary products",
  "Sunscreen",
  "Insect repellent",
  "Mobile SIM card/recharge",
  "Internet/Wi-Fi charges",
  "Phone calls (business related)",
  "Tips/gratuities",
  "Entry fees to tourist attractions",
  "Guided tour fees",
  "Event tickets (concerts/shows)",
  "Souvenirs/gifts",
  "Emergency medicines/first aid",
  "Travel insurance",
  "Travel visa fees",
  "Airport taxes and fees",
  "Luggage fees (extra weight)",
  "Airport shuttle or transfer services",
  "Travel guidebooks or maps",
  "Photography or camera accessories",
  "Charging cables, adapters, and power banks",
  "Health check-ups or vaccinations before trip",
  "Tips for drivers or porters",
  "Snacks and beverages during travel",
  "Parking charges at home for travel duration",
  "Laundry detergent (if self-washing)",
  "Books, magazines, or entertainment materials",
  "Local SIM card purchase",
  "Currency exchange fees",
  "Travel apps or software subscriptions",
  "Emergency cash reserves",
  "Childcare or pet care while traveling",
  "Specialty clothing or gear (raincoat, hiking boots)",
  "Additional baggage (carrying gifts or shopping)",
  "Entry fee (museums, parks, monuments)",
  "Parking fee (at attractions or event sites)",
  "Zip line rides",
  "Amusement park rides",
  "Boat rides or rentals",
  "Cable car or gondola rides",
  "Scuba diving/snorkeling fees",
  "Guided nature walks or hikes",
  "Safari tours",
  "Water sports fees (jet skiing, kayaking)",
  "Bicycle rental",
  "Horseback riding",
  "Adventure sports (bungee jumping, paragliding)",
  "Theme park passes",
  "Wildlife sanctuary fees",
  "Skiing or snowboarding passes",
  "Cultural show tickets",
  "Cooking class fees",
  "Craft or art workshop fees",
  "Festival or event entry tickets",
] as const;

type BudgetItemInput = {
  tempId: string;
  name: string;
  amount: number;
  category: string;
  memberIds: string[];
};

export default function AddBudgetItem() {
  const [, params] = useRoute("/trip/:id/add-items");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isExploring } = useAuth();
  const tripId = params?.id;
  
  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({});

  const [budgetItems, setBudgetItems] = useState<BudgetItemInput[]>([
    {
      tempId: Date.now().toString(),
      name: "",
      amount: 0,
      category: "Miscellaneous",
      memberIds: [],
    },
  ]);

  const getFilteredItems = (inputValue: string) => {
    if (!inputValue) return BUDGET_ITEMS;
    return BUDGET_ITEMS.filter((item) =>
      item.toLowerCase().includes(inputValue.toLowerCase())
    );
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
        } catch (error) {
          console.error("Error parsing explore trips:", error);
          setTrip(null);
        }
      }
      setIsLoading(false);
      return;
    }

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

  const addItemMutation = useMutation({
    mutationFn: async (items: BudgetItemInput[]) => {
      if (!tripId) throw new Error("Trip ID is required");
      
      if (isExploring) {
        const exploreTrips = localStorage.getItem("exploreTripData");
        const trips = exploreTrips ? JSON.parse(exploreTrips) as Trip[] : [];
        const tripIndex = trips.findIndex(t => t.id === tripId);
        
        if (tripIndex === -1) throw new Error("Trip not found in explore mode");
        
        const newBudgetItems = items.map((item) => ({
          id: Date.now().toString() + Math.random(),
          tripId,
          name: item.name,
          amount: item.amount,
          category: item.category as "Food" | "Accommodation" | "Transport" | "Entertainment" | "Shopping" | "Miscellaneous",
          memberIds: item.memberIds,
          createdAt: Date.now(),
        })) as BudgetItem[];
        
        trips[tripIndex].budgetItems = [...(trips[tripIndex].budgetItems || []), ...newBudgetItems];
        localStorage.setItem("exploreTripData", JSON.stringify(trips));
        
        return newBudgetItems;
      }
      
      const promises = items.map((item) =>
        addBudgetItem(tripId, {
          name: item.name,
          amount: item.amount,
          category: item.category,
          memberIds: item.memberIds,
        })
      );
      
      return await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgetItems", tripId] });
      toast({
        title: "Budget items added!",
        description: `${budgetItems.length} ${budgetItems.length === 1 ? "item" : "items"} added successfully.`,
      });
      setLocation(`/dashboard/${tripId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add items",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addNewItem = () => {
    setBudgetItems([
      ...budgetItems,
      {
        tempId: Date.now().toString(),
        name: "",
        amount: 0,
        category: "Miscellaneous",
        memberIds: [],
      },
    ]);
  };

  const removeItem = (tempId: string) => {
    if (budgetItems.length === 1) {
      toast({
        title: "Cannot remove",
        description: "At least one budget item is required.",
        variant: "destructive",
      });
      return;
    }
    setBudgetItems(budgetItems.filter((item) => item.tempId !== tempId));
  };

  const updateItem = (tempId: string, updates: Partial<BudgetItemInput>) => {
    setBudgetItems(budgetItems.map((item) => (item.tempId === tempId ? { ...item, ...updates } : item)));
  };

  const toggleMember = (itemTempId: string, memberId: string) => {
    const item = budgetItems.find((i) => i.tempId === itemTempId);
    if (!item) return;

    const isSelected = item.memberIds.includes(memberId);

    if (isSelected) {
      updateItem(itemTempId, {
        memberIds: item.memberIds.filter((id) => id !== memberId),
      });
    } else {
      updateItem(itemTempId, {
        memberIds: [...item.memberIds, memberId],
      });
    }
  };

  const handleSubmit = () => {
    const invalidItems = budgetItems.filter(
      (item) => !item.name || item.amount <= 0 || item.memberIds.length === 0
    );

    if (invalidItems.length > 0) {
      toast({
        title: "Invalid budget items",
        description: "Please fill in all items with valid amounts and select members.",
        variant: "destructive",
      });
      return;
    }

    addItemMutation.mutate(budgetItems);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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

      <main className="container mx-auto max-w-4xl px-4 py-8 md:px-8">
        <Button
          variant="ghost"
          className="mb-6 gap-2"
          onClick={() => setLocation(`/dashboard/${tripId}`)}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">Add Budget Items</h1>
          <p className="text-muted-foreground">Add expenses to {trip.name}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5" />
              New Budget Items
            </CardTitle>
            <CardDescription>Add expenses and select who will split each cost</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {budgetItems.map((item, itemIndex) => (
              <Card key={item.tempId} className="border-muted">
                <CardContent className="pt-6">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label htmlFor={`item-name-${item.tempId}`}>Item Name</Label>
                          <Popover
                            open={openPopovers[item.tempId] || false}
                            onOpenChange={(open) =>
                              setOpenPopovers((prev) => ({ ...prev, [item.tempId]: open }))
                            }
                          >
                            <PopoverTrigger asChild>
                              <Input
                                id={`item-name-${item.tempId}`}
                                placeholder="e.g., Dinner at Restaurant"
                                value={item.name}
                                onChange={(e) => updateItem(item.tempId, { name: e.target.value })}
                                data-testid={`input-item-name-${itemIndex}`}
                              />
                            </PopoverTrigger>
                            <PopoverContent className="w-[200px] p-0" align="start">
                              <Command>
                                <CommandInput
                                  placeholder="Search items..."
                                  value={item.name}
                                  onValueChange={(value) => updateItem(item.tempId, { name: value })}
                                />
                                <CommandList>
                                  <CommandEmpty>No items found. Creating new item.</CommandEmpty>
                                  <CommandGroup>
                                    {getFilteredItems(item.name).map((budgetItem) => (
                                      <CommandItem
                                        key={budgetItem}
                                        value={budgetItem}
                                        onSelect={(currentValue) => {
                                          updateItem(item.tempId, { name: currentValue });
                                          setOpenPopovers((prev) => ({ ...prev, [item.tempId]: false }));
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            item.name === budgetItem ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {budgetItem}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div>
                          <Label htmlFor={`item-amount-${item.tempId}`}>Amount (₹)</Label>
                          <Input
                            id={`item-amount-${item.tempId}`}
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={item.amount || ""}
                            onChange={(e) =>
                              updateItem(item.tempId, { amount: parseFloat(e.target.value) || 0 })
                            }
                            data-testid={`input-item-amount-${itemIndex}`}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor={`item-category-${item.tempId}`}>Category</Label>
                        <Select
                          value={item.category}
                          onValueChange={(value) => updateItem(item.tempId, { category: value })}
                        >
                          <SelectTrigger id={`item-category-${item.tempId}`} data-testid={`select-category-${itemIndex}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Split between:</Label>
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {trip.members.map((member) => (
                            <div key={member.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`member-${item.tempId}-${member.id}`}
                                checked={item.memberIds.includes(member.id)}
                                onCheckedChange={() => toggleMember(item.tempId, member.id)}
                                data-testid={`checkbox-member-${itemIndex}-${member.id}`}
                              />
                              <label
                                htmlFor={`member-${item.tempId}-${member.id}`}
                                className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                <Avatar className={`h-6 w-6 ${member.color}`}>
                                  <AvatarFallback className="text-xs text-white">
                                    {member.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate">{member.name}</span>
                              </label>
                            </div>
                          ))}
                        </div>
                        {item.memberIds.length > 0 && item.amount > 0 && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            ₹{(item.amount / item.memberIds.length).toFixed(2)} per person
                          </p>
                        )}
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.tempId)}
                      data-testid={`button-remove-item-${itemIndex}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={addNewItem}
              data-testid="button-add-more"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Another Item
            </Button>
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => setLocation(`/dashboard/${tripId}`)}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            className="gap-2"
            onClick={handleSubmit}
            disabled={addItemMutation.isPending}
            data-testid="button-save-items"
          >
            {addItemMutation.isPending ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <IndianRupee className="h-4 w-4" />
                Save Items
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
