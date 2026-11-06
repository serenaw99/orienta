"use strict";

// Offline, synthetic experiment only. No retrieval, model, or production adapter.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { evaluateObjective } = require("../src/orientation_engine");
const { evaluateCases } = require("./evaluate-cases");
const ROOT = path.resolve(__dirname, "..");
const ARMS = ["no_checkpoint", "text_only_core", "evidence_assisted_core"];
const DECISIONS = ["PROCEED", "MODIFY", "ESCALATE", "BLOCK"];
const hash = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const requireThat = (condition, message) => { if (!condition) throw new Error(message); };

function validateSuite(suite) {
  requireThat(suite?.suite_version === "1.0" && suite.evidence_scope === "synthetic", "Only synthetic suite version 1.0 is supported.");
  requireThat(suite.policy?.id && Number.isInteger(suite.policy.minimum_independent_groups_for_confident_ranking) &&
    suite.policy.minimum_independent_groups_for_confident_ranking >= 2, "Declare a policy and an integer independent-group minimum >= 2.");
  requireThat(Array.isArray(suite.source_sets) && suite.source_sets.length && Array.isArray(suite.cases) && suite.cases.length, "Source sets and cases are required.");
  const sets = new Map();
  for (const set of suite.source_sets) {
    requireThat(typeof set.id === "string" && set.id && !sets.has(set.id), "Source-set IDs must be unique.");
    sets.set(set.id, set);
    requireThat(Array.isArray(set.sources) && set.sources.length && Array.isArray(set.conflicts), "Sources and explicit conflicts are required: " + set.id);
    const ids = new Set();
    const uris = new Set();
    for (const source of set.sources) {
      requireThat(typeof source.id === "string" && source.id && !ids.has(source.id), "Source IDs must be unique: " + set.id);
      ids.add(source.id);
      requireThat(typeof source.uri === "string" && source.uri.startsWith("fixture://") && typeof source.excerpt === "string" && source.excerpt.trim(), "Only synthetic source URIs and nonempty excerpts are allowed.");
      requireThat(!uris.has(source.uri), "Duplicate source URI: " + source.uri);
      uris.add(source.uri);
      requireThat(["VERIFIED", "UNVERIFIED"].includes(source.provenance) && ["NONE", "UNRESOLVED", "VALIDATED"].includes(source.manipulation), "Invalid source evidence status.");
      requireThat(source.publisher_group === null || (typeof source.publisher_group === "string" && source.publisher_group.trim()), "Invalid publisher group.");
      requireThat(source.provenance !== "VERIFIED" || source.publisher_group, "Verified provenance requires an attributed publisher group.");
    }
    const conflicts = new Set();
    for (const conflict of set.conflicts) {
      requireThat(typeof conflict.id === "string" && conflict.id && !conflicts.has(conflict.id), "Conflict IDs must be unique.");
      conflicts.add(conflict.id);
      requireThat(Array.isArray(conflict.source_ids) && new Set(conflict.source_ids).size >= 2 &&
        new Set(conflict.source_ids).size === conflict.source_ids.length &&
        conflict.source_ids.every(id => ids.has(id)) && ["RESOLVED", "UNRESOLVED"].includes(conflict.status) &&
        typeof conflict.description === "string" && conflict.description.trim(), "Invalid conflict record.");
    }
  }
  const cases = new Map();
  for (const c of suite.cases) {
    requireThat(typeof c.id === "string" && c.id && !cases.has(c.id), "Case IDs must be unique.");
    cases.set(c.id, c);
    const set = sets.get(c.source_set_id);
    requireThat(set && Array.isArray(c.source_ids) && c.source_ids.length && new Set(c.source_ids).size === c.source_ids.length &&
      c.source_ids.every(id => set.sources.some(s => s.id === id)), "Case must select distinct existing sources: " + c.id);
    requireThat(["CONFIDENT_RANKING", "QUALIFIED_COMPARISON"].includes(c.publication_mode) && typeof c.discloses_limitations === "boolean", "Publication intent must be declared: " + c.id);
    requireThat(c.input && ["objective", "context", "proposed_action", "domain"].every(k => typeof c.input[k] === "string" && c.input[k].trim()) &&
      Array.isArray(c.input.constraints) && c.input.constraints.every(v => typeof v === "string") &&
      !Object.hasOwn(c.input, "orientation_evidence"), "Case input must preserve canonical fields without precomputed evidence.");
    requireThat(DECISIONS.includes(c.expected_decision) && typeof c.policy_basis === "string" && c.policy_basis.trim(), "Expected decision and policy basis are required.");
  }
  for (const c of suite.cases) {
    const pair = cases.get(c.paired_case_id);
    requireThat(pair && pair !== c && pair.paired_case_id === c.id, "Pairs must link back to a different case.");
  }
  return suite;
}

function sourceEvidence(c, set) {
  const sources = set.sources.filter(s => c.source_ids.includes(s.id));
  const conflicts = set.conflicts.filter(f => f.source_ids.filter(id => c.source_ids.includes(id)).length >= 2);
  return { sources, conflicts };
}

