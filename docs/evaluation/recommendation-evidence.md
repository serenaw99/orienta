# Recommendation evidence retention and cross-platform replay

The [retained raw report](reports/recommendation-2026-11-01T16-18-46-759Z-XZk13q/results.json) and its [readable companion](reports/recommendation-2026-11-01T16-18-46-759Z-XZk13q/results.md) contain every fixture, baseline output, projected input, Core output, score, error field, and disagreement from the completed comparison. The [evaluation summary](recommendation-integrity.md) explains the result and its limits.

## Earlier runs without duplicate evidence

The October 15 run and the initial November 1 run have exactly the same `suite`, `baseline`, `summary`, and `rows` as the retained November 1 report. This equality was checked before removing their duplicate full JSON and Markdown files. No failure or case was omitted.

[recommendation-history.json](reports/recommendation-history.json) keeps each earlier run's complete remaining top-level metadata, including timestamp, Node version, base commit, and raw source-file hashes. It also records:

- The shared report fields and their SHA-256 digest.
- Each original JSON/Markdown artifact's SHA-256 digest.
- Immutable links to the original artifacts at commit `eabfddd9f163f69f97c36f5fdb3022acd3caa187` in `gowtham432/orienta`.
- LF-normalized source fingerprints and captured line-ending layouts for the retained run.

Combining a historical receipt's `metadata` with the retained shared fields reconstructs that run's complete original report. The existing Markdown renderer reconstructs its companion. Both reconstructed artifacts were verified byte-for-byte against their recorded hashes and the original Git blobs. The original full files also remain directly accessible through the receipt's immutable URLs.

To reconstruct the earlier artifacts, run the following JavaScript with Node from the repository root. It writes to a fresh ignored directory and validates the hashes before writing. The original renderer is available at the same pinned commit if it changes in a future revision.

```js
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { markdown } = require('./scripts/recommendation-integrity');
const base = 'docs/evaluation/reports';
const history = JSON.parse(fs.readFileSync(`${base}/recommendation-history.json`));
const canonical = JSON.parse(fs.readFileSync(`${base}/${history.canonical_report}`));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const shared = Object.fromEntries(history.shared_fields.map(k => [k, canonical[k]]));
assert.equal(sha(JSON.stringify(shared)), history.shared_data_sha256);
fs.mkdirSync('eval-runs', { recursive: true });
const out = fs.mkdtempSync(path.join('eval-runs', 'recommendation-history-'));
for (const run of history.runs) {
  const report = { ...run.metadata, ...shared };
  const artifacts = { json: JSON.stringify(report, null, 2) + '\n', markdown: markdown(report) };
  for (const [kind, text] of Object.entries(artifacts)) {
    assert.equal(sha(text), run.artifacts[kind].sha256);
    const target = path.join(out, run.artifacts[kind].original_path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text, { flag: 'wx' });
  }
}
console.log(out);
```

## Raw-byte hashes and line endings

`file_sha256` hashes the exact bytes read from disk. It performs no line-ending normalization. Git's `core.autocrlf`, `.gitattributes`, and editor settings can therefore change a file's raw digest even when its source text differs only between LF and CRLF.

The retained historical capture used CRLF for the existing Core, checks, Core schema, evaluation runner, baseline library, and case schema; it used LF for the new recommendation adapter and fixtures. The per-file layout is recorded in `canonical_files` in the history file. Neither the original report nor its hashes have been rewritten to conceal this difference. No repository-wide line-ending conversion is included in this PR.

The report's `source_commit` is the base checkout (`a00fa3e`), not a claim that the experiment was captured from a clean, fully committed tree. The added adapter and fixtures were not present at that base commit. Snapshot `eabfddd9f163f69f97c36f5fdb3022acd3caa187` contains the final adapter and fixtures as well as the unchanged Core; its file contents, allowing for LF/CRLF conversion, were checked against the retained run. Earlier receipts keep the pre-validation adapter hashes separately.

There are three distinct replay checks:

1. **Raw-byte identity:** compare local file bytes with the report's `file_sha256`. For an exact historical replay, reproduce the recorded per-file layout in a disposable checkout. Simply setting all files to LF will not match a capture that mixed CRLF and LF.
2. **Source-text identity:** compare the receipt's `sha256_lf` after replacing CRLF with LF only. This does not ignore other whitespace, a BOM, Unicode differences, or source changes. A passing LF check explains a raw mismatch caused only by line endings; it is not a raw-hash match.
3. **Behavioral reproduction:** rerun the baseline and comparison, then compare parsed fixtures, baseline outputs, per-case outputs, and summaries. Run timestamps, base commits, local raw hashes, and fresh output directories are expected to differ. Matching decisions alone does not establish matching explanations or source identity.

The following JavaScript checks the retained capture's source fingerprints and reconstructs its raw-byte hashes in memory. It does not alter any working files or claim that the current on-disk layout already matches the historical layout.

```js
const fs = require('node:fs');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const base = 'docs/evaluation/reports';
const history = JSON.parse(fs.readFileSync(`${base}/recommendation-history.json`));
const report = JSON.parse(fs.readFileSync(`${base}/${history.canonical_report}`));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
for (const [file, identity] of Object.entries(history.canonical_files)) {
  const lf = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  assert.equal(sha(lf), identity.sha256_lf, file);
  const captured = identity.captured_line_endings === 'CRLF' ? lf.replace(/\n/g, '\r\n') : lf;
  assert.equal(sha(captured), report.file_sha256[file], file);
}
console.log('Source text and reconstructed capture hashes match.');
```

The synthetic inputs and original expected labels remain unchanged. These provenance checks establish evidence identity and reproducibility; they do not establish poisoning detection, independent source verification, incremental Core value, or runtime enforcement.

## Cleanup verification — November 6, 2026

`npm test` passed all 53 root tests, and `node --test mcp-server/contract.test.mjs` passed all 25 MCP tests. The recommendation runner completed its 14-case baseline and all 24 condition evaluations without errors; its fixtures, full baseline outputs, per-case outputs, and summaries reproduced the retained report. The fresh run was written under ignored `eval-runs/`, without adding another duplicate checked-in report.

Both replay snippets above were executed successfully. Reconstructed historical JSON and Markdown matched their recorded artifact digests and original Git blobs byte-for-byte. The retained report, Core/API/MCP runtime, experiment adapter, fixture expectations, and dependencies are unchanged by this cleanup. All local documentation links were checked after removing duplicate artifacts.

The remaining qualified-comparison hold is tracked in [Issue #8](https://github.com/serenaw99/orienta/issues/8). This cleanup neither fixes Core nor begins the proposed adapter-only follow-up or a runtime-enforcement experiment.
