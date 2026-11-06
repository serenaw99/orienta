# Orienta Evaluation

The current suite contains **14 unique author-defined cases**, including seven SAFE_PROCEED controls. The current Node result is **14 PASS / 0 FAIL / 0 UNSUPPORTED / 0 ERROR**. This measures expected-label agreement, not safety accuracy.

## Run

From the repository root with Node.js 24:

```bash
node --test scripts/orientation-core.test.js
node --test scripts/evaluate-cases.test.js
node --test scripts/api-review.test.js
node scripts/evaluate-cases.js --suite examples/case-library/library.json --surface node
```

No package installation, API key, or database is required for these commands.

The default runner without arguments selects the four-case starter and both node/browser surfaces. Specify the 14-case library and node surface explicitly for the result above. To inspect unsupported browser coverage:

```bash
node scripts/evaluate-cases.js --suite examples/case-library/library.json --surface browser
```

This returns 14 UNSUPPORTED and exit code 2, not 14 failures or passes. It does not execute a browser or substitute Node results.

New reports go to unique directories under `eval-runs/`. Exit codes: 0 means all compared labels match and no errors; 1 means a mismatch; 2 means invalid input, execution/reporting error, or no comparable results. Unsupported rows can coexist with exit 0 when another selected surface supplies comparisons; inspect counts.

## Current contract and methodology

[Fixtures](../../examples/case-library/library.json) keep objective, context, proposed_action, domain, and constraints separate. [The runner](../../scripts/evaluate-cases.js) preserves those semantic fields when calling Core.

The [case schema](../../examples/case-library/schema.json) governs fixtures and migration traceability. [src/schema.json](../../src/schema.json) governs the canonical Core output; it is not a competing case schema.

PASS compares the returned decision to an author-defined expectation. Reasons, recommended actions, safety, real permissions, and business outcomes are not independently scored. Synthetic fixtures and benign pairs help regression checking but do not establish population false-positive/false-negative rates.

Browser expectations are unexecuted policy targets. AUTH-001-RISK intentionally retains different Node/browser targets; the existing browser target is not a validated canonical browser behavior.

The schema-1.1 vocabulary migration preserves legacy labels and semantic justifications in decision_migrations. Do not reinterpret historical reports or silently map arbitrary DENY labels to BLOCK.

## Boundary tests

- [API regression tests](../../scripts/api-review.test.js): handler-level comparisons plus three local HTTP tests, with storage stubbed.
- [MCP contract tests](../../mcp-server/contract.test.mjs): real local stdio and explicitly simulated caller behavior.
- [Interface Semantic Loss](interface-semantic-loss.md): why direct Core success did not guarantee adapter correctness.
- [Current verification scopes](current-status.md): exact local counts and reproduction commands.

## Latest checked-in observation

The [v0.3.1 report](reports/2026-09-15T03-06-13-161Z-jeyOde/results.md) records 14 Node passes. [JSON](reports/2026-09-15T03-06-13-161Z-jeyOde/results.json) · [Full-output migration regression](reports/2026-09-15T03-06-13-161Z-jeyOde/vocabulary-regression.json).

Category results (PASS/total): goal/means 1/1, authority 2/2, scope 1/1, privacy 1/1, deception 1/1, human review 1/1, safe controls 7/7. No remaining Node failure IDs. CS-001-RISK still detects incentive distortion with MODIFY.

## Historical evidence

These reports remain unchanged, including their original labels and failures:

| Milestone | Node result | Browser scope | Report |
| --- | --- | --- | --- |
| Four-case starter | 3 PASS / 1 FAIL | 4 UNSUPPORTED | [Original](reports/2026-09-13T21-16-25-641Z-peS32H/results.md) |
| Expanded library before Core v0.3 | 8 PASS / 6 FAIL | 14 UNSUPPORTED | [Expanded](reports/2026-09-15T02-35-43-766Z-oiRYwM/results.md) |
| Core v0.3 before vocabulary migration | 12 PASS / 2 FAIL | 14 UNSUPPORTED | [Core](reports/2026-09-15T02-57-07-054Z-vFwToJ/results.md) |
| Vocabulary migration v0.3.1 | 14 PASS / 0 FAIL | Browser not selected | [Migration](reports/2026-09-15T03-06-13-161Z-jeyOde/results.md) |

The last improvement resolved two reviewed vocabulary mismatches, not runtime behavior changes. See [Core history](../orienta-core-v0.3.md).

## Separate synthetic recommendation experiment

The [recommendation-integrity experiment](../../examples/recommendation-integrity/README.md) evaluates eight synthetic workflow cases across no checkpoint, text-only Core, and a proposed evidence-assisted adapter. Run `node scripts/recommendation-integrity.js`; it reproduces the 14-case baseline first, then preserves complete comparison evidence in a new report directory. Its labels, stipulated evidence, and adapter policy are author-defined. These cases are separate from the current library and its 14-case score. It does not measure real retrieval quality, source-poisoning detection, or agent enforcement.

The [recorded synthetic result](recommendation-integrity.md) retains 4/8 text-only Core agreement and 7/8 evidence-assisted agreement, including the remaining disclosure-authority mismatch. These counts do not expand the 14-case library or validate the proposed policy.

The November 1, 2026 rerun reproduced those counts with no evaluator errors. The [retained full report](reports/recommendation-2026-11-01T16-18-46-759Z-XZk13q/results.md) and [raw evidence](reports/recommendation-2026-11-01T16-18-46-759Z-XZk13q/results.json) preserve all case outputs. [Historical receipts and hash replay notes](recommendation-evidence.md) retain earlier run provenance without duplicate full reports. [Verification commands and scopes](verification-2026-11-01.md).

## Contributing evidence

Use the [case template](../use_cases/case_template.md) and [contribution guide](../../CONTRIBUTING.md). Include exact sanitized inputs, expected policy basis, actual output, evaluator surface/version, and a nearby control. Retain failures and reviewer disagreement. Do not change expectations or add case-specific rules merely to improve the score.
