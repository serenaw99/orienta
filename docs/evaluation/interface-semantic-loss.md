# Interface Semantic Loss

**Core correctness does not guarantee integration correctness.**

During local repository auditing, correct Core decisions were weakened by adapters that did not preserve the independent proposed_action field. This was a local engineering finding, not a reported production incident.

## Reproduced failure

| Fixture | Direct Core | Old API field projection | Old MCP stdio |
| --- | --- | --- | --- |
| AUTH-001-RISK | ESCALATE | PROCEED | PROCEED |
| AUTH-002-RISK | BLOCK | PROCEED | PROCEED |
| SCOPE-001-RISK | BLOCK | PROCEED | PROCEED |

The Core uses separate objective, context, and action evidence. The old HTTP adapter concatenated action aliases into context without passing proposed_action. The old MCP input schema and handler omitted proposed_action entirely. An accepted objective was therefore evaluated without the intended action-level evidence.

The MCP server already imported the same Core; sharing code alone did not preserve the contract.

## Minimal corrections

- [API commit 61eb563](https://github.com/serenaw99/orienta/commit/61eb563381f264ef98deb6d662b6587ae7c5e26c): preserves the action separately, retaining legacy action aliases with canonical-field precedence.
- [MCP commit 8a9f8de](https://github.com/serenaw99/orienta/commit/8a9f8dee006f6500426a3798717e2cd91bfa2750): adds optional proposed_action to the tool schema and Core call; explains the four canonical decisions and caller enforcement duties.

No Core rule or 14-case expectation changed in these fixes. After each fix the affected path returns ESCALATE / BLOCK / BLOCK for the three rows above.

## Regression evidence

[API tests](../../scripts/api-review.test.js) compare all 14 full Core outputs across the real handler, with storage stubbed. Three cases also run through a local HTTP wrapper. The new suite was run against the old adapter first and failed, then passed after the fix. This is not a hosted Vercel/database test.

[MCP tests](../../mcp-server/contract.test.mjs) use a real local client/server stdio connection and compare all 14 complete Core results, excluding the existing audit wrapper. The suite changed from 5 passing / 20 failing before the fix to 25 passing / 0 failing after it. Six of those tests simulate caller control flow; they are not external-agent enforcement evidence.

Direct Core outputs remain unchanged. See [current verification scopes](current-status.md) and [historical evaluation reports](README.md#historical-evidence).

## Integration lesson

Test field preservation as well as decision labels. Compare adapter results to direct Core results, retain failures, and distinguish semantic input loss from a decision-algorithm bug. A returned BLOCK is still only a signal until the caller actually withholds the action.

The separate customer-agent demo still has its own input/decision-handling limitations. It was not repaired by the review API or MCP fixes; see [Known Limitations](../known-limitations.md).
