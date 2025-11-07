import type { Trip, BudgetItem, SpendingItem, Member } from "@shared/schema";

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
    memberEmails: Array<{ name: string; email: string }>;
    budgetItems: Array<{
      name: string;
      amount: number;
      category: string;
      memberIds: string[];
    }>;
  }
): Promise<string> {
  const members: Member[] = tripData.memberEmails.map((member, index) => ({
    id: index.toString(),
    name: member.name,
    email: member.email || undefined,
    color: MEMBER_COLORS[index % MEMBER_COLORS.length],
    status: index === 0 ? "owner" : member.email ? "invited" : "joined",
  }));

  const response = await fetch(`${API_BASE}/trips`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
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
  const response = await fetch(`${API_BASE}/trips`, {
    credentials: "include",
  });
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
    const response = await fetch(`${API_BASE}/trips/${encodeURIComponent(tripId)}`, {
      credentials: "include",
    });
    if (response.status === 404) return null;
    const result = await handleResponse<Trip>(response);
    return result;
  } catch (error) {
    return null;
  }
}

export function subscribeToTrip(
  tripId: string,
  onUpdate: (trip: Trip) => void,
  onError?: (error: Error) => void
): () => void {
  let isSubscribed = true;
  let pollInterval: NodeJS.Timeout | null = null;

  const poll = async () => {
    if (!isSubscribed) return;
    try {
      const trip = await getTrip(tripId);
      if (isSubscribed && trip) {
        onUpdate(trip);
      }
    } catch (error) {
      if (isSubscribed && onError) {
        onError(error instanceof Error ? error : new Error("Unknown error"));
      }
    }
  };

  poll();
  pollInterval = setInterval(poll, 2000);

  return () => {
    isSubscribed = false;
    if (pollInterval) clearInterval(pollInterval);
  };
}

export async function getBudgetItems(tripId: string): Promise<BudgetItem[]> {
  const response = await fetch(`${API_BASE}/trips/${encodeURIComponent(tripId)}/budget-items`, {
    credentials: "include",
  });
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
    credentials: "include",
    body: JSON.stringify(itemData),
  });

  const result = await handleResponse<{ id: string }>(response);
  return result.id;
}

export async function deleteBudgetItem(tripId: string, itemId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE}/trips/${encodeURIComponent(tripId)}/budget-items/${encodeURIComponent(itemId)}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );

  await handleResponse<{ message: string }>(response);
}

export async function deleteTrip(tripId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/trips/${encodeURIComponent(tripId)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  await handleResponse<{ message: string }>(response);
}

// Spending operations
export async function getSpendingItems(tripId: string): Promise<SpendingItem[]> {
  const response = await fetch(`${API_BASE}/trips/${encodeURIComponent(tripId)}/spending-items`, {
    credentials: "include",
  });
  const result = await handleResponse<{ items: SpendingItem[] }>(response);
  return result.items;
}

export function subscribeToSpendingItems(
  tripId: string,
  onUpdate: (items: SpendingItem[], changes?: { added: SpendingItem[]; modified: SpendingItem[]; removed: SpendingItem[] }) => void,
  onError?: (error: Error) => void
): () => void {
  let isSubscribed = true;
  let pollInterval: NodeJS.Timeout | null = null;
  let previousItems: SpendingItem[] = [];

  const poll = async () => {
    if (!isSubscribed) return;
    try {
      const items = await getSpendingItems(tripId);
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
  pollInterval = setInterval(poll, 2000); // Faster polling for spending items

  return () => {
    isSubscribed = false;
    if (pollInterval) clearInterval(pollInterval);
  };
}

export async function addSpendingItem(
  tripId: string,
  itemData: {
    budgetItemId?: string; // Optional for unplanned spending
    name: string;
    amount: number;
    category: string;
    memberIds: string[];
  }
): Promise<string> {
  const response = await fetch(`${API_BASE}/trips/${encodeURIComponent(tripId)}/spending-items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(itemData),
  });

  const result = await handleResponse<{ id: string }>(response);
  return result.id;
}

export async function updateSpendingItem(
  tripId: string,
  itemId: string,
  updates: Partial<{ isCompleted: boolean }>
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/trips/${encodeURIComponent(tripId)}/spending-items/${encodeURIComponent(itemId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(updates),
    }
  );

  await handleResponse<{ message: string }>(response);
}

export async function deleteSpendingItem(tripId: string, itemId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE}/trips/${encodeURIComponent(tripId)}/spending-items/${encodeURIComponent(itemId)}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );

  await handleResponse<{ message: string }>(response);
}

export async function inviteMembers(
  tripId: string,
  members: Array<{ name: string; email?: string }>
): Promise<{ message: string; invitedMembers: Member[]; invitationCodes: Array<{ name: string; email?: string; code: string }> }> {
  const response = await fetch(`${API_BASE}/trips/${encodeURIComponent(tripId)}/invite-members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ members }),
  });

  return await handleResponse<{ message: string; invitedMembers: Member[]; invitationCodes: Array<{ name: string; email?: string; code: string }> }>(response);
}

export async function joinTrip(invitationCode: string): Promise<{ message: string; tripId: string; tripName: string }> {
  const response = await fetch(`${API_BASE}/join/${encodeURIComponent(invitationCode)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  return await handleResponse<{ message: string; tripId: string; tripName: string }>(response);
}

export async function rejectInvitation(invitationCode: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE}/join/${encodeURIComponent(invitationCode)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  return await handleResponse<{ message: string }>(response);
}

async function deleteTripMember(tripId: string, memberId: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE}/trips/${encodeURIComponent(tripId)}/members/${encodeURIComponent(memberId)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  return await handleResponse<{ message: string }>(response);
}

export async function leaveTrip(tripId: string, memberId: string): Promise<{ message: string }> {
  return deleteTripMember(tripId, memberId);
}

export async function removeTripMember(tripId: string, memberId: string): Promise<{ message: string }> {
  return deleteTripMember(tripId, memberId);
}

export async function updateTripMember(
  tripId: string,
  memberId: string,
  updates: { name: string }
): Promise<Member> {
  const response = await fetch(
    `${API_BASE}/trips/${encodeURIComponent(tripId)}/members/${encodeURIComponent(memberId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(updates),
    }
  );

  const result = await handleResponse<{ message: string; member: Member }>(response);
  return result.member;
}
