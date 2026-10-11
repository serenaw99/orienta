# Current Local Verification

Source baseline: [8a9f8de](https://github.com/serenaw99/orienta/commit/8a9f8dee006f6500426a3798717e2cd91bfa2750), including API fix 61eb563. Documentation finalization re-ran the commands below using Node.js v24.16.0 without changing runtime sources or fixture expectations.

## Scopes

| Scope | Actual local result | What it verifies |
| --- | --- | --- |
| Core tests | 11 PASS / 0 FAIL | Core behavior and canonical output |
| Runner tests | 10 PASS / 0 FAIL | Suite validation, failure reporting, historical output regression |
| API tests | 23 PASS / 0 FAIL | Handler/adapter preservation; includes 3 local HTTP tests with storage stubs |
| MCP tests | 25 PASS / 0 FAIL | 19 real stdio contract checks; 6 test-only caller simulations |
| MCP smoke | Completed, exit 0 | Tool discovery, two reviews, risk catalog, audit-log read |
| Node library | 14 PASS / 0 FAIL / 0 UNSUPPORTED / 0 ERROR | Expected-label agreement on the unchanged 14 inputs |
| SAFE_PROCEED subset | 7/7 | Included in the Node library; not seven additional cases |
| Browser runner | 14 UNSUPPORTED when selected | No browser adapter executes these cases |

These are separate scopes, not an aggregate measure of safety.

## Reproduce

From the repository root:

```bash
node src/gate_node.js examples/customer_support_demo_input.json
node --test scripts/orientation-core.test.js
node --test scripts/evaluate-cases.test.js
node --test scripts/api-review.test.js
node scripts/evaluate-cases.js --suite examples/case-library/library.json --surface node
cd mcp-server
npm ci --ignore-scripts
node --test contract.test.mjs
node test.mjs
cd ..
```

The MCP smoke log is local and ignored; it contains synthetic objective text. No database or model service is involved in the tests above. npm dependency installation uses the MCP lockfile; no dependency files were changed.

## Not established

- Hosted API deployment or real MongoDB/Gemini integration.
- Real external-agent obedience, tool blocking, or human handoff.
- Browser equivalence to canonical Core.
- Production safety, independent benchmark performance, customer outcomes.
- Measured latency or cross-model robustness.

The CLI reports its actual output. The API/MCP suites compare full outputs to Core, but their PASS counts are not independent judgments of reasoning quality.

## Historical evidence

The [v0.3.1 checked-in report](reports/2026-09-15T03-06-13-161Z-jeyOde/results.md) records the canonical 14/14 Node result. Its [JSON](reports/2026-09-15T03-06-13-161Z-jeyOde/results.json) and [vocabulary regression evidence](reports/2026-09-15T03-06-13-161Z-jeyOde/vocabulary-regression.json) remain unchanged. The documentation verification is a rerun, not a replacement of that report.
