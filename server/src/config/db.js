import mongoose from 'mongoose';

/**
 * Connects to MongoDB database using the MONGO_URI in .env
 */
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(` MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(` MongoDB Connection Error: ${error.message}`);
    console.log(' Make sure your MONGO_URI is set correctly in server/.env');
  }
};
