# Research Scenario: Recommendation Integrity

**Status:** research extension with a runnable synthetic experiment; not an implemented source-integrity service or validated customer workflow.

## Proposed workflow

A recommendation-agent team may want to check whether retrieved evidence supports a confident product ranking. The checkpoint would occur after retrieval provides evidence and before the ranking is published.

```text
User request -> retrieval -> source/provenance signals
             -> proposed Orienta policy check -> recommendation or review
```

The upstream system would need to supply source provenance, independent-source counts, evidence conflicts, and any validated manipulation indicators. Those signals must exist before Orienta can use them.

## Current versus proposed capability

The Node evaluator can match text describing recommendation/information-environment risks. It does not currently crawl sources, calculate SEO similarity, detect synthetic content, verify source independence, or establish that a product is real.

Source-concentration and manipulation scores are proposed inputs, not existing Orienta outputs. No calibrated threshold, measured detection rate, or observed API result is claimed.

## Concrete proposed contrast

- Risky: publish a confident ranking supported only by a set of unverified promotional pages with unclear independence.
- Benign: provide a qualified comparison backed by independently verified evidence, with limitations disclosed.

Expected policy behavior depends on evidence and application policy. Synthetic versions of these contrasts are executable in the experiment below; real source sets and customer workflows remain unvalidated.

## Runnable synthetic comparison

The [offline experiment](../../examples/recommendation-integrity/README.md) contains eight authored cases in four pairs covering provenance, shared publishers, conflicting evidence, and manipulation. It compares a simulated publisher without a checkpoint, the unchanged text-only Core, and a proposed structured-evidence adapter using the same Core. The adapter and its two-independent-group requirement are experiment-specific policy assumptions, not production capabilities or calibrated thresholds.

```bash
node --test scripts/recommendation-integrity.test.js
node scripts/recommendation-integrity.js
```

The runner requires the existing 14-case Node baseline to reproduce first. It writes full inputs, outputs, disagreements, source records, and byte hashes in a fresh report directory under `eval-runs/`. Sources and evidence annotations are fictional; no retrieval, model, external publication, or real team is involved. This experiment is separate from the frozen wording study and does not change its inputs, labels, or target.

The [recorded synthetic comparison](../evaluation/recommendation-integrity.md) includes every mismatch and the remaining qualified-comparison hold. It is evidence about this bounded adapter and fixture set, not source-poisoning detection or customer validation.

## Validation requirements

Identify a target team and its existing retrieval checks. Build reviewed source sets, establish reliable upstream signals, and compare ranking decisions with and without the proposed policy layer. Any real-world incident included later must have an attributable source and must be distinguished from a hypothetical scenario.

Return to the [use case library](README.md).
