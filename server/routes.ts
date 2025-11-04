import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { connectDB, getTripsCollection, getBudgetItemsCollection, getUsersCollection } from "./db";
import { verifyGoogleToken } from "./auth";
import { randomUUID } from "crypto";

interface SessionUser {
  id: string;
  email: string;
  name?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

declare module "express-session" {
  interface SessionData {
    userId?: string;
    userEmail?: string;
    userName?: string;
  }
}

function ensureAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    console.log(`[ensureAuth] Access denied. Session: ${JSON.stringify({
      sessionID: req.sessionID,
      session: req.session,
      cookies: req.headers.cookie?.substring(0, 100)
    })}`);
    return res.status(401).json({ message: "Unauthorized" });
  }
  console.log(`[ensureAuth] Access allowed for userId: ${req.session.userId}`);
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  await connectDB();

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", message: "BkTravel API is running" });
  });

  app.get("/api/auth/session", (req: Request, res: Response) => {
    if (req.session?.userId) {
      return res.json({
        user: {
          id: req.session.userId,
          email: req.session.userEmail,
          name: req.session.userName,
        },
      });
    }
    res.status(401).json({ message: "Not authenticated" });
  });

  app.post("/api/auth/google-signin", async (req: Request, res: Response) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }

      const user = await verifyGoogleToken(token);

      if (!user) {
        return res.status(401).json({ message: "Invalid Google token" });
      }

      req.session.userId = user.id;
      req.session.userEmail = user.email;
      req.session.userName = user.name;

      req.session.save((err: Error | null) => {
        if (err) {
          return res.status(500).json({ message: "Failed to save session" });
        }
        res.json({
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
        });
      });
    } catch (error) {
      console.error("Google sign-in error:", error);
      res.status(500).json({ message: "Sign-in failed" });
    }
  });

  app.post("/api/auth/signout", (req: Request, res: Response) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Sign-out failed" });
      }
      res.json({ message: "Signed out successfully" });
    });
  });

  app.post("/api/trips", ensureAuth, async (req: Request, res: Response) => {
    try {
      const { name, members, budgetItems } = req.body;
      const userId = req.session!.userId!;

      const tripId = randomUUID();
      const tripsCollection = getTripsCollection();
      const budgetItemsCollection = getBudgetItemsCollection();

      console.log("[POST /api/trips] Creating trip:", { tripId, userId, name, members: members?.length });

      await tripsCollection.insertOne({
        _id: tripId,
        id: tripId,
        userId,
        name,
        members,
        createdAt: Date.now(),
      });

      console.log("[POST /api/trips] Trip inserted successfully");

      if (budgetItems && budgetItems.length > 0) {
        const items = budgetItems.map((item: any) => ({
          _id: randomUUID(),
          tripId,
          ...item,
          createdAt: Date.now(),
        }));
        await budgetItemsCollection.insertMany(items);
        console.log(`[POST /api/trips] Inserted ${items.length} budget items`);
      }

      // Ensure session is saved before responding
      req.session.save((err: Error | null) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Failed to save session" });
        }
        console.log("[POST /api/trips] Response sent with tripId:", tripId);
        res.json({ id: tripId });
      });
    } catch (error) {
      console.error("Trip creation error:", error);
      res.status(500).json({ message: "Failed to create trip" });
    }
  });

  app.get("/api/trips", ensureAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session!.userId!;
      const tripsCollection = getTripsCollection();
      const budgetItemsCollection = getBudgetItemsCollection();

      console.log("[GET /api/trips] Fetching trips for userId:", userId);
      
      const trips = await tripsCollection
        .find({ userId })
        .sort({ createdAt: -1 })
        .toArray();
      
      console.log(`[GET /api/trips] Found ${trips.length} trips for userId:`, userId);

      const formattedTrips = await Promise.all(
        trips.map(async (trip) => {
          const budgetItems = await budgetItemsCollection
            .find({ tripId: trip._id || trip.id })
            .sort({ createdAt: -1 })
            .toArray();

          return {
            id: trip._id || trip.id,
            userId: trip.userId,
            name: trip.name,
            members: trip.members,
            createdAt: trip.createdAt,
            budgetItems: budgetItems.map((item) => ({
              id: item._id || item.id,
              tripId: item.tripId,
              name: item.name,
              amount: item.amount,
              category: item.category,
              memberIds: item.memberIds,
              createdAt: item.createdAt,
            })),
          };
        })
      );

      res.json({ trips: formattedTrips });
    } catch (error) {
      console.error("Get trips error:", error);
      res.status(500).json({ message: "Failed to fetch trips" });
    }
  });

  app.get("/api/trips/:id", ensureAuth, async (req: Request, res: Response) => {
    try {
      const tripId = req.params.id;
      const userId = req.session!.userId!;
      const tripsCollection = getTripsCollection();
      const budgetItemsCollection = getBudgetItemsCollection();

      console.log("[GET /api/trips/:id] Looking for trip:", { tripId, userId, sessionId: req.sessionID });

      const trip = await tripsCollection.findOne({ _id: tripId, userId });

      if (!trip) {
        console.log("[GET /api/trips/:id] Trip not found. Searching in DB for this tripId...");
        // Debug: check if trip exists without userId filter
        const tripWithoutUserFilter = await tripsCollection.findOne({ _id: tripId });
        console.log("[GET /api/trips/:id] Trip exists in DB?", !!tripWithoutUserFilter);
        if (tripWithoutUserFilter) {
          console.log("[GET /api/trips/:id] Trip exists but with different userId. Trip userId:", tripWithoutUserFilter.userId, "Session userId:", userId);
        }
        return res.status(404).json({ message: "Trip not found" });
      }
      
      console.log("[GET /api/trips/:id] Trip found:", { tripId, name: trip.name });

      const budgetItems = await budgetItemsCollection
        .find({ tripId })
        .sort({ createdAt: -1 })
        .toArray();

      res.json({
        id: trip._id || trip.id,
        userId: trip.userId,
        name: trip.name,
        members: trip.members,
        createdAt: trip.createdAt,
        budgetItems: budgetItems.map((item) => ({
          id: item._id || item.id,
          tripId: item.tripId,
          name: item.name,
          amount: item.amount,
          category: item.category,
          memberIds: item.memberIds,
          createdAt: item.createdAt,
        })),
      });
    } catch (error) {
      console.error("Get trip error:", error);
      res.status(500).json({ message: "Failed to fetch trip" });
    }
  });

  app.post("/api/trips/:id/budget-items", ensureAuth, async (req: Request, res: Response) => {
    try {
      const tripId = req.params.id;
      const userId = req.session!.userId!;
      const { name, amount, category, memberIds } = req.body;
      const tripsCollection = getTripsCollection();

      // Verify that the trip belongs to the current user
      const trip = await tripsCollection.findOne({ _id: tripId, userId });
      if (!trip) {
        return res.status(403).json({ message: "Access denied: This trip is not yours" });
      }

      const itemId = randomUUID();
      const budgetItemsCollection = getBudgetItemsCollection();

      await budgetItemsCollection.insertOne({
        _id: itemId,
        id: itemId,
        tripId,
        name,
        amount,
        category,
        memberIds,
        createdAt: Date.now(),
      });

      res.json({ id: itemId });
    } catch (error) {
      console.error("Budget item creation error:", error);
      res.status(500).json({ message: "Failed to create budget item" });
    }
  });

  app.get("/api/trips/:id/budget-items", ensureAuth, async (req: Request, res: Response) => {
    try {
      const tripId = req.params.id;
      const userId = req.session!.userId!;
      const tripsCollection = getTripsCollection();
      const budgetItemsCollection = getBudgetItemsCollection();

      // Verify that the trip belongs to the current user
      const trip = await tripsCollection.findOne({ _id: tripId, userId });
      if (!trip) {
        return res.status(403).json({ message: "Access denied: This trip is not yours" });
      }

      const items = await budgetItemsCollection
        .find({ tripId })
        .sort({ createdAt: -1 })
        .toArray();

      const formattedItems = items.map((item) => ({
        id: item._id || item.id,
        tripId: item.tripId,
        name: item.name,
        amount: item.amount,
        category: item.category,
        memberIds: item.memberIds,
        createdAt: item.createdAt,
      }));

      res.json({ items: formattedItems });
    } catch (error) {
      console.error("Get budget items error:", error);
      res.status(500).json({ message: "Failed to fetch budget items" });
    }
  });

  app.delete("/api/trips/:tripId/budget-items/:itemId", ensureAuth, async (req: Request, res: Response) => {
    try {
      const { tripId, itemId } = req.params;
      const userId = req.session!.userId!;
      const tripsCollection = getTripsCollection();
      const budgetItemsCollection = getBudgetItemsCollection();

      // Verify that the trip belongs to the current user
      const trip = await tripsCollection.findOne({ _id: tripId, userId });
      if (!trip) {
        return res.status(403).json({ message: "Access denied: This trip is not yours" });
      }

      const result = await budgetItemsCollection.deleteOne({
        $or: [{ _id: itemId }, { id: itemId }],
        tripId,
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({ message: "Budget item not found" });
      }

      res.json({ message: "Budget item deleted successfully" });
    } catch (error) {
      console.error("Delete budget item error:", error);
      res.status(500).json({ message: "Failed to delete budget item" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
