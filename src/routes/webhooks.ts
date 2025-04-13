import { Router } from "express";

import webhook from "../controllers/webhook";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.post("/user", webhook);

export default router;
