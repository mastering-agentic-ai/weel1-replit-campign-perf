# Campaign Performance — Detailed Analysis

> **Scope:** This report analyzes the dashboard's fictional sample data, not real advertiser results. The sample is deterministic and includes 7,200 daily records for 40 campaigns across Facebook, Instagram, Pinterest, and Twitter from April 11 to October 7, 2026. Its channel and campaign-goal results are generated from preset assumptions; do not use them to make real budget decisions.

## Executive Summary

The sample totals $692,734 in ad spend and $1,412,449 in attributed revenue, producing a revenue-based ROI proxy of 103.9% (2.04x revenue-to-spend). Pinterest leads the platform comparison at 172.9% ROI and a $29.65 cost per conversion; Twitter is below breakeven overall at -11.7%, but its Sales and Leads segments are positive in the generated data. The upward time trend is also built into the sample generator, so it demonstrates the dashboard's analysis flow rather than an observed campaign improvement.

## Key Findings

### 1. Pinterest is the strongest aggregate channel in this sample

Pinterest generated 4,784 conversions on $141,839 spend, with $387,048 attributed revenue, 172.9% ROI, and a $29.65 cost per conversion. It used 20.5% of spend but supplied 30.5% of conversions. Its cost per conversion is about 65% lower than Twitter's $85.84.

Twitter spent $153,227 and generated $135,347 revenue, a $17,881 shortfall against ad spend and -11.7% revenue-based ROI. It used 22.1% of spend for 11.4% of conversions. This channel-level result hides differences by campaign goal: Twitter Sales and Leads are positive in this sample, while Awareness and Traffic are negative.

| Channel | Spend (USD) | Clicks | Conversions | Revenue (USD) | ROI | Cost / conversion (USD) | Conversion rate |
|---|---:|---:|---:|---:|---:|---:|---:|
| Facebook | $184,799 | 57,128 | 4,267 | $381,465 | 106.4% | $43.31 | 7.47% |
| Instagram | $212,868 | 76,125 | 4,828 | $508,589 | 138.9% | $44.09 | 6.34% |
| Pinterest | $141,839 | 59,378 | 4,784 | $387,048 | 172.9% | $29.65 | 8.06% |
| Twitter | $153,227 | 34,966 | 1,785 | $135,347 | -11.7% | $85.84 | 5.10% |

### 2. Campaign goal is a stronger split than platform alone

Sales accounts for 5,523 conversions (35.3% of all conversions) on 26.4% of spend and has the highest aggregate ROI, 226.0%. Leads also performs well in the sample at 153.4% ROI. Awareness is below revenue breakeven at -20.9%, but this is not a fair brand-awareness assessment: the dataset contains no reach, impressions, or brand-lift measurements.

| Campaign goal | Spend (USD) | Conversions | Revenue (USD) | ROI | Cost / conversion (USD) |
|---|---:|---:|---:|---:|---:|
| Sales | $182,629 | 5,523 | $595,445 | 226.0% | $33.07 |
| Leads | $176,462 | 4,926 | $447,201 | 153.4% | $35.82 |
| Traffic | $163,433 | 3,076 | $235,180 | 43.9% | $53.13 |
| Awareness | $170,210 | 2,139 | $134,624 | -20.9% | $79.57 |

The channel-by-goal rollup reinforces why the dashboard should be filtered by both dimensions. Pinterest Sales records 374.0% ROI and a $20.45 cost per conversion. Twitter Awareness records -66.0% ROI and a $155.18 cost per conversion. These are useful examples of segment reporting, not evidence that the same pattern will hold in a real account.

### 3. Audience differences are visible, but not isolated causal effects

Men 25–34 has the highest sample audience ROI at 142.5%, with a $39.50 cost per conversion. Women 25–34 has the lowest audience ROI at 84.6% and the highest audience cost per conversion at $47.69. Audience assignments are intertwined with channel and goal in the generated file, so these differences cannot be attributed to audience targeting alone.

| Audience | Spend (USD) | Conversions | Revenue (USD) | ROI | Cost / conversion (USD) |
|---|---:|---:|---:|---:|---:|
| Men 25–34 | $134,008 | 3,393 | $324,932 | 142.5% | $39.50 |
| Women 18–24 | $124,063 | 2,832 | $263,854 | 112.7% | $43.81 |
| Small business owners | $145,772 | 3,313 | $290,838 | 99.5% | $44.00 |
| Women 25–34 | $156,026 | 3,272 | $287,955 | 84.6% | $47.69 |
| All adults | $132,865 | 2,854 | $244,869 | 84.3% | $46.55 |

### 4. The top and bottom campaigns illustrate why a searchable campaign table helps

The highest-ROI campaign is Pinterest Sales 03: $10,607 spend, 528 conversions, $51,081 attributed revenue, and 381.6% ROI. The lowest is Twitter Awareness 10: $11,145 spend, 47 conversions, $2,494 revenue, and -77.6% ROI. The 459.2 percentage-point spread is intentionally exaggerated by the sample assumptions; it is not a forecast of real campaign variation.

