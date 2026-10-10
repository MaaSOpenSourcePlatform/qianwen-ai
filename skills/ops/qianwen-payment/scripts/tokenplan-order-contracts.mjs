/** Shared Token Plan payment-result and retained-order history contracts. */

const TOKEN_PLAN_PAYMENT_STATUSES = new Set([
  "succeeded",
  "pending",
  "failed",
  "cancelled",
  "unknown",
  "timed_out",
]);
const ORDER_ID_RE = /^[1-9]\d*$/;
const ORDER_STATUSES = new Set(["Paid", "Unpaid", "Canceled"]);
const MAX_ORDER_PAGE_SIZE = 100;

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isOrderId(value) {
  return typeof value === "string" && ORDER_ID_RE.test(value);
}

/**
 * Validate one Token Plan payment-result payload against the retained order.
 *
 * @param {unknown} doc parsed CLI JSON payload
 * @param {string | null} expectedPaymentOrderId retained payment order ID
 * @returns {[string[], {payment?: string, sourceStatus?: string}]}
 */
export function validateTokenPlanPaymentResult(doc, expectedPaymentOrderId) {
  if (!isPlainObject(doc))
    return [["token_plan_payment_result_not_a_json_object"], {}];
  const errors = [];
  if (!isOrderId(expectedPaymentOrderId)) {
    errors.push("expect_payment_order_id_required");
  }
  if (!isOrderId(doc.orderId)) {
    errors.push("order_id_missing");
  } else if (
    isOrderId(expectedPaymentOrderId) &&
    doc.orderId !== expectedPaymentOrderId
  ) {
    errors.push("payment_order_id_mismatch");
  }
  if (!TOKEN_PLAN_PAYMENT_STATUSES.has(doc.status))
    errors.push("status_invalid");
  if (doc.reason !== undefined && typeof doc.reason !== "string")
    errors.push("reason_invalid");
  if (
    doc.payStatusCode !== undefined &&
    typeof doc.payStatusCode !== "string"
  ) {
    errors.push("pay_status_code_invalid");
  }
  if (doc.status === "succeeded") {
    if (doc.reason !== undefined) errors.push("succeeded_reason_unexpected");
    if (doc.payStatusCode !== "1") {
      errors.push("succeeded_pay_status_code_invalid");
    }
  } else if (doc.status === "pending") {
    if (doc.reason !== undefined) errors.push("pending_reason_unexpected");
    if (doc.payStatusCode !== "0") {
      errors.push("pending_pay_status_code_invalid");
    }
  } else if (doc.status === "failed") {
    if (doc.reason !== "payment_failed") errors.push("failed_reason_invalid");
    if (doc.payStatusCode !== undefined && doc.payStatusCode !== "0") {
      errors.push("failed_pay_status_code_invalid");
    }
  } else if (doc.status === "cancelled") {
    if (doc.reason !== "order_cancelled") {
      errors.push("cancelled_reason_invalid");
    }
    if (doc.payStatusCode !== undefined) {
      errors.push("cancelled_pay_status_code_unexpected");
    }
  } else if (doc.status === "unknown") {
    if (
      !new Set(["protocol_error", "payment_unconfirmed", "interrupted"]).has(
        doc.reason,
      )
    ) {
      errors.push("unknown_reason_invalid");
    }
    if (
      doc.payStatusCode !== undefined &&
      doc.payStatusCode !== "0" &&
      doc.payStatusCode !== "1"
    ) {
      errors.push("unknown_pay_status_code_invalid");
    }
  } else if (doc.status === "timed_out") {
    if (doc.reason !== "payment_wait_expired")
      errors.push("timed_out_reason_invalid");
    if (doc.payStatusCode !== undefined)
      errors.push("timed_out_pay_status_code_unexpected");
  }
  const payment =
    errors.length > 0
      ? "unconfirmed"
      : doc.status === "succeeded"
        ? "payment_succeeded"
        : doc.status === "failed"
          ? "payment_failed"
          : doc.status === "pending"
            ? "processing"
            : "unconfirmed";
  return [
    errors,
    {
      payment,
      ...(errors.length === 0 ? { sourceStatus: doc.status } : {}),
    },
  ];
}

/**
 * Validate the latest purchase-order page and classify the complete retained
 * order set. A partial match never proves cancellation or permits repurchase.
 *
 * @param {unknown} doc parsed CLI JSON payload
 * @param {string[] | null} expectedOrderIds retained complete order ID set
 * @param {number | null} expectedPageSize requested order-history page size
 * @returns {[string[], {history: string}]}
 */
export function validateTokenPlanOrders(doc, expectedOrderIds, expectedPageSize) {
  if (!isPlainObject(doc)) {
    return [["token_plan_orders_not_a_json_object"], { history: "unconfirmed" }];
  }
  if (
    !Array.isArray(expectedOrderIds) ||
    expectedOrderIds.length === 0 ||
    !expectedOrderIds.every(isOrderId) ||
    new Set(expectedOrderIds).size !== expectedOrderIds.length
  ) {
    return [["expect_order_ids_required"], { history: "unconfirmed" }];
  }
  if (
    !Number.isSafeInteger(expectedPageSize) ||
    expectedPageSize < 1 ||
    expectedPageSize > MAX_ORDER_PAGE_SIZE
  ) {
    return [["expect_page_size_required"], { history: "unconfirmed" }];
  }

  const errors = [];
  const { orders, pagination, diagnostics } = doc;
  if (!Array.isArray(orders)) errors.push("orders_not_array");
  if (!Array.isArray(diagnostics) || diagnostics.length > 0) {
    errors.push("diagnostics_invalid");
  }
  if (
    !isPlainObject(pagination) ||
    pagination.page !== 1 ||
    pagination.pageSize !== expectedPageSize ||
    !Number.isSafeInteger(pagination.total) ||
    pagination.total < 0
  ) {
    errors.push("pagination_invalid");
  }

  const rows = Array.isArray(orders) ? orders : [];
  if (rows.length > expectedPageSize) errors.push("orders_exceed_page_size");
  if (
    isPlainObject(pagination) &&
    Number.isSafeInteger(pagination.total) &&
    (pagination.total < rows.length ||
      (pagination.total > rows.length && rows.length !== expectedPageSize))
  ) {
    errors.push("page_incomplete");
  }

  const expected = new Set(expectedOrderIds);
  const seen = new Set();
  const matched = [];
  for (const [index, order] of rows.entries()) {
    if (!isPlainObject(order) || !isOrderId(order.orderId)) {
      errors.push(`orders_${index}_invalid`);
      continue;
    }
    if (seen.has(order.orderId)) {
      errors.push(`orders_${index}_duplicate`);
      continue;
    }
    seen.add(order.orderId);
    if (!expected.has(order.orderId)) continue;
    if (order.orderType !== "Purchase" || !ORDER_STATUSES.has(order.status)) {
      errors.push(`orders_${index}_match_invalid`);
      continue;
    }
    matched.push(order.status);
  }

  if (errors.length > 0) return [errors, { history: "unconfirmed" }];

  let history = "unconfirmed";
  if (matched.length === 0) {
    history = "not_found";
    errors.push("order_ids_not_found");
  } else if (matched.length !== expectedOrderIds.length) {
    errors.push("order_ids_partial_match");
  } else {
    const statuses = new Set(matched);
    history =
      statuses.size !== 1
        ? "mixed"
        : {
            Paid: "all_paid",
            Unpaid: "all_unpaid",
            Canceled: "all_canceled",
          }[[...statuses][0]];
  }
  return [errors, { history }];
}
