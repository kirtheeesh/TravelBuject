export const MONGODB_URI = import.meta.env.VITE_MONGODB_URI || '';

let isMongoInitialized = false;

if (MONGODB_URI) {
  isMongoInitialized = true;
  console.log("✅ MongoDB connection string configured");
} else {
  console.warn("⚠️ MongoDB connection string not configured. Using explore mode only.");
}

export { isMongoInitialized };
