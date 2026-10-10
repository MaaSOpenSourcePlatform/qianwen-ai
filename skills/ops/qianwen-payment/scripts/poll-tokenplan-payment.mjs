#!/usr/bin/env node
/**
 * Bounded foreground wait for a Token Plan payment result.
 *
 * The QianWen CLI owns the read-only polling loop. This wrapper caps that wait
 * with a local wall-clock deadline, validates the retained order identity and
 * emits exactly one JSON document for the Agent to consume.
 *
 * Exit codes:
 *   0 = Validated terminal payment classification reached.
 *   1 = Maximum wait duration elapsed without a terminal result.
 *   2 = Usage error, validation/read failure, or interruption.
 */

import { spawn } from "node:child_process";
import { parseArgs as parseNodeArgs } from "node:util";
import { resolveExecutable } from "./command-resolver.mjs";
import { validateTokenPlanPaymentResult } from "./tokenplan-order-contracts.mjs";

const SAFE_ARG_RE = /^[A-Za-z0-9._:=-]+$/;
const PAYMENT_ORDER_ID_RE = /^[1-9]\d*$/;
const DEFAULT_MAX_SECONDS = 600;
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024;
const TERMINATION_GRACE_MS = 250;

const USAGE = `\
usage: poll-tokenplan-payment.mjs --payment-order-id <id>
           [--max-seconds <n>]

Wait in the foreground for a Token Plan payment's terminal status.

  --payment-order-id ID       Required. The retained payment order to query.
  --max-seconds N             Max total wait duration in seconds (default: ${DEFAULT_MAX_SECONDS}).
  -h, --help                  Show this help.

Exit codes:
  0  Validated terminal payment classification reached
  1  Max wait duration elapsed before a terminal result
  2  Usage/runtime/validation failure or interruption
`;

function usageError(message) {
  process.stderr.write(
    `${USAGE}\npoll-tokenplan-payment.mjs: error: ${message}\n`,
  );
  process.exit(2);
}

function parseArgv(argv) {
  let values;
  try {
    ({ values } = parseNodeArgs({
      args: argv,
      options: {
        "payment-order-id": { type: "string" },
        "max-seconds": { type: "string" },
        help: { type: "boolean", short: "h" },
      },
      strict: true,
      allowPositionals: false,
    }));
  } catch (error) {
    usageError(error.message);
  }
  if (values.help === true) {
    process.stdout.write(USAGE);
    process.exit(0);
  }

  const paymentOrderId = values["payment-order-id"] ?? null;
  if (paymentOrderId === null)
    usageError("--payment-order-id is required");
  if (!PAYMENT_ORDER_ID_RE.test(paymentOrderId)) {
    usageError("--payment-order-id must be a positive decimal integer");
  }
  const maxSecondsValue = values["max-seconds"] ?? String(DEFAULT_MAX_SECONDS);
  const maxSeconds = Number(maxSecondsValue);
  if (!Number.isFinite(maxSeconds) || maxSeconds <= 0 || !Number.isInteger(maxSeconds)) {
    usageError(
      `argument --max-seconds: expected a positive integer, got '${maxSecondsValue}'`,
    );
  }
  return { paymentOrderId, maxSeconds };
}

/**
 * Send a signal to the complete result-query process tree when possible.
 *
 * @param {import("node:child_process").ChildProcess} child active child
 * @param {NodeJS.Signals} signal termination signal
 */
function signalChild(child, signal) {
  if (process.platform !== "win32" && child.pid !== undefined) {
    try {
      process.kill(-child.pid, signal);
      return;
    } catch {
      // The process group may already be gone; fall back to the direct child.
    }
  }
  child.kill(signal);
}

/**
 * Stop the active read-only wait and guarantee eventual process termination.
 *
 * @param {import("node:child_process").ChildProcess} child active child
 * @returns {NodeJS.Timeout}
 */
function terminateChild(child) {
  signalChild(child, "SIGTERM");
  const timer = setTimeout(
    () => signalChild(child, "SIGKILL"),
    TERMINATION_GRACE_MS,
  );
  timer.unref();
  return timer;
}

/**
 * Run the CLI-owned wait with a strict outer deadline.
 *
 * @param {string[]} argv executable followed by structured arguments
 * @param {number} timeoutMs maximum child runtime
 * @param {AbortSignal} signal outer interruption signal
 * @returns {Promise<{code: number, stdout: string, stderr: string}>}
 */
function run(argv, timeoutMs, signal) {
  const [exe, ...args] = argv;
  const isWindows = process.platform === "win32";
  const needsShell = isWindows && /\.(cmd|bat)$/i.test(exe);
  if (needsShell && !args.every((arg) => SAFE_ARG_RE.test(arg))) {
    return Promise.resolve({
      code: 126,
      stdout: "",
      stderr: "refusing to build shell text from unexpected argument",
    });
  }

  return new Promise((resolve) => {
    const options = {
      windowsHide: true,
      shell: needsShell,
      detached: !isWindows,
    };
    const line = needsShell
      ? [exe, ...args].map((part) => `"${part}"`).join(" ")
      : exe;
    const childArgs = needsShell ? [] : args;
    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;
    let outputExceeded = false;
    let terminationTimer = null;

    const child = spawn(line, childArgs, options);

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutTimer);
      if (terminationTimer !== null) clearTimeout(terminationTimer);
      signal.removeEventListener("abort", handleAbort);
      resolve(result);
    };

    const appendOutput = (current, chunk) => {
      const next = current + chunk.toString("utf8");
      if (Buffer.byteLength(next, "utf8") > MAX_OUTPUT_BYTES) {
        outputExceeded = true;
        if (terminationTimer === null) terminationTimer = terminateChild(child);
        return current;
      }
      return next;
    };

    child.stdout?.on("data", (chunk) => {
      stdout = appendOutput(stdout, chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr = appendOutput(stderr, chunk);
    });

    const handleAbort = () => {
      if (terminationTimer === null) terminationTimer = terminateChild(child);
    };
    signal.addEventListener("abort", handleAbort, { once: true });

    const timeoutTimer = setTimeout(() => {
      timedOut = true;
      if (terminationTimer === null) terminationTimer = terminateChild(child);
    }, timeoutMs);
    timeoutTimer.unref();

    child.once("error", (error) => {
      const errorCode = error.code;
      if (errorCode === "ENOENT") {
        finish({ code: 127, stdout: "", stderr: "executable not found" });
      } else {
        finish({
          code: 126,
          stdout,
          stderr: String(error.message ?? errorCode),
        });
      }
    });

    child.once("close", (code, childSignal) => {
      if (signal.aborted) {
        finish({ code: 130, stdout, stderr: "interrupted" });
      } else if (timedOut) {
        finish({
          code: 124,
          stdout,
          stderr: `timed out after ${timeoutMs / 1000}s`,
        });
      } else if (outputExceeded) {
        finish({ code: 126, stdout, stderr: "command output exceeded 4 MiB" });
      } else if (code === null) {
        finish({
          code: 126,
          stdout,
          stderr: `terminated by signal ${childSignal ?? "unknown"}`,
        });
      } else {
        finish({ code, stdout, stderr });
      }
    });
  });
}

function emitResult(report) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

function stop(baseReport, message, reason, exitCode, details = {}) {
  process.stderr.write(`${message}\n`);
  emitResult({
    ok: false,
    ...baseReport,
    status: details.status ?? null,
    ...(details.sourceStatus === undefined
      ? {}
      : { sourceStatus: details.sourceStatus }),
    terminal: false,
    payment: details.payment ?? "unconfirmed",
    reason,
  });
  return exitCode;
}

async function main() {
  const opts = parseArgv(process.argv.slice(2));
  const startedAt = Date.now();
  const abortController = new AbortController();
  let interruptionSignal = null;

  const interrupt = (signal) => {
    if (interruptionSignal !== null) return;
    interruptionSignal = signal;
    abortController.abort();
  };
  process.once("SIGINT", () => interrupt("SIGINT"));
  process.once("SIGTERM", () => interrupt("SIGTERM"));

  const baseReport = () => ({
    paymentOrderId: opts.paymentOrderId,
    elapsedSeconds: Math.round((Date.now() - startedAt) / 1000),
  });

  const exe = resolveExecutable("qianwen");
  if (exe === null) {
    return stop(
      baseReport(),
      "Error: 'qianwen' CLI not found on PATH.",
      "read-error",
      2,
    );
  }

  process.stderr.write(
    `Polling Token Plan payment result (max=${opts.maxSeconds}s)...\n`,
  );
  const result = await run(
    [
      exe,
      "subscription",
      "tokenplan",
      "payment-result",
      opts.paymentOrderId,
      "--wait",
      "--format",
      "json",
    ],
    opts.maxSeconds * 1000,
    abortController.signal,
  );

  if (interruptionSignal !== null || result.code === 130) {
    return stop(
      baseReport(),
      `Interrupted${interruptionSignal === null ? "" : ` by ${interruptionSignal}`}.`,
      "interrupted",
      2,
    );
  }

  if (result.code === 124) {
    return stop(
      baseReport(),
      `Max duration (${opts.maxSeconds}s) exceeded; giving up.`,
      "timeout",
      1,
    );
  }

  // The current CLI uses 0 for succeeded, 1 for confirmed failed/cancelled,
  // and 8 for pending/unknown/timed_out. The payload validator remains the
  // authority for which of those states this Skill may trust.
  if (result.code !== 0 && result.code !== 1 && result.code !== 8) {
    return stop(
      baseReport(),
      `Token Plan payment query failed (CLI exit ${result.code}).`,
      "read-error",
      2,
    );
  }

  let doc;
  try {
    doc = JSON.parse(result.stdout.trim());
  } catch {
    return stop(
      baseReport(),
      `Payment result could not be validated (CLI exit ${result.code}).`,
      "read-error",
      2,
    );
  }

  const [validationErrors, classification] = validateTokenPlanPaymentResult(
    doc,
    opts.paymentOrderId,
  );
  if (validationErrors.length > 0) {
    return stop(
      baseReport(),
      "Token Plan payment result failed validation.",
      "read-error",
      2,
    );
  }

  const terminal =
    classification.payment === "payment_succeeded" ||
    classification.payment === "payment_failed";
  if (terminal) {
    process.stderr.write(
      `Terminal payment classification reached: ${classification.payment}.\n`,
    );
    emitResult({
      ok: true,
      ...baseReport(),
      status: doc.status,
      sourceStatus: classification.sourceStatus,
      terminal: true,
      payment: classification.payment,
    });
    return 0;
  }

  const timedOut = doc.status === "timed_out";
  return stop(
    baseReport(),
    "Token Plan payment result remains unconfirmed.",
    timedOut ? "timeout" : "unconfirmed",
    timedOut ? 1 : 2,
    {
      status: doc.status,
      sourceStatus: classification.sourceStatus,
      payment: classification.payment,
    },
  );
}

process.exitCode = await main();
