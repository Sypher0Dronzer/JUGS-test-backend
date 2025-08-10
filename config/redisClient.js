// redisClient.js
import { createClient } from "redis";
import { ENV_VARS } from "./envVars.js"; 

const redisClient = createClient({
  url: ENV_VARS.REDIS_URL, // from Render
  socket: { tls: true }
});

redisClient.on("error", (err) => console.error("Redis error:", err)).on("connect",()=>console.log("Redis Client Connected"));

await redisClient.connect();

export default redisClient;
