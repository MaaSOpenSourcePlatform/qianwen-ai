#!/usr/bin/env node
/**
 * Deterministic dependency preflight and response validation for the
 * qianwen-payment Token Plan domain.
 *
 * This script is read-only. It never creates an order, initiates payment, or
 * queries transaction state. Business authorization remains in the Token Plan
 * runbook.
 *
 * Output: exactly one JSON document on stdout. Diagnostics go to stderr.
 * Requires Node >= 18.18.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { parseArgs as parseNodeArgs } from "node:util";
import { resolveExecutable } from "./command-resolver.mjs";
import {
  validateTokenPlanOrders,
  validateTokenPlanPaymentResult,
} from "./tokenplan-order-contracts.mjs";

export {
  validateTokenPlanOrders,
  validateTokenPlanPaymentResult,
} from "./tokenplan-order-contracts.mjs";

const [NODE_MAJOR, NODE_MINOR] = process.versions.node
  .split(".")
  .slice(0, 2)
  .map((part) => Number.parseInt(part, 10));
if (
  !Number.isInteger(NODE_MAJOR) ||
  !Number.isInteger(NODE_MINOR) ||
  NODE_MAJOR < 18 ||
  (NODE_MAJOR === 18 && NODE_MINOR < 18)
) {
  fs.writeSync(
    1,
    `${JSON.stringify(
      {
        ok: false,
        error: "node_version_unsupported",
        version: process.versions.node,
        minimum: "18.18.0",
      },
      null,
      2,
    )}\n`,
  );
  fs.writeSync(
    2,
    `Error: Node 18.18+ required (found ${process.versions.node}). ` +
      "Install: https://nodejs.org/\n",
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Route names mirror the Token Plan `qianwen` subcommand each one gates.
// Validation shapes are the subset that requires a local contract check.
const ROUTE_CLI_COMMAND = {
  "token-plan-list": ["subscription", "tokenplan", "list"],
  "token-plan-preview": ["subscription", "tokenplan", "purchase", "--preview"],
  "token-plan-purchase": ["subscription", "tokenplan", "purchase"],
  "token-plan-payment-result": ["subscription", "tokenplan", "payment-result"],
  "token-plan-status": ["subscription", "tokenplan", "status"],
  "token-plan-orders": ["subscription", "orders"],
};
const VALIDATORS = {
  "token-plan-list": validateTokenPlanList,
  "token-plan-preview": validateTokenPlanPreview,
  "token-plan-purchase": validateTokenPlanPurchase,
  "token-plan-payment-result": (doc, expected) =>
    validateTokenPlanPaymentResult(doc, expected.paymentOrderId),
  "token-plan-status": validateTokenPlanStatus,
  "token-plan-orders": (doc, expected) =>
    validateTokenPlanOrders(doc, expected.orderIds, expected.pageSize),
};
const VALIDATION_SHAPES = new Set(Object.keys(VALIDATORS));
const MIN_QIANWEN_CLI_VERSION = "1.10.0";
const ALIPAY_SIGNAL_SUBCOMMAND = "trigger-payment-signal";
const ALIPAY_SIGNAL_OPTIONS = ["--payment-link", "--merchant-info", "--amount"];
const ALIPAY_SUBMIT_SUBCOMMAND = "submit-payment";
const ALIPAY_SUBMIT_OPTIONS = ["--session-id", "--payment-link", "--intent-summary"];
const ALIPAY_VERSION_PREFIX = "alipay-bot-cli ";

// Allowlist of hostnames permitted for order paymentUrl; matched case-insensitively.
// Mirrors the installed QianWen CLI's own payment-URL gate exactly -- re-verify
// against the CLI bundle after any CLI upgrade.
const PAYMENT_URL_HOSTS = [
  "account.qianwenai.com",
  "cashier.alipay.com",
  "excashier.alipay.com",
  "qr.alipay.com",
];

const PROBE_TIMEOUT_MS = 20_000;

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;
const DECIMAL_RE = /^\d+(?:\.\d{1,2})?$/;
const TOKEN_PLAN_ORDER_ID_RE = /^[1-9]\d*$/;
const TOKEN_PLAN_TYPES = new Set([
  "token_plan_individual_lite",
  "token_plan_individual_essential",
  "token_plan_individual_standard",
  "token_plan_individual_pro",
  "token_plan_team",
]);
const TOKEN_PLAN_BILLING_CYCLES = new Set(["monthly", "quarterly", "yearly"]);
const TOKEN_PLAN_PURCHASE_STATUSES = new Set([
  "succeeded",
  "failed",
  "timed_out",
  "cancelled",
  "unknown",
  "pending",
]);
const TOKEN_PLAN_LIST_EDITIONS = new Set(["all", "individual", "team"]);
const TOKEN_PLAN_COUPON_MODES = new Set(["default", "explicit", "none"]);
const TOKEN_PLAN_DEDUCTION_INTENTS = new Set(["auto", "manual", "none"]);
const TOKEN_PLAN_SUBSCRIPTION_STATUSES = new Set(["active", "not_subscribed", "unknown"]);
const TOKEN_PLAN_NO_COUPON_ID = "youhuiquan_promotion_option_id_for_blank";
const TOKEN_PLAN_SUBSCRIPTION_URLS = {
  individual: "https://platform.qianwenai.com/home/analytics/token-plan/individual",
  team: "https://platform.qianwenai.com/home/analytics/token-plan/team",
};
const MAX_INPUT_BYTES = 4 * 1024 * 1024;

// Only fixed literals from this file are ever passed to run(); this pattern is
// the defensive gate that keeps the Windows .cmd path free of injectable text.
const SAFE_ARG_RE = /^[A-Za-z0-9._=-]+$/;

const isPlainObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === "string" && value.trim() !== "";
const isTokenPlanOrderId = (value) =>
  typeof value === "string" && TOKEN_PLAN_ORDER_ID_RE.test(value);

function hasAsciiControlCharacter(value) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

function paymentUrlError(value) {
  if (typeof value !== "string" || value !== value.trim() || hasAsciiControlCharacter(value)) {
    return "payment_url_invalid";
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return "payment_url_invalid";
  }

  if (parsed.protocol !== "https:") return "payment_url_not_https";
  if (parsed.username !== "" || parsed.password !== "") {
    return "payment_url_has_userinfo";
  }
  // Case-insensitive match: normalize to lowercase before checking the allowlist
  if (!PAYMENT_URL_HOSTS.includes(parsed.hostname.toLowerCase())) {
    return "payment_url_host_not_allowlisted";
  }
  return null;
}

// ---------------------------------------------------------------------------
// SemVer
// ---------------------------------------------------------------------------

/** Parse a SemVer string into {core: [major, minor, patch], prerelease}. */
export function parseSemver(raw) {
  if (typeof raw !== "string") return null;
  const m = SEMVER_RE.exec(raw.trim());
  if (!m) return null;
  return {
    core: [Number(m[1]), Number(m[2]), Number(m[3])],
    prerelease: m[4] ?? null,
  };
}

