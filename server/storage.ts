import { getUsersCollection, type DBUser } from "./db";
import { randomUUID } from "crypto";

export interface User {
  id: string;
  email: string;
  username?: string;
}

export interface InsertUser {
  email: string;
  username?: string;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export class MongoStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const dbUser = await getUsersCollection().findOne({ _id: id });
    if (!dbUser) return undefined;
    return {
      id: dbUser._id || id,
      email: dbUser.email,
      username: dbUser.name,
    };
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const dbUser = await getUsersCollection().findOne({ email });
    if (!dbUser) return undefined;
    return {
      id: dbUser._id || "",
      email: dbUser.email,
      username: dbUser.name,
    };
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const newUser: DBUser = {
      _id: id,
      email: insertUser.email,
      name: insertUser.username,
      createdAt: Date.now(),
    };

    await getUsersCollection().insertOne(newUser);

    return {
      id,
      email: insertUser.email,
      username: insertUser.username,
    };
  }
}

export const storage = new MongoStorage();
