import { Router } from "express";

import webhook from "../controllers/webhook";

const router = Router();

router.post("/user", webhook);

export default router;
