# Benchmarks

The required benchmark SQL lives in [`benchmarks/queries.sql`](../benchmarks/queries.sql).

The captured outputs are stored as text transcripts in [`benchmarks/screenshots/`](../benchmarks/screenshots).

## Measured Results

| Query | Purpose | Execution Time | Output File |
| --- | --- | --- | --- |
| Q1 | Live occupancy for one gym | 4.612 ms | [`q1_live_occupancy_single_gym.txt`](../benchmarks/screenshots/q1_live_occupancy_single_gym.txt) |
| Q2 | Today's revenue for one gym | 4.541 ms | [`q2_todays_revenue_single_gym.txt`](../benchmarks/screenshots/q2_todays_revenue_single_gym.txt) |
| Q3 | Churn-risk members | 0.067 ms | [`q3_churn_risk_members.txt`](../benchmarks/screenshots/q3_churn_risk_members.txt) |
| Q4 | Peak-hour heatmap for 7 days | 0.576 ms | [`q4_peak_hour_heatmap_7d.txt`](../benchmarks/screenshots/q4_peak_hour_heatmap_7d.txt) |
| Q5 | Cross-gym revenue comparison | 5.197 ms | [`q5_cross_gym_revenue_comparison.txt`](../benchmarks/screenshots/q5_cross_gym_revenue_comparison.txt) |
| Q6 | Active anomalies across all gyms | 0.073 ms | [`q6_active_anomalies_all_gyms.txt`](../benchmarks/screenshots/q6_active_anomalies_all_gyms.txt) |

## Reproduction Notes

- Seed the database with `docker compose up`
- Run each query with `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)`
- For parameterized queries, use a seeded gym id from the `gyms` table

## What The Numbers Mean

- Q1 and Q2 are the hottest live dashboard queries
- Q3 exercises the partial churn-risk index
- Q4 reads the materialized heatmap view
- Q5 scans the rolling payment index for cross-gym comparison
- Q6 reads unresolved anomalies only

