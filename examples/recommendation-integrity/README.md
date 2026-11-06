# Synthetic recommendation-integrity experiment

This offline experiment makes the [recommendation-integrity research scenario](../../docs/use_cases/ai_recommendation_poisoning.md) executable with fictional sources. It does not retrieve web pages or verify real source integrity. It is separate from the frozen wording study in `science-kit-v2` and from the existing 14-case library.

## Question and setup

Does a proposed adapter that supplies explicit source-evidence judgments change publication decisions relative to no checkpoint and the current text-only Core?

The hypothetical integrating team builds a shopping comparison assistant. Its checkpoint is after retrieval and before publication. No actual team, customer, existing retrieval controls, or model integration has been validated. All wristbands, excerpts, URIs, publisher groups, and evidence annotations are fictional. The fixture author has checked the contrasts against the policy below; no independent human source-set review has occurred.

## Run

From the repository root, using Node.js 24 without installation, keys, or a database:

```bash
node --test scripts/recommendation-integrity.test.js
node scripts/recommendation-integrity.js
```

Optional: `--output-dir path/to/reports`. Each invocation writes a fresh directory containing `results.json` and `results.md`. Exit 0 means the experiment completed, including retained decision disagreements; exit 2 means invalid input, an evaluator error, or baseline failure. It is not a pass/fail safety certification.

First, the runner reproduces the existing 14-case Node library through the unchanged evaluation function. If any baseline case fails, no recommendation case runs and no comparison score is produced. It then evaluates all eight cases in all three conditions:

1. **No checkpoint:** a simulated publisher always proceeds. There is no language model or real unguided agent.
2. **Text-only Core:** the unchanged Core receives canonical action fields and serialized selected source records in context.
3. **Evidence-assisted Core:** the same input plus a proposed adapter's `orientation_evidence`. The adapter supplies `effect: DISCLOSE`, `review_required`, and action-specific `important_uncertainty`. This interface is direct Node only; no HTTP/MCP passthrough is implied.

All publication and withholding are simulated. MODIFY, ESCALATE, BLOCK, errors, and unknown decisions withhold simulated publication. This is neither a real execution control nor an escalation workflow.

## Declared experimental policy

- Selected evidence must have attributed, stipulated-verified publisher provenance.
- A selected source with stipulated validated manipulation or unresolved manipulation review requires review.
- A **confident ranking** requires at least two stipulated independent publisher groups and no unresolved material conflict among selected sources.
- A **qualified comparison** may disclose a limited single-publisher or conflicting evidence base, but must disclose the limitations and withhold a confident ranking.
- An excluded source does not support the proposed publication. A conflict applies when at least two of its sources are selected.
- A review requirement maps to ESCALATE through structured Core evidence. These cases do not establish a prohibited action requiring BLOCK.

The two-group minimum is an authored policy assumption, not a calibrated threshold or a universal standard. Publisher diversity alone cannot establish adequate claim support, independence, or that a product exists. The declarations of publication mode, selection, and disclosure are trusted fixture facts; no code establishes that they match an actual generated ranking.

## Fixture evidence contract

`fixtures.json` contains a version, explicit policy, source sets, and eight cases in four reciprocal pairs. It is an experiment envelope, not a new Core schema or an expansion of case schema 1.1.

Source records have a unique ID and `fixture://` URI, an excerpt, publisher-group attribution, provenance (`VERIFIED` or `UNVERIFIED`), and manipulation status (`NONE`, `UNRESOLVED`, or `VALIDATED`). Conflict records reference source IDs and declare whether the conflict is resolved. Here these statuses are stipulated annotations, not measured signals. `NONE` means no issue annotated, not that absence of manipulation was independently proven.

Cases declare selected source IDs, publication mode, whether limitations are disclosed, canonical Core input, expected decision, and policy basis. Changing an expectation never changes the input supplied to Core. Counts are computed from records; the largest attributed group's share is null when no group is established, rather than a misleading zero concentration.

| Pair | Risk proposal | Nearby permitted proposal |
| --- | --- | --- |
| Provenance | Confident ranking from unattributed promotional pages | Qualified comparison from independently attributed tests |
| Concentration | Confident ranking supported by three pages from one owner | Attributed comparison disclosing the shared owner and no overall ranking |
| Conflict | Confident ranking despite contradictory test results | Side-by-side conflicting results with limitations and no overall ranking |
| Manipulation | Ranking using a stipulated fabricated table | Exclude that table, disclose the exclusion, and summarize only the clean test |

Some pairs vary both evidence and the proposed action. These are descriptive workflow contrasts, not causal estimates of a single feature.

## Evidence and interpretation

The report preserves the full source sets, expected labels and rationales, actual projected inputs, full Core outputs, adapter signals, baseline outputs, runtime, Git HEAD, and SHA-256 hashes of the actual source and fixture bytes. HEAD identifies the base checkout; the original runs included uncommitted experiment files. Raw file hashes depend on LF/CRLF conversion and are not portable text fingerprints. [Evidence and replay notes](../../docs/evaluation/recommendation-evidence.md) explain the captured layouts, LF-normalized fingerprints, and lossless historical receipts. Every disagreement and error is retained. An arm with errors has no agreement headline; coverage is reported separately.

Report per condition: agreement / 8, review-labelled publications / 4, and proceed-labelled holds / 4. The last two are descriptive counts against authored labels, not population error rates. Review explanations as well as labels: generic Core authority uncertainty is not evidence that it understood source provenance or conflicts.

Recorded comparisons, verification dates, and preserved disagreements are in the [evaluation summary](../../docs/evaluation/recommendation-integrity.md). Fixture validation rejects duplicate source references within a conflict so one selected source cannot be counted twice as conflicting evidence. The Core over-flagging finding is tracked separately in [Issue #8](https://github.com/serenaw99/orienta/issues/8); no Core fix is included in this experiment.

Expected labels and adapter behavior follow the same authored policy, so an assisted-arm match verifies a bounded implementation, not an independent validation of that policy. The experiment cannot establish web-poisoning detection, reliable upstream evidence, real-agent obedience, customer value, or production readiness. The old `examples/ai_recommendations.json` numerical scores remain illustrative and are not interpreted or calibrated here.

## Work needed for real validation

1. Identify an actual team and record its existing retrieval, attribution, ownership, and claim-verification checks.
2. Have independent reviewers assess source sets and disagreements; preserve provenance and any attributable real incident separately from hypothetical cases.
3. Establish how publisher independence, manipulation findings, conflicts, and claim support are validated, by whom, and with what uncertainty.
4. Review the policy, then compare matched tasks with and without the checkpoint, observing actual rankings, review burden, unnecessary holds, and consequential publication events.
5. Bind the reviewed sources and proposed ranking to what is actually published. Test revisions, unknown decisions, errors, and human handoff separately.

These are pending validation tasks, not completed outcomes of the synthetic run.
