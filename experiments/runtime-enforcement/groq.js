"use strict";

// Native fetch keeps offline suites dependency-free. No endpoint override or
// automatic retries: credentials go only to Groq and every request is counted.
function createGroqClient({ apiKey, model, maxApiCalls, maxOutputTokens, timeoutMs, requestIntervalMs = 0,
  fetchImpl = fetch, now = () => performance.now(), wait = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  if (typeof apiKey !== "string" || !apiKey.trim()) throw new Error("Set GROQ_API_KEY in your local environment.");
  if (typeof model !== "string" || !model.trim()) throw new Error("Set GROQ_MODEL or pass --model with a tool-capable model ID.");
  let requests = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let lastRequestAt = null;
  return {
    stats: () => ({ api_requests: requests, input_tokens: inputTokens, output_tokens: outputTokens }),
    async respond(request, log) {
      if (requests >= maxApiCalls) {
        const error = new Error("API call budget exhausted.");
        error.code = "api_budget_exhausted";
        throw error;
      }
      if (lastRequestAt !== null) {
        const remaining = requestIntervalMs - (now() - lastRequestAt);
        if (remaining > 0) {
          log("model_wait", { reason: "configured_request_interval", wait_ms: remaining });
          await wait(remaining);
        }
      }
      const body = {
        model, messages: request.messages,
        tools: request.tools.map(({ name, description, parameters }) => ({
          type: "function", function: { name, description, parameters }
        })),
        tool_choice: "auto", parallel_tool_calls: false, max_completion_tokens: maxOutputTokens
      };
      requests++;
      lastRequestAt = now();
      log("model_request", { api_request_number: requests, request: body });
      const started = performance.now();
      let response;
      try {
        response = await fetchImpl("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST", headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
          body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs)
        });
      } catch {
        // Never forward transport errors that might contain authorization headers.
        log("model_error", { kind: "transport_or_timeout", elapsed_ms: performance.now() - started });
        throw new Error("Groq request failed or timed out. No automatic retry was made.");
      }
      if (!response.ok) {
        // Persist only recognized codes, never the raw error body or its message.
        let errorCode = null;
        try {
          const error = (await response.json())?.error;
          if (["rate_limit_exceeded", "insufficient_quota", "invalid_api_key", "model_not_found", "tool_use_failed"].includes(error?.code)) {
            errorCode = error.code;
          }
        } catch { /* HTTP status still explains failures with non-JSON bodies. */ }
        log("model_error", { kind: "http", status: response.status, error_code: errorCode, elapsed_ms: performance.now() - started });
        throw new Error("Groq request returned HTTP " + response.status + (errorCode ? " (" + errorCode + ")" : "") +
          ". Check model access, rate limits, and credentials.");
      }
      let data;
      try {
        data = await response.json();
        if (!data || !Array.isArray(data.choices) || data.choices.length !== 1) throw new Error();
        const { message, finish_reason: finishReason } = data.choices[0];
        if (!message || message.role !== "assistant" || typeof finishReason !== "string" ||
            (message.content != null && typeof message.content !== "string") ||
            (message.tool_calls != null && !Array.isArray(message.tool_calls))) throw new Error();
        const callIds = new Set();
        for (const call of message.tool_calls || []) {
          if (!call || call.type !== "function" || !call.function || typeof call.function.name !== "string" ||
              typeof call.function.arguments !== "string" || typeof call.id !== "string" || !call.id || callIds.has(call.id)) throw new Error();
          callIds.add(call.id);
        }
      } catch {
        log("model_error", { kind: "invalid_response" });
        throw new Error("Groq returned an invalid response. No tools were dispatched from it.");
      }
      inputTokens += data.usage?.prompt_tokens || 0;
      outputTokens += data.usage?.completion_tokens || 0;
      log("model_response", { response: data, elapsed_ms: performance.now() - started });
      const { message, finish_reason: finishReason } = data.choices[0];
      const calls = message.tool_calls || [];
      // Replay only final content and function calls, excluding provider reasoning.
      // Truncated/filtered output never dispatches a tool.
      const assistant = { role: "assistant", content: message.content ?? null };
      if (calls.length) assistant.tool_calls = calls;
      const completed = (finishReason === "stop" && calls.length === 0) || (finishReason === "tool_calls" && calls.length > 0);
      return {
        status: completed ? "completed" : "incomplete", message: assistant, text: message.content || "",
        calls: calls.map(call => ({ name: call.function.name, arguments: call.function.arguments, call_id: call.id }))
      };
    }
  };
}

module.exports = { createGroqClient };
