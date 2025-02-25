import { Router } from "express";
import webhook from "../controllers/webhook.controllers";
import authenticate from "../middleware/auth.middleware";

const router = Router();
router.use(authenticate);

router.post("/user", webhook);

export default router;
