
import connectDB from "./config/connectionDb.js";
import express from "express";
import bodyParser from "body-parser";
import passport from "passport";
import cookieParser from "cookie-parser";
import { ENV_VARS } from "./config/envVars.js";
import cors from 'cors'

import "./config/passport.js";
import authRoutes from "./routes/auth.route.js";

const app = express();

// middlewares
app.use(cors({
  origin: ENV_VARS.FRONTEND_LINK,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// ✅ Handle preflight for all routes

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// app.use((req, res, next) => {
//   res.header("Access-Control-Allow-Origin", ENV_VARS.FRONTEND_LINK);
//   res.header("Access-Control-Allow-Credentials", "true");
//   res.header("Access-Control-Allow-Methods", "GET, POST");
//   res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
//   next();
// });


app.use(passport.initialize());
 
//routes
app.use("/api/auth", authRoutes);





app.listen(ENV_VARS.PORT, () => {
  console.log(`Server started at http://localhost:${ENV_VARS.PORT}`);
  connectDB();
});



