"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fixtures = require("../examples/recommendation-integrity/fixtures.json");
const { validateSuite, sourceEvidence, deriveSignals, evaluateExperiment, summarize } = require("./recommendation-integrity");
const clone = () => structuredClone(fixtures);
const select = (suite, id) => {
  const c = suite.cases.find(c => c.id === id);
  const set = suite.source_sets.find(s => s.id === c.source_set_id);
  return { c, evidence: sourceEvidence(c, set), policy: suite.policy };
};

test("multiple pages from one attributed publisher do not become independent sources", () => {
  const { c, evidence, policy } = select(fixtures, "REC-CONCENTRATION-RISK");
  const signals = deriveSignals(c, evidence, policy);
  assert.equal(signals.source_count, 3);
  assert.equal(signals.independent_group_count, 1);
  assert.equal(signals.largest_attributed_group_share, 1);
  assert.ok(signals.review_reasons.includes("INSUFFICIENT_INDEPENDENT_GROUPS"));
});

test("a confident ranking needs corroboration even when a qualified comparison is allowed", () => {
  const { c, evidence, policy } = select(fixtures, "REC-CONCENTRATION-SAFE");
  assert.equal(deriveSignals(c, evidence, policy).review_required, false);
  assert.equal(deriveSignals({ ...c, publication_mode: "CONFIDENT_RANKING" }, evidence, policy).review_required, true);
  assert.equal(deriveSignals({ ...c, discloses_limitations: false }, evidence, policy).review_required, true);
});

test("qualifying an output does not establish missing provenance or clear manipulation", () => {
  const { c, evidence, policy } = select(fixtures, "REC-PROVENANCE-RISK");
  const signals = deriveSignals({ ...c, publication_mode: "QUALIFIED_COMPARISON", discloses_limitations: true }, evidence, policy);
  assert.equal(signals.review_required, true);
  assert.ok(signals.review_reasons.includes("PROVENANCE_UNVERIFIED"));
  assert.equal(signals.largest_attributed_group_share, null);
});

test("unresolved conflicts are tolerated only for a disclosed qualified comparison", () => {
  const { c, evidence, policy } = select(fixtures, "REC-CONFLICT-SAFE");
  assert.equal(deriveSignals(c, evidence, policy).review_required, false);
  assert.equal(deriveSignals({ ...c, discloses_limitations: false }, evidence, policy).review_required, true);
  assert.ok(deriveSignals({ ...c, publication_mode: "CONFIDENT_RANKING" }, evidence, policy).review_reasons.includes("MATERIAL_CONFLICT_UNRESOLVED"));
});

test("only selected evidence supports a proposal, and conflicts need both selected sources", () => {
  const safe = select(fixtures, "REC-MANIPULATION-SAFE");
  assert.deepEqual(safe.evidence.sources.map(s => s.id), ["clean-test"]);
  assert.equal(deriveSignals(safe.c, safe.evidence, safe.policy).review_required, false);
  const risk = select(fixtures, "REC-MANIPULATION-RISK");
  assert.ok(deriveSignals(risk.c, risk.evidence, risk.policy).review_reasons.includes("MANIPULATED_EVIDENCE_SELECTED"));
  const set = fixtures.source_sets.find(s => s.id === "CONFLICTING-TESTS");
  assert.equal(sourceEvidence({ source_ids: ["test-a"] }, set).conflicts.length, 0);
});

test("malformed or non-synthetic fixture evidence is rejected before evaluation", () => {
  for (const mutate of [
    s => { s.source_sets[0].sources[0].uri = "https://example.com/real"; },
    s => { s.source_sets[1].sources[0].publisher_group = null; },
    s => { s.source_sets[0].sources[1].uri = s.source_sets[0].sources[0].uri; },
    s => { s.source_sets[0].sources[0].manipulation = "GUESS"; },
    s => { s.source_sets.find(set => set.id === "CONFLICTING-TESTS").conflicts[0].source_ids.push("test-a"); },
    s => { s.cases[0].source_ids = ["missing"]; },
    s => { s.cases[0].source_ids.push(s.cases[0].source_ids[0]); },
    s => { s.cases[0].input.orientation_evidence = { review_required: false }; },
    s => { s.cases[0].paired_case_id = s.cases[0].id; }
  ]) {
    const suite = clone();
    mutate(suite);
    assert.throws(() => validateSuite(suite));
  }
});

test("both Core conditions receive the same selected evidence and preserve the action field", () => {
  const rows = evaluateExperiment(fixtures);
  for (const row of rows) {
    const text = row.arms.text_only_core.evaluated_input;
    const { orientation_evidence, ...assisted } = row.arms.evidence_assisted_core.evaluated_input;
    assert.deepEqual(text, assisted);
    assert.equal(text.proposed_action, row.case.input.proposed_action);
    assert.ok(text.context.includes(JSON.stringify(row.selected_evidence)));
    assert.equal(orientation_evidence.review_required, row.signals.review_required);
    assert.equal(row.arms.no_checkpoint.result.simulated, true);
  }
});

test("changing expected labels cannot change Core inputs or actual decisions", () => {
  const original = evaluateExperiment(fixtures);
  const suite = clone();
  for (const c of suite.cases) c.expected_decision = "BLOCK";
  const changed = evaluateExperiment(suite);
  for (let i = 0; i < original.length; i++) {
    for (const arm of ["text_only_core", "evidence_assisted_core"]) {
      assert.deepEqual(original[i].arms[arm].evaluated_input, changed[i].arms[arm].evaluated_input);
      assert.deepEqual(original[i].arms[arm].result, changed[i].arms[arm].result);
    }
  }
});

test("errors and unknown decisions hold simulated publication and suppress affected agreement", () => {
  for (const evaluator of [() => { throw new Error("evaluation unavailable"); }, () => ({ decision: "ALLOW" })]) {
    const rows = evaluateExperiment(fixtures, evaluator);
    assert.equal(rows.length, 8);
    for (const arm of ["text_only_core", "evidence_assisted_core"]) {
      assert.equal(summarize(rows, arm).agreement, null);
      assert.equal(summarize(rows, arm).errors, 8);
      assert.ok(rows.every(r => r.arms[arm].publication_simulated === false && r.arms[arm].error));
    }
  }
  assert.equal(summarize([], "text_only_core").agreement, null);
});
