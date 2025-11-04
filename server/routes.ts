import type { Express, Request, Response } from "express";
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

function ensureAuth(req: Request, res: Response, next: Function) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  await connectDB();

  app.get("/api/health", (_req, res) => {
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

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    } catch (error) {
      console.error("Google sign-in error:", error);
      res.status(500).json({ message: "Sign-in failed" });
    }
  });

  app.post("/api/auth/signout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
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

      await tripsCollection.insertOne({
        _id: tripId,
        id: tripId,
        userId,
        name,
        members,
        createdAt: Date.now(),
      });

      if (budgetItems && budgetItems.length > 0) {
        const items = budgetItems.map((item: any) => ({
          _id: randomUUID(),
          tripId,
          ...item,
          createdAt: Date.now(),
        }));
        await budgetItemsCollection.insertMany(items);
      }

      res.json({ id: tripId });
    } catch (error) {
      console.error("Trip creation error:", error);
      res.status(500).json({ message: "Failed to create trip" });
    }
  });

  app.get("/api/trips", ensureAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session!.userId!;
      const tripsCollection = getTripsCollection();

      const trips = await tripsCollection
        .find({ userId })
        .sort({ createdAt: -1 })
        .toArray();

      const formattedTrips = trips.map((trip) => ({
        id: trip._id || trip.id,
        userId: trip.userId,
        name: trip.name,
        members: trip.members,
        createdAt: trip.createdAt,
      }));

      res.json({ trips: formattedTrips });
    } catch (error) {
      console.error("Get trips error:", error);
      res.status(500).json({ message: "Failed to fetch trips" });
    }
  });

  app.get("/api/trips/:id", async (req: Request, res: Response) => {
    try {
      const tripId = req.params.id;
      const tripsCollection = getTripsCollection();

      const trip = await tripsCollection.findOne({ _id: tripId });

      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      res.json({
        id: trip._id || trip.id,
        userId: trip.userId,
        name: trip.name,
        members: trip.members,
        createdAt: trip.createdAt,
      });
    } catch (error) {
      console.error("Get trip error:", error);
      res.status(500).json({ message: "Failed to fetch trip" });
    }
  });

  app.post("/api/trips/:id/budget-items", async (req: Request, res: Response) => {
    try {
      const tripId = req.params.id;
      const { name, amount, category, memberIds } = req.body;

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

  app.get("/api/trips/:id/budget-items", async (req: Request, res: Response) => {
    try {
      const tripId = req.params.id;
      const budgetItemsCollection = getBudgetItemsCollection();

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

  const httpServer = createServer(app);

  return httpServer;
}
