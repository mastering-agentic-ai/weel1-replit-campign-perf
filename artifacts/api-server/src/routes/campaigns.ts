import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Router, type IRouter } from "express";

const router: IRouter = Router();
const sampleCsvPath = resolve(
  process.cwd(),
  "data/campaign_performance.csv",
);

router.get("/campaigns.csv", async (req, res) => {
  try {
    const csv = await readFile(sampleCsvPath, "utf8");
    res.type("text/csv").send(csv);
  } catch (error) {
    req.log.error({ err: error }, "Failed to read sample campaign CSV");
    res.status(500).json({ error: "Sample campaign data is unavailable." });
  }
});

export default router;
