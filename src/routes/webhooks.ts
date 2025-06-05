import { Router } from "express";

import { authenticate } from "../middleware/auth";
import { deleteUserWebhook, updateUserWebhook } from "../controllers/webhook";

const router = Router();
router.put("/user", authenticate, updateUserWebhook);
router.delete("/user", authenticate, deleteUserWebhook);

export default router;
