import express from "express";
import {
  createSpecialSection,
  getAllSpecialSections,
  getSpecialSectionById,
  updateSpecialSection,
  deleteSpecialSection,
} from "../controller/specialSectionController.js";

const router = express.Router();

router.post("/", createSpecialSection);
router.get("/", getAllSpecialSections);
router.get("/:id", getSpecialSectionById);
router.put("/:id", updateSpecialSection);
router.delete("/:id", deleteSpecialSection);

export default router;
