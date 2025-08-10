import passport from "passport";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { ENV_VARS } from "../config/envVars.js";
import redisClient from "../config/redisClient.js"; // Ensure this file exports a connected redis client

// ------------------ Logout ------------------
export async function logout(req, res) {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: false, // Only secure in production (you might want to use ENV_VARS to control this)
    });
    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Error in logout controller", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// ------------------ Auth Check ------------------
export async function authCheck(req, res) {
  try {
    if (req.user)
      return res.status(200).json({ success: true, user: req.user });
    return res
      .status(401)
      .json({ success: false, message: "Not authenticated" });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
}

// ------------------ Central Login Logic ------------------
/**
 * handleLogin - central place to issue JWT + cookie
 * If userOverride is provided, it will skip passport authentication and use that user directly.
 */
export async function handleLogin(req, res, userOverride = null) {
  try {
    const user =
      userOverride ||
      (await new Promise((resolve, reject) => {
        passport.authenticate("local", (err, user, info) => {
          if (err)
            return reject({ status: 500, message: "Internal server error" });
          if (!user)
            return reject({
              status: 400,
              message: info?.message || "Invalid credentials",
            });
          resolve(user);
        })(req, res);
      }));

    const token = jwt.sign({ ...user._doc }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.cookie("token", token, {
      httpOnly: ENV_VARS.ENVIROMENT == "dev",
      secure: ENV_VARS.ENVIROMENT != "dev",
    });

    return {
      status: 200,
      user: { ...user._doc, password: "" },
      token,
    };
  } catch (error) {
    return Promise.reject({
      status: error.status || 500,
      message: error.message || "Login failed",
    });
  }
}

// ------------------ Helper: generate OTP ------------------
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
}

// ------------------ Signup (send OTP) ------------------
export async function signup(req, res) {
  try {
    const { username, email, password, college } = req.body;

    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!regex.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid Email" });
    }

    if (!password || password.length < 6) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Password must be at least 6 characters long",
        });
    }

    const existingUserByUsername = await User.findOne({ username });
    if (existingUserByUsername) {
      return res
        .status(400)
        .json({ success: false, message: "Username already exists" });
    }

    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      return res
        .status(400)
        .json({ success: false, message: "Email already exists" });
    }

    // create user (you can uncomment bcrypt hashing if needed)
    const newUser = new User({
      username,
      email,
      password,
      college,
    });

    await newUser.save();

    // Send OTP after signup
    const otp = generateOTP();
    await redisClient.setEx(`otp:${email}`, 300, otp); // 5 minutes TTL

    // ---------------------TODO: replace console.log with real email/SMS sending integration------------------
    console.log(`Signup OTP for ${email}: ${otp}`);

    return res
      .status(200)
      .json({
        success: true,
        message: "OTP sent. Please verify to complete signup.",
      });
  } catch (err) {
    console.error("Error in signup:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server side error" });
  }
}

// - Login (validate credentials then send OTP) -
export async function login(req, res) {
  try {
    // Authenticate credentials using passport local strategy but DO NOT issue JWT here.
    const user = await new Promise((resolve, reject) => {
      passport.authenticate("local", (err, user, info) => {
        if (err)
          return reject({ status: 500, message: "Internal server error" });
        if (!user)
          return reject({
            status: 400,
            message: info?.message || "Invalid credentials",
          });
        resolve(user);
      })(req, res);
    });

    // send OTP to the user's email
    const email = user.email;
    const otp = generateOTP();
    await redisClient.setEx(`otp:${email}`, 300, otp); // 5 minutes

    // TODO: integrate with email/SMS provider instead of console.log
    console.log(`Login OTP for ${email}: ${otp}`);

    return res
      .status(200)
      .json({
        success: true,
        message: "OTP sent. Please verify to complete login.",
      });
  } catch (err) {
    console.error("Error in login:", err);
    return res
      .status(err.status || 500)
      .json({ success: false, message: err.message || "Login failed" });
  }
}

//-OTP Verify (used by both signup and login to finish auth)-
export async function verifyOTP(req, res) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Email and OTP required" });
    }

    const storedOTP = await redisClient.get(`otp:${email}`);
    if (!storedOTP) {
      return res
        .status(400)
        .json({ success: false, message: "OTP expired or not found" });
    }

    if (storedOTP !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    // OTP valid -> consume it
    await redisClient.del(`otp:${email}`);

    // Find user and finish login (reuse handleLogin so cookie/token logic is central)
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Use handleLogin with userOverride to skip passport (we already verified)
    try {
      const loginResult = await handleLogin(req, res, user);
      return res.status(loginResult.status).json({
        success: true,
        user: loginResult.user,
        token: loginResult.token,
        message: "User Successfully Signed In",
      });
    } catch (loginError) {
      // handleLogin rejects with {status, message}
      return res.status(loginError.status || 500).json({
        success: false,
        message: loginError.message || "Login after OTP failed",
      });
    }
  } catch (err) {
    console.error("Error in verifyOTP:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
}

export async function resendOTP(req, res) {
  try {
    const { email } = req.body;

    const otp = generateOTP();
    await redisClient.setEx(`otp:${email}`, 300, otp);
    //--------- TODO: integrate with email/SMS provider instead of console.log------------------
    console.log(`RESENT  OTP for ${email}: ${otp}`);
    res.status(200).json({success:true, message:"New OTP Sent"})
  } catch (error) {
res.status(400).json({success:false, message:"Server Side Error"})
  }
}
