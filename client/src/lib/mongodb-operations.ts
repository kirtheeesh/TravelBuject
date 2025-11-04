import type { Trip, BudgetItem, Member } from "@shared/schema";

const MEMBER_COLORS = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"];

const API_BASE = "/api";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export async function createTrip(
  userId: string,
  tripData: {
    name: string;
    memberNames: string[];
    budgetItems: Array<{
      name: string;
      amount: number;
      category: string;
      memberIds: string[];
    }>;
  }
): Promise<string> {
  const members: Member[] = tripData.memberNames.map((name, index) => ({
    id: index.toString(),
    name,
    color: MEMBER_COLORS[index % MEMBER_COLORS.length],
  }));

  const response = await fetch(`${API_BASE}/trips`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      name: tripData.name,
      members,
      budgetItems: tripData.budgetItems,
    }),
  });

  const result = await handleResponse<{ id: string }>(response);
  return result.id;
}

export async function getTrips(userId: string): Promise<Trip[]> {
  const response = await fetch(`${API_BASE}/trips?userId=${encodeURIComponent(userId)}`);
  const result = await handleResponse<{ trips: Trip[] }>(response);
  return result.trips;
}

export function subscribeToTrips(
  userId: string,
  onUpdate: (trips: Trip[]) => void,
  onError?: (error: Error) => void
): () => void {
  let isSubscribed = true;
  let pollInterval: NodeJS.Timeout | null = null;

  const poll = async () => {
    if (!isSubscribed) return;
    try {
      const trips = await getTrips(userId);
      if (isSubscribed) {
        onUpdate(trips);
      }
    } catch (error) {
      if (isSubscribed && onError) {
        onError(error instanceof Error ? error : new Error("Unknown error"));
      }
    }
  };

  poll();
  pollInterval = setInterval(poll, 5000);

  return () => {
    isSubscribed = false;
    if (pollInterval) clearInterval(pollInterval);
  };
}

export async function getTrip(tripId: string): Promise<Trip | null> {
  try {
    const response = await fetch(`${API_BASE}/trips/${encodeURIComponent(tripId)}`);
    if (response.status === 404) return null;
    const result = await handleResponse<Trip>(response);
    return result;
  } catch (error) {
    return null;
  }
}

export function subscribeToTrip(
  tripId: string,
  onUpdate: (trip: Trip | null) => void,
  onError?: (error: Error) => void
): () => void {
  let isSubscribed = true;
  let pollInterval: NodeJS.Timeout | null = null;

  const poll = async () => {
    if (!isSubscribed) return;
    try {
      const trip = await getTrip(tripId);
      if (isSubscribed) {
        onUpdate(trip);
      }
    } catch (error) {
      if (isSubscribed && onError) {
        onError(error instanceof Error ? error : new Error("Unknown error"));
      }
    }
  };

  poll();
  pollInterval = setInterval(poll, 5000);

  return () => {
    isSubscribed = false;
    if (pollInterval) clearInterval(pollInterval);
  };
}

export async function getBudgetItems(tripId: string): Promise<BudgetItem[]> {
  const response = await fetch(`${API_BASE}/trips/${encodeURIComponent(tripId)}/budget-items`);
  const result = await handleResponse<{ items: BudgetItem[] }>(response);
  return result.items;
}

export function subscribeToBudgetItems(
  tripId: string,
  onUpdate: (items: BudgetItem[], changes?: { added: BudgetItem[]; modified: BudgetItem[]; removed: BudgetItem[] }) => void,
  onError?: (error: Error) => void
): () => void {
  let isSubscribed = true;
  let pollInterval: NodeJS.Timeout | null = null;
  let previousItems: BudgetItem[] = [];

  const poll = async () => {
    if (!isSubscribed) return;
    try {
      const items = await getBudgetItems(tripId);
      if (isSubscribed) {
        const changes = {
          added: items.filter(item => !previousItems.find(p => p.id === item.id)),
          modified: items.filter(item => {
            const prev = previousItems.find(p => p.id === item.id);
            return prev && JSON.stringify(prev) !== JSON.stringify(item);
          }),
          removed: previousItems.filter(item => !items.find(p => p.id === item.id)),
        };
        previousItems = items;
        onUpdate(items, changes);
      }
    } catch (error) {
      if (isSubscribed && onError) {
        onError(error instanceof Error ? error : new Error("Unknown error"));
      }
    }
  };

  poll();
  pollInterval = setInterval(poll, 5000);

  return () => {
    isSubscribed = false;
    if (pollInterval) clearInterval(pollInterval);
  };
}

export async function addBudgetItem(
  tripId: string,
  itemData: {
    name: string;
    amount: number;
    category: string;
    memberIds: string[];
  }
): Promise<string> {
  const response = await fetch(`${API_BASE}/trips/${encodeURIComponent(tripId)}/budget-items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(itemData),
  });

  const result = await handleResponse<{ id: string }>(response);
  return result.id;
}
