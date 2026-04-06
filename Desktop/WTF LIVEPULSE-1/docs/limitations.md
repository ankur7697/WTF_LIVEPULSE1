# Known Limitations

The project is complete enough to run and review, but a few constraints still matter.

## Benchmark Artifacts

- The benchmark outputs are text transcripts, not PNG screenshots.
- They are still valid `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)` captures, but they were generated in a shell rather than through a screenshot tool.
- The measured times are specific to this seeded environment and will vary on another machine.

## Browser Testing

- The Playwright suite uses the mock runtime.
- That keeps the tests deterministic, but it means the browser tests do not hit the live Docker backend in this workspace.

## Coverage Scope

- The backend coverage report is generated from Jest.
- The unit and integration tests run against the in-memory store, so the coverage report does not prove PostgreSQL performance by itself.

## Review Notes

- The app is implemented end-to-end for the demo flow.
- If you need a production hardening pass, the next steps would be live backend E2E tests, additional Postgres integration coverage, and PNG benchmark captures.

