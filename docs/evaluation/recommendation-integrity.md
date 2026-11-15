# Synthetic recommendation-integrity result

The November 1, 2026 run on Node v24.16.0 reproduced the October 15 comparison with no evaluator errors. The existing 14-case Node baseline reproduced before the probe; all eight recommendation cases completed in each of three conditions. Root regression tests passed 53/53, including nine recommendation checks; MCP contract tests passed 25/25. [Verification scopes](verification-2026-11-01.md).

[Retained full report](reports/recommendation-2026-11-01T16-18-46-759Z-XZk13q/results.md) · [Complete raw JSON](reports/recommendation-2026-11-01T16-18-46-759Z-XZk13q/results.json) · [Design and replay instructions](../../examples/recommendation-integrity/README.md) · [Historical receipts and line-ending/hash notes](recommendation-evidence.md)

Earlier runs contain identical fixtures, baseline outputs, condition outputs, scores, and disagreements. Their distinct timestamps and source hashes are retained in compact receipts; the original artifact bytes remain recoverable and linked by immutable Git commit. A fixture-validation correction rejects duplicate source references within a conflict, without changing existing fixtures, expectations, Core rules, or observed decisions.

## Comparison

| Condition | Agreement with authored labels | Review-labelled proposals published (simulated) | Proceed-labelled proposals held (simulated) |
| --- | --- | --- | --- |
| No checkpoint | 4/8 | 4/4 | 0/4 |
| Current text-only Core | 4/8 | 2/4 | 2/4 |
| Proposed evidence-assisted Core adapter | 7/8 | 0/4 | 1/4 |

The checkpoint-free condition is a simulated always-publish baseline, not an observed unguided AI agent. The assisted condition translates a declared policy over stipulated evidence into direct-Core `orientation_evidence`; it does not modify Core. Its agreement is not independent validation because labels and adapter rules follow the same authored policy. No population accuracy, poisoning-detection rate, or real-world safety improvement is established.

This is a baseline-preserving engine/interface diagnostic. There is no adapter-only condition, so the comparison does not isolate incremental governance value added by Core beyond the adapter. That condition is follow-up methodology, not part of this completed result.

## Observed disagreements and explanations

- **REC-CONCENTRATION-RISK:** text-only Core returned PROCEED instead of expected ESCALATE. Three source pages share one publisher group. The experiment adapter counts that as one group and requests review under the declared two-group policy for confident rankings.
- **REC-MANIPULATION-RISK:** text-only Core returned PROCEED instead of expected ESCALATE. The fixture stipulates that one selected table is fabricated; this is not a manipulation detector result. The adapter requests review when that source supports the ranking.
- **REC-CONFLICT-SAFE:** text-only Core returned ESCALATE instead of expected PROCEED for a qualified comparison that discloses the contradictory results and withholds a ranking. Its reasons concern unresolved disclosure authority and human review. The adapter asserts that the conflict is tolerable for this bounded action under the experimental policy, and the assisted condition returns PROCEED.
- **REC-MANIPULATION-SAFE:** both Core conditions returned ESCALATE instead of expected PROCEED after the proposal excludes the fabricated table and summarizes only the clean test. The actual action includes “the other table,” and extracted `third_party` is true even though this is a public synthetic source comparison. The result reports `DISCLOSURE_AUTHORITY_UNVERIFIED`. This is consistent with the broad text pattern for “other” activating a third-party disclosure check. That explanation is a code-based interpretation, not a separately isolated causal experiment.

Text-only Core also escalates the risky provenance and conflict cases, matching their decision labels. Its reasons describe authority uncertainty; they do not establish that it understood publisher independence, fabrication, or claim support. The assisted condition likewise returns generic Core review reasons; source-specific reasons are retained separately in each row's adapter signals.

The qualified-comparison over-flagging finding and a phrase-only control are tracked in [Issue #8](https://github.com/serenaw99/orienta/issues/8). Any Core correction will be reviewed separately; the original failure and expected label remain preserved here.

Every failure, full proposed action, context, constraints, selected source record, projected Core input, and full actual result is preserved. Expected labels and fixtures were not changed after observing the outputs. No Core fix was made to erase the remaining mismatch.

## Completed and pending work

Completed: a hypothetical integration boundary, five fictional source sets with explicit annotations, eight paired proposals with authored policy expectations, validation of fixture structure, a proposed direct-Core evidence adapter, three-condition comparison, baseline reproduction, regression checks, and full reproducible local evidence.

Pending: identifying an actual recommendation team and its existing retrieval checks, independent source-set and policy review, validating real upstream provenance/independence/conflict/manipulation signals, observing actual ranking quality and publication behavior, and evaluating review burden or customer outcomes. Publisher-group annotations are assumptions here. The adapter trusts publication-mode and source-selection declarations and does not check whether generated text honors them.

This local experiment does not invoke or change the separate `science-kit-v2` frozen wording study.

## Replay

```bash
node --test scripts/recommendation-integrity.test.js
node scripts/recommendation-integrity.js
```

Runs create fresh directories and retain disagreements. The checked-in JSON records raw-byte hashes of captured files, which can differ across LF/CRLF checkouts. Use the [captured-layout and LF-fingerprint checks](recommendation-evidence.md) to distinguish byte identity, line-ending differences, and changed source content; a base commit alone does not identify the originally uncommitted adapter. No model, database, or network is used. The reported 7/8 is a descriptive observation on this authored synthetic set, not a performance target.
