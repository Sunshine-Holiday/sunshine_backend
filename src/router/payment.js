import express from "express";
import { isAuthenticated, adminOnly } from "../middleware/auth.js";
import { createPaymentIntent, getRefundAlerts, resolveRefundAlert, reconcilePayments } from "../controller/payment.js";
const paymentRouter = express.Router();
paymentRouter.post("/create", createPaymentIntent);
paymentRouter.get("/refund-alerts", isAuthenticated, adminOnly, getRefundAlerts);
paymentRouter.put("/refund-alerts/:id/resolve", isAuthenticated, adminOnly, resolveRefundAlert);
paymentRouter.post("/reconcile", isAuthenticated, adminOnly, reconcilePayments);
export default paymentRouter;
