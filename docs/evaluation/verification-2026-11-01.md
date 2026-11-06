# Local verification — November 1, 2026

Verification date: November 1, 2026. Runtime: Node.js v24.16.0. This record describes verification before the initial experiment commit, including then-uncommitted experiment files. It is local regression evidence, not hosted-service or production validation. [Source identity and line-ending notes](recommendation-evidence.md).

## Executed checks

| Command / scope | Actual result |
| --- | --- |
| `npm test` | 53 passed, zero failed: 11 Core, 10 evaluation runner, 23 API, nine recommendation |
| `node --test mcp-server/contract.test.mjs` | 25 passed, zero failed: 19 stdio contract checks and six simulated caller checks |
| `node scripts/evaluate-cases.js --suite examples/case-library/library.json --surface node` | 14 PASS, zero FAIL / ERROR / UNSUPPORTED |
| `npm run eval:recommendations -- --output-dir docs/evaluation/reports` | Completed; baseline 14/14, eight cases in each of three conditions, zero evaluator errors |
| `node test.mjs` from `mcp-server/`, using a fresh ignored audit-log path | Exit 0; three tools discovered, English MODIFY and Chinese ESCALATE, 12 catalog rules, two audit entries |

On PowerShell, `npm.cmd` was used to execute npm. The API tests stub storage and use three local HTTP checks; they do not call MongoDB or Gemini. MCP tests use the real local stdio server. The six caller-enforcement tests remain simulations.

## Recommendation results and evidence

| Condition | Agreement with authored labels | Review-labelled simulated publications | Proceed-labelled simulated holds |
| --- | --- | --- | --- |
| No checkpoint | 4/8 | 4/4 | 0/4 |
| Text-only Core | 4/8 | 2/4 | 2/4 |
| Proposed evidence-assisted adapter | 7/8 | 0/4 | 1/4 |

[Latest full report](reports/recommendation-2026-11-01T16-18-46-759Z-XZk13q/results.md) · [Latest raw JSON](reports/recommendation-2026-11-01T16-18-46-759Z-XZk13q/results.json) · [Interpretation](recommendation-integrity.md)

The source sets, labels, baseline, and decisions reproduce the October 15 run. The retained report records actual source-file hashes, Node version, base Git commit, complete inputs, all condition outputs, and remaining disagreements. The October 15 run and the initial November 1 run have identical evidence payloads. Their distinct metadata and original artifact hashes are preserved in [historical receipts](reports/recommendation-history.json), with [exact reconstruction and immutable original-file links](recommendation-evidence.md), rather than duplicate full report copies.

## Review corrections

- Fixture validation now rejects repeated source IDs within a conflict. Without that check, a malformed conflict could count the same selected source twice and appear to involve two selected sources. The invalid-fixture regression test now covers that input. Existing fixtures and expected labels are unchanged; all 53 root tests passed again after the correction.
- The contributor guide now uses the actual direct commands for API and MCP tests rather than advertising absent `test:api` / `test:mcp` shortcuts. Existing package scripts, including `test:core`, remain present.
- Run dates and detailed experimental results are kept in evaluation documents; general project documentation links to them. Historical receipts retain their original metadata and artifact hashes.

An initial smoke invocation from the repository root failed before server startup because the legacy smoke script resolves `server.js` relative to its working directory. Re-running it from the documented `mcp-server/` directory completed successfully. The smoke script's implementation was not changed.

## Limits

The remaining REC-MANIPULATION-SAFE decision mismatch is retained: Core returns ESCALATE where the experimental policy expects PROCEED for the qualified clean-source summary. Passing regression tests does not mean every experimental expectation matches.

All recommendation sources and annotations are synthetic assumptions. No retrieval, source verification, model-generated ranking, real publication, customer integration, or human handoff was tested. The browser adapter remains unsupported and was not rerun as a browser evaluation today. The separate frozen `science-kit-v2` wording study was neither run nor modified.
