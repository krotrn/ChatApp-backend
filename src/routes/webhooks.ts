import { Router } from "express";

import webhook from "../controllers/webhook";
import { authenticate } from "../middleware/auth";

const router = Router();

router.post("/user", authenticate, webhook);

export default router;
