import express from 'express'
import { authCheck, login, logout, resendOTP, signup, verifyOTP } from '../controllers/auth.controller2.js'
import { protectRoute } from '../middleware/protectRoute.js'

const route=express.Router()

route.post('/signup', signup)         // Step 1: signup, send OTP
route.post('/login', login)           // Step 1: login check, send OTP
route.post('/verify-otp', verifyOTP)  // Step 2: OTP verification, issue JWT
route.post('/resend-otp', resendOTP) 
route.get('/logout', logout)
route.get('/authcheck', protectRoute, authCheck)

export default route