# Orienta — Decision Principles v0.1

**Status:** Draft for research discussion — NOT final policy or verified implementation  
**Owner:** Senux Research Lab / Research Lead  
**Date:** 2026-10-19  
**Scope:** Proposed-action review and four-way decision taxonomy. This document does not replace the existing five-layer governance architecture.

## 1. Purpose and scope

Orienta explores model-agnostic, objective-aware governance of proposed AI-agent actions. Its intended purpose is not merely to follow the user's request: it is to assess whether the objective is legitimate under applicable rules, whether the proposed means and authority are appropriate, and eventually whether the execution trajectory remains aligned with the reviewed legitimate objective.

Three distinct questions must not be collapsed:

1. **Objective legitimacy:** Is the requested outcome permissible under applicable policy, rights, safety constraints and human oversight?
2. **Means, scope and authority:** Is this *specific action* permitted for this actor, resource, recipient and situation? Are claims of consent or authority supported by trustworthy evidence?
3. **Trajectory and outcome alignment:** Does a sequence of actions remain within the reviewed objective and constraints? This is a research direction, **not a validated current Core capability**.

A governance verdict is not itself enforcement. A calling application or tool gateway must implement and verify any stop, revision or human-review behavior.

## 2. Provisional four-label taxonomy

| Decision | Working meaning | Illustrative condition |
| --- | --- | --- |
| **PROCEED** | The proposed action can proceed *within the reviewed scope*, based on sufficient applicable evidence and constraints. | User requests a permitted action on their own resource, with required authorization established. |
| **MODIFY** | A legitimate objective can be pursued through a specifically defined safer or compliant alternative, without silently changing an essential user choice or bypassing approval. | Prepare an unsent draft rather than send a message before verification. |
| **ESCALATE** | The action cannot proceed yet because a necessary approval, identity/authority check, evidence item or human decision is missing or contested. | A $400 refund requires approval above a $50 agent limit. |
| **BLOCK** | The proposed action is affirmatively disallowed by a verified applicable restriction, denial or prohibited means. | A confirmed policy prohibits the proposed transfer or deletion. |

These are **hypotheses for research adjudication**, not a claim that current code always applies them correctly. `ESCALATE` is not a weaker synonym for `BLOCK`; `MODIFY` is not a substitute for authorization.

## 3. Boundary and conflict principles

- **Explicit prohibition versus unknown permission:** Verified prohibition suggests BLOCK; missing or disputed required authorization suggests ESCALATE. The evidence and the exact scope of the prohibition matter.
- **Modification versus escalation:** A reversible draft, narrower read or other clearly authorized alternative may qualify as MODIFY. Do not relabel an unauthorized $400 refund as an authorized $50 refund without checking the objective and the user's intent.
- **Unknown is not authorized:** An unrecognized action effect, recipient, resource or authority assertion must not silently become a confirmed harmless READ. Whether to return a validation error, abstention indicator or ESCALATE requires an agreed input contract.
- **Source trust:** An agent's own claim that it has permission is not equivalent to a trusted permission record. Record provenance, conflicts and uncertainty where possible.
- **Avoid indiscriminate refusal:** Benign, authorized actions and legitimate tasks must remain possible. False blocks, review burden and cost matter alongside missed risks.
- **No unauthorized substitution of goals:** The governance layer should not invent a new user objective or appoint itself the final moral authority. Human policy and legitimate oversight define governing constraints.

## 4. Input and execution contract — open design questions

The team must specify which action representations are supported and who normalizes tool-call/code-form input into structured action evidence. Potential fields include actor, tool, effect, resource, owner, recipient, constraints, authority, evidence source and intended side effect. These are **candidate contract fields**, not guarantees of current implementation.

An input-level decision should be bound to the exact tool operation reviewed. Changes to arguments, resources, approval state or action sequence may require re-review. A BLOCK signal without evidence that the tool call was prevented is not proof of enforcement.

