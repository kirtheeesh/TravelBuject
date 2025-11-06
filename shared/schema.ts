import { z } from "zod";

// Member within a trip
export const memberSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Member name is required"),
  email: z.string().email("Valid email is required").optional(),
  color: z.string(), // For avatar background color
  status: z.enum(["owner", "joined", "invited", "pending"]).default("pending"),
  invitedAt: z.number().optional(), // timestamp when invited
  joinedAt: z.number().optional(), // timestamp when joined
  invitationCode: z.string().optional(), // unique code for joining the trip
});

export type Member = z.infer<typeof memberSchema>;

// Budget item (expense)
export const budgetItemSchema = z.object({
  id: z.string(),
  tripId: z.string(),
  name: z.string().min(1, "Item name is required"),
  amount: z.number().positive("Amount must be positive"),
  category: z.enum([
    "Food",
    "Accommodation",
    "Transport",
    "Entertainment",
    "Shopping",
    "Miscellaneous",
  ]),
  memberIds: z.array(z.string()).min(1, "Select at least one member"),
  createdAt: z.number(), // timestamp
  isUnplanned: z.boolean().optional().default(false), // Whether this budget item was created from unplanned spending
});

export type BudgetItem = z.infer<typeof budgetItemSchema>;

// Spending item (actual expenses tracked against budget or unplanned spending)
export const spendingItemSchema = z.object({
  id: z.string(),
  tripId: z.string(),
  budgetItemId: z.string().optional(), // Links to the original budget item (optional for unplanned spending)
  name: z.string().min(1, "Item name is required"),
  amount: z.number().positive("Amount must be positive"),
  category: z.enum([
    "Food",
    "Accommodation",
    "Transport",
    "Entertainment",
    "Shopping",
    "Miscellaneous",
  ]),
  memberIds: z.array(z.string()).min(1, "Select at least one member"),
  createdAt: z.number(), // timestamp
  isCompleted: z.boolean().default(false), // Whether this spending is marked as completed
});

export type SpendingItem = z.infer<typeof spendingItemSchema>;

// Trip
export const tripSchema = z.object({
  id: z.string(),
  userId: z.string().optional(), // Owner's Firebase UID (optional for explore mode)
  name: z.string().min(1, "Trip name is required"),
  joinCode: z.string().min(6),
  members: z.array(memberSchema).min(1, "At least one member is required"),
  createdAt: z.number(), // timestamp
  budgetItems: z.array(budgetItemSchema).optional(), // For explore mode
});

export type Trip = z.infer<typeof tripSchema>;

// Insert schemas (without id and auto-generated fields)
export const insertMemberSchema = memberSchema.omit({ id: true, status: true, invitedAt: true, joinedAt: true });
export type InsertMember = z.infer<typeof insertMemberSchema>;

export const insertBudgetItemSchema = budgetItemSchema
  .omit({ id: true, createdAt: true })
  .extend({
    // For creation form validation
    name: z.string().min(1, "Item name is required"),
    amount: z.coerce.number().positive("Amount must be positive"),
    isUnplanned: z.boolean().optional().default(false), // Default to false for planned items
  });
export type InsertBudgetItem = z.infer<typeof insertBudgetItemSchema>;

export const insertSpendingItemSchema = spendingItemSchema
  .omit({ id: true, createdAt: true })
  .extend({
    // For creation form validation
    name: z.string().min(1, "Item name is required"),
    amount: z.coerce.number().positive("Amount must be positive"),
    budgetItemId: z.string().optional(), // Optional for unplanned spending
  });
export type InsertSpendingItem = z.infer<typeof insertSpendingItemSchema>;

export const insertTripSchema = z.object({
  name: z.string().min(3, "Trip name must be at least 3 characters"),
  memberCount: z.coerce.number().min(1).max(20),
  memberEmails: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Valid email is required").optional().or(z.literal("")),
  })).transform(members =>
    members.map((member, i) => ({
      name: member.name.trim() || `Member ${i + 1}`,
      email: member.email || undefined,
    }))
  ),
});
export type InsertTrip = z.infer<typeof insertTripSchema>;

// User from Google OAuth
export type User = {
  id: string;
  email: string;
  name?: string;
  picture?: string;
};
