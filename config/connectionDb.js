import mongoose from 'mongoose';
import { ENV_VARS } from './envVars.js';

const connectDB = async () => {
  // const mongoLink= ENV_VARS.ENVIROMENT == "dev"? ENV_VARS.MONGO_LOCALDB : ENV_VARS.MONGO_URI
  const mongoLink=  ENV_VARS.MONGO_URI
  try {
    const conn = await mongoose.connect(mongoLink);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1); 
  }
};

export default connectDB;
