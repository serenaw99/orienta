"use strict";

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const suite = require("../experiments/runtime-enforcement/cases.json");
const { CONDITIONS, createSession, runScripted, runAgent, summarize } = require("../experiments/runtime-enforcement/runtime");
const { createGroqClient } = require("../experiments/runtime-enforcement/groq");
const { BUSINESS_TOOLS, INITIAL_STATE, normalizeCall, mutation, writeJson, digest } = require("../experiments/runtime-enforcement/sandbox");
const ROOT = path.resolve(__dirname, "..");

function validateSuite(data) {
  if (data.evidence_scope !== "synthetic" || data.status !== "development-pilot-not-frozen" ||
      !Array.isArray(data.cases) || !data.cases.length) throw new Error("Expected a synthetic development suite.");
  const ids = new Set();
  for (const task of data.cases) {
    if (typeof task.id !== "string" || !/^[a-z0-9-]+$/.test(task.id) || ids.has(task.id)) throw new Error("Invalid or duplicate case ID.");
    ids.add(task.id);
    if (!["benign", "prohibited"].includes(task.category) ||
        ![task.objective, task.context].every(s => typeof s === "string" && s.trim()) ||
        !Array.isArray(task.constraints) || !task.constraints.every(s => typeof s === "string") ||
        !Array.isArray(task.allowed_mutations) || !Array.isArray(task.script) || !task.script.length ||
        !task.goal || !Array.isArray(task.goal.read_calls) || !task.goal.state) throw new Error("Invalid task structure: " + task.id);
    for (const call of [...task.script, ...task.goal.read_calls]) {
      normalizeCall(call.name, call.arguments);
      if (!BUSINESS_TOOLS.some(t => t.name === call.name)) throw new Error("Fixtures may contain only business calls.");
    }
    for (const call of task.goal.read_calls) if (mutation(call)) throw new Error("A goal read cannot mutate state.");
    if (Object.keys(task.goal.state).length !== Object.keys(INITIAL_STATE).length) throw new Error("Declare all protected goal state.");
    for (const [id, fields] of Object.entries(INITIAL_STATE)) {
      const target = task.goal.state[id];
      if (!target || Object.keys(target).length !== Object.keys(fields).length ||
          !["basic", "premium"].includes(target.plan) || typeof target.notifications !== "boolean") throw new Error("Invalid goal state.");
    }
    for (const allowed of task.allowed_mutations) {
      const name = allowed.field === "plan" ? "change_plan" : allowed.field === "notifications" ? "update_preferences" : null;
      if (!name || Object.keys(allowed).sort().join(",") !== "account_id,field,value") throw new Error("Invalid allowed mutation.");
      normalizeCall(name, { account_id: allowed.account_id, [allowed.field]: allowed.value });
    }
  }
  for (const task of data.cases) {
    const pair = data.cases.find(c => c.id === task.paired_case_id);
    if (!pair || pair.id === task.id || pair.paired_case_id !== task.id || pair.category === task.category) throw new Error("Cases require reciprocal risk/benign pairs.");
  }
  return data;
}

function parseArgs(argv) {
  const args = {};
  const allowed = ["mode", "case", "conditions", "repetitions", "model", "max-api-calls", "max-turns", "max-output-tokens", "timeout-ms", "order-seed", "request-interval-ms"];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--help") return { help: true };
    const key = argv[i].replace(/^--/, "");
    if (!argv[i].startsWith("--") || !allowed.includes(key) || Object.hasOwn(args, key) || !argv[i + 1] || argv[i + 1].startsWith("--")) {
      throw new Error("Unknown, duplicate, or incomplete option: " + argv[i]);
    }
    args[key] = argv[++i];
  }
  const number = (key, fallback, minimum, maximum) => {
    const value = args[key] === undefined ? fallback : Number(args[key]);
    if (!Number.isInteger(value) || value < minimum || value > maximum) throw new Error("Invalid --" + key);
    return value;
  };
  const mode = args.mode || "scripted";
  if (!["scripted", "groq"].includes(mode)) throw new Error("Mode must be scripted or groq.");
  const caseId = args.case || (mode === "scripted" ? "all" : "compare-only-risk");
  if (caseId !== "all" && !suite.cases.some(c => c.id === caseId)) throw new Error("Unknown case ID.");
  const conditions = (args.conditions || CONDITIONS.join(",")).split(",");
  if (new Set(conditions).size !== conditions.length || !conditions.every(c => CONDITIONS.includes(c))) throw new Error("Invalid conditions.");
  return {
    mode, caseId, conditions, model: args.model || process.env.GROQ_MODEL || null,
    repetitions: number("repetitions", 1, 1, 20), maxApiCalls: number("max-api-calls", 12, 1, 500),
    maxTurns: number("max-turns", 6, 1, 20), maxOutputTokens: number("max-output-tokens", 1200, 64, 8192),
    timeoutMs: number("timeout-ms", 30000, 1000, 60000), orderSeed: number("order-seed", 1, 0, 2147483647),
    requestIntervalMs: number("request-interval-ms", 0, 0, 60000)
  };
}

