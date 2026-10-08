"""Generate a deterministic, fictional daily campaign dataset for the dashboard."""

import csv
import random
from datetime import date, timedelta
from pathlib import Path


random.seed(20261008)

CHANNELS = {
    "Facebook": {"spend": 92, "ctr": 0.019, "cvr": 0.074, "aov": 84},
    "Instagram": {"spend": 105, "ctr": 0.022, "cvr": 0.061, "aov": 96},
    "Pinterest": {"spend": 68, "ctr": 0.026, "cvr": 0.083, "aov": 78},
    "Twitter": {"spend": 76, "ctr": 0.014, "cvr": 0.052, "aov": 71},
}
AUDIENCES = [
    "Women 18-24",
    "Women 25-34",
    "Men 25-34",
    "All adults",
    "Small business owners",
]
GOALS = ["Awareness", "Traffic", "Leads", "Sales"]
GOAL_CONVERSION_MULTIPLIER = {
    "Awareness": 0.58,
    "Traffic": 0.82,
    "Leads": 1.17,
    "Sales": 1.42,
}
GOAL_REVENUE_MULTIPLIER = {
    "Awareness": 0.74,
    "Traffic": 0.91,
    "Leads": 1.08,
    "Sales": 1.24,
}

output_path = Path(__file__).with_name("campaign_performance.csv")
start_date = date(2026, 4, 11)
day_count = 180
campaigns = []

for channel_index, (channel, metrics) in enumerate(CHANNELS.items()):
    for campaign_number in range(1, 11):
        audience = AUDIENCES[(campaign_number + channel_index) % len(AUDIENCES)]
        goal = GOALS[(campaign_number + channel_index * 2) % len(GOALS)]
        campaigns.append(
            {
                "id": f"{channel[:2].upper()}-{campaign_number:02d}",
                "name": f"{channel} {goal} {campaign_number:02d}",
                "channel": channel,
                "audience": audience,
                "goal": goal,
                "metrics": metrics,
                "scale": random.uniform(0.72, 1.34),
            }
        )

with output_path.open("w", newline="", encoding="utf-8") as csv_file:
    writer = csv.DictWriter(
        csv_file,
        fieldnames=[
            "date",
            "campaign_id",
            "campaign_name",
            "channel",
            "audience",
            "campaign_goal",
            "spend_usd",
            "clicks",
            "conversions",
            "revenue_usd",
        ],
    )
    writer.writeheader()

    for day_offset in range(day_count):
        report_date = start_date + timedelta(days=day_offset)
        weekly_effect = 1 + 0.12 * (1 if report_date.weekday() in (1, 2, 3) else -0.45)
        seasonal_effect = 1 + 0.16 * (day_offset / day_count) + 0.06 * (
            (day_offset % 31) / 31
        )

        for campaign in campaigns:
            metrics = campaign["metrics"]
            spend = (
                metrics["spend"]
                * campaign["scale"]
                * weekly_effect
                * seasonal_effect
                * random.uniform(0.72, 1.30)
            )
            ctr = metrics["ctr"] * random.uniform(0.76, 1.27)
            clicks = max(1, round(spend * 16 * ctr))
            cvr = (
                metrics["cvr"]
                * GOAL_CONVERSION_MULTIPLIER[campaign["goal"]]
                * random.uniform(0.75, 1.25)
            )
            conversions = max(0, round(clicks * cvr))
            revenue = conversions * metrics["aov"] * GOAL_REVENUE_MULTIPLIER[
                campaign["goal"]
            ] * random.uniform(0.82, 1.20)

            writer.writerow(
                {
                    "date": report_date.isoformat(),
                    "campaign_id": campaign["id"],
                    "campaign_name": campaign["name"],
                    "channel": campaign["channel"],
                    "audience": campaign["audience"],
                    "campaign_goal": campaign["goal"],
                    "spend_usd": f"{spend:.2f}",
                    "clicks": clicks,
                    "conversions": conversions,
                    "revenue_usd": f"{revenue:.2f}",
                }
            )

print(f"Wrote {day_count * len(campaigns):,} fictional daily rows to {output_path}")
