import { z } from "zod";

// Member within a trip
export const memberSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Member name is required"),
  color: z.string(), // For avatar background color
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
});

export type BudgetItem = z.infer<typeof budgetItemSchema>;

// Trip
export const tripSchema = z.object({
  id: z.string(),
  userId: z.string().optional(), // Owner's Firebase UID (optional for explore mode)
  name: z.string().min(1, "Trip name is required"),
  members: z.array(memberSchema).min(1, "At least one member is required"),
  createdAt: z.number(), // timestamp
  budgetItems: z.array(budgetItemSchema).optional(), // For explore mode
});

export type Trip = z.infer<typeof tripSchema>;

// Insert schemas (without id and auto-generated fields)
export const insertMemberSchema = memberSchema.omit({ id: true });
export type InsertMember = z.infer<typeof insertMemberSchema>;

export const insertBudgetItemSchema = budgetItemSchema
  .omit({ id: true, createdAt: true })
  .extend({
    // For creation form validation
    name: z.string().min(1, "Item name is required"),
    amount: z.coerce.number().positive("Amount must be positive"),
  });
export type InsertBudgetItem = z.infer<typeof insertBudgetItemSchema>;

export const insertTripSchema = z.object({
  name: z.string().min(3, "Trip name must be at least 3 characters"),
  memberCount: z.coerce.number().min(1).max(20),
  memberNames: z.array(z.string()).transform(names => 
    names.map((name, i) => name.trim() || `Member ${i + 1}`)
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