// These are arithmetic over stipulated fixture annotations, not source verification.
function deriveSignals(c, evidence, policy) {
  const groups = new Set(evidence.sources.filter(s => s.provenance === "VERIFIED").map(s => s.publisher_group));
  const reasons = [];
  if (evidence.sources.some(s => s.provenance !== "VERIFIED")) reasons.push("PROVENANCE_UNVERIFIED");
  if (evidence.sources.some(s => s.manipulation === "VALIDATED")) reasons.push("MANIPULATED_EVIDENCE_SELECTED");
  if (evidence.sources.some(s => s.manipulation === "UNRESOLVED")) reasons.push("MANIPULATION_REVIEW_UNRESOLVED");
  if (c.publication_mode === "CONFIDENT_RANKING") {
    if (groups.size < policy.minimum_independent_groups_for_confident_ranking) reasons.push("INSUFFICIENT_INDEPENDENT_GROUPS");
    if (evidence.conflicts.some(f => f.status === "UNRESOLVED")) reasons.push("MATERIAL_CONFLICT_UNRESOLVED");
  } else if (!c.discloses_limitations) reasons.push("QUALIFICATION_MISSING");
  return {
    source_count: evidence.sources.length,
    independent_group_count: groups.size,
    largest_attributed_group_share: groups.size ? Math.max(...[...groups].map(g => evidence.sources.filter(s => s.provenance === "VERIFIED" && s.publisher_group === g).length)) / evidence.sources.length : null,
    unverified_source_count: evidence.sources.filter(s => s.provenance !== "VERIFIED").length,
    review_reasons: reasons,
    review_required: reasons.length > 0
  };
}

function projectInput(c, evidence) {
  // Same action and selected source evidence in both Core arms. No expected labels.
  return {
    objective: c.input.objective,
    context: c.input.context + "\nSelected synthetic source evidence: " + JSON.stringify(evidence),
    proposed_action: c.input.proposed_action,
    domain: c.input.domain,
    constraints: [...c.input.constraints]
  };
}

function evaluateExperiment(suite, evaluator = evaluateObjective) {
  validateSuite(suite);
  return suite.cases.map(c => {
    const set = suite.source_sets.find(s => s.id === c.source_set_id);
    const evidence = sourceEvidence(c, set);
    const signals = deriveSignals(c, evidence, suite.policy);
    const input = projectInput(c, evidence);
    const assisted = {
      ...input,
      // A trusted adapter would have to validate these assertions. Here they are synthetic.
      // A disclosed, bounded comparison can tolerate a conflict that a confident ranking cannot.
      orientation_evidence: { effect: "DISCLOSE", important_uncertainty: signals.review_required, review_required: signals.review_required }
    };
    const arms = {};
    for (const arm of ARMS) {
      const evaluatedInput = arm === "no_checkpoint" ? null : structuredClone(arm === "text_only_core" ? input : assisted);
      try {
        const result = arm === "no_checkpoint"
          ? { decision: "PROCEED", simulated: true, explanation: "The simulated publisher always publishes; no review is performed." }
          : evaluator(structuredClone(evaluatedInput));
        requireThat(result && DECISIONS.includes(result.decision), "Unknown evaluator decision.");
        arms[arm] = { status: result.decision === c.expected_decision ? "PASS" : "FAIL", evaluated_input: evaluatedInput, result,
          publication_simulated: result.decision === "PROCEED" };
      } catch (error) {
        arms[arm] = { status: "ERROR", evaluated_input: evaluatedInput, result: null, publication_simulated: false, error: error.message };
      }
    }
    return { case: structuredClone(c), selected_evidence: evidence, signals, arms };
  });
}

function summarize(rows, arm) {
  const errors = rows.filter(r => r.arms[arm].status === "ERROR").length;
  const matched = rows.filter(r => r.arms[arm].status === "PASS").length;
  return {
    planned: rows.length, compared: rows.length - errors, errors,
    agreement: errors || !rows.length ? null : { matched, total: rows.length },
    review_labelled_cases: rows.filter(r => r.case.expected_decision === "ESCALATE").length,
    review_labelled_publications: rows.filter(r => r.case.expected_decision === "ESCALATE" && r.arms[arm].publication_simulated).length,
    proceed_labelled_cases: rows.filter(r => r.case.expected_decision === "PROCEED").length,
    proceed_labelled_holds: rows.filter(r => r.case.expected_decision === "PROCEED" && r.arms[arm].result && !r.arms[arm].publication_simulated).length
  };
}

function markdown(report) {
  const lines = ["# Synthetic recommendation-integrity comparison", "", "Status: " + report.status, "",
    "Offline, author-defined fixtures and policy. No real retrieval, source verification, model, team, or publication was tested.",
    "The evidence-assisted arm is a proposed experiment adapter, not a new Core capability. Publication is simulated.", "",
    "Baseline: " + report.baseline.filter(r => r.status === "PASS").length + "/14 expected decisions matched.",
    "Source commit: " + (report.source_commit || "unavailable") + ". Run UTC: " + report.run_at + ". Node: " + report.node_version + ".", ""];
  if (report.status === "baseline_failed") lines.push("Baseline failed; no experiment cases were evaluated. No comparison score.", "");
  else {
    lines.push("| Condition | Label agreement | Review-labelled publications | Proceed-labelled holds | Errors |", "| --- | --- | --- | --- | --- |");
    for (const arm of ARMS) {
      const s = report.summary[arm];
      lines.push(`| ${arm} | ${s.agreement ? s.agreement.matched + "/" + s.agreement.total : "unavailable (incomplete)"} | ${s.review_labelled_publications}/${s.review_labelled_cases} | ${s.proceed_labelled_holds}/${s.proceed_labelled_cases} | ${s.errors} |`);
    }
    lines.push("", "| Case | Expected | No checkpoint | Text-only Core | Evidence-assisted Core |", "| --- | --- | --- | --- | --- |");
    for (const row of report.rows) lines.push(`| ${row.case.id} | ${row.case.expected_decision} | ${ARMS.map(a => row.arms[a].result?.decision || "ERROR").join(" | ")} |`);
    lines.push("", "## Complete inputs, outputs, and disagreements", "", "Each case below retains every arm, including failed comparisons and errors. Expected labels were not supplied to either Core arm.");
    for (const row of report.rows) lines.push("", "### " + row.case.id, "", "```json", JSON.stringify(row, null, 2), "```");
  }
  lines.push("", "## Limits", "", "Eight cases are four authored pairs, not independent population samples. No independent human review has occurred.",
    "VERIFIED, publisher groups, manipulation annotations, and conflict annotations are stipulated synthetic facts. The adapter does not authenticate them or parse publication intent from natural language.",
    "The two-group rule is a declared experimental policy assumption, not a calibrated safety threshold. Two publishers do not by themselves prove source independence or adequate claim support.",
    "Both assisted decisions and expected labels reflect the same declared policy. Agreement checks plumbing and bounded policy behavior; it does not independently validate the policy or establish a detection rate.",
    "The no-checkpoint publisher and all publication holds are simulations. No real ranking, tool execution, external agent, or human handoff was evaluated.",
    "results.json preserves the source sets, baseline outputs, all case inputs, selected evidence, projections, results, and source-file hashes.", "");
  return lines.join("\n");
}

function main(argv = process.argv.slice(2)) {
  let outputDir = path.join(ROOT, "eval-runs");
  if (argv.length) {
    requireThat(argv.length === 2 && argv[0] === "--output-dir" && argv[1] && !argv[1].startsWith("--"), "Usage: node scripts/recommendation-integrity.js [--output-dir directory]");
    outputDir = path.resolve(argv[1]);
  }
  const fixturePath = path.join(ROOT, "examples/recommendation-integrity/fixtures.json");
  const suite = validateSuite(JSON.parse(fs.readFileSync(fixturePath, "utf8")));
  const baselineSuite = JSON.parse(fs.readFileSync(path.join(ROOT, "examples/case-library/library.json"), "utf8"));
  const baseline = evaluateCases(baselineSuite, ["node"]);
  const baselinePassed = baseline.length === 14 && new Set(baseline.map(r => r.case_id)).size === 14 && baseline.every(r => r.status === "PASS");
  const rows = baselinePassed ? evaluateExperiment(suite) : [];
  let sourceCommit = null;
  try { sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { /* File hashes are the byte identity even without Git. */ }
  const files = ["src/orientation_engine.js", "src/orientation_checks.js", "src/schema.json", "scripts/evaluate-cases.js", "scripts/recommendation-integrity.js", "examples/case-library/library.json", "examples/case-library/schema.json", "examples/recommendation-integrity/fixtures.json"];
  const report = {
    report_version: "1.0", status: !baselinePassed ? "baseline_failed" : rows.some(r => ARMS.some(a => r.arms[a].status === "ERROR")) ? "incomplete" : "completed",
    evidence_scope: "synthetic_local_experiment", run_at: new Date().toISOString(), node_version: process.version,
    source_commit: sourceCommit, file_sha256: Object.fromEntries(files.map(f => [f, hash(fs.readFileSync(path.join(ROOT, f)))])),
    suite, baseline, summary: Object.fromEntries(ARMS.map(a => [a, summarize(rows, a)])), rows
  };
  fs.mkdirSync(outputDir, { recursive: true });
  const directory = fs.mkdtempSync(path.join(outputDir, "recommendation-" + report.run_at.replace(/[:.]/g, "-") + "-"));
  fs.writeFileSync(path.join(directory, "results.json"), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
  fs.writeFileSync(path.join(directory, "results.md"), markdown(report), { flag: "wx" });
  console.log(JSON.stringify({ report_directory: directory, status: report.status, summary: report.summary }, null, 2));
  // Decision mismatches are retained experimental findings, not runner errors.
  return report.status === "completed" ? 0 : 2;
}

if (require.main === module) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error.message); process.exitCode = 2; }
}
module.exports = { validateSuite, sourceEvidence, deriveSignals, projectInput, evaluateExperiment, summarize, markdown };
