import { OAuth2Client } from 'google-auth-library';
import { getUsersCollection, type DBUser } from './db';
import { randomUUID } from 'crypto';

const googleClient = new OAuth2Client(process.env.VITE_GOOGLE_CLIENT_ID);

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

export async function verifyGoogleToken(token: string): Promise<AuthUser | null> {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch Google user info:', response.statusText);
      return null;
    }

    const payload = await response.json();
    if (!payload || !payload.email) {
      return null;
    }

    const usersCollection = getUsersCollection();
    
    let user = await usersCollection.findOne({ email: payload.email });

    if (!user) {
      const userId = randomUUID();
      const newUser: DBUser = {
        _id: userId,
        email: payload.email,
        name: payload.name,
        createdAt: Date.now(),
      };
      await usersCollection.insertOne(newUser);
      user = newUser as DBUser & { _id: string };
    }

    const userId = user._id || '';
    if (!userId || !user.email) {
      return null;
    }

    return {
      id: userId,
      email: user.email,
      name: user.name,
      picture: payload.picture,
    };
  } catch (error) {
    console.error('Google token verification failed:', error);
    return null;
  }
}
