import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { connectDB, getTripsCollection, getBudgetItemsCollection, getSpendingItemsCollection, getUsersCollection } from "./db";
import { verifyGoogleToken } from "./auth";
import { randomUUID } from "crypto";

const MEMBER_COLORS = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"];

function generateJoinCode() {
  return randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
}

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

      // Process members to set proper status, identifiers, and invitation metadata
      const processedMembers = members.map((member: any, index: number) => {
        const baseStatus = member.status || (member.email ? "invited" : "joined");
        const isOwner = index === 0 || baseStatus === "owner";
        const id = member.id ?? index.toString();
        const color = member.color || MEMBER_COLORS[index % MEMBER_COLORS.length];
        return {
          ...member,
          id,
          color,
          status: isOwner ? "owner" : baseStatus,
          invitedAt: !isOwner && member.email ? Date.now() : member.invitedAt,
          joinedAt: isOwner || baseStatus === "joined" ? Date.now() : undefined,
          invitationCode: !isOwner && member.email ? member.invitationCode ?? randomUUID() : undefined,
        };
      });

      await tripsCollection.insertOne({
        _id: tripId,
        id: tripId,
        userId,
        name,
        joinCode: generateJoinCode(),
        members: processedMembers,
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
      const userEmail = req.session!.userEmail!;
      const tripsCollection = getTripsCollection();
      const budgetItemsCollection = getBudgetItemsCollection();

      console.log("[GET /api/trips] Fetching trips for userId:", userId, "email:", userEmail);

      // Find trips where user is owner OR member
      const trips = await tripsCollection
        .find({
          $or: [
            { userId }, // User is the owner
            { "members.email": userEmail } // User is a member
          ]
        })
        .sort({ createdAt: -1 })
        .toArray();
      
      console.log(`[GET /api/trips] Found ${trips.length} trips for userId:`, userId);

      const formattedTrips = await Promise.all(
        trips.map(async (trip) => {
          let joinCode = trip.joinCode;
          if (!joinCode) {
            joinCode = generateJoinCode();
            await tripsCollection.updateOne(
              { _id: trip._id || trip.id },
              { $set: { joinCode } }
            );
          }

          const budgetItems = await budgetItemsCollection
            .find({ tripId: trip._id || trip.id })
            .sort({ createdAt: -1 })
            .toArray();

          return {
            id: trip._id || trip.id,
            userId: trip.userId,
            name: trip.name,
            joinCode,
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
      const userEmail = req.session!.userEmail!;
      const tripsCollection = getTripsCollection();
      const budgetItemsCollection = getBudgetItemsCollection();

      console.log("[GET /api/trips/:id] Looking for trip:", { tripId, userId, userEmail, sessionId: req.sessionID });

      // First try to find trip where user is the owner
      let trip = await tripsCollection.findOne({ _id: tripId, userId });

      // If not found as owner, check if user is a member of the trip
      if (!trip) {
        trip = await tripsCollection.findOne({
          _id: tripId,
          "members.email": userEmail
        });

        if (!trip) {
          console.log("[GET /api/trips/:id] Trip not found for user");
          return res.status(404).json({ message: "Trip not found" });
        }
      }
      
      console.log("[GET /api/trips/:id] Trip found:", { tripId, name: trip.name });

      let joinCode = trip.joinCode;
      if (!joinCode) {
        joinCode = generateJoinCode();
        await tripsCollection.updateOne(
          { _id: trip._id || trip.id },
          { $set: { joinCode } }
        );
      }

      const budgetItems = await budgetItemsCollection
        .find({ tripId })
        .sort({ createdAt: -1 })
        .toArray();

      res.json({
        id: trip._id || trip.id,
        userId: trip.userId,
        name: trip.name,
        joinCode,
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
      const userEmail = req.session!.userEmail!;
      const { name, amount, category, memberIds } = req.body;
      const tripsCollection = getTripsCollection();

      let trip = await tripsCollection.findOne({ _id: tripId });
      if (!trip) {
        trip = await tripsCollection.findOne({ id: tripId });
      }
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      const members = Array.isArray(trip.members) ? trip.members : [];
      const member = members.find((m: any) => m.email === userEmail);
      const isOwner = trip.userId === userId || member?.status === "owner";
      const isJoinedMember = member && ["joined", "owner"].includes(member.status);

      if (!isOwner && !isJoinedMember) {
        return res.status(403).json({ message: "Access denied: You are not part of this trip" });
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
      const userEmail = req.session!.userEmail!;
      const tripsCollection = getTripsCollection();
      const budgetItemsCollection = getBudgetItemsCollection();

      let trip = await tripsCollection.findOne({ _id: tripId });
      if (!trip) {
        trip = await tripsCollection.findOne({ id: tripId });
      }
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      const members = Array.isArray(trip.members) ? trip.members : [];
      const member = members.find((m: any) => m.email === userEmail);
      const isOwner = trip.userId === userId || member?.status === "owner";
      const isJoinedMember = member && ["joined", "owner"].includes(member.status);

      if (!isOwner && !isJoinedMember) {
        return res.status(403).json({ message: "Access denied: You are not part of this trip" });
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
      const userEmail = req.session!.userEmail!;
      const tripsCollection = getTripsCollection();
      const budgetItemsCollection = getBudgetItemsCollection();

      let trip = await tripsCollection.findOne({ _id: tripId });
      if (!trip) {
        trip = await tripsCollection.findOne({ id: tripId });
      }
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      const members = Array.isArray(trip.members) ? trip.members : [];
      const member = members.find((m: any) => m.email === userEmail);
      const isOwner = trip.userId === userId || member?.status === "owner";
      const isJoinedMember = member && ["joined", "owner"].includes(member.status);

      if (!isOwner && !isJoinedMember) {
        return res.status(403).json({ message: "Access denied: You are not part of this trip" });
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

  // Spending items routes
  app.post("/api/trips/:id/spending-items", ensureAuth, async (req: Request, res: Response) => {
    try {
      const tripId = req.params.id;
      const userId = req.session!.userId!;
      const userEmail = req.session!.userEmail!;
      const { budgetItemId, name, amount, category, memberIds } = req.body;
      const tripsCollection = getTripsCollection();

      let trip = await tripsCollection.findOne({ _id: tripId });
      if (!trip) {
        trip = await tripsCollection.findOne({ id: tripId });
      }
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      const members = Array.isArray(trip.members) ? trip.members : [];
      const member = members.find((m: any) => m.email === userEmail);
      const isOwner = trip.userId === userId || member?.status === "owner";
      const isJoinedMember = member && ["joined", "owner"].includes(member.status);

      if (!isOwner && !isJoinedMember) {
        return res.status(403).json({ message: "Access denied: You are not part of this trip" });
      }

      const itemId = randomUUID();
      const spendingItemsCollection = getSpendingItemsCollection();

      await spendingItemsCollection.insertOne({
        _id: itemId,
        id: itemId,
        tripId,
        budgetItemId,
        name,
        amount,
        category,
        memberIds,
        createdAt: Date.now(),
        isCompleted: false,
      });

      res.json({ id: itemId });
    } catch (error) {
      console.error("Spending item creation error:", error);
      res.status(500).json({ message: "Failed to create spending item" });
    }
  });

  app.get("/api/trips/:id/spending-items", ensureAuth, async (req: Request, res: Response) => {
    try {
      const tripId = req.params.id;
      const userId = req.session!.userId!;
      const userEmail = req.session!.userEmail!;
      const tripsCollection = getTripsCollection();
      const spendingItemsCollection = getSpendingItemsCollection();

      let trip = await tripsCollection.findOne({ _id: tripId });
      if (!trip) {
        trip = await tripsCollection.findOne({ id: tripId });
      }
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      const members = Array.isArray(trip.members) ? trip.members : [];
      const member = members.find((m: any) => m.email === userEmail);
      const isOwner = trip.userId === userId || member?.status === "owner";
      const isJoinedMember = member && ["joined", "owner"].includes(member.status);

      if (!isOwner && !isJoinedMember) {
        return res.status(403).json({ message: "Access denied: You are not part of this trip" });
      }

      const items = await spendingItemsCollection
        .find({ tripId })
        .sort({ createdAt: -1 })
        .toArray();

      const formattedItems = items.map((item) => ({
        id: item._id || item.id,
        tripId: item.tripId,
        budgetItemId: item.budgetItemId,
        name: item.name,
        amount: item.amount,
        category: item.category,
        memberIds: item.memberIds,
        createdAt: item.createdAt,
        isCompleted: item.isCompleted,
      }));

      res.json({ items: formattedItems });
    } catch (error) {
      console.error("Get spending items error:", error);
      res.status(500).json({ message: "Failed to fetch spending items" });
    }
  });

  app.patch("/api/trips/:tripId/spending-items/:itemId", ensureAuth, async (req: Request, res: Response) => {
    try {
      const { tripId, itemId } = req.params;
      const userId = req.session!.userId!;
      const userEmail = req.session!.userEmail!;
      const updates = req.body;
      const tripsCollection = getTripsCollection();
      const spendingItemsCollection = getSpendingItemsCollection();

      let trip = await tripsCollection.findOne({ _id: tripId });
      if (!trip) {
        trip = await tripsCollection.findOne({ id: tripId });
      }
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      const members = Array.isArray(trip.members) ? trip.members : [];
      const member = members.find((m: any) => m.email === userEmail);
      const isOwner = trip.userId === userId || member?.status === "owner";
      const isJoinedMember = member && ["joined", "owner"].includes(member.status);

      if (!isOwner && !isJoinedMember) {
        return res.status(403).json({ message: "Access denied: You are not part of this trip" });
      }

      const result = await spendingItemsCollection.updateOne(
        { $or: [{ _id: itemId }, { id: itemId }], tripId },
        { $set: updates }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "Spending item not found" });
      }

      res.json({ message: "Spending item updated successfully" });
    } catch (error) {
      console.error("Update spending item error:", error);
      res.status(500).json({ message: "Failed to update spending item" });
    }
  });

  app.delete("/api/trips/:tripId/spending-items/:itemId", ensureAuth, async (req: Request, res: Response) => {
    try {
      const { tripId, itemId } = req.params;
      const userId = req.session!.userId!;
      const userEmail = req.session!.userEmail!;
      const tripsCollection = getTripsCollection();
      const spendingItemsCollection = getSpendingItemsCollection();

      let trip = await tripsCollection.findOne({ _id: tripId });
      if (!trip) {
        trip = await tripsCollection.findOne({ id: tripId });
      }
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      const members = Array.isArray(trip.members) ? trip.members : [];
      const member = members.find((m: any) => m.email === userEmail);
      const isOwner = trip.userId === userId || member?.status === "owner";
      const isJoinedMember = member && ["joined", "owner"].includes(member.status);

      if (!isOwner && !isJoinedMember) {
        return res.status(403).json({ message: "Access denied: You are not part of this trip" });
      }

      const result = await spendingItemsCollection.deleteOne({
        $or: [{ _id: itemId }, { id: itemId }],
        tripId,
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({ message: "Spending item not found" });
      }

      res.json({ message: "Spending item deleted successfully" });
    } catch (error) {
      console.error("Delete spending item error:", error);
      res.status(500).json({ message: "Failed to delete spending item" });
    }
  });

  app.post("/api/trips/:id/invite-members", ensureAuth, async (req: Request, res: Response) => {
    try {
      const tripId = req.params.id;
      const userId = req.session!.userId!;
      const { members } = req.body; // Array of { name: string, email: string }
      const tripsCollection = getTripsCollection();

      // Verify that the trip belongs to the current user
      const trip = await tripsCollection.findOne({ _id: tripId, userId });
      if (!trip) {
        return res.status(403).json({ message: "Access denied: This trip is not yours" });
      }

      console.log("[POST /api/trips/:id/invite-members] Inviting members:", { tripId, members: members?.length });

      const newMembers = members.map((member: any, index: number) => {
        const invitationCode = randomUUID();
        const rawName = typeof member.name === "string" ? member.name.trim() : "";
        const rawEmail = typeof member.email === "string" ? member.email.trim() : "";
        const name = rawName || `Trip Guest ${trip.members.length + index + 1}`;
        const email = rawEmail || undefined;
        return {
          id: randomUUID(),
          name,
          email,
          color: MEMBER_COLORS[(trip.members.length + index) % MEMBER_COLORS.length],
          status: "invited",
          invitedAt: Date.now(),
          invitationCode,
        };
      });

      const shareInvites = newMembers
        .filter((member: any) => !member.email)
        .map((member: any) => ({
          code: member.invitationCode,
          label: member.name,
          createdAt: Date.now(),
          createdBy: userId,
        }));

      const updatedMembers = [...trip.members, ...newMembers];

      const updateOps: any = { $set: { members: updatedMembers } };
      if (shareInvites.length > 0) {
        updateOps.$push = { shareLinks: { $each: shareInvites } };
      }

      await tripsCollection.updateOne(
        { _id: tripId, userId },
        updateOps
      );

      console.log("[POST /api/trips/:id/invite-members] Members invited successfully");
      res.json({
        message: "Members invited successfully",
        invitedMembers: newMembers,
        invitationCodes: newMembers.map((member: any) => ({
          name: member.name,
          email: member.email,
          code: member.invitationCode
        }))
      });
    } catch (error) {
      console.error("Invite members error:", error);
      res.status(500).json({ message: "Failed to invite members" });
    }
  });

  app.post("/api/join/:code", ensureAuth, async (req: Request, res: Response) => {
    try {
      const rawCode = req.params.code;
      const trimmedCode = typeof rawCode === "string" ? rawCode.trim() : "";
      if (!trimmedCode) {
        return res.status(400).json({ message: "Invitation code is required" });
      }
      const upperCode = trimmedCode.toUpperCase();
      const userEmail = req.session!.userEmail!;
      const userName = req.session!.userName || userEmail?.split("@")[0] || "Traveler";
      const tripsCollection = getTripsCollection();

      console.log("[POST /api/join/:code] Joining trip with code:", trimmedCode, "for user:", userEmail);

      const trip = await tripsCollection.findOne({
        $or: [
          { "members.invitationCode": trimmedCode },
          { joinCode: upperCode },
        ],
      });

      if (!trip) {
        console.log("[POST /api/join/:code] No trip found with this code");
        return res.status(404).json({ message: "Invalid or expired invitation link" });
      }

      let members = Array.isArray(trip.members) ? [...trip.members] : [];
      const tripIdValue = trip._id || trip.id;

      const existingMember = members.find((member: any) => member.email === userEmail && ["joined", "owner"].includes(member.status));
      if (existingMember) {
        return res.json({ message: "You have already joined this trip", tripId: tripIdValue, tripName: trip.name });
      }

      const isJoinCode = typeof trip.joinCode === "string" && trip.joinCode.toUpperCase() === upperCode;
      const isShareLink = Array.isArray((trip as any).shareLinks) && (trip as any).shareLinks.some((link: any) => link.code === trimmedCode);
      const shouldAutoJoin = isJoinCode || isShareLink;

      const joinedMemberIdsBefore = members
        .filter((tripMember: any) => ["joined", "owner"].includes(tripMember.status))
        .map((tripMember: any) => tripMember.id);

      let updatedMembers = members;
      let activeMember: any = null;

      if (isJoinCode) {
        const newMember = {
          id: randomUUID(),
          name: userName,
          email: userEmail,
          color: MEMBER_COLORS[members.length % MEMBER_COLORS.length],
          status: "joined",
          invitedAt: Date.now(),
          joinedAt: Date.now(),
        };
        updatedMembers = [...members, newMember];
        activeMember = newMember;
      } else {
        // Check if it's a share link code
        const shareLinks = Array.isArray((trip as any).shareLinks) ? (trip as any).shareLinks : [];
        const shareEntry = shareLinks.find((link: any) => link.code === trimmedCode);

        if (shareEntry) {
          // Share link - automatically join like invitation code
          const newMember = {
            id: randomUUID(),
            name: shareEntry.label || userName,
            email: userEmail,
            color: MEMBER_COLORS[members.length % MEMBER_COLORS.length],
            status: "joined",
            invitedAt: Date.now(),
            joinedAt: Date.now(),
          };
          updatedMembers = [...members, newMember];
          activeMember = newMember;
          console.log("[POST /api/join/:code] User joined via share link", { code: trimmedCode, member: newMember });
        } else {
          // Regular invitation code - find existing member
          let memberIndex = members.findIndex((member: any) => member.invitationCode === trimmedCode);
        if (memberIndex === -1) {
          console.log("[POST /api/join/:code] Invitation code not found in members", {
            code: trimmedCode,
            membersWithCodes: members
              .filter((m: any) => m.invitationCode)
              .map((m: any) => ({ id: m.id, name: m.name, email: m.email, invitationCode: m.invitationCode, status: m.status })),
          });
          return res.status(404).json({ message: "Member not found" });
        }

        const member = members[memberIndex];
        const originalEmail = member.email;

        if (member.status === "joined") {
          if (member.email === userEmail) {
            return res.json({ message: "You have already joined this trip", tripId: tripIdValue, tripName: trip.name });
          }
          return res.status(409).json({ message: "This invitation link has already been used" });
        }

        const joinedMember = {
          ...member,
          status: "joined",
          joinedAt: Date.now(),
          email: userEmail,
          name: member.name || userName,
        };
        if (!originalEmail) {
          joinedMember.invitationCode = undefined;
        }

        updatedMembers = [...members];
        updatedMembers[memberIndex] = joinedMember;
        activeMember = updatedMembers[memberIndex];

        if (!originalEmail) {
          const shareColorIndex = updatedMembers.length % MEMBER_COLORS.length;
          updatedMembers.push({
            id: randomUUID(),
            name: member.name || `${trip.name || "Trip"} Guest`,
            color: MEMBER_COLORS[shareColorIndex],
            status: "invited",
            invitedAt: Date.now(),
            invitationCode: trimmedCode,
          });
        }
        }
      }

      await tripsCollection.updateOne(
        { _id: tripIdValue },
        { $set: { members: updatedMembers } }
      );

      if (joinedMemberIdsBefore.length > 0 && activeMember?.id) {
        const budgetItemsCollection = getBudgetItemsCollection();
        const budgetItems = await budgetItemsCollection
          .find({ tripId: tripIdValue })
          .toArray();
        const itemsToUpdate = budgetItems.filter((item: any) => {
          const memberIds = Array.isArray(item.memberIds) ? item.memberIds : [];
          // Don't update if member is already included
          if (memberIds.includes(activeMember.id)) {
            return false;
          }
          // For general join code or share links, add to all existing budget items
          // For specific invitation links, only add to items that include all previously joined members
          if (shouldAutoJoin) {
            return true; // Add to all budget items
          } else {
            // Original logic for specific invitation links
            if (memberIds.length !== joinedMemberIdsBefore.length) {
              return false;
            }
            return joinedMemberIdsBefore.every((id) => memberIds.includes(id));
          }
        });
        for (const item of itemsToUpdate) {
          const identifier = item._id ? { _id: item._id } : { id: item.id };
          await budgetItemsCollection.updateOne(
            { ...identifier, tripId: tripIdValue },
            { $addToSet: { memberIds: activeMember.id } }
          );
        }

        const spendingItemsCollection = getSpendingItemsCollection();
        const spendingItems = await spendingItemsCollection
          .find({ tripId: tripIdValue })
          .toArray();
        const spendingToUpdate = spendingItems.filter((item: any) => {
          const memberIds = Array.isArray(item.memberIds) ? item.memberIds : [];
          // Don't update if member is already included
          if (memberIds.includes(activeMember.id)) {
            return false;
          }
          // For general join code or share links, add to all existing spending items
          // For specific invitation links, only add to items that include all previously joined members
          if (shouldAutoJoin) {
            return true; // Add to all spending items
          } else {
            // Original logic for specific invitation links
            if (memberIds.length !== joinedMemberIdsBefore.length) {
              return false;
            }
            return joinedMemberIdsBefore.every((id) => memberIds.includes(id));
          }
        });
        for (const item of spendingToUpdate) {
          const identifier = item._id ? { _id: item._id } : { id: item.id };
          await spendingItemsCollection.updateOne(
            { ...identifier, tripId: tripIdValue },
            { $addToSet: { memberIds: activeMember.id } }
          );
        }
      }

      console.log("[POST /api/join/:code] Member joined successfully:", activeMember?.name || userName);
      res.json({
        message: "Successfully joined the trip!",
        tripId: tripIdValue,
        tripName: trip.name,
      });
    } catch (error) {
      console.error("Join trip error:", error);
      res.status(500).json({ message: "Failed to join trip" });
    }
  });

  app.delete("/api/join/:code", ensureAuth, async (req: Request, res: Response) => {
    try {
      const { code } = req.params;
      const userEmail = req.session!.userEmail!;
      const tripsCollection = getTripsCollection();
      const budgetItemsCollection = getBudgetItemsCollection();
      const spendingItemsCollection = getSpendingItemsCollection();

      console.log("[DELETE /api/join/:code] Rejecting invitation with code:", code, "for user:", userEmail);

      const trip = await tripsCollection.findOne({
        "members.invitationCode": code,
        "members.email": userEmail
      });

      if (!trip) {
        console.log("[DELETE /api/join/:code] No trip found with this code for this user");
        return res.status(404).json({ message: "Invalid invitation code or you are not invited to this trip" });
      }

      const memberIndex = trip.members.findIndex((member: any) => member.invitationCode === code && member.email === userEmail);
      if (memberIndex === -1) {
        return res.status(404).json({ message: "Member not found" });
      }

      const member = trip.members[memberIndex];

      if (member.status === "joined") {
        return res.status(400).json({ message: "You have already joined this trip" });
      }

      const tripIdValue = trip._id || trip.id;
      const tripIdentifier = trip._id ? { _id: trip._id } : { id: trip.id };
      const updatedMembers = trip.members.filter((_: any, index: number) => index !== memberIndex);

      await tripsCollection.updateOne(
        tripIdentifier,
        { $set: { members: updatedMembers } }
      );

      const memberId = member.id;

      if (memberId) {
        await budgetItemsCollection.updateMany(
          { tripId: tripIdValue },
          { $pull: { memberIds: memberId } }
        );
        await budgetItemsCollection.deleteMany({ tripId: tripIdValue, memberIds: { $size: 0 } });
        await spendingItemsCollection.updateMany(
          { tripId: tripIdValue },
          { $pull: { memberIds: memberId } }
        );
        await spendingItemsCollection.deleteMany({ tripId: tripIdValue, memberIds: { $size: 0 } });
      }

      console.log("[DELETE /api/join/:code] Invitation rejected for:", member.email);
      res.json({ message: "Invitation rejected" });
    } catch (error) {
      console.error("Reject invitation error:", error);
      res.status(500).json({ message: "Failed to reject invitation" });
    }
  });

  app.delete("/api/trips/:tripId/members/:memberId", ensureAuth, async (req: Request, res: Response) => {
    try {
      const { tripId, memberId } = req.params;
      const userEmail = req.session!.userEmail!;
      const tripsCollection = getTripsCollection();
      const budgetItemsCollection = getBudgetItemsCollection();
      const spendingItemsCollection = getSpendingItemsCollection();

      console.log("[DELETE /api/trips/:tripId/members/:memberId] Removing member:", { tripId, memberId, userEmail });

      const trip = await tripsCollection.findOne({
        $or: [{ _id: tripId }, { id: tripId }],
        "members.id": memberId
      });

      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      const memberIndex = trip.members.findIndex((member: any) => member.id === memberId);
      if (memberIndex === -1) {
        return res.status(404).json({ message: "Member not found" });
      }

      const member = trip.members[memberIndex];
      const requestingMember = trip.members.find((m: any) => m.email === userEmail);

      if (!requestingMember) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }

      if (member.status === "owner") {
        return res.status(400).json({ message: "Trip owner cannot leave the trip" });
      }

      const isSelf = requestingMember.id === memberId || member.email === userEmail;
      const isOwner = requestingMember.status === "owner";

      if (!isSelf && !isOwner) {
        return res.status(403).json({ message: "Only the trip owner can remove other members" });
      }

      const tripIdValue = trip._id || trip.id;
      const tripIdentifier = trip._id ? { _id: trip._id } : { id: trip.id };
      const updatedMembers = trip.members.filter((_: any, index: number) => index !== memberIndex);

      await tripsCollection.updateOne(
        tripIdentifier,
        { $set: { members: updatedMembers } }
      );

      await budgetItemsCollection.updateMany(
        { tripId: tripIdValue },
        { $pull: { memberIds: memberId } }
      );
      await budgetItemsCollection.deleteMany({ tripId: tripIdValue, memberIds: { $size: 0 } });

      await spendingItemsCollection.updateMany(
        { tripId: tripIdValue },
        { $pull: { memberIds: memberId } }
      );
      await spendingItemsCollection.deleteMany({ tripId: tripIdValue, memberIds: { $size: 0 } });

      const message = isSelf ? "Left trip successfully" : "Member removed successfully";
      console.log("[DELETE /api/trips/:tripId/members/:memberId] Member removal success:", member.email || member.name, { performedBy: userEmail, isOwner, isSelf });
      res.json({ message });
    } catch (error) {
      console.error("Leave trip error:", error);
      res.status(500).json({ message: "Failed to remove member" });
    }
  });

  app.delete("/api/trips/:id", ensureAuth, async (req: Request, res: Response) => {
    try {
      const tripId = req.params.id;
      const userId = req.session!.userId!;
      const tripsCollection = getTripsCollection();
      const budgetItemsCollection = getBudgetItemsCollection();
      const spendingItemsCollection = getSpendingItemsCollection();

      // Verify that the trip belongs to the current user
      const trip = await tripsCollection.findOne({ _id: tripId, userId });
      if (!trip) {
        return res.status(403).json({ message: "Access denied: This trip is not yours" });
      }

      console.log("[DELETE /api/trips/:id] Deleting trip:", { tripId, userId, tripName: trip.name });

      // Delete all budget items for this trip
      const budgetItemsResult = await budgetItemsCollection.deleteMany({ tripId });
      console.log(`[DELETE /api/trips/:id] Deleted ${budgetItemsResult.deletedCount} budget items`);

      // Delete all spending items for this trip
      const spendingItemsResult = await spendingItemsCollection.deleteMany({ tripId });
      console.log(`[DELETE /api/trips/:id] Deleted ${spendingItemsResult.deletedCount} spending items`);

      // Delete the trip
      const tripResult = await tripsCollection.deleteOne({ _id: tripId, userId });
      if (tripResult.deletedCount === 0) {
        return res.status(404).json({ message: "Trip not found" });
      }

      console.log("[DELETE /api/trips/:id] Trip deleted successfully");
      res.json({ message: "Trip deleted successfully" });
    } catch (error) {
      console.error("Delete trip error:", error);
      res.status(500).json({ message: "Failed to delete trip" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
