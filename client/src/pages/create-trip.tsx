import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTutorial } from "@/contexts/TutorialContext";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, X, Users, IndianRupee, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertTripSchema, type InsertBudgetItem, type Trip } from "@shared/schema";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { createTrip } from "@/lib/mongodb-operations";
import { CreateTripTutorial } from "@/components/CreateTripTutorial";
import { CreateTripChatbot } from "@/components/CreateTripChatbot";

const MEMBER_COLORS = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"];
const CATEGORIES = ["Food", "Accommodation", "Transport", "Entertainment", "Shopping", "Miscellaneous"] as const;
const COMMON_ITEMS = [
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
];

type BudgetItemInput = Omit<InsertBudgetItem, "tripId"> & { tempId: string };

export default function CreateTrip() {
  const { user, isExploring, signInWithGoogle } = useAuth();
  const { tutorialEnabled, isLoading: tutorialLoading } = useTutorial();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [budgetItems, setBudgetItems] = useState<BudgetItemInput[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<{ [key: string]: boolean }>({});
  const [showTutorial, setShowTutorial] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<"tripName" | "memberCount" | "memberDetails" | "budgetItems" | "review">("tripName");

  const form = useForm<z.infer<typeof insertTripSchema>>({
    resolver: zodResolver(insertTripSchema),
    defaultValues: {
      name: "",
      memberCount: undefined,
      memberEmails: [],
    },
  });

  const memberCount = form.watch("memberCount");
  const memberEmails = form.watch("memberEmails");

  useEffect(() => {
    if (!user) return;
    const currentMembers = form.getValues("memberEmails");
    const memberCount = form.getValues("memberCount");
    if (memberCount && memberCount > 0) {
      if (currentMembers.length === 0) {
        form.setValue("memberEmails", [{ name: "", email: "" }]);
      }
      const selfName = user.name?.trim() || user.email || "You";
      const selfEmail = user.email || "";
      form.setValue("memberEmails.0.name", selfName, { shouldDirty: false, shouldTouch: false });
      form.setValue("memberEmails.0.email", selfEmail, { shouldDirty: false, shouldTouch: false });
    }
  }, [user, form]);



  useEffect(() => {
    const tripName = form.getValues("name");
    const memberCount = form.getValues("memberCount");
    const memberEmails = form.getValues("memberEmails");

    if (!tripName || tripName.length < 3) {
      setCurrentStep("tripName");
    } else if (!memberCount || memberCount === 0) {
      setCurrentStep("memberCount");
    } else if (!memberEmails || memberEmails.length === 0) {
      setCurrentStep("memberDetails");
    } else if (budgetItems.length === 0) {
      setCurrentStep("budgetItems");
    } else {
      setCurrentStep("review");
    }
  }, [form.watch("name"), form.watch("memberCount"), form.watch("memberEmails"), budgetItems.length]);

  // Update member emails array when count changes
  const handleMemberCountChange = (value: string) => {
    const count = parseInt(value);
    form.setValue("memberCount", count);
    const currentMembers = form.getValues("memberEmails");
    if (currentMembers.length < count) {
      // Add empty objects for new members - they will default to Member N during submission
      const newMembers = Array.from({ length: count - currentMembers.length }).map(() => ({ name: "", email: "" }));
      form.setValue("memberEmails", [...currentMembers, ...newMembers]);
    } else if (currentMembers.length > count) {
      // Remove excess members
      form.setValue("memberEmails", currentMembers.slice(0, count));
    }
  };

  const addBudgetItem = () => {
    const newItem: BudgetItemInput = {
      tempId: Date.now().toString(),
      name: "",
      amount: 0,
      category: "Miscellaneous",
      memberIds: [],
      isUnplanned: false,
    };
    setBudgetItems([...budgetItems, newItem]);
  };

  const removeBudgetItem = (tempId: string) => {
    setBudgetItems(budgetItems.filter((item) => item.tempId !== tempId));
  };

  const updateBudgetItem = (tempId: string, updates: Partial<BudgetItemInput>) => {
    setBudgetItems(budgetItems.map((item) => (item.tempId === tempId ? { ...item, ...updates } : item)));
  };

  const toggleMember = (itemTempId: string, memberIndex: number) => {
    const item = budgetItems.find((i) => i.tempId === itemTempId);
    if (!item) return;

    const memberId = memberIndex.toString();
    const isSelected = item.memberIds.includes(memberId);

    if (isSelected) {
      updateBudgetItem(itemTempId, {
        memberIds: item.memberIds.filter((id) => id !== memberId),
      });
    } else {
      updateBudgetItem(itemTempId, {
        memberIds: [...item.memberIds, memberId],
      });
    }
  };

  const toggleAllMembers = (itemTempId: string) => {
    const item = budgetItems.find((i) => i.tempId === itemTempId);
    if (!item || !memberCount) return;

    const allMemberIds = Array.from({ length: memberCount }, (_, i) => i.toString());
    const allSelected = item.memberIds.length === memberCount && memberCount > 0;

    updateBudgetItem(itemTempId, {
      memberIds: allSelected ? [] : allMemberIds,
    });
  };

  const createTripMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertTripSchema> & { budgetItems: BudgetItemInput[] }) => {
      if (!user?.id) {
        throw new Error("Please sign in to save your trip");
      }
      return await createTrip(user.id, {
        name: data.name,
        memberEmails: data.memberEmails.map(({ name, email }) => ({
          name,
          email: email ?? "",
        })),
        budgetItems: data.budgetItems,
      });
    },
    onSuccess: (tripId) => {
      console.log("Trip saved successfully:", tripId);
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast({
        title: "Trip created!",
        description: "Your travel budget has been saved successfully.",
      });
      // Add small delay to ensure trip is saved in DB, then redirect to home
      // so user can see the trip in the list before clicking to view dashboard
      setTimeout(() => {
        setLocation("/home");
      }, 500);
    },
    onError: (error: any) => {
      console.error("Trip creation error:", error);
      toast({
        title: "Failed to create trip",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: z.infer<typeof insertTripSchema>) => {
    if (!user?.id) {
      toast({
        title: "Sign in required",
        description: "Please sign in with Google to save your trip.",
        variant: "destructive",
      });
      signInWithGoogle();
      return;
    }

    if (!data.name || data.name.length < 3) {
      toast({
        title: "Trip name required",
        description: "Please enter a trip name (at least 3 characters).",
        variant: "destructive",
      });
      return;
    }

    const invalidItems = budgetItems.filter(
      (item) => !item.name || item.amount <= 0 || item.memberIds.length === 0
    );

    if (invalidItems.length > 0) {
      console.log("Invalid items:", invalidItems);
      toast({
        title: "Invalid budget items",
        description: "Please fill in all budget items with valid amounts and select members.",
        variant: "destructive",
      });
      return;
    }

    console.log("✅ All validation passed. Submitting...");
    
    // Ensure the first member (owner) has the user's actual name
    const memberEmailsWithOwnerName = data.memberEmails.map((member, index) => {
      if (index === 0 && user?.name) {
        return { ...member, name: user.name };
      }
      return member;
    });
    
    createTripMutation.mutate({ ...data, memberEmails: memberEmailsWithOwnerName, budgetItems });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {showTutorial && (
        <CreateTripTutorial 
          onComplete={() => setShowTutorial(false)}
        />
      )}

      {tutorialEnabled && (
        <CreateTripChatbot
          currentStep={currentStep}
          tripName={form.getValues("name")}
          memberCount={form.getValues("memberCount")}
          hasBudgetItems={budgetItems.length > 0}
          isOpen={chatbotOpen}
          onOpenChange={setChatbotOpen}
        />
      )}

      <main className="container mx-auto max-w-4xl px-4 py-8 md:px-8">
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <h1 className="text-3xl font-bold">Create New Trip</h1>
          </div>
          <p className="text-muted-foreground">
            Set up your travel budget and add members
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Trip Name */}
            <Card>
              <CardHeader>
                <CardTitle>Trip Details</CardTitle>
                <CardDescription>Give your trip a memorable name</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trip Name (minimum 3 characters)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Bali Adventure 2024"
                          {...field}
                          data-testid="input-trip-name"
                          onChange={(e) => {
                            field.onChange(e);
                            console.log("Trip name changed:", e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Members */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Trip Members
                </CardTitle>
                <CardDescription>Add the people who will share expenses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="memberCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Members</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            placeholder="Enter number of members"
                            value={field.value || ""}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              if (!isNaN(value) && value >= 1 && value <= 100) {
                                handleMemberCountChange(value.toString());
                              } else if (e.target.value === "") {
                                form.setValue("memberCount", undefined);
                                form.setValue("memberEmails", []);
                              }
                            }}
                            data-testid="input-member-count"
                            className="flex-1"
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const currentCount = form.getValues("memberCount");
                            if (currentCount && currentCount < 100) {
                              handleMemberCountChange((currentCount + 1).toString());
                            }
                          }}
                          title="Add one more member"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">Enter a number between 1 and 100</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  {memberCount ? Array.from({ length: memberCount }).map((_, index) => (
                    <div key={index} className="space-y-2">
                      <FormField
                        control={form.control}
                        name={`memberEmails.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{index === 0 && user ? "Member 1 (You)" : `Member ${index + 1} Name (Optional)`}</FormLabel>
                            <div className="flex items-center gap-2">
                              <Avatar className={`h-10 w-10 ${MEMBER_COLORS[index % MEMBER_COLORS.length]}`}>
                                <AvatarFallback className="text-white">
                                  {field.value ? field.value.charAt(0).toUpperCase() : index + 1}
                                </AvatarFallback>
                              </Avatar>
                              <FormControl>
                                <Input
                                  placeholder={index === 0 && user ? (user.name?.trim() || user.email || "You") : `Leave blank for Member ${index + 1}`}
                                  {...field}
                                  data-testid={`input-member-${index}-name`}
                                  readOnly={index === 0 && !!user}
                                />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`memberEmails.${index}.email`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{index === 0 && user ? "Member 1 Email (Your Google Account)" : `Member ${index + 1} Email (Optional - for Google Account invites)`}</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder={index === 0 && user ? (user.email || "your.email@example.com") : `email${index + 1}@example.com (optional)`}
                                {...field}
                                data-testid={`input-member-${index}-email`}
                                readOnly={index === 0 && !!user}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )) : null}
                </div>
              </CardContent>
            </Card>

            {/* Budget Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IndianRupee className="h-5 w-5" />
                  Budget Items
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
                            <div className="relative">
                              <Label htmlFor={`item-name-${item.tempId}`}>Item Name</Label>
                              <Input
                                id={`item-name-${item.tempId}`}
                                placeholder="e.g., Hotel, Tea, Coffee..."
                                value={item.name}
                                onChange={(e) => {
                                  updateBudgetItem(item.tempId, { name: e.target.value });
                                  setShowSuggestions({ ...showSuggestions, [item.tempId]: true });
                                }}
                                onFocus={() => setShowSuggestions({ ...showSuggestions, [item.tempId]: true })}
                                onBlur={() => setTimeout(() => setShowSuggestions({ ...showSuggestions, [item.tempId]: false }), 200)}
                                data-testid={`input-item-name-${itemIndex}`}
                              />
                              {showSuggestions[item.tempId] && (
                                <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-md border border-input bg-background shadow-md">
                                  {COMMON_ITEMS.filter(s => s.toLowerCase().includes(item.name.toLowerCase())).map(suggestion => (
                                    <button
                                      key={suggestion}
                                      type="button"
                                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                                      onClick={() => {
                                        updateBudgetItem(item.tempId, { name: suggestion });
                                        setShowSuggestions({ ...showSuggestions, [item.tempId]: false });
                                      }}
                                    >
                                      {suggestion}
                                    </button>
                                  ))}
                                  {COMMON_ITEMS.filter(s => s.toLowerCase().includes(item.name.toLowerCase())).length === 0 && item.name && (
                                    <div className="px-3 py-2 text-sm text-muted-foreground">No suggestions</div>
                                  )}
                                </div>
                              )}
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
                                  updateBudgetItem(item.tempId, { amount: parseFloat(e.target.value) || 0 })
                                }
                                data-testid={`input-item-amount-${itemIndex}`}
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor={`item-category-${item.tempId}`}>Category</Label>
                            <Select
                              value={item.category}
                              onValueChange={(value) =>
                                updateBudgetItem(item.tempId, { category: value as any })
                              }
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
                            <div className="flex items-center justify-between">
                              <Label>Split between:</Label>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`select-all-${item.tempId}`}
                                  checked={item.memberIds.length === memberCount && memberCount > 0}
                                  onCheckedChange={() => toggleAllMembers(item.tempId)}
                                  data-testid={`checkbox-select-all-${itemIndex}`}
                                />
                                <label htmlFor={`select-all-${item.tempId}`} className="text-sm font-medium cursor-pointer">
                                  Select All
                                </label>
                              </div>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                              {memberEmails.map((member, idx) => (
                                <div key={idx} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`member-${item.tempId}-${idx}`}
                                    checked={item.memberIds.includes(idx.toString())}
                                    onCheckedChange={() => toggleMember(item.tempId, idx)}
                                    data-testid={`checkbox-member-${itemIndex}-${idx}`}
                                  />
                                  <label
                                    htmlFor={`member-${item.tempId}-${idx}`}
                                    className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                  >
                                    <Avatar className={`h-6 w-6 ${MEMBER_COLORS[idx % MEMBER_COLORS.length]}`}>
                                      <AvatarFallback className="text-xs text-white">
                                        {member.name ? member.name.charAt(0).toUpperCase() : idx + 1}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="truncate">{member.name || `Member ${idx + 1}`}</span>
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
                          onClick={() => removeBudgetItem(item.tempId)}
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
                  onClick={addBudgetItem}
                  data-testid="button-add-item"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Budget Item
                </Button>
              </CardContent>
            </Card>

            {/* Submit Buttons */}
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/home")}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="gap-2"
                disabled={createTripMutation.isPending}
                data-testid="button-save-trip"
              >
                {createTripMutation.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Saving...
                  </>
                ) : user?.id ? (
                  <>
                    <IndianRupee className="h-4 w-4" />
                    Save Trip
                  </>
                ) : (
                  <>
                    <IndianRupee className="h-4 w-4" />
                    Sign In to Save
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </main>
    </div>
  );
}
