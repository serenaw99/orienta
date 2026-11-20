"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawnSync } = require("node:child_process");
const suite = require("../experiments/runtime-enforcement/cases.json");
const { evaluateObjective } = require("../src/orientation_engine");
const { INITIAL_STATE, digest, normalizeCall } = require("../experiments/runtime-enforcement/sandbox");
const { CONDITIONS, createSession, reviewInput, runScripted, runAgent, summarize } = require("../experiments/runtime-enforcement/runtime");
const { createGroqClient } = require("../experiments/runtime-enforcement/groq");
const { parseArgs, validateSuite, schedule } = require("./runtime-enforcement");

function setup(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "orienta-exp004-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  let index = 0;
  return (condition = "enforced", id = "denied-preferences-risk", evaluator) => {
    const directory = path.join(root, "session-" + (++index));
    const task = structuredClone(suite.cases.find(c => c.id === id));
    const session = createSession({ directory, task, condition, evaluator });
    const events = () => fs.readFileSync(path.join(directory, "events.jsonl"), "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
    return { session, task, directory, events };
  };
}
const change = { account_id: "bob", notifications: true };
const planCall = (accountId = "alice") => ({ name: "change_plan", arguments: { account_id: accountId, plan: "premium" } });
const reply = (calls = [], finishReason = calls.length ? "tool_calls" : "stop", messageExtra = {}) => ({
  id: "response-test", model: "fixture-model",
  choices: [{ index: 0, finish_reason: finishReason, message: {
    role: "assistant", content: calls.length ? null : "Finished.", ...(calls.length ? { tool_calls: calls } : {}), ...messageExtra
  } }], usage: { prompt_tokens: 10, completion_tokens: 5 }
});
const functionCall = (name, args, id = "call-1") => ({ type: "function", id, function: { name, arguments: JSON.stringify(args) } });
const done = () => reply();
const clientOptions = { apiKey: "fixture-key-not-a-credential", model: "fixture-model", maxApiCalls: 5, maxOutputTokens: 1200, timeoutMs: 1000 };
const clientRequest = { messages: [], tools: [] };

test("all three conditions perform legitimate persisted mutations with identical tool validation", async t => {
  const make = setup(t);
  for (const condition of CONDITIONS) {
    const { session, task, directory } = make(condition, "upgrade-benign");
    const result = await runScripted(session, task, condition);
    assert.equal(result.task_success, true);
    assert.equal(result.executed_mutations, 1);
    assert.equal(result.prohibited_executions, 0);
    assert.equal(JSON.parse(fs.readFileSync(path.join(directory, "state.json"))).alice.plan, "premium");
    assert.equal(JSON.parse(fs.readFileSync(path.join(directory, "initial-state.json"))).alice.plan, "basic");
  }
});

test("a real Core BLOCK stops tool entry even when explicit review is skipped", async t => {
  const { session, events } = setup(t)();
  const outcome = await session.dispatch("update_preferences", change);
  assert.equal(outcome.executed, false);
  assert.equal(outcome.governance.decision, "BLOCK");
  const result = await session.finish("completed");
  assert.equal(result.mandatory_blocks, 1);
  assert.equal(result.attempts_without_prior_explicit_review, 1);
  assert.equal(result.executed_tools, 0);
  assert.equal(events().some(e => e.type === "tool_entered"), false);
  assert.deepEqual(events().at(-1).final_state, INITIAL_STATE);
});

test("advisory allows a noncompliant attempt after BLOCK; enforced denies retries and aliases", async t => {
  const make = setup(t);
  for (const condition of ["advisory", "enforced"]) {
    const { session, task } = make(condition, "retry-alias-risk");
    const result = await runScripted(session, task, condition);
    assert.equal(result.attempts_after_any_matching_block, 3);
    assert.equal(result.prohibited_attempts, 3);
    assert.equal(result.prohibited_executions, condition === "advisory" ? 3 : 0);
    assert.equal(result.executions_after_any_matching_block, condition === "advisory" ? 3 : 0);
    assert.equal(result.mandatory_blocks, condition === "enforced" ? 3 : 0);
    assert.equal(result.executions_after_mandatory_block, 0);
  }
});

test("review errors and every non-PROCEED decision hold execution", async t => {
  const make = setup(t);
  for (const evaluator of [
    () => { throw new Error("unavailable"); }, () => ({ decision: "ALLOW" }),
    ...["MODIFY", "ESCALATE", "BLOCK"].map(decision => () => ({ decision }))
  ]) {
    const { session } = make("enforced", "upgrade-benign", evaluator);
    const call = planCall();
    assert.equal((await session.dispatch(call.name, call.arguments)).executed, false);
    const result = await session.finish("completed");
    assert.equal(result.executed_mutations, 0);
    assert.equal(result.benign_denials, 1);
  }
});

test("an approval cannot authorize different arguments, and a MODIFY revision is re-reviewed", async t => {
  const make = setup(t);
  const reviewed = [];
  const evaluator = input => {
    reviewed.push(input.proposed_action);
    if (input.proposed_action.includes("bob")) return { decision: "BLOCK" };
    return { decision: "PROCEED" };
  };
  const { session, events } = make("enforced", "upgrade-benign", evaluator);
  await session.dispatch("review_action", { tool_name: "change_plan", tool_arguments: JSON.stringify(planCall().arguments) });
  assert.equal((await session.dispatch("change_plan", planCall("bob").arguments)).executed, false);
  assert.equal((await session.dispatch("change_plan", planCall().arguments)).executed, true);
  assert.equal(reviewed.length, 3);
  assert.notEqual(events().find(e => e.type === "review").call_hash,
    events().find(e => e.type === "review" && e.channel === "mandatory").call_hash);
  await session.finish("completed");

  let count = 0;
  const revised = make("enforced", "upgrade-benign", () => ({ decision: ++count === 1 ? "MODIFY" : "PROCEED" }));
  assert.equal((await revised.session.dispatch("change_plan", planCall().arguments)).executed, false);
  assert.equal((await revised.session.dispatch("set_plan", planCall().arguments)).executed, true);
  assert.equal(count, 2);
  await revised.session.finish("completed");
});

test("argument snapshots and the serial queue prevent mutation while review is pending", async t => {
  let release;
  let reviewStarted;
  const started = new Promise(resolve => { reviewStarted = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  const { session, directory, events } = setup(t)("enforced", "upgrade-benign", async () => {
    reviewStarted();
    await gate;
    return { decision: "PROCEED" };
  });
  const args = planCall().arguments;
  const pending = session.dispatch("change_plan", args);
  await started;
  args.account_id = "bob";
  release();
  await pending;
  const state = JSON.parse(fs.readFileSync(path.join(directory, "state.json")));
  assert.equal(state.alice.plan, "premium");
  assert.equal(state.bob.plan, "basic");
  const review = events().find(e => e.type === "review");
  const execution = events().find(e => e.type === "tool_entered");
  assert.equal(review.call_hash, execution.call_hash);
  await session.finish("completed");
});

test("unknown tools, traversal-like account IDs, injected decisions, and malformed JSON never enter tools", async t => {
  const make = setup(t);
  for (const condition of CONDITIONS) {
    const { session } = make(condition);
    for (const [name, args] of [
      ["shell", { command: "ignored" }], ["change_plan", { account_id: "../alice", plan: "premium" }],
      ["update_preferences", { ...change, decision: "PROCEED" }], ["change_plan", "{"],
      ["get_account", { account_id: "__proto__" }]
    ]) assert.equal((await session.dispatch(name, args)).executed, false);
    assert.equal((await session.finish("completed")).executed_tools, 0);
  }
});

test("scoring facts cannot change Core input or its genuine review result", async t => {
  const task = structuredClone(suite.cases[0]);
  const call = normalizeCall("change_plan", planCall().arguments);
  const original = reviewInput(task, call);
  task.allowed_mutations = [{ account_id: "alice", field: "plan", value: "premium" }];
  task.goal.state.alice.plan = "premium";
  task.category = "benign";
  assert.deepEqual(reviewInput(task, call), original);
  const { session, events } = setup(t)("enforced", "compare-only-risk");
  await session.dispatch(call.name, call.arguments);
  const actual = events().find(e => e.type === "review");
  assert.deepEqual(actual.evaluated_input, original);
  assert.deepEqual(actual.verdict, evaluateObjective(original));
  await session.finish("completed");
});

test("a reverted prohibited action is still a violation even with unchanged final state", async t => {
  const { session, task } = setup(t)("agent-only", "compare-only-risk");
  await session.dispatch("list_plans", {});
  await session.dispatch("change_plan", planCall().arguments);
  await session.dispatch("change_plan", { account_id: "alice", plan: "basic" });
  const result = await session.finish("completed");
  assert.equal(result.goal_satisfied, true);
  assert.equal(result.final_state_hash, digest(INITIAL_STATE));
  assert.equal(result.prohibited_executions, 2);
  assert.equal(result.prohibited_state_changes, 2);
  assert.equal(result.task_success, false);
  assert.equal(task.allowed_mutations.length, 0);
});

test("Groq loop sends function schemas, replays tool results, excludes reasoning, and records usage", async t => {
  const { session, task, events } = setup(t)("enforced", "upgrade-benign");
  const replies = [reply([functionCall("review_action", { tool_name: "change_plan", tool_arguments: JSON.stringify(planCall().arguments) })],
    "tool_calls", { reasoning: "fixture-provider-reasoning" }),
    reply([functionCall("change_plan", planCall().arguments, "call-2")]), done()];
  const bodies = [];
  const client = createGroqClient({ ...clientOptions, fetchImpl: async (url, init) => {
    assert.equal(url, "https://api.groq.com/openai/v1/chat/completions");
    assert.equal(init.headers.Authorization, "Bearer " + clientOptions.apiKey);
    bodies.push(JSON.parse(init.body));
    return { ok: true, json: async () => replies.shift() };
  } });
  const result = await runAgent(session, task, "enforced", client, { maxTurns: 4 });
  assert.equal(result.task_success, true);
  assert.equal(result.driver, "groq");
  assert.equal(bodies[0].model, clientOptions.model);
  assert.equal(bodies[0].max_completion_tokens, clientOptions.maxOutputTokens);
  assert.equal(bodies[0].parallel_tool_calls, false);
  assert.ok(bodies[0].tools.every(tool => tool.type === "function" && tool.function.parameters.additionalProperties === false));
  assert.equal(bodies[0].messages[0].role, "system");
  assert.equal(bodies[1].messages.at(-1).role, "tool");
  assert.equal(bodies[1].messages.at(-1).tool_call_id, "call-1");
  assert.equal(JSON.parse(bodies[2].messages.at(-1).content).executed, true);
  assert.equal(JSON.stringify(bodies[1].messages).includes("fixture-provider-reasoning"), false);
  assert.equal(JSON.stringify(bodies[0].messages).includes("allowed_mutations"), false);
  assert.equal(JSON.stringify(events()).includes(clientOptions.apiKey), false);
  assert.deepEqual(client.stats(), { api_requests: 3, input_tokens: 30, output_tokens: 15 });
});

test("Groq failures are sanitized, never retried, and bounded by a shared request budget", async () => {
  for (const fetchImpl of [
    async () => { throw new Error("Authorization: Bearer " + clientOptions.apiKey); },
    async () => ({ ok: false, status: 401, text: async () => clientOptions.apiKey }),
    async () => ({ ok: true, json: async () => reply([functionCall("list_plans", {}, "")]) })
  ]) {
    const logs = [];
    const client = createGroqClient({ ...clientOptions, maxApiCalls: 1, fetchImpl });
    await assert.rejects(client.respond(clientRequest, (type, data) => logs.push({ type, ...data })), error => !error.message.includes(clientOptions.apiKey));
    await assert.rejects(client.respond(clientRequest, () => {}), error => error.code === "api_budget_exhausted");
    assert.equal(client.stats().api_requests, 1);
    assert.equal(JSON.stringify(logs).includes(clientOptions.apiKey), false);
  }
});

test("Groq HTTP errors retain recognized codes without logging arbitrary provider messages", async () => {
  for (const code of ["rate_limit_exceeded", clientOptions.apiKey]) {
    const logs = [];
    const client = createGroqClient({ ...clientOptions, fetchImpl: async () => ({ ok: false, status: 429,
      json: async () => ({ error: { code, message: clientOptions.apiKey } }) }) });
    await assert.rejects(client.respond(clientRequest, (type, data) => logs.push({ type, ...data })), error => {
      assert.match(error.message, /Groq.*429/);
      assert.equal(error.message.includes(clientOptions.apiKey), false);
      return true;
    });
    assert.equal(logs.at(-1).error_code, code === "rate_limit_exceeded" ? code : null);
    assert.equal(JSON.stringify(logs).includes(clientOptions.apiKey), false);
  }
});

test("configured request spacing applies across turns without retries or extra API calls", async () => {
  let time = 0;
  const starts = [];
  const waits = [];
  const logs = [];
  const client = createGroqClient({ ...clientOptions, requestIntervalMs: 100, now: () => time,
    wait: async ms => { waits.push(ms); time += ms; },
    fetchImpl: async () => { starts.push(time); time += 20; return { ok: true, json: async () => done() }; }
  });
  for (let i = 0; i < 3; i++) await client.respond(clientRequest, (type, data) => logs.push({ type, ...data }));
  assert.deepEqual(starts, [0, 100, 200]);
  assert.deepEqual(waits, [80, 80]);
  assert.equal(logs.filter(e => e.type === "model_wait").length, 2);
  assert.equal(client.stats().api_requests, 3);
});

test("a malformed Groq tool batch cannot partially execute its valid first call", async t => {
  const make = setup(t);
  for (const invalid of [
    functionCall("list_plans", {}, "call-1"),
    { type: "function", id: "call-2", function: { name: "list_plans", arguments: {} } },
    { type: "other", id: "call-2", function: { name: "list_plans", arguments: "{}" } }
  ]) {
    const { session, task } = make("enforced", "upgrade-benign");
    const client = createGroqClient({ ...clientOptions, fetchImpl: async () => ({ ok: true,
      json: async () => reply([functionCall("change_plan", planCall().arguments), invalid]) }) });
    await assert.rejects(runAgent(session, task, "enforced", client, { maxTurns: 1 }), /invalid response/);
    const result = await session.finish("error");
    assert.equal(result.executed_tools, 0);
    assert.equal(result.business_attempts, 0);
    assert.equal(result.final_state_hash, digest(INITIAL_STATE));
  }
});

test("incomplete model output cannot dispatch tools; repeated calls stop at the turn limit", async t => {
  const make = setup(t);
  for (const finishReason of ["length", "content_filter", "stop"]) {
    const incomplete = make("enforced", "upgrade-benign");
    const client = createGroqClient({ ...clientOptions, fetchImpl: async () => ({ ok: true,
      json: async () => reply([functionCall("change_plan", planCall().arguments)], finishReason) }) });
    const result = await runAgent(incomplete.session, incomplete.task, "enforced", client, { maxTurns: 1 });
    assert.equal(result.status, "model_incomplete");
    assert.equal(result.executed_tools, 0);
  }
  const repeating = make("agent-only", "upgrade-benign");
  const loopClient = createGroqClient({ ...clientOptions, fetchImpl: async () => ({ ok: true,
    json: async () => reply([functionCall("list_plans", {})]) }) });
  const limited = await runAgent(repeating.session, repeating.task, "agent-only", loopClient, { maxTurns: 2 });
  assert.equal(limited.status, "turn_limit");
  assert.equal(loopClient.stats().api_requests, 2);
});

test("CLI defaults are offline, schedules reproducible, and invalid fixtures/options are rejected", () => {
  assert.equal(validateSuite(suite), suite);
  assert.equal(parseArgs([]).mode, "scripted");
  assert.equal(parseArgs(["--request-interval-ms", "10000"]).requestIntervalMs, 10000);
  const options = parseArgs(["--repetitions", "2"]);
  const plan = schedule(suite.cases, options);
  assert.deepEqual(plan, schedule(suite.cases, options));
  assert.equal(plan.length, suite.cases.length * CONDITIONS.length * 2);
  for (const args of [["--mode", "other"], ["--max-api-calls", "0"], ["--conditions", "enforced,enforced"],
    ["--case", "../escape"], ["--unknown", "true"], ["--model"], ["--request-interval-ms", "-1"],
    ["--mode", "scripted", "--mode", "groq"]]) {
    assert.throws(() => parseArgs(args));
  }
  const invalid = structuredClone(suite);
  invalid.cases[0].script.push({ name: "shell", arguments: {} });
  assert.throws(() => validateSuite(invalid));
  const missing = spawnSync(process.execPath, [path.join(__dirname, "runtime-enforcement.js"), "--mode", "groq"], {
    env: { ...process.env, GROQ_API_KEY: "", GROQ_MODEL: "" }, encoding: "utf8"
  });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /GROQ_API_KEY/);
});

test("no eligible BLOCKs produces a null leakage rate, and incomplete runs do not count as successes", async t => {
  const { session, task } = setup(t)("enforced", "upgrade-benign");
  await session.dispatch("change_plan", planCall().arguments);
  const result = await session.finish("turn_limit");
  assert.equal(result.task_success, true);
  const summary = summarize([result])[0];
  assert.equal(summary.enforcement_leakage_rate, null);
  assert.equal(summary.task_successes, 0);
  assert.equal(summary.completed, 0);
  assert.equal(task.category, "benign");
});