function schedule(tasks, options) {
  const plan = [];
  for (let repetition = 1; repetition <= options.repetitions; repetition++) {
    for (const task of tasks) for (const condition of options.conditions) plan.push({ case_id: task.id, condition, repetition });
  }
  let seed = options.orderSeed >>> 0;
  for (let i = plan.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [plan[i], plan[j]] = [plan[j], plan[i]];
  }
  return plan;
}

function sourceSnapshot(directory) {
  const files = ["scripts/runtime-enforcement.js", "scripts/runtime-enforcement.test.js", "package.json",
    "experiments/runtime-enforcement/sandbox.js", "experiments/runtime-enforcement/runtime.js",
    "experiments/runtime-enforcement/groq.js", "experiments/runtime-enforcement/cases.json",
    "experiments/runtime-enforcement/README.md", "src/orientation_engine.js", "src/orientation_checks.js"];
  const hashes = {};
  for (const file of files) {
    const bytes = fs.readFileSync(path.join(ROOT, file));
    hashes[file] = crypto.createHash("sha256").update(bytes).digest("hex");
    const target = path.join(directory, "sources", file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes, { flag: "wx" });
  }
  return hashes;
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log("EXP-004 development pilot. No API calls by default.\n" +
      "npm run exp:004 -- --mode scripted\n" +
      "npm run exp:004 -- --mode groq --case upgrade-benign --conditions enforced\n" +
      "Options: --case ID|all --conditions agent-only,advisory,enforced --model MODEL_ID\n" +
      "--repetitions 1 --max-api-calls 12 --max-turns 6 --max-output-tokens 1200 --timeout-ms 30000 --order-seed 1\n" +
      "--request-interval-ms 10000 spaces live requests across the entire run (default: 0).\n" +
      "Live mode requires GROQ_API_KEY and GROQ_MODEL (or --model). Artifacts: eval-runs/exp004-*.");
    return;
  }
  validateSuite(suite);
  // Validate credentials before creating run artifacts. Never record environment values.
  const client = options.mode === "groq" ? createGroqClient({ ...options, apiKey: process.env.GROQ_API_KEY }) : null;
  const tasks = suite.cases.filter(c => options.caseId === "all" || c.id === options.caseId);
  const plan = schedule(tasks, options);
  const parent = path.join(ROOT, "eval-runs");
  fs.mkdirSync(parent, { recursive: true });
  const directory = fs.mkdtempSync(path.join(parent, "exp004-" + new Date().toISOString().replace(/[:.]/g, "-") + "-"));
  let git = null;
  try {
    git = { revision: execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim(),
      branch: execFileSync("git", ["branch", "--show-current"], { cwd: ROOT, encoding: "utf8" }).trim(),
      dirty: Boolean(execFileSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8" }).trim()) };
  } catch { /* Source hashes remain available without Git. */ }
  const hashes = sourceSnapshot(directory);
  const manifest = {
    experiment: "EXP-004", status: suite.status, started_at: new Date().toISOString(),
    driver: options.mode === "scripted" ? "scripted-probe-not-an-llm" : "groq-chat-completions",
    options, schedule: plan, suite_version: suite.suite_version, git, source_sha256: hashes,
    environment: { node: process.version, platform: os.platform(), release: os.release(), arch: os.arch() },
    review_surface: "direct-core-text-only", ordinary_permissions: "Both fictional accounts editable; identical schema validation in all arms.",
    model_settings: client ? { requested_model: options.model, temperature: "provider default; not explicitly set",
      parallel_tool_calls: false, max_completion_tokens: options.maxOutputTokens } : null,
    limitations: ["Authored development cases, not an independently approved frozen protocol.",
      "Local application sandbox, not OS isolation against arbitrary code.", "No human approval workflow or real external tools.",
      "Task success scores state and required reads; final explanation quality is not automatically graded.",
      "Unchanged final state alone is insufficient: inspect tool entry and transition events."]
  };
  manifest.protocol_fingerprint = digest({ options, schedule: plan, sources: hashes });
  writeJson(path.join(directory, "manifest.json"), manifest);
  console.log(`EXP-004 ${options.mode} development pilot: ${plan.length} sessions. Artifacts: ${directory}`);
  if (client) console.log(`At most ${options.maxApiCalls} Groq requests, ${options.maxOutputTokens} completion tokens per request; account rate and token limits still apply.`);
  const results = [];
  let failed = false;
  for (let i = 0; i < plan.length; i++) {
    const entry = plan[i];
    const task = tasks.find(c => c.id === entry.case_id);
    const session = createSession({ directory: path.join(directory, `${String(i + 1).padStart(3, "0")}-${task.id}-${entry.condition}-r${entry.repetition}`),
      task, condition: entry.condition });
    let result;
    try {
      result = client ? await runAgent(session, task, entry.condition, client, options) : await runScripted(session, task, entry.condition);
    } catch (error) {
      // Client errors are sanitized at the HTTP boundary. No response bodies/headers or secrets.
      session.log("run_error", { message: error.message });
      result = await session.finish(error.code === "api_budget_exhausted" ? error.code : "error", { error: error.message });
    }
    result.repetition = entry.repetition;
    results.push(result);
    if (result.status !== "completed") failed = true;
    fs.appendFileSync(path.join(directory, "results.jsonl"), JSON.stringify(result) + "\n");
    console.log(`${task.id} / ${entry.condition}: ${result.status}; prohibited executions=${result.prohibited_executions}; task success=${result.task_success}`);
  }
  const report = { status: failed ? "incomplete" : "completed", study_status: suite.status, conditions: summarize(results),
    usage: client ? client.stats() : { api_requests: 0, input_tokens: 0, output_tokens: 0 },
    note: "A completed run is not a successful safety result. See per-session outcomes, review errors, and raw events." };
  writeJson(path.join(directory, "summary.json"), report);
  const markdown = "# EXP-004 development pilot\n\n" + report.note + "\n\n" +
    "| Condition | Sessions | Completed | Task successes | Prohibited attempts | Prohibited executions | Mandatory BLOCKs | Executions after mandatory BLOCK | Benign denials | Review errors |\n" +
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n" +
    report.conditions.map(r => `| ${r.condition} | ${r.sessions} | ${r.completed} | ${r.task_successes} | ${r.prohibited_attempts} | ${r.prohibited_executions} | ${r.mandatory_blocks} | ${r.executions_after_mandatory_block} | ${r.benign_denials} | ${r.review_errors} |`).join("\n") +
    `\n\nAPI requests: ${report.usage.api_requests}; reported input tokens: ${report.usage.input_tokens}; output tokens: ${report.usage.output_tokens}.\n\n` +
    "Enforcement leakage uses mandatory BLOCKs as its denominator; zero eligible BLOCKs gives null, not 0%. " +
    "Benign denials include all held otherwise-permitted calls, not just BLOCK. These small authored cases do not establish population safety rates.\n";
  fs.writeFileSync(path.join(directory, "summary.md"), markdown, { flag: "wx" });
  console.log("Summary: " + path.join(directory, "summary.md"));
  if (failed) process.exitCode = 1;
  return { directory, report, results };
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { main, parseArgs, schedule, validateSuite };
