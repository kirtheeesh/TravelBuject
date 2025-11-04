import { MongoClient, Db, Collection } from "mongodb";

let client: MongoClient | null = null;
let db: Db | null = null;

export interface Trip {
  _id?: string;
  id?: string;
  userId: string;
  name: string;
  members: any[];
  createdAt: number;
}

export interface BudgetItem {
  _id?: string;
  id?: string;
  tripId: string;
  name: string;
  amount: number;
  category: string;
  memberIds: string[];
  createdAt: number;
}

export interface SpendingItem {
  _id?: string;
  id?: string;
  tripId: string;
  budgetItemId: string;
  name: string;
  amount: number;
  category: string;
  memberIds: string[];
  createdAt: number;
  isCompleted: boolean;
}

export interface DBUser {
  _id?: string;
  id?: string;
  email: string;
  password?: string;
  name?: string;
  createdAt: number;
}

export async function connectDB(): Promise<Db> {
  if (db) {
    return db;
  }

  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI environment variable is not set");
  }

  try {
    client = new MongoClient(mongoUri);
    await client.connect();

    db = client.db("travelbudget");

    // Create collections if they don't exist
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    if (!collectionNames.includes("trips")) {
      await db.createCollection("trips");
      await db.collection("trips").createIndex({ userId: 1, createdAt: -1 });
    }

    if (!collectionNames.includes("budgetItems")) {
      await db.createCollection("budgetItems");
      await db.collection("budgetItems").createIndex({ tripId: 1, createdAt: -1 });
    }

    if (!collectionNames.includes("spendingItems")) {
      await db.createCollection("spendingItems");
      await db.collection("spendingItems").createIndex({ tripId: 1, createdAt: -1 });
      await db.collection("spendingItems").createIndex({ budgetItemId: 1 });
    }

    if (!collectionNames.includes("users")) {
      await db.createCollection("users");
      await db.collection("users").createIndex({ email: 1 }, { unique: true });
    }

    console.log("Connected to MongoDB");
    return db;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}

export function getDB(): Db {
  if (!db) {
    throw new Error("Database not initialized. Call connectDB first.");
  }
  return db;
}

export async function closeDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log("MongoDB connection closed");
  }
}

export function getTripsCollection(): Collection<Trip> {
  return getDB().collection<Trip>("trips");
}

export function getBudgetItemsCollection(): Collection<BudgetItem> {
  return getDB().collection<BudgetItem>("budgetItems");
}

export function getSpendingItemsCollection(): Collection<SpendingItem> {
  return getDB().collection<SpendingItem>("spendingItems");
}

export function getUsersCollection(): Collection<DBUser> {
  return getDB().collection<DBUser>("users");
}
