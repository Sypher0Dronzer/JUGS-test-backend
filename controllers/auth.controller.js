import passport from "passport";
import User from "../models/user.model.js";
import jwt from 'jsonwebtoken';
import { ENV_VARS } from "../config/envVars.js";
// import bcryptjs from "bcryptjs";
export async function logout(req, res) {
  try {

    res.clearCookie("token", {
    httpOnly: true,
    secure: false, // Only secure in production
  });
  res.status(200).json({success:true, message: "Logged out successfully" });
  } catch (error) {
    // console.log("Error in logout controller", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

export async function authCheck(req, res) {
  try {
    console.log("authCheck:" , req.user)
    if(req.user)
    return res.status(200).json({ success: true, user: req.user });
  } catch (err) {
    // console.log("Error in authCheck controller", err.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
}



export async function handleLogin(req, res) {
  try {
    const user = await new Promise((resolve, reject) => {
      passport.authenticate('local', (err, user, info) => {
        if (err) return reject({ status: 500, message: 'Internal server error' });
        if (!user) return reject({ status: 400, message: info?.message || 'Invalid credentials' });
        resolve(user);
      })(req, res);
    });

     const token = jwt.sign(
      { ...user._doc },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    res.cookie('token', token, {
      httpOnly: ENV_VARS.ENVIROMENT=='dev',
      secure: ENV_VARS.ENVIROMENT!='dev', // in production with HTTPS
    });

    return {
      status: 200,
      user: { ...user._doc, password: '' },
      token,
    };
  } catch (error) {
    return Promise.reject({
      status: error.status || 500,
      message: error.message || 'Login failed',
    });
  }
}

export async function signup(req, res) {
  try {
    const { username, email, password,college } = req.body;

    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!regex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Email',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const existingUserByUsername = await User.findOne({ username });
    if (existingUserByUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists',
      });
    }

    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists',
      });
    }
// ----------------------To hash the password ---------------------
    // const salt = await bcryptjs.genSalt(10);
    // const hashedPassword = await bcryptjs.hash(password, salt);

    

    const newUser = new User({
      username: username,
      email: email,
      password: password,
      college:college
    });

    await newUser.save();

    // Use the extracted login logic
    try {
      const loginResult = await handleLogin(req, res);
      return res.status(loginResult.status).json({
        success: true,
        user: loginResult.user,
        token: loginResult.token
      });
    } catch (loginError) {
      return res.status(loginError.status).json({ 
        success: false,
        message: loginError.message, 
        
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Server side error',
    });
  }
}

export async function login(req, res) {
  try {
    const loginResult = await handleLogin(req, res);
    return res.status(loginResult.status).json({
      success: true,
      user: loginResult.user,
      token: loginResult.token, // ✅ send the token
    });
  } catch (loginError) {
    return res.status(loginError.status).json({
      success: false,
      message: loginError.message,
    });
  }
}