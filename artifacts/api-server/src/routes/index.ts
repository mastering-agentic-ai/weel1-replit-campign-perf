import { Router, type IRouter } from "express";
import campaignsRouter from "./campaigns";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);
router.use(campaignsRouter);

export default router;