Open questions: how should unknown effects be handled? What evidence is trusted? What happens when an authorization service is unavailable, consent expires, or a caller ignores the verdict? Which layer is responsible for validation, normalization and tool gating?

## 5. Research and adjudication protocol

1. **State the claim.** Separate a proposed governance principle, a source-code hypothesis, an observed output and a demonstrated runtime outcome.
2. **Freeze a reproducible test packet.** Save case IDs, version/commit, inputs, expected decisions, reviewer notes and relevant controls before the run.
3. **Review independently.** At least two reviewers should label representative disputed cases without seeing Core outputs when feasible; retain disagreements and rationales rather than forcing agreement.
4. **Run controlled comparisons.** Change one factor at a time (e.g., authorization, recipient, wording, action representation), and include legitimate controls.
5. **Preserve evidence.** Save raw outputs, extracted fields, reason codes, tool-call attempts, executed calls, final state and version identifiers as applicable.
6. **Separate findings from fixes.** A surprising PROCEED is an investigation trigger, not automatic proof of a particular root cause. Do not edit rules merely to make existing cases pass.
7. **Approve changes explicitly.** Proposed Core semantics, input contracts and implementation fixes require documented review and new regression/held-out evaluation.

Avoid reporting agreement with author-written expected labels as independently validated safety accuracy. Report both missed risks and unnecessary interventions, with clear denominators and limits.

## 6. Current research links and responsibilities

| Workstream | Current standing | Next research decision |
| --- | --- | --- |
| **EXP-004 — Runtime BLOCK Enforcement** | **P0, unassigned, awaiting approved plan**; distinct from GitHub Issue #4 | Recruit a technical lead; design sandbox agent-only versus agent + Orienta experiment, actual attempted/executed tool logs and final-state verification. |
| **GitHub Issue #3 — Frozen wording study** | Existing study completed; independent adjudication pending | Review disputed cases, identify interpretation gaps and preserve frozen results. |
| **GitHub Issue #4 — Policy, authority and sensitive data** | Vedant's completed BOOTH comparison identified follow-up questions; root causes not established | Reproduce on a pinned baseline, isolate constraint and authorization factors, coordinate with overlapping studies. |
| **Cameron A1 — Action representations** | P1, preparation of frozen design permitted; execution and Core changes not yet approved | Review four matched code-form/plain-English pairs and two benign controls before running. |
| **Decision taxonomy review** | P1 proposed research discussion | Review MODIFY / ESCALATE / BLOCK boundaries using disputed cases and independent reviewers. |

Links: [Issue #3](https://github.com/serenaw99/orienta/issues/3) · [Issue #4](https://github.com/serenaw99/orienta/issues/4)

## 7. Issue governance and ownership

- **Issue author:** documents reproducible evidence, scope, hypotheses and proposed next steps. Opening an Issue does **not** automatically authorize code changes or make the author its assigned owner.
- **Research lead:** sets priority, confirms owner and scope, approves experiments or changes, and records decisions. The lead does not need to debug each technical issue.
- **Assigned investigator:** performs the agreed reproduction or study, updates the Issue and links raw evidence and a concise conclusion.
- **Independent reviewer:** checks methods, labels, evidence and limitations before a finding is treated as confirmed.

Suggested states: **Open Question → Reproduction Planned → In Investigation → Evidence Reviewed → Fix Proposed (if warranted) → Validated / Closed**. Closure must distinguish “question answered,” “fix verified,” and “out of scope.”

## 8. What this document does NOT claim

It does not establish real-world safety accuracy, reliable enforcement, verified permission checks, calibrated risk scores, general semantic understanding or a finished trajectory monitor. It does not assign EXP-004 to a Contributor, nor approve changes to Core decision semantics.

**Research principle:** Build → Validate → Compare → Improve → Demonstrate. Preserve failures as evidence; do not optimize merely for passing existing tests.
