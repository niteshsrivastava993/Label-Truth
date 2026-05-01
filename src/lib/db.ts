import mongoose from "mongoose";

export const connectDB = async () => {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    console.error("MONGODB_URI is not defined in environment variables");
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error connecting to MongoDB: ${error.message}`);
    } else {
      console.error("Unknown error connecting to MongoDB");
    }
    // Don't exit process in development to allow for hot reloads/error visibility
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }
};
