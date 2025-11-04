import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Trip, BudgetItem, Member } from "@shared/schema";

const MEMBER_COLORS = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"];

// Helper to check if Firebase is available
function ensureDb() {
  if (!db) {
    throw new Error("Firebase is not initialized. Please sign in to use this feature.");
  }
  return db;
}

// Trips Collection
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
  const firebaseDb = ensureDb();
  
  // Create members with IDs and colors
  const members: Member[] = tripData.memberNames.map((name, index) => ({
    id: index.toString(),
    name,
    color: MEMBER_COLORS[index % MEMBER_COLORS.length],
  }));

  // Create the trip
  const tripRef = await addDoc(collection(firebaseDb, "trips"), {
    userId,
    name: tripData.name,
    members,
    createdAt: Date.now(),
  });

  // Create budget items for this trip
  for (const item of tripData.budgetItems) {
    await addDoc(collection(firebaseDb, "budgetItems"), {
      tripId: tripRef.id,
      name: item.name,
      amount: item.amount,
      category: item.category,
      memberIds: item.memberIds,
      createdAt: Date.now(),
    });
  }

  return tripRef.id;
}

// Real-time listener for trips
export function subscribeToTrips(
  userId: string,
  onUpdate: (trips: Trip[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    const firebaseDb = ensureDb();
    const q = query(
      collection(firebaseDb, "trips"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(
      q,
      (querySnapshot) => {
        const trips: Trip[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          trips.push({
            id: doc.id,
            userId: data.userId,
            name: data.name,
            members: data.members,
            createdAt: data.createdAt,
          });
        });
        onUpdate(trips);
      },
      (error) => {
        console.error("Error listening to trips:", error);
        onError?.(error as Error);
      }
    );
  } catch (error) {
    const err = new Error(error instanceof Error ? error.message : "Firebase is not available");
    onError?.(err);
    return () => {};
  }
}

// Fallback for one-off fetch (backwards compatibility)
export async function getTrips(userId: string): Promise<Trip[]> {
  const firebaseDb = ensureDb();
  const q = query(
    collection(firebaseDb, "trips"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  const querySnapshot = await getDocs(q);
  const trips: Trip[] = [];

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    trips.push({
      id: doc.id,
      userId: data.userId,
      name: data.name,
      members: data.members,
      createdAt: data.createdAt,
    });
  });

  return trips;
}

// Real-time listener for a single trip
export function subscribeToTrip(
  tripId: string,
  onUpdate: (trip: Trip | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    const firebaseDb = ensureDb();
    return onSnapshot(
      doc(firebaseDb, "trips", tripId),
      (docSnapshot) => {
        if (!docSnapshot.exists()) {
          onUpdate(null);
          return;
        }

        const data = docSnapshot.data();
        onUpdate({
          id: docSnapshot.id,
          userId: data.userId,
          name: data.name,
          members: data.members,
          createdAt: data.createdAt,
        });
      },
      (error) => {
        console.error("Error listening to trip:", error);
        onError?.(error as Error);
      }
    );
  } catch (error) {
    const err = new Error(error instanceof Error ? error.message : "Firebase is not available");
    onError?.(err);
    return () => {};
  }
}

// Fallback for one-off fetch
export async function getTrip(tripId: string): Promise<Trip | null> {
  const firebaseDb = ensureDb();
  const tripDoc = await getDoc(doc(firebaseDb, "trips", tripId));

  if (!tripDoc.exists()) {
    return null;
  }

  const data = tripDoc.data();
  return {
    id: tripDoc.id,
    userId: data.userId,
    name: data.name,
    members: data.members,
    createdAt: data.createdAt,
  };
}

// Budget Items Collection - Real-time listener
export function subscribeToBudgetItems(
  tripId: string,
  onUpdate: (items: BudgetItem[], changes?: { added: BudgetItem[]; modified: BudgetItem[]; removed: BudgetItem[] }) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    const firebaseDb = ensureDb();
    const q = query(
      collection(firebaseDb, "budgetItems"),
      where("tripId", "==", tripId),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(
      q,
      (querySnapshot) => {
        const items: BudgetItem[] = [];
        const changes = {
          added: [] as BudgetItem[],
          modified: [] as BudgetItem[],
          removed: [] as BudgetItem[],
        };

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const item: BudgetItem = {
            id: doc.id,
            tripId: data.tripId,
            name: data.name,
            amount: data.amount,
            category: data.category,
            memberIds: data.memberIds,
            createdAt: data.createdAt,
          };
          items.push(item);
        });

        // Track changes for notifications
        querySnapshot.docChanges().forEach((change) => {
          const data = change.doc.data();
          const item: BudgetItem = {
            id: change.doc.id,
            tripId: data.tripId,
            name: data.name,
            amount: data.amount,
            category: data.category,
            memberIds: data.memberIds,
            createdAt: data.createdAt,
          };

          if (change.type === "added") {
            changes.added.push(item);
          } else if (change.type === "modified") {
            changes.modified.push(item);
          } else if (change.type === "removed") {
            changes.removed.push(item);
          }
        });

        onUpdate(items, changes);
      },
      (error) => {
        console.error("Error listening to budget items:", error);
        onError?.(error as Error);
      }
    );
  } catch (error) {
    const err = new Error(error instanceof Error ? error.message : "Firebase is not available");
    onError?.(err);
    return () => {};
  }
}

// Fallback for one-off fetch
export async function getBudgetItems(tripId: string): Promise<BudgetItem[]> {
  const firebaseDb = ensureDb();
  const q = query(
    collection(firebaseDb, "budgetItems"),
    where("tripId", "==", tripId),
    orderBy("createdAt", "desc")
  );

  const querySnapshot = await getDocs(q);
  const items: BudgetItem[] = [];

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    items.push({
      id: doc.id,
      tripId: data.tripId,
      name: data.name,
      amount: data.amount,
      category: data.category,
      memberIds: data.memberIds,
      createdAt: data.createdAt,
    });
  });

  return items;
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
  const firebaseDb = ensureDb();
  const itemRef = await addDoc(collection(firebaseDb, "budgetItems"), {
    tripId,
    name: itemData.name,
    amount: itemData.amount,
    category: itemData.category,
    memberIds: itemData.memberIds,
    createdAt: Date.now(),
  });

  return itemRef.id;
}
