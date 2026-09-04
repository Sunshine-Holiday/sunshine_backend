import mongoose from "mongoose";
import dns from "dns";

// Fix for Windows DNS querySrv ECONNREFUSED with MongoDB Atlas
try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (e) {
  // Ignore if not supported
}

export const connectDB = async (uri) => {
  try {
    const dbConnect = await mongoose.connect(uri, {
      dbName: "travels",

    });
    console.log(`MongoDB Connected: ${dbConnect.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};
