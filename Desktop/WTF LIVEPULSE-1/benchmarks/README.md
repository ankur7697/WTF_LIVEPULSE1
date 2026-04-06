# Benchmark Notes

This folder contains the exact SQL used for the six required `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)` runs.

The summary table, measured times, and reproduction notes are documented in [`docs/benchmarks.md`](../docs/benchmarks.md).

The captured outputs live in `benchmarks/screenshots/` as text transcripts:
- `q1_live_occupancy_single_gym.txt`
- `q2_todays_revenue_single_gym.txt`
- `q3_churn_risk_members.txt`
- `q4_peak_hour_heatmap_7d.txt`
- `q5_cross_gym_revenue_comparison.txt`
- `q6_active_anomalies_all_gyms.txt`

If you want PNG screenshots, rerun the same queries in a local environment with screenshot tooling and capture the `EXPLAIN` panes there.
