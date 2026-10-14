attle AI Agents Meetup — Research Methods, Findings & Orienta Follow-ups

Date: October 13, 2026
Status: Retrospective research notes, assembled from discussion and recollection; not an official transcript or independently audited account.
Projects: Senux AI / Orienta; related to DPVF methodology proposal.
Evidence legend: Reported at meetup = described in prior discussion; Interpretation = our analysis; Proposed = future Senux experiment; Unconfirmed = source detail needs speaker materials or recording.

1. Why this record exists

Separate speaker methods, data provenance, decision criteria, observations, the attendee’s questions, and actionable experimental ideas. Avoid conflating a persuasive live demo with independent empirical evidence. The core transfer question is: What can Senux reproduce or independently test?

2. MotherDuck — Jacob Matson / Jev evaluation

2.1 Problem and workflow (reported)

• Rapid evaluation of a model or model-assisted decision system against task-specific examples, including confidence and correctness calibration.
• A MotherDuck use case involved prefiltering whether incoming chat requests were database-related.
• A hybrid pipeline used Jev plus a stronger model, with a reported cost/latency benefit of approximately 80% in that specific use case. Unconfirmed: exact denominator, sample size, cost breakdown, and independent replication. Do not generalize this number to all workflows.

2.2 Data and labels

• Development set: approximately 20 tests were mentioned in the earlier meeting discussion. Unconfirmed: exact count, public availability, split protocol, and full case list.
• Held-out tests: used to assess generalization rather than relying only on examples seen during iteration. Unconfirmed: count, randomization, and contamination checks.
• Novel New York Times puzzles: described as a way to reduce exposure/contamination from familiar benchmark items. Unconfirmed: which puzzles, source permissions, and precise dataset construction.
• Ground truth: trusted human judgments were emphasized. Unconfirmed: number of annotators, adjudication procedure, agreement statistics, and annotation rubric.
• No evidence established that these were Hugging Face benchmark datasets; do not attribute an external dataset without verification.

2.3 Method and evaluation logic

1. Define the actual decision/task and its cost of error.
2. Prepare development examples and independent held-out cases.
3. Compare model outputs against trusted human reference judgments.
4. Examine confidence versus actual accuracy; confidence alone is not correctness.
5. Set thresholds according to the consequences of false positives/false negatives, not a universal pass percentage.
6. Compare the hybrid system against a stronger-model-only baseline for quality, cost, and latency.

2.4 Findings vs unknowns

• Reported observation: confidence can be miscalibrated; threshold choice depends on risk and application.
• Reported use-case result: hybrid routing reportedly improved efficiency substantially, potentially around 80% on the stated comparison; not independently verified here.
• Not established: exact precision, recall, calibration error, confusion matrix, sample sizes, confidence intervals, statistical significance, or per-case logs.

2.5 What Orienta can borrow (proposed)

• Split development and held-out cases; independent reviewer labels.
• Keep expected decision separate from observed tool action and downstream state.
• Measure false BLOCK and missed BLOCK separately, including severity and base rates.
• Evaluate decision thresholds per threat category and explicitly document the human adjudication rubric.
• If adding a lightweight prefilter, compare full-system cost/latency and safety against no prefilter; do not assume cheaper implies safer.

3. Camp AI — Governor / OpenFGA / Gateway demo

3.1 Demonstrated architecture (reported)

• A Governor authorization/governance layer working with OpenFGA policy relationships and a Gateway at tool-execution boundaries.
• Demonstration reportedly involved Claude Opus 4.5, delegated permissions, staged least-privilege access, and customer-record operations in a toy/test environment.
• Decision categories: PERMIT / ESCALATE / PRECONDITION / FORBID.
• Human approval (including mobile approval), audit records, and changing or revoked permissions were part of the demonstrated workflow.

3.2 What was the test data?

• Observed: a toy/demo customer-record environment and example authorization scenarios.
• Unconfirmed: whether records were synthetic or anonymized, number of records, policy count, scenario count, data schema, public repo, versioned dataset, and independent test set.
• The demo should not be described as a statistically evaluated benchmark or production deployment without evidence.

3.3 How success was judged in the demonstration

• The visible question was whether policy decisions and approval conditions actually governed tool execution in the illustrated scenarios.
• Distinguish: (a) decision label, (b) tool call attempted, (c) gateway enforcement, (d) actual side effect, (e) audit trail, (f) later permission changes.
• Not established: comprehensive bypass resistance, error rates, coverage, failure distributions, performance overhead, or independent red-team results.

3.4 What Orienta can borrow (proposed)

• Test actual runtime enforcement, not merely BLOCK output.
• Log attempted tool call, policy decision, gate action, resulting state, and audit evidence.
• Include revoked/delegated permissions, approval expiry, indirect tool paths, and recovery after refusal.
• Preserve a distinct research question: an authorized action may still deviate from the user’s original objective. This is a hypothesis to test against Governor-like approaches, not a proven feature gap in Camp AI.

4. User’s meeting questions — reconstruction boundary

The prior discussion establishes strong interest in: what data was used; how experiments were structured; how ground truth was decided; what constitutes a good result; and how authorization differs from original-objective alignment. It does not preserve a verbatim, speaker-attributed transcript of each question asked aloud.

Question register (research questions reconstructed, NOT verbatim quotations):

