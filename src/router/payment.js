import express from "express";


import { isAuthenticated } from "../middleware/auth.js";
import { createPaymentIntent } from "../controller/payment.js";

const paymentRouter = express.Router();

// route - /api/v1/payment/create
paymentRouter.post("/create", createPaymentIntent);

export default paymentRouter;