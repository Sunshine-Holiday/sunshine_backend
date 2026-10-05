import express from "express";
import {
  getDestinationPage,
  getDestinationPages,
  upsertDestinationPage,
} from "../controller/destinationPageController.js";
import upload from "../middleware/multer.js";
import { adminOnly, isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

router.get("/", getDestinationPages);
router.get("/:slug", getDestinationPage);
router.put(
  "/:slug",
  isAuthenticated,
  adminOnly,
  upload,
  upsertDestinationPage
);

export default router;