/**
 * SemVer prerelease precedence per semver.org §11: dot-separated identifiers,
 * numeric identifiers compare numerically and rank below alphanumeric ones,
 * a shorter identifier list ranks lower when all preceding ones are equal.
 */
function comparePrerelease(a, b) {
  const as = a.split(".");
  const bs = b.split(".");
  const len = Math.max(as.length, bs.length);
  for (let i = 0; i < len; i += 1) {
    const x = as[i];
    const y = bs[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const xNum = /^\d+$/.test(x);
    const yNum = /^\d+$/.test(y);
    if (xNum && yNum) {
      if (Number(x) !== Number(y)) return Number(x) < Number(y) ? -1 : 1;
      continue;
    }
    if (xNum) return -1;
    if (yNum) return 1;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

/**
 * True when `actual` >= `minimum`.
 *
 * A prerelease of the minimum core version ranks below its final release, so
 * 1.6.0-alpha.1 does not satisfy a 1.6.0 minimum.
 */
export function meetsMinimum(actual, minimum) {
  const a = parseSemver(actual);
  const b = parseSemver(minimum);
  if (a === null || b === null) return false;
  for (let i = 0; i < 3; i += 1) {
    if (a.core[i] !== b.core[i]) return a.core[i] > b.core[i];
  }
  if (!a.prerelease) return true;
  if (!b.prerelease) return false;
  return comparePrerelease(a.prerelease, b.prerelease) >= 0;
}

// ---------------------------------------------------------------------------
// Process probes
// ---------------------------------------------------------------------------

/** Resolve an executable on PATH, honouring PATHEXT on Windows. */
export function which(cmd) {
  return resolveExecutable(cmd);
}

function run(argv) {
  const [exe, ...args] = argv;
  const isWindows = process.platform === "win32";
  // Node refuses to spawn .cmd/.bat without a shell, so that one case goes
  // through the shell.  Every arg here is a fixed literal, and the guard below
  // fails closed if that ever stops being true.
  const needsShell = isWindows && /\.(cmd|bat)$/i.test(exe);
  if (needsShell && !args.every((arg) => SAFE_ARG_RE.test(arg))) {
    return [126, "", "refusing to build shell text from unexpected probe argument"];
  }
  const options = {
    encoding: "utf8",
    timeout: PROBE_TIMEOUT_MS,
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024,
  };
  let res;
  if (needsShell) {
    const line = [exe, ...args].map((part) => `"${part}"`).join(" ");
    res = spawnSync(line, { ...options, shell: true });
  } else {
    res = spawnSync(exe, args, { ...options, shell: false });
  }
  const stdout = res.stdout ?? "";
  const stderr = res.stderr ?? "";
  if (res.error) {
    const code = res.error.code;
    if (code === "ENOENT") return [127, "", "executable not found"];
    if (code === "ETIMEDOUT") {
      return [124, stdout, `probe timed out after ${PROBE_TIMEOUT_MS / 1000}s`];
    }
    return [126, stdout, String(res.error.message ?? code)];
  }
  if (res.status === null) {
    return [126, stdout, `probe terminated by signal ${res.signal ?? "unknown"}`];
  }
  return [res.status, stdout, stderr];
}

/** Parse exactly one JSON document from `text`, else null. */
function singleJson(text) {
  try {
    const parsed = JSON.parse(text.trim());
    return parsed === null ? null : parsed;
  } catch {
    return null;
  }
}

/** Probe the QianWen CLI on PATH and require `version` >= `minimum`. */
export function probeQianwenCli(minimum) {
  const exe = which("qianwen");
  if (exe === null) {
    return {
      name: "qianwen_cli",
      status: "gap",
      reason: "executable_not_found",
    };
  }
  const [code, out, err] = run([exe, "version", "--format", "json"]);
  if (code !== 0) {
    return {
      name: "qianwen_cli",
      status: "gap",
      reason: "version_command_failed",
      exit_code: code,
      stderr: err.trim().slice(0, 200),
    };
  }
  const doc = singleJson(out);
  if (!isPlainObject(doc) || typeof doc.version !== "string") {
    return {
      name: "qianwen_cli",
      status: "gap",
      reason: "version_not_single_json",
    };
  }
  const version = doc.version;
  const parsed = parseSemver(version);
  if (parsed === null) {
    return {
      name: "qianwen_cli",
      status: "gap",
      reason: "version_unparseable",
      version,
    };
  }
  if (!meetsMinimum(version, minimum)) {
    return {
      name: "qianwen_cli",
      status: "gap",
      reason: parsed.prerelease ? "prerelease_below_minimum" : "version_below_minimum",
      version,
      minimum,
    };
  }
  return { name: "qianwen_cli", status: "pass", version, minimum };
}

function probeAlipayVersion(exe) {
  const [versionCode, versionOut] = run([exe, "--version"]);
  if (versionCode !== 0) {
    return {
      status: "unavailable",
      reason: "version_command_failed",
      exit_code: versionCode,
    };
  }
  const line = versionOut.replace(/\n+$/, "");
  if (!line.startsWith(ALIPAY_VERSION_PREFIX)) {
    return { status: "unavailable", reason: "unexpected_version_output" };
  }
  const version = line.slice(ALIPAY_VERSION_PREFIX.length).trim();
  if (parseSemver(version) === null) {
    return { status: "unavailable", reason: "version_unparseable", version };
  }
  return { status: "observed", version };
}

/**
 * Probe the exact trigger-payment-signal contract used by the direct path.
 *
 * The version probe is diagnostic metadata only. Its failure, output format,
 * or reported value must not select a payment path; only this command's
 * observed option contract and the submit-payment probe determine routing.
 */
export function probeAlipayCli() {
  const exe = which("alipay-bot");
  if (exe === null) {
    return {
      name: "alipay_cli",
      status: "missing",
      reason: "executable_not_found",
      version_probe: { status: "unavailable", reason: "executable_not_found" },
    };
  }
  const versionProbe = probeAlipayVersion(exe);
  // trigger-payment-signal is intentionally omitted from some top-level help
  // output, so probe its help directly and verify the exact contract needed by
  // the pre-handoff flow.
  const [signalHelpCode, signalHelpOut, signalHelpErr] = run([
    exe,
    ALIPAY_SIGNAL_SUBCOMMAND,
    "--help",
  ]);
  if (signalHelpCode !== 0) {
    return {
      name: "alipay_cli",
      status: "missing",
      reason: "signal_help_command_failed",
      exit_code: signalHelpCode,
      version_probe: versionProbe,
    };
  }
  const signalHelp = signalHelpOut + signalHelpErr;
  if (!signalHelp.includes(`alipay-bot ${ALIPAY_SIGNAL_SUBCOMMAND}`)) {
    return {
      name: "alipay_cli",
      status: "missing",
      reason: "missing_subcommands",
      missing: [ALIPAY_SIGNAL_SUBCOMMAND],
      version_probe: versionProbe,
    };
  }
  const missingSignalOptions = ALIPAY_SIGNAL_OPTIONS.filter(
    (option) => !signalHelp.includes(option),
  );
  if (missingSignalOptions.length > 0) {
    return {
      name: "alipay_cli",
      status: "missing",
      reason: "missing_subcommand_options",
      subcommand: ALIPAY_SIGNAL_SUBCOMMAND,
      missing: missingSignalOptions,
      version_probe: versionProbe,
    };
  }
  return {
    name: "alipay_cli",
    status: "pass",
    subcommands: [ALIPAY_SIGNAL_SUBCOMMAND],
    version_probe: versionProbe,
  };
}

/**
 * Probe the `submit-payment` option contract directly.
 *
 * This is a hard CLI dependency shared by the direct and delegated-Skill paths.
 * `alipay-payment-skill` also executes submit-payment, so its availability cannot
 * compensate for a missing or incompatible command contract.
 */
export function probeAlipaySubmitPayment() {
  const check = {
    name: "alipay_submit_payment",
    subcommands: [ALIPAY_SUBMIT_SUBCOMMAND],
    required_options: [...ALIPAY_SUBMIT_OPTIONS],
  };
  const exe = which("alipay-bot");
  if (exe === null) {
    return { ...check, status: "gap", reason: "executable_not_found" };
  }
  const [helpCode, helpOut, helpErr] = run([exe, ALIPAY_SUBMIT_SUBCOMMAND, "--help"]);
  if (helpCode !== 0) {
    return {
      ...check,
      status: "gap",
      reason: "submit_help_command_failed",
      exit_code: helpCode,
    };
  }
  const submitHelp = helpOut + helpErr;
  if (!submitHelp.includes(`alipay-bot ${ALIPAY_SUBMIT_SUBCOMMAND}`)) {
    return { ...check, status: "gap", reason: "subcommand_not_found" };
  }
  const missingOptions = ALIPAY_SUBMIT_OPTIONS.filter((option) => !submitHelp.includes(option));
  if (missingOptions.length > 0) {
    return {
      ...check,
      status: "gap",
      reason: "missing_subcommand_options",
      missing: missingOptions,
    };
  }
  return { ...check, status: "pass" };
}

// ---------------------------------------------------------------------------
// Response shape validation
// ---------------------------------------------------------------------------

function nonnegativeCents(value) {
  if (typeof value !== "string" || value !== value.trim() || !DECIMAL_RE.test(value)) {
    return null;
  }
  const [integer, fraction = ""] = value.split(".");
  return BigInt(integer) * 100n + BigInt(fraction.padEnd(2, "0"));
}

function validateOptionalDecimal(doc, field, errors) {
  if (doc[field] !== undefined && nonnegativeCents(doc[field]) === null) {
    errors.push(`${field}_not_decimal_string`);
  }
}

function validateTokenPlanAnchor(doc, expected, errors) {
  if (expected.tokenPlanType === null) {
    errors.push("expect_token_plan_type_required");
  } else if (doc.type !== expected.tokenPlanType) {
    errors.push("token_plan_type_mismatch");
  }
  if (expected.billingCycle === null) {
    errors.push("expect_billing_cycle_required");
  } else if (doc.billingCycle !== expected.billingCycle) {
    errors.push("billing_cycle_mismatch");
  }
  if (expected.autoRenew === null) {
    errors.push("expect_auto_renew_required");
  } else if (doc.autoRenew !== undefined && doc.autoRenew !== expected.autoRenew) {
    errors.push("auto_renew_mismatch");
  } else if (
    doc.requestedAutoRenew !== undefined &&
    doc.requestedAutoRenew !== expected.autoRenew
  ) {
    errors.push("requested_auto_renew_mismatch");
  }
}

export function validateTokenPlanList(doc, expected) {
  if (!isPlainObject(doc)) return [["token_plan_list_not_a_json_object"], {}];
  const errors = [];
  if (typeof doc.authenticated !== "boolean") errors.push("authenticated_not_boolean");
  if (!TOKEN_PLAN_LIST_EDITIONS.has(doc.edition)) {
    errors.push("edition_invalid");
  }
  if (expected.edition === null) errors.push("expect_edition_required");
  else if (doc.edition !== expected.edition) errors.push("edition_mismatch");
  if (!TOKEN_PLAN_BILLING_CYCLES.has(doc.billingCycle)) {
    errors.push("billing_cycle_invalid");
  }
  if (expected.billingCycle === null) errors.push("expect_billing_cycle_required");
  else if (doc.billingCycle !== expected.billingCycle) errors.push("billing_cycle_mismatch");
  if (!new Set(["complete", "partial", "unknown"]).has(doc.completeness)) {
    errors.push("completeness_invalid");
  }
  if (!Array.isArray(doc.sections)) {
    errors.push("sections_not_array");
  } else {
    const expectedEditions =
      expected.edition === "all"
        ? ["individual", "team"]
        : TOKEN_PLAN_LIST_EDITIONS.has(expected.edition)
          ? [expected.edition]
          : [];
    const actualEditions = doc.sections
      .filter(isPlainObject)
      .map((section) => section.edition)
      .filter((edition) => edition === "individual" || edition === "team");
    if (
      actualEditions.length !== expectedEditions.length ||
      new Set(actualEditions).size !== actualEditions.length ||
      expectedEditions.some((edition) => !actualEditions.includes(edition))
    ) {
      errors.push("sections_edition_set_mismatch");
    }
    for (const [sectionIndex, section] of doc.sections.entries()) {
      if (!isPlainObject(section)) {
        errors.push(`sections_${sectionIndex}_not_object`);
        continue;
      }
      if (!new Set(["individual", "team"]).has(section.edition)) {
        errors.push(`sections_${sectionIndex}_edition_invalid`);
      }
      if (
        section.billingCycleSupported !== null &&
        typeof section.billingCycleSupported !== "boolean"
      ) {
        errors.push(`sections_${sectionIndex}_billing_cycle_supported_invalid`);
      }
      if (!TOKEN_PLAN_SUBSCRIPTION_STATUSES.has(section.subscriptionStatus)) {
        errors.push(`sections_${sectionIndex}_subscription_status_invalid`);
      }
      if (
        section.subscriptionStatus === "active" &&
        section.subscriptionUrl !== TOKEN_PLAN_SUBSCRIPTION_URLS[section.edition]
      ) {
        errors.push(`sections_${sectionIndex}_subscription_url_invalid`);
      }
      if (!Array.isArray(section.rows)) {
        errors.push(`sections_${sectionIndex}_rows_not_array`);
      } else {
        for (const [rowIndex, row] of section.rows.entries()) {
          if (!isPlainObject(row)) {
            errors.push(`sections_${sectionIndex}_rows_${rowIndex}_not_object`);
            continue;
          }
          if (!isNonEmptyString(row.type)) {
            errors.push(`sections_${sectionIndex}_rows_${rowIndex}_type_missing`);
          }
          if (!isNonEmptyString(row.specCode)) {
            errors.push(`sections_${sectionIndex}_rows_${rowIndex}_spec_code_missing`);
          }
          if (row.price !== null && nonnegativeCents(row.price) === null) {
            errors.push(`sections_${sectionIndex}_rows_${rowIndex}_price_invalid`);
          }
          if (row.currency !== null && row.currency !== "CNY") {
            errors.push(`sections_${sectionIndex}_rows_${rowIndex}_currency_invalid`);
          }
          if (row.inventory !== null && typeof row.inventory !== "boolean") {
            errors.push(`sections_${sectionIndex}_rows_${rowIndex}_inventory_invalid`);
          }
          if (
            row.status !== undefined &&
            !new Set(["purchasable", "subscribed", "upgrade", "unavailable", "unknown"]).has(
              row.status,
            )
          ) {
            errors.push(`sections_${sectionIndex}_rows_${rowIndex}_status_invalid`);
          }
        }
      }
      if (!Array.isArray(section.diagnostics)) {
        errors.push(`sections_${sectionIndex}_diagnostics_not_array`);
      }
    }
  }
  return [errors, { catalog: doc.completeness ?? "unknown" }];
}

export function validateTokenPlanPreview(doc, expected) {
  if (!isPlainObject(doc)) return [["token_plan_preview_not_a_json_object"], {}];
  const errors = [];
  validateTokenPlanAnchor(doc, expected, errors);
  if (!new Set(["individual", "team"]).has(doc.edition)) errors.push("edition_invalid");
  const expectedEdition = expected.tokenPlanType === "token_plan_team" ? "team" : "individual";
  if (TOKEN_PLAN_TYPES.has(expected.tokenPlanType) && doc.edition !== expectedEdition) {
    errors.push("edition_mismatch");
  }
  if (doc.currency !== "CNY") errors.push("currency_not_cny");
  for (const field of ["planAmount", "orderAmount", "accountBalance", "maxDeduction"]) {
    if (nonnegativeCents(doc[field]) === null) errors.push(`${field}_not_decimal_string`);
  }
  let availableCouponIds = new Set();
  if (!Array.isArray(doc.availableCoupons)) {
    errors.push("available_coupons_not_array");
  } else {
    for (const [index, coupon] of doc.availableCoupons.entries()) {
      if (
        !isPlainObject(coupon) ||
        !isNonEmptyString(coupon.id) ||
        !isNonEmptyString(coupon.name)
      ) {
        errors.push(`available_coupons_${index}_invalid`);
      }
    }
    availableCouponIds = new Set(
      doc.availableCoupons
        .filter((coupon) => isPlainObject(coupon) && isNonEmptyString(coupon.id))
        .map((coupon) => coupon.id),
    );
  }
  if (!isNonEmptyString(doc.selectedCoupon)) errors.push("selected_coupon_missing");
  if (expected.couponMode === null) {
    errors.push("expect_coupon_mode_required");
  } else if (expected.couponMode === "explicit") {
    if (!isNonEmptyString(expected.couponId)) errors.push("expect_coupon_id_required");
    else if (doc.selectedCoupon !== expected.couponId) errors.push("selected_coupon_mismatch");
  } else if (expected.couponMode === "none") {
    if (doc.selectedCoupon !== TOKEN_PLAN_NO_COUPON_ID) errors.push("selected_coupon_mismatch");
  } else if (
    isNonEmptyString(doc.selectedCoupon) &&
    doc.selectedCoupon !== TOKEN_PLAN_NO_COUPON_ID &&
    !availableCouponIds.has(doc.selectedCoupon)
  ) {
    errors.push("selected_coupon_not_available");
  }
  if (typeof doc.deductionValid !== "boolean") errors.push("deduction_valid_not_boolean");
  if (!TOKEN_PLAN_DEDUCTION_INTENTS.has(doc.deductionIntent)) {
    errors.push("deduction_intent_invalid");
  }
  if (expected.deductionIntent === null) errors.push("expect_deduction_intent_required");
  else if (doc.deductionIntent !== expected.deductionIntent) {
    errors.push("deduction_intent_mismatch");
  }
  if (expected.deductionIntent === "manual" && expected.cashDeduction === null) {
    errors.push("expect_cash_deduction_required");
  }
  if (typeof doc.autoRenew !== "boolean") errors.push("auto_renew_not_boolean");
  if (!isPlainObject(doc.eligibility)) {
    errors.push("eligibility_not_object");
  } else {
    if (doc.eligibility.subscriptionCheck !== "passed") {
      errors.push("eligibility_subscription_check_not_passed");
    }
    if (doc.eligibility.inventoryCheck !== "passed") {
      errors.push("eligibility_inventory_check_not_passed");
    }
    if (doc.eligibility.paymentCapability !== "supported") {
      errors.push("eligibility_payment_capability_not_supported");
    }
  }

  if (doc.fundingPlan !== null && !isPlainObject(doc.fundingPlan)) {
    errors.push("funding_plan_invalid");
  } else if (isPlainObject(doc.fundingPlan)) {
    const orderAmount = nonnegativeCents(doc.orderAmount);
    const cashDeduction = nonnegativeCents(doc.fundingPlan.cashDeduction);
    const externalPayable = nonnegativeCents(doc.fundingPlan.externalPayable);
    if (!TOKEN_PLAN_DEDUCTION_INTENTS.has(doc.fundingPlan.deductionIntent)) {
      errors.push("funding_plan_deduction_intent_invalid");
    } else if (doc.fundingPlan.deductionIntent !== doc.deductionIntent) {
      errors.push("funding_plan_deduction_intent_mismatch");
    }
    if (doc.fundingPlan.paymentMode !== "cash_alipay") {
      errors.push("funding_plan_payment_mode_invalid");
    }
    if (cashDeduction === null) errors.push("funding_plan_cash_deduction_invalid");
    if (externalPayable === null) errors.push("funding_plan_external_payable_invalid");
    if (
      expected.deductionIntent === "manual" &&
      expected.cashDeduction !== null &&
      cashDeduction !== nonnegativeCents(expected.cashDeduction)
    ) {
      errors.push("funding_plan_cash_deduction_mismatch");
    }
    if (expected.deductionIntent === "none" && cashDeduction !== 0n) {
      errors.push("funding_plan_cash_deduction_not_zero");
    }
    if (
      orderAmount !== null &&
      cashDeduction !== null &&
      externalPayable !== null &&
      cashDeduction + externalPayable !== orderAmount
    ) {
      errors.push("funding_plan_amount_mismatch");
    }
  }

  const quoteUsable =
    errors.length === 0 && doc.deductionValid === true && isPlainObject(doc.fundingPlan);
  return [errors, { quote_usable: quoteUsable }];
}

export function validateTokenPlanPurchase(doc, expected) {
  if (!isPlainObject(doc)) return [["token_plan_purchase_not_a_json_object"], {}];
  const errors = [];
  validateTokenPlanAnchor(doc, expected, errors);
  if (expected.orderAmount === null) errors.push("expect_order_amount_required");
  if (expected.cashDeduction === null) errors.push("expect_cash_deduction_required");
  if (expected.externalPayable === null) errors.push("expect_external_payable_required");
  if (!new Set(["preflight", "create", "payment"]).has(doc.stage)) {
    errors.push("stage_invalid");
  }
  if (!TOKEN_PLAN_PURCHASE_STATUSES.has(doc.status)) errors.push("status_invalid");
  if (typeof doc.requestedAutoRenew !== "boolean") {
    errors.push("requested_auto_renew_not_boolean");
  }
  if (!new Set(["enabled", "disabled", "unknown"]).has(doc.autoRenewStatus)) {
    errors.push("auto_renew_status_invalid");
  }
  if (!new Set(["not_checked", "pending", "visible"]).has(doc.activationStatus)) {
    errors.push("activation_status_invalid");
  }
  if (doc.amount !== null && nonnegativeCents(doc.amount) === null) {
    errors.push("amount_not_decimal_string");
  }
  if (doc.currency !== null && doc.currency !== "CNY") errors.push("currency_invalid");
  if (doc.paymentOrderId !== null && !isTokenPlanOrderId(doc.paymentOrderId)) {
    errors.push("payment_order_id_invalid");
  }
  if (
    doc.orderIds !== null &&
    (!Array.isArray(doc.orderIds) || !doc.orderIds.every(isTokenPlanOrderId))
  ) {
    errors.push("order_ids_invalid");
  }
  for (const field of ["cashDeduction", "externalPayable", "settledAmount"]) {
    validateOptionalDecimal(doc, field, errors);
  }
  if (doc.paymentMode !== undefined && doc.paymentMode !== "cash_alipay") {
    errors.push("payment_mode_invalid");
  }
  if (doc.paymentAttempted !== undefined && typeof doc.paymentAttempted !== "boolean") {
    errors.push("payment_attempted_not_boolean");
  }
  const urlError =
    doc.paymentUrl === undefined || doc.paymentUrl === null
      ? null
      : paymentUrlError(doc.paymentUrl);
  if (urlError !== null) errors.push(urlError);

  const orderCreated = isTokenPlanOrderId(doc.paymentOrderId);
  if (orderCreated) {
    if (nonnegativeCents(doc.amount) === null) errors.push("created_order_amount_missing");
    if (doc.currency !== "CNY") errors.push("created_order_currency_invalid");
    if (!Array.isArray(doc.orderIds) || doc.orderIds.length === 0) {
      errors.push("created_order_ids_missing");
    } else {
      if (new Set(doc.orderIds).size !== doc.orderIds.length) {
        errors.push("order_ids_not_unique");
      }
      if (!doc.orderIds.includes(doc.paymentOrderId)) {
        errors.push("payment_order_id_not_in_order_ids");
      }
    }
    if (
      expected.orderAmount !== null &&
      nonnegativeCents(doc.amount) !== nonnegativeCents(expected.orderAmount)
    ) {
      errors.push("order_amount_mismatch");
    }
  }

  const baseAmount = nonnegativeCents(doc.settledAmount ?? doc.amount);
  const cashDeduction = nonnegativeCents(doc.cashDeduction);
  const externalPayable = nonnegativeCents(doc.externalPayable);
  const expectedOrderAmount = nonnegativeCents(expected.orderAmount);
  const expectedCashDeduction = nonnegativeCents(expected.cashDeduction);
  const expectedExternalPayable = nonnegativeCents(expected.externalPayable);
  if (
    doc.settledAmount !== undefined &&
    baseAmount !== null &&
    expectedOrderAmount !== null &&
    baseAmount !== expectedOrderAmount
  ) {
    errors.push("settled_amount_mismatch");
  }
  const requiresSettlementProof =
    orderCreated && (doc.status === "pending" || doc.status === "succeeded");
  if (requiresSettlementProof) {
    if (doc.paymentMode === undefined) errors.push("settlement_payment_mode_missing");
    if (doc.cashDeduction === undefined) errors.push("settlement_cash_deduction_missing");
    if (doc.externalPayable === undefined) errors.push("settlement_external_payable_missing");
    if (cashDeduction !== null && cashDeduction !== expectedCashDeduction) {
      errors.push("cash_deduction_mismatch");
    }
    if (externalPayable !== null && externalPayable !== expectedExternalPayable) {
      errors.push("external_payable_mismatch");
    }
  }
  if (
    baseAmount !== null &&
    cashDeduction !== null &&
    externalPayable !== null &&
    cashDeduction + externalPayable !== baseAmount
  ) {
    errors.push("settlement_amount_mismatch");
  }

  let settlementMode = "unconfirmed";
  if (
    errors.length === 0 &&
    orderCreated &&
    doc.stage === "payment" &&
    doc.status === "pending" &&
    externalPayable !== null &&
    externalPayable > 0n &&
    urlError === null &&
    isNonEmptyString(doc.paymentUrl)
  ) {
    settlementMode = "alipay_required";
  } else if (
    errors.length === 0 &&
    orderCreated &&
    doc.stage === "payment" &&
    doc.status === "succeeded" &&
    externalPayable === 0n &&
    (doc.paymentUrl === undefined || doc.paymentUrl === null)
  ) {
    settlementMode = "internal";
  }

  if (externalPayable === 0n && isNonEmptyString(doc.paymentUrl)) {
    errors.push("payment_url_unexpected_for_internal_settlement");
    settlementMode = "unconfirmed";
  }
  if (
    doc.status === "pending" &&
    externalPayable !== null &&
    externalPayable > 0n &&
    !isNonEmptyString(doc.paymentUrl)
  ) {
    errors.push("payment_url_required_for_alipay_handoff");
    settlementMode = "unconfirmed";
  }

  return [errors, { order_created: orderCreated, settlement_mode: settlementMode }];
}

/**
 * Return only the validated transaction fields required by later payment steps.
 * Raw command responses may contain unrelated or sensitive fields and must not
 * become part of the validator contract.
 */
function projectValidatedTransaction(shape, doc, errors, classification) {
  if (errors.length > 0) return null;

  if (
    shape === "token-plan-purchase" &&
    classification.order_created === true &&
    new Set(["alipay_required", "internal"]).has(classification.settlement_mode)
  ) {
    return {
      paymentOrderId: doc.paymentOrderId,
      orderIds: [...doc.orderIds],
      type: doc.type,
      billingCycle: doc.billingCycle,
      requestedAutoRenew: doc.requestedAutoRenew,
      amount: doc.amount,
      currency: doc.currency,
      cashDeduction: doc.cashDeduction,
      externalPayable: doc.externalPayable,
      ...(classification.settlement_mode === "alipay_required"
        ? { paymentUrl: doc.paymentUrl }
        : {}),
    };
  }

  return null;
}

/**
 * Preserve only the identity needed to recover an already-created Token Plan
 * order. This projection is intentionally independent from settlement
 * validation: an incomplete or contradictory settlement response may still
 * carry trustworthy order anchors, but it must never leak a payment URL or
 * amount into recovery state.
 */
function projectValidatedTokenPlanOrderContext(
  shape,
  doc,
  expected,
  classification,
) {
  if (
    shape !== "token-plan-purchase" ||
    !isPlainObject(doc) ||
    classification.order_created !== true ||
    (doc.stage !== "create" && doc.stage !== "payment") ||
    !isTokenPlanOrderId(doc.paymentOrderId) ||
    !Array.isArray(doc.orderIds) ||
    doc.orderIds.length === 0 ||
    !doc.orderIds.every(isTokenPlanOrderId) ||
    new Set(doc.orderIds).size !== doc.orderIds.length ||
    !doc.orderIds.includes(doc.paymentOrderId) ||
    expected.tokenPlanType === null ||
    doc.type !== expected.tokenPlanType ||
    expected.billingCycle === null ||
    doc.billingCycle !== expected.billingCycle ||
    expected.autoRenew === null ||
    typeof doc.requestedAutoRenew !== "boolean" ||
    doc.requestedAutoRenew !== expected.autoRenew ||
    (doc.autoRenew !== undefined && doc.autoRenew !== expected.autoRenew)
  ) {
    return null;
  }

  return {
    paymentOrderId: doc.paymentOrderId,
    orderIds: [...doc.orderIds],
    type: doc.type,
    billingCycle: doc.billingCycle,
    requestedAutoRenew: doc.requestedAutoRenew,
  };
}

function validateTokenPlanEditionStatus(section, edition, errors) {
  if (!isPlainObject(section)) return;
  if (section.edition !== edition) errors.push(`${edition}_edition_mismatch`);
  if (!TOKEN_PLAN_SUBSCRIPTION_STATUSES.has(section.status)) {
    errors.push(`${edition}_status_invalid`);
  }
  if (section.type !== null && section.type !== undefined && !isNonEmptyString(section.type)) {
    errors.push(`${edition}_type_invalid`);
  }
  if (
    section.billingCycle !== null &&
    section.billingCycle !== undefined &&
    !isNonEmptyString(section.billingCycle)
  ) {
    errors.push(`${edition}_billing_cycle_invalid`);
  }
  if (!Array.isArray(section.diagnostics)) errors.push(`${edition}_diagnostics_not_array`);
  if (section.seatSummary !== null && section.seatSummary !== undefined) {
    if (!isPlainObject(section.seatSummary) || !Array.isArray(section.seatSummary.groups)) {
      errors.push(`${edition}_seat_summary_invalid`);
    } else {
      const seenSpecTypes = new Set();
      for (const [index, group] of section.seatSummary.groups.entries()) {
        if (
          !isPlainObject(group) ||
          !isNonEmptyString(group.specType) ||
          (group.seats !== null && (!Number.isInteger(group.seats) || group.seats < 0))
        ) {
          errors.push(`${edition}_seat_group_${index}_invalid`);
          continue;
        }
        if (seenSpecTypes.has(group.specType)) {
          errors.push(`${edition}_seat_group_${index}_duplicate_spec_type`);
        }
        seenSpecTypes.add(group.specType);
      }
    }
  }
}

export function validateTokenPlanStatus(doc, expected) {
  if (!isPlainObject(doc)) return [["token_plan_status_not_a_json_object"], {}];
  const errors = [];
  if (!isNonEmptyString(expected.tokenPlanType)) errors.push("expect_token_plan_type_required");
  if (!isNonEmptyString(expected.billingCycle)) errors.push("expect_billing_cycle_required");
  if (doc.individual !== undefined) {
    validateTokenPlanEditionStatus(doc.individual, "individual", errors);
  }
  if (doc.team !== undefined) validateTokenPlanEditionStatus(doc.team, "team", errors);
  if (!Array.isArray(doc.diagnostics)) errors.push("diagnostics_not_array");

  const expectedEdition = expected.tokenPlanType === "token_plan_team" ? "team" : "individual";
  const section = doc[expectedEdition];
  let activation = "unconfirmed";
  if (isPlainObject(section)) {
    if (section.status === "not_subscribed") {
      activation = "not_visible";
    } else if (section.status === "active") {
      let mismatch = false;
      let incomplete = false;
      if (section.type === null || section.type === undefined) incomplete = true;
      else if (section.type !== expected.tokenPlanType) mismatch = true;
      if (
        section.billingCycle !== null &&
        section.billingCycle !== undefined &&
        section.billingCycle !== expected.billingCycle
      ) {
        mismatch = true;
      }

      const expectedSeatEntries = Object.entries(expected.teamSeats).filter(
        ([, count]) => count > 0,
      );
      if (expectedEdition === "team") {
        if (expectedSeatEntries.length === 0) {
          errors.push("expect_team_seat_count_required");
        } else if (!isPlainObject(section.seatSummary)) {
          incomplete = true;
        } else if (Array.isArray(section.seatSummary.groups)) {
          const unknownSeatTypes = new Set(
            section.seatSummary.groups
              .filter((group) => isPlainObject(group) && group.seats === null)
              .map((group) => group.specType),
          );
          if (
            unknownSeatTypes.size > 0 ||
            section.seatSummary.groups.some((group) => !isPlainObject(group))
          ) {
            incomplete = true;
          }
          const actualSeats = new Map(
            section.seatSummary.groups
              .filter((group) => isPlainObject(group) && Number.isInteger(group.seats))
              .map((group) => [group.specType, group.seats]),
          );
          for (const [specType, count] of expectedSeatEntries) {
            if (!unknownSeatTypes.has(specType) && actualSeats.get(specType) !== count) {
              mismatch = true;
            }
          }
          for (const [specType, count] of actualSeats) {
            if (count > 0 && (expected.teamSeats[specType] ?? 0) !== count) mismatch = true;
          }
        } else {
          incomplete = true;
        }
      } else if (expectedSeatEntries.length > 0) {
        errors.push("team_seat_count_unexpected_for_individual");
      }
      activation = mismatch ? "mismatched" : incomplete ? "unconfirmed" : "visible";
    }
  }
  if (errors.length > 0) activation = "unconfirmed";
  return [errors, { activation }];
}

// ---------------------------------------------------------------------------
// Route preflight
// ---------------------------------------------------------------------------

export function runRoute(route) {
  const checks = [probeQianwenCli(MIN_QIANWEN_CLI_VERSION)];
  let paymentPath;
  if (route === "token-plan-purchase") {
    const signalCheck = probeAlipayCli();
    const submitCheck = probeAlipaySubmitPayment();
    checks.push(signalCheck, submitCheck);
    if (submitCheck.status === "pass") {
      paymentPath = signalCheck.status === "pass" ? "direct" : "alipay-payment-skill";
    }
  }
  return {
    route,
    cli_command: ROUTE_CLI_COMMAND[route],
    checks,
    ...(paymentPath === undefined ? {} : { payment_path: paymentPath }),
    gaps: checks.filter((check) => check.status === "gap"),
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const USAGE = `usage: tokenplan-preflight.mjs --route ROUTE
       tokenplan-preflight.mjs --validate SHAPE [validation anchors] [--input FILE]

Read-only preflight and response validation for the Token Plan domain

  --route ROUTE        Probe only the dependencies this Token Plan command needs
  --validate SHAPE     Validate JSON from stdin or --input
  --expect-token-plan-type TYPE
  --expect-edition EDITION
  --expect-billing-cycle CYCLE
  --expect-auto-renew BOOL
  --expect-order-amount AMOUNT
  --expect-coupon-mode MODE
  --expect-coupon-id ID
  --expect-deduction-intent INTENT
  --expect-cash-deduction AMOUNT
  --expect-external-payable AMOUNT
  --expect-payment-order-id ID
  --expect-order-ids ID[,ID...]
  --expect-page-size N
  --expect-standard-seat-count N
  --expect-pro-seat-count N
  --expect-max-seat-count N
  --input FILE
  -h, --help

ROUTE: ${Object.keys(ROUTE_CLI_COMMAND).sort().join(", ")}
SHAPE: ${[...VALIDATION_SHAPES].sort().join(", ")}

Exit codes:
  0  All script-owned blocking checks passed; external Skill registry gate excluded
  1  Blocking dependency gap, anchor mismatch, or response validation failure
  2  Usage or internal error
`;

function usageError(message) {
  process.stderr.write(`${USAGE}\ntokenplan-preflight.mjs: error: ${message}\n`);
  process.exit(2);
}

const CLI_VALUE_OPTIONS = `route validate expect-token-plan-type expect-edition
expect-billing-cycle expect-auto-renew expect-order-amount expect-coupon-mode
expect-coupon-id expect-deduction-intent expect-cash-deduction
expect-external-payable expect-payment-order-id expect-order-ids expect-page-size
expect-standard-seat-count
expect-pro-seat-count expect-max-seat-count input`.split(/\s+/);
const toCamelCase = (value) => value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

function validateChoice(options, key, flag, choices) {
  const value = options[key];
  if (value !== null && !choices.has(value)) {
    usageError(`argument ${flag}: invalid value '${value}'`);
  }
}

function parseArgv(argv) {
  let values;
  try {
    ({ values } = parseNodeArgs({
      args: argv,
      options: {
        ...Object.fromEntries(
          CLI_VALUE_OPTIONS.map((name) => [name, { type: "string" }]),
        ),
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

  const options = Object.fromEntries(
    CLI_VALUE_OPTIONS.map((name) => [toCamelCase(name), values[name] ?? null]),
  );

  if (options.route !== null && !Object.hasOwn(ROUTE_CLI_COMMAND, options.route)) {
    usageError(`argument --route: invalid choice: '${options.route}'`);
  }
  if (options.validate !== null && !VALIDATION_SHAPES.has(options.validate)) {
    usageError(`argument --validate: invalid choice: '${options.validate}'`);
  }
  validateChoice(options, "expectTokenPlanType", "--expect-token-plan-type", TOKEN_PLAN_TYPES);
  validateChoice(options, "expectEdition", "--expect-edition", TOKEN_PLAN_LIST_EDITIONS);
  validateChoice(
    options,
    "expectBillingCycle",
    "--expect-billing-cycle",
    TOKEN_PLAN_BILLING_CYCLES,
  );
  if (options.expectAutoRenew !== null) {
    if (options.expectAutoRenew !== "true" && options.expectAutoRenew !== "false") {
      usageError("argument --expect-auto-renew: expected true or false");
    }
    options.expectAutoRenew = options.expectAutoRenew === "true";
  }
  if (options.expectOrderAmount !== null && nonnegativeCents(options.expectOrderAmount) === null) {
    usageError("argument --expect-order-amount: expected a non-negative CNY decimal");
  }
  validateChoice(options, "expectCouponMode", "--expect-coupon-mode", TOKEN_PLAN_COUPON_MODES);
  if (options.expectCouponId !== null && !isNonEmptyString(options.expectCouponId)) {
    usageError("argument --expect-coupon-id: expected a non-empty value");
  }
  validateChoice(
    options,
    "expectDeductionIntent",
    "--expect-deduction-intent",
    TOKEN_PLAN_DEDUCTION_INTENTS,
  );
  for (const [name, value] of [
    ["--expect-cash-deduction", options.expectCashDeduction],
    ["--expect-external-payable", options.expectExternalPayable],
  ]) {
    if (value !== null && nonnegativeCents(value) === null) {
      usageError(`argument ${name}: expected a non-negative CNY decimal`);
    }
  }
  if (options.expectPaymentOrderId !== null && !isTokenPlanOrderId(options.expectPaymentOrderId)) {
    usageError("argument --expect-payment-order-id: expected a positive decimal order ID");
  }
  if (options.expectOrderIds !== null) {
    const orderIds = options.expectOrderIds.split(",").map((value) => value.trim());
    if (
      orderIds.length === 0 ||
      !orderIds.every(isTokenPlanOrderId) ||
      new Set(orderIds).size !== orderIds.length
    ) {
      usageError("argument --expect-order-ids: expected unique positive decimal order IDs");
    }
    options.expectOrderIds = orderIds;
  }
  if (options.expectPageSize !== null) {
    if (!/^\d+$/.test(options.expectPageSize)) {
      usageError("argument --expect-page-size: expected an integer from 1 to 100");
    }
    options.expectPageSize = Number(options.expectPageSize);
    if (
      !Number.isSafeInteger(options.expectPageSize) ||
      options.expectPageSize < 1 ||
      options.expectPageSize > 100
    ) {
      usageError("argument --expect-page-size: expected an integer from 1 to 100");
    }
  }
  for (const key of ["expectStandardSeatCount", "expectProSeatCount", "expectMaxSeatCount"]) {
    if (options[key] === null) continue;
    if (!/^\d+$/.test(options[key])) {
      usageError(`argument --${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}: expected a non-negative integer`);
    }
    const count = Number(options[key]);
    if (!Number.isSafeInteger(count)) {
      usageError(`argument --${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}: value is too large`);
    }
    options[key] = count;
  }
  return options;
}

async function readInput(inputPath) {
  // readFileSync(0) hangs when stdin is a TTY with no piped data; bail early.
  if (inputPath === null && process.stdin.isTTY) {
    usageError("--validate requires JSON input. Pipe CLI output or pass --input <file>");
  }
  try {
    let text;
    if (inputPath !== null) {
      text = await fs.promises.readFile(inputPath, "utf8");
    } else {
      const chunks = [];
      let size = 0;
      for await (const chunk of process.stdin) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += buffer.length;
        if (size > MAX_INPUT_BYTES) throw new Error("input exceeds 4 MiB");
        chunks.push(buffer);
      }
      text = Buffer.concat(chunks, size).toString("utf8");
    }
    if (Buffer.byteLength(text, "utf8") > MAX_INPUT_BYTES) {
      throw new Error("input exceeds 4 MiB");
    }
    return { ok: true, doc: singleJson(text) };
  } catch (err) {
    process.stderr.write(`Error: cannot read input: ${err.message}\n`);
    return { ok: false, doc: null };
  }
}

async function main() {
  const args = parseArgv(process.argv.slice(2));
  if (args.route === null && args.validate === null) {
    usageError("provide at least one of --route or --validate");
  }
  const report = { ok: true };
  let inputReadFailed = false;
  if (args.route !== null) {
    Object.assign(report, runRoute(args.route));
    if (report.gaps.length > 0) report.ok = false;
  }
  if (args.validate !== null) {
    const input = await readInput(args.input);
    const doc = input.doc;
    inputReadFailed = !input.ok;
    if (doc === null) {
      report.ok = false;
      report.validation = {
        shape: args.validate,
        cli_command: ROUTE_CLI_COMMAND[args.validate],
        errors: ["payload_not_single_json_document"],
      };
    } else {
      const expected = {
        tokenPlanType: args.expectTokenPlanType,
        edition: args.expectEdition,
        billingCycle: args.expectBillingCycle,
        autoRenew: args.expectAutoRenew,
        orderAmount: args.expectOrderAmount,
        couponMode: args.expectCouponMode,
        couponId: args.expectCouponId,
        deductionIntent: args.expectDeductionIntent,
        cashDeduction: args.expectCashDeduction,
        externalPayable: args.expectExternalPayable,
        paymentOrderId: args.expectPaymentOrderId,
        orderIds: args.expectOrderIds,
        pageSize: args.expectPageSize,
        teamSeats: {
          standard: args.expectStandardSeatCount ?? 0,
          pro: args.expectProSeatCount ?? 0,
          max: args.expectMaxSeatCount ?? 0,
        },
      };
      const [errors, classification] = VALIDATORS[args.validate](doc, expected);
      report.validation = {
        shape: args.validate,
        cli_command: ROUTE_CLI_COMMAND[args.validate],
        errors,
        ...(Object.keys(classification).length > 0 ? { classification } : {}),
      };
      const validated = projectValidatedTransaction(args.validate, doc, errors, classification);
      if (validated !== null && report.ok) report.validated = validated;
      const validatedOrderContext = projectValidatedTokenPlanOrderContext(
        args.validate,
        doc,
        {
          tokenPlanType: args.expectTokenPlanType,
          billingCycle: args.expectBillingCycle,
          autoRenew: args.expectAutoRenew,
        },
        classification,
      );
      if (validatedOrderContext !== null) report.validatedOrderContext = validatedOrderContext;
      if (errors.length > 0) report.ok = false;
    }
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  return inputReadFailed ? 2 : report.ok ? 0 : 1;
}

process.on("SIGINT", () => {
  process.stderr.write("Interrupted.\n");
  process.exit(2);
});

process.exitCode = await main();