1. What is the source of the evaluation examples, and are any held out from development?
2. Who provides ground truth and how are ambiguous cases adjudicated?
3. What metrics distinguish correct decisions from calibrated confidence and actual downstream success?
4. Does a FORBID/BLOCK decision prevent execution at the tool boundary, including alternate paths?
5. If an agent is authorized to use a tool, how is continued alignment with the user’s original objective checked?
6. Which claims come from a live demo, and which are supported by repeated independent experiments?

To finalize as a historical record: replace or annotate this section with the user’s exact spoken questions and any recorded speaker answers if available. Do not present reconstructed questions as exact quotations.

5. Experimental comparison: speaker lessons -> Orienta

|Issue              |MotherDuck/Jev lesson                    |Camp AI/Governor lesson                        |Orienta test to run                 |
|-------------------|-----------------------------------------|-----------------------------------------------|------------------------------------|
|Data quality       |Dev vs held-out, human labels            |Demo scenarios need provenance                 |Freeze case sources and labels      |
|Evaluation target  |Decision quality, calibration, efficiency|Permission and gateway enforcement             |Decision + action + final state     |
|Baseline           |Stronger-model-only vs hybrid            |Governed vs ungated paths (proposed comparator)|Agent-only vs Agent + Orienta       |
|Risk               |Threshold depends on error costs         |Least privilege and approvals                  |Missed BLOCK vs false BLOCK severity|
|Multi-step behavior|Task-level outcomes need measurement     |Revocation and delegated permissions           |Objective drift and bypass sequences|
|Evidence           |Accuracy/confidence and cost logs        |Tool boundary and audit logs                   |Complete timestamped trajectory     |

6. Proposed Orienta experiments

Experiment A — Runtime BLOCK enforcement (existing #004; priority)

• Question: Does adding Orienta prevent prohibited tool actions without excessively blocking legitimate actions?
• Conditions: same agent, tasks, model version, tools, permissions, environment; compare agent-only versus agent + Orienta. Randomize trial order where feasible.
• Data: predefined allowed/forbidden cases; internal synthetic cases clearly labeled; separate held-out and independently reviewed cases.
• Ground truth: reviewer-defined allowed/prohibited action and expected final state, fixed before runs.
• Evidence: exact input, objective, tool attempt, Orienta decision, enforcement outcome, final environment state, timestamps, errors.
• Primary measures: prohibited actions actually executed / attempted; permitted task completion; false blocks; bypasses; inconclusive runs. Report counts and denominators.
• Failure: BLOCK emitted but forbidden side effect occurs, or legitimate workflow is wrongly prevented.

Experiment B — Authorized-but-off-objective drift

• Question: Can an agent stay within tool permissions yet depart from the user’s original authorized objective?
• Design: multi-step tasks with plausible distractors, ambiguous intermediate choices, and objective-changing opportunities; same task across baseline and governed conditions.
• Outcome: independent reviewer judgment of objective fidelity, actual final state, step at which deviation occurred, and whether deviation was corrected.
• Controls: avoid cases whose ‘correct’ objective interpretation is debatable without adjudication; blind reviewers to condition when possible.

Experiment C — Held-out calibration and threshold analysis

• Question: Do confidence/decision thresholds transfer to unseen wording and risk classes?
• Data: 56 synthetic wording cases can be one source for review, but do not automatically treat them as independent held-out data if they were used during design.
• Measures: confusion matrix by decision class; false BLOCK, missed BLOCK, reviewer agreement, threshold trade-offs; cost and latency if relevant.
• Avoid: tuning thresholds on the test set, reporting only accuracy, suppressing unsupported or failed cases.

Experiment D — DPVF exploratory re-analysis (later)

• Track A: decision and tool enforcement metrics.
• Track B: full trajectory, state changes, indirect consequences, objective drift and corrective feedback.
• Cross-track: identify important discrepancies; run a follow-up test that could disprove the interpretation.
• Claim threshold: show a consequential, reproducible finding missed by one track, not just a richer narrative.

7. Questions to request from speakers / materials

MotherDuck/Jev: exact dataset and split; example count; label rubric; independent annotators; metrics and confidence calibration plot; baseline models; what “80%” measures; hardware/API cost, latency and repeated runs; slide or code links.

Camp AI: policy schema and OpenFGA model; gateway interception point; demo data origin; scenario list; bypass/red-team tests; enforcement logs; revocation semantics; whether objective fidelity is measured separately from authorization; code/slides.

8. What can be concluded today

Supported as discussion takeaways: held-out tests and human reference labels matter; confidence must be calibrated; runtime governance must be checked at the action boundary; audit trails and permission changes are important.

Not supported as demonstrated conclusions: Jev generalizes across domains; the ~80% efficiency result generalizes; Camp AI universally prevents bypasses; Orienta is uniquely capable of objective fidelity; DPVF has been empirically shown superior.

9. References and provenance

• Primary provenance: retrospective conversation about the October 13, 2026 Seattle AI Agents Meetup; not an official recording.
• Existing Senux documentation: CONTRIBUTOR_EXPERIMENT_REPORT_TEMPLATE.md v1.1, FORMAL_RESEARCH_EXPERIMENT_REPORT_TEMPLATE.md v1.1, senux_dual_paradigm_validation_framework_v0.1.md, and Orienta experiment #004.
• Add speaker decks, recordings, links, repo commits, screenshots, and direct quotes only when confirmed.

Research integrity rule: Reported / Independently verified / Interpretation / Proposed / Unknown should never be silently merged into one claim.