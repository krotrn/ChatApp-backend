import { Router } from "express";
import webhook from "../controllers/webhook.controllers";

const router = Router();

router.post("/user", webhook);

export default router;