| Campaign | Channel / goal | Spend (USD) | Conversions | Revenue (USD) | ROI | Cost / conversion (USD) |
|---|---|---:|---:|---:|---:|---:|
| Pinterest Sales 03 | Pinterest / Sales | $10,607 | 528 | $51,081 | 381.6% | $20.09 |
| Pinterest Sales 07 | Pinterest / Sales | $12,562 | 605 | $58,747 | 367.7% | $20.76 |
| Instagram Sales 01 | Instagram / Sales | $25,611 | 816 | $98,368 | 284.1% | $31.39 |
| Twitter Awareness 10 | Twitter / Awareness | $11,145 | 47 | $2,494 | -77.6% | $237.12 |

## Data Summary

| Metric | Value | Period |
|---|---:|---|
| Daily records | 7,200 | Apr 11–Oct 7, 2026 |
| Campaigns | 40 | 10 per channel |
| Spend | $692,734 | Full sample |
| Clicks | 227,597 | Full sample |
| Conversions | 15,664 | Full sample |
| Attributed revenue | $1,412,449 | Full sample |
| Revenue-to-spend | 2.04x | Full sample |
| Revenue-based ROI proxy | 103.9% | Full sample |
| Cost per conversion | $44.22 | Spend ÷ conversions |
| Cost per click | $3.04 | Spend ÷ clicks |
| Conversion rate | 6.88% | Conversions ÷ clicks |

## Trends & Patterns

The dashboard's Overview chart shows daily spend and conversions generally rising together. In six consecutive 30-day windows, average daily spend rises from $3,646 to $4,090 (+12.2%) and conversions rise from 81.3 to 93.5 per day (+15.0%). ROI moves from 99.9% to 106.1%, while cost per conversion edges down from $44.83 to $43.73.

| 30-day window | Spend / day (USD) | Conversions / day | ROI | Cost / conversion (USD) |
|---|---:|---:|---:|---:|
| Apr 11–May 10 | $3,646 | 81.3 | 99.9% | $44.83 |
| May 11–Jun 9 | $3,703 | 83.7 | 105.4% | $44.25 |
| Jun 10–Jul 9 | $3,779 | 85.5 | 103.5% | $44.18 |
| Jul 10–Aug 8 | $3,901 | 88.0 | 103.8% | $44.32 |
| Aug 9–Sep 7 | $3,972 | 90.0 | 104.3% | $44.13 |
| Sep 8–Oct 7 | $4,090 | 93.5 | 106.1% | $43.73 |

This smooth progression is not evidence of seasonality or optimization: the generator explicitly increases spend over time and includes a weekday multiplier. The chart is useful for confirming that shared date filters and time-series aggregation work; real trend conclusions require real, consistently attributed history.

## Recommendations

1. **Replace the sample before making budget decisions** — Use the generated CSV as a dashboard demo only. Upload a real daily campaign export with consistent dates, channel names, goals, spend, clicks, conversions, and attributed revenue.
2. **Compare channel and campaign goal together** — In real data, check channel × goal × audience segments before moving budgets. The sample's negative Twitter aggregate includes positive Sales and Leads segments, demonstrating how a channel-only total can hide useful variation.
3. **Use a profit-based return measure for investment decisions** — The dashboard's ROI formula is `(attributed revenue − ad spend) ÷ ad spend`. It excludes product margin, fulfillment, agency fees, taxes, and refunds; add contribution profit or margin-adjusted revenue before treating it as net ROI.
4. **Use goal-appropriate measures for Awareness** — Add impressions, reach, frequency, CPM, and brand-lift data. Conversion-based ROI alone can understate the purpose of an awareness campaign.
5. **Add impressions and attribution context to future exports** — Impressions are needed to calculate CTR and CPM. Document the conversion/revenue attribution window and currency so comparisons stay meaningful.

## Definitions and Limitations

- **ROI proxy:** `(total attributed revenue − total ad spend) ÷ total ad spend × 100`. It is calculated from aggregate totals, not by averaging daily ROI.
- **Revenue-to-spend:** `total attributed revenue ÷ total ad spend` (ROAS). At 2.04x, each $1 in sample ad spend corresponds to $2.04 in attributed revenue.
- **Cost per conversion:** `total ad spend ÷ total conversions`.
- **Conversion rate:** `total conversions ÷ total clicks`. It is not a click-through rate; impressions are not included.
- All sample data is fictional, generated from preset channel, goal, audience, and time multipliers with seeded random variation. The sample is not an experiment and does not establish causation, statistical significance, or real-world channel benchmarks.
- Revenue is treated as the return value because no profit margin, refunds, or non-ad costs are available. The resulting ROI is not net-profit ROI.
- The two Kaggle datasets were not used as the built-in data source: one does not document daily dates, while the other has a broader channel mix and would need field mapping. Neither directly supplies the full, consistent schema used here.
