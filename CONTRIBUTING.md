# Contributing to Orienta

Engineers and researchers are welcome to improve reproducibility, adapter fidelity, documentation, independent case review, and experimental design. Begin with the [README](README.md), [known limitations](docs/known-limitations.md), and [open experiments](docs/open-experiments.md).

## Setup and tests

Node.js 24 is the locally tested environment. From a fresh checkout at the repository root:

```bash
npm test
node src/gate_node.js examples/customer_support_demo_input.json
node --test scripts/orientation-core.test.js
node --test scripts/evaluate-cases.test.js
node --test scripts/api-review.test.js
node scripts/evaluate-cases.js --suite examples/case-library/library.json --surface node
```

These commands need no model credentials, database, or root dependency installation. The API tests stub storage; they do not test a deployed service. Report directories under `eval-runs/` are ignored by Git.

For MCP:

```bash
cd mcp-server
npm ci --ignore-scripts
node --test contract.test.mjs
node test.mjs
cd ..
```

Contract tests use real stdio and temporary logs. The smoke script appends synthetic entries to `mcp-server/orienta_audit.jsonl` (ignored by Git); set ORIENTA_AUDIT_LOG if you want a separate log. It prints results and is not an assertion-based enforcement test. On PowerShell, use `npm.cmd` if its script wrapper is blocked.

Root `npm test` discovers all `scripts/*.test.js` regression suites, including Core, evaluation runner, API (storage stubbed), and the synthetic recommendation experiment. It requires no dependency installation, model key, or database. The individual `test:core`, `test:cases`, and `test:recommendations` commands are preserved. Run `node --test scripts/api-review.test.js` to select the API suite. After installing the MCP dependencies, run `node --test mcp-server/contract.test.mjs` from the repository root for the separate MCP contract suite. There are no `test:api` or `test:mcp` shortcuts in the current root package. MCP's own `npm test` runs only the smoke script.

## Bugs and reproducible failures

Open an issue with the commit, Node version, exact sanitized objective/context/proposed_action, adapter/surface, expected decision and policy basis, actual full output, and reproduction command. Distinguish an observed defect from a research hypothesis.

Use stable case IDs and nearby benign controls when proposing fixtures. Follow the [case template](docs/use_cases/case_template.md) and existing [case schema](examples/case-library/schema.json). Explain why the expectation is valid before modifying it. Record browser, Node, API, and MCP evidence separately.

## Code changes

Keep pull requests focused. Core changes need evidence, regression tests, and a discussion of false positives and missed risks. Do not insert case-ID-specific rules, hide failures, or change expected labels merely to make an evaluation pass. Preserve previous reports and migration traceability.

Run the relevant suites; changes at an integration boundary should compare against the direct Core output. State what was executed, what was simulated, and what was not tested. Discuss decision semantics, expected-label changes, new dependencies, and public API changes before implementation.

## Experiment template

```text
Question:
Setup:
Baseline:
Orienta condition:
Expected behavior:
Actual behavior:
Evidence:
Result:
Open questions:
```

Include task policy, agent/model versions, actual tool events, control cases, and metric denominators where applicable. Do not present a proposed experiment as a completed result.

## Sensitive information

Use [SECURITY.md](SECURITY.md) for security-sensitive reports. Do not commit secrets, real customer data, personal notes, audit logs, or unrelated Senux research. Keep required license and attribution notices.
