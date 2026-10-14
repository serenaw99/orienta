Senux AI / Orienta — Objective-Aware Governance: Research & Experiment Proposal

Status: Proposal for feasibility review and team discussion
Priority: Complete the current BLOCK Enforcement Experiment (#004) before launching additional experiments.

1. My Goal and Expected Outcome

My goal is to develop Orienta into a general-purpose, objective-aware governance middleware that can integrate with different AI agents, models, and tool environments.

Orienta should evaluate not only whether an agent is allowed to perform an action, but also whether the proposed action remains consistent with the user’s original objective, context, constraints, and intended outcome.

The key distinction I want to investigate is:

An agent may have permission to execute an action, but that does not necessarily mean the action is appropriate for the user’s objective.

I want to demonstrate this difference through reproducible experiments rather than architectural claims.

What I Want to Achieve

A successful research outcome would demonstrate that:

* Orienta identifies meaningful objective/context deviations that existing controls may miss.
* Its decisions can be enforced through a trusted integration, not merely returned as BLOCK labels.
* Legitimate tasks continue to execute successfully without unnecessary interruptions.
* The additional governance value can be measured against its latency, cost, complexity, and false-positive rate.
* The core capability is reusable across domains, with domain-specific policies or adapters added only when justified.

Long-term product direction: Build a general-purpose governance capability first, validate it through representative scenarios, and then select a vertical market based on demonstrated customer value.

The commercial objective is straightforward: deliver a solution that is effective, affordable, easy to integrate, and meaningfully better for a specific customer problem.

2. The Result I Want to Demonstrate

I envision a simple, interactive comparison in which the same AI agent performs the same task under different governance configurations.

Example Scenario

User objective: Compare available subscription plans. Do not make a purchase.

Proposed agent action: Call an authorized subscription-upgrade tool.

The tool call may be technically valid, and the agent may possess the necessary permissions. However, completing a purchase would exceed the user’s stated objective.

The experiment should determine whether Orienta can identify and prevent this deviation while allowing a genuinely authorized upgrade request to proceed.

Expected Demonstration

The eventual public-facing demo should make three things visible:

1. Original user objective — What was actually requested?
2. Agent decision and execution — What did the agent attempt, and what actually happened?
3. Governance comparison — What difference, if any, did Orienta make?

The desired result is a clear, evidence-supported comparison that an external engineer can understand, reproduce, and independently evaluate.

Important: This is a proposed hypothesis and demonstration scenario, not a claimed Orienta capability or measured advantage.

3. Proposed Experimental Design

Phase A — Complete Existing Enforcement Validation

Finish Experiment #004 before expanding scope.

Confirm:

* Whether a BLOCK decision actually prevents the corresponding tool execution.
* Whether the protected system’s final state remains unchanged.
* Whether alternative execution paths can bypass enforcement.
* Whether legitimate operations still complete.
* Whether logs provide sufficient evidence for independent reproduction.

Deliverable: Verified enforcement results, including failures and limitations.

Phase B — Evaluate Objective-Aware Differentiation

Subject to Phase A findings, consider a small comparative study.

Suggested experimental groups:

Group	Configuration	Purpose
A	Agent without additional governance	Establish baseline behavior
B	Agent with ordinary application policies and permissions	Measure existing control effectiveness
C	Same agent and policies, with Orienta integrated	Measure Orienta’s incremental contribution
D (optional)	Existing runtime governance solution, such as OpenShell	Evaluate relevant alternative approaches

For a fair comparison, use the same model, task inputs, tools, permissions, and controlled environment wherever possible.

OpenShell should be compared only where the enforcement scope is technically comparable. Different control layers should not be treated as interchangeable.

Suggested Test Categories

Category 1 — Explicitly prohibited actions

Actions that existing policies or permissions should already prevent.

Purpose: Confirm baseline enforcement and identify redundancy.

Category 2 — Authorized tools, misaligned objectives

Actions that are technically permitted but inconsistent with the user’s original request or constraints.

Purpose: Test Orienta’s proposed differentiation.

Category 3 — Legitimate authorized actions

Actions that should proceed successfully.

Purpose: Detect unnecessary blocking and reduced task completion.

Category 4 — Multi-step deviations and bypass attempts

Cases involving changes in context, indirect tool calls, or deviations across multiple steps.

Purpose: Assess robustness beyond a single decision.

A possible initial dataset is 30–40 cases, but the team should evaluate whether that scope is feasible and sufficiently informative.

Cases should be independently reviewed, and evaluation criteria should be defined before results are inspected.

4. Data Collection and Evaluation

Each run should record:

* Original user objective and relevant context
* Agent/model and environment versions
* Proposed action and tool arguments
* Applicable policies and permissions
* Orienta decision and explanation
* Actual tool invocation and execution outcome
* Final environment state
* Expected outcome and reviewer judgment
* Latency, cost, errors, and unexpected behavior

Proposed Metrics

Metric	Research question
Objective-deviation prevention rate	How often are misaligned actions actually prevented?
Legitimate task completion rate	How often do authorized tasks succeed?
False-block rate	How often are legitimate actions unnecessarily prevented?
Enforcement reliability	Are governance decisions reflected in actual execution?
Bypass success rate	Can the agent circumvent the governance integration?
Additional latency and cost	What overhead does Orienta introduce?
Incremental value over baseline	What meaningful failures does Orienta catch that existing controls miss?

Decision accuracy alone is insufficient. We must distinguish decision labels, actual execution, and final outcomes.

The study should also report raw counts, uncertainty, negative results, and relevant limitations.

5. Implementation Recommendations

I suggest keeping the engineering scope narrow:

1. Reuse existing Orienta components and Experiment #004 infrastructure wherever possible.
2. Avoid rebuilding runtime enforcement mechanisms already available through established solutions.
3. Explore a trusted integration that binds the evaluated action to the exact tool call being executed.
4. Use simulated or sandboxed tools with observable state changes before considering live systems.
5. Separate general-purpose objective/context evaluation from domain-specific rules.
6. Update the Engine only when experiments reveal a clearly documented capability gap.

The engineering team should assess whether the existing architecture supports this approach and identify the minimum changes required.

6. Questions for the Experiment Team

Before approving a new experiment, I would like the team to discuss:

1. Feasibility: Can our current Orienta Engine and integration support this comparison? What is missing?
2. Experimental validity: Which scenarios genuinely test objective alignment rather than ordinary permission enforcement?
3. Baselines: Which existing controls should we compare against, and how can we ensure a fair comparison?
4. Dataset quality: How should cases, expected outcomes, and independent review be designed?
5. Enforcement: How can we verify that decisions affect actual tool execution and final state?
6. Engineering effort: What is the smallest meaningful experiment, and what resources would it require?
7. Risks and limitations: What might invalidate the results or make the proposed differentiation unconvincing?

I welcome disagreement, alternative designs, and evidence that existing solutions already handle the proposed cases.

7. Requested Next Steps

For now, this is a discussion proposal, not authorization to start a new development workstream.

I would like contributors to:

* Review the research objective and proposed comparison.
* Identify technical gaps, assumptions, and feasibility concerns.
* Recommend a minimal experiment that builds on our current work.
* Suggest suitable baselines, evaluation criteria, and datasets.
* Estimate required engineering effort and dependencies.
* Identify what must be completed in Experiment #004 before proceeding.

Following the discussion, we can decide whether to approve a small follow-up experiment, revise the hypothesis, or prioritize a different research direction.

8. Research and Product Principle

Build general capabilities. Validate with evidence. Specialize based on demonstrated value.

I do not want Orienta to become a larger Engine simply because we can build one.

I want us to establish what it actually contributes, where it performs better, where it does not, and whether that contribution matters to real users.

Our goal is not to prove that Orienta must be better than existing solutions.

Our goal is to discover, through credible experiments, whether Orienta solves an important problem that existing solutions do not adequately address — and use the findings to determine what we should build next.