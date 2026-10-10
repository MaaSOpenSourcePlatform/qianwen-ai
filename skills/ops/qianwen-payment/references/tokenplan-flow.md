# Token Plan Workflow

## Execution Constraints

- All Token Plan routes and scripts require Node 18.18+.
- When running in a sandboxed or isolated environment, explain any insufficient environment permissions to the user and request the corresponding permissions. Do not treat permission issues as a default failure or a workflow blocker.
- Use structured arguments when invoking the CLI. Do not concatenate package configurations, order IDs, payment links, or user text into shell commands.
- Always use `--format json` for QianWen CLI business commands, and treat stderr only as diagnostic information. Even if a command exits with a nonzero code, pass its stdout to the corresponding validator whenever stdout contains structured JSON so that the validator can determine the business status.
- Validated CLI responses are the sole source of truth for package, price, eligibility, settlement, payment, and activation status. Treat missing, conflicting, or incomplete information as unknown.
- Base every Token Plan order-status determination on the validated result of `qianwen subscription orders --type purchase`. `payment-result` represents only the payment-channel result and cannot, by itself, prove that an order has been paid, remains unpaid, or has been canceled.
- Respond to user follow the language of the user's latest substantive message.

## Workflow

1. Confirm the user's scenario: whether the user wants to view a Token Plan quote, purchase a Token Plan, or continue handling a Token Plan order already created in the current flow.
   - If the user only wants to view the subscription status of an existing Token Plan, query it with `qianwen subscription tokenplan status --format json`.
   - If the user wants to view usage, billing, or similar information, hand the request off to `qianwen-usage`.
   - If the user wants to view the payment result for the current purchase order, have the payment materials displayed again, or confirm the post-purchase activation status, continue using the order information retained in this flow.
   - This workflow handles only Token Plan quotes, new purchases, and follow-up handling for the current purchase order. For renewals, upgrades, or add-on purchases, direct the user to the console at <https://platform.qianwenai.com/home/analytics/token-plan/individual>.

2. Based on the user's current stage, use the Token Plan-specific `tokenplan-preflight.mjs` script to check prerequisites. Token Plan and Recharge scripts, validators, pollers, and recovery states must not be mixed.
   - When viewing Token Plan quotes, run:

     ```text
     node <skill-dir>/scripts/tokenplan-preflight.mjs --route token-plan-list
     ```

   - Before entering the Token Plan purchase quote stage, run:

     ```text
     node <skill-dir>/scripts/tokenplan-preflight.mjs --route token-plan-preview
     ```

   - At these two stages, check only the QianWen CLI. Do not require the Alipay CLI or `alipay-payment-skill` to be installed in advance.
   - Only when a validated Preview result has `fundingPlan.externalPayable > 0`, run:

     ```text
     node <skill-dir>/scripts/tokenplan-preflight.mjs --route token-plan-purchase
     ```

     Also confirm that `alipay-payment-skill` is installed and loadable in the host environment. Even if the prerequisite check selects the `direct` path, both the Alipay CLI and the payment Skill must be available.
   - If `externalPayable=0`, the order will be settled internally through the balance or another method. Do not check Alipay dependencies or enter the Alipay flow.
   - If a dependency is not installed, provide the corresponding installation command and ask the user for authorization before installing it. The user may also choose to install it manually. Authorization to install does not constitute authorization to create an order.
     - QianWen CLI installation command: `npm install -g @qianwenai/qianwen-cli@latest`
     - Alipay CLI and payment Skill installation command: `npx -y @alipay/agent-payment@latest install`
   - If the user declines installation or the dependency remains unavailable, stop the corresponding command and tell the user to complete the operation themselves at <https://platform.qianwenai.com/pricing/token-plan>.
   - Exit codes for `tokenplan-preflight.mjs`: `0` means the checks owned by the script passed, `1` means a dependency is missing or response validation failed, and `2` means an invocation or internal script error occurred. Whether the external `alipay-payment-skill` is loadable must still be confirmed separately.

3. Follow these steps for a Token Plan quote:
   - If the user has not specified a Token Plan type, run the following command to retrieve quote information for both Individual and Team Token Plans:

     ```text
     qianwen subscription tokenplan list --format json
     ```

   - If the user specifies a Token Plan edition or billing cycle, use `--edition` and `--billing-cycle`, respectively:

     ```text
     qianwen subscription tokenplan list \
       [--edition <all|individual|team>] \
       [--billing-cycle <monthly|quarterly|yearly>] \
       --format json
     ```

   - `--edition` accepts only `all`, `individual`, or `team`; it does not accept a specific Token Plan plan identifier (`type`). If the user specifies a concrete package type, first query by its edition and billing cycle, then precisely match the corresponding plan identifier (`type`) in the validated response.
   - Individual supports `monthly`, `quarterly`, and `yearly`; Team supports `monthly` and `yearly`, but not `quarterly`.
   - Pass the command's stdout JSON to the validator along with the edition and billing cycle that actually took effect:

     ```text
     node <skill-dir>/scripts/tokenplan-preflight.mjs --validate token-plan-list \
       --expect-edition <all|individual|team> \
       --expect-billing-cycle <monthly|quarterly|yearly>
     ```

   - Summarize only fields that passed validation and are actually present in the response, including the package name, plan identifier (`type`), Team `seatType`, price, quota, inventory or purchase availability, subscription status, and diagnostic information.
   - If the response returns `subscriptionStatus=active`, the user is already subscribed to the corresponding edition. Stop the new purchase and display only the `subscriptionUrl` management link returned in the response.
   - If the response returns `status=unavailable`, this means only that the current package or configuration cannot be purchased. Explain a specific reason only if the response also provides one.
   - Treat missing or `unknown` price, status, and inventory information as unknown. Do not fill in zeroes, infer values, or describe the package as purchasable.
   - During quote lookup, do not collect purchase configuration, ask about coupons, or create an order.

4. Follow these steps to purchase a Token Plan:
   - First use the `token-plan-preview` route to complete the QianWen CLI prerequisite check, then use the following command to check whether the user is logged in:

     ```text
     qianwen auth status --format json
     ```

   - Consider the logged-in account usable only when `authenticated=true`, `server_verified=true`, and `user.aliyunId` is nonempty. Retain the complete account identifier only within the current flow and show the user only a masked identifier.
   - If the user is not logged in, first run the following command to obtain a read-only authentication link:

     ```text
     qianwen auth login --init-only --format json
     ```

     Prompt the user to open the original `verification_url` from the response and complete CLI login authentication. Do not construct or rewrite the link, and do not ask the user to provide credentials or a token. After the user reports that they have logged in, run:

     ```text
     qianwen auth login --complete --format json
     ```

     Confirm that login is complete and ensure subsequent commands use the same credential storage, network, sandbox, and permission context.

   - If a subsequent read-only command returns `AUTH_REQUIRED` or exit code `2`, first compare its credential storage, network, sandbox, and permission context with the context in which the account was verified. Retry that read-only command once only if the same `user.aliyunId` can be reconfirmed in the same context; otherwise, repeat the device login flow if the user remains logged out. This recovery must not be used for order creation, Alipay commands, or restarting a long poll.

   - Ensure that the user has provided the Token Plan type to purchase, the billing cycle, and whether to enable automatic renewal. Automatic renewal has no default and must be explicitly selected by the user.
   - If the user is purchasing the Team edition, additionally confirm the seat types and quantities to purchase:
     - Standard seat(标准席位): Catalog `seatType=standard`, Status `specType=standard`, and purchase argument `--standard-seat-count`.
     - Pro seat(高级席位): Catalog `seatType=pro`, Status `specType=pro`, and purchase argument `--pro-seat-count`.
     - Max seat(尊享席位): Catalog `seatType=max`, Status `specType=max`, and purchase argument `--max-seat-count`.
   - Before the first quote, retrieve and validate the Token Plan catalog for the current edition and billing cycle to confirm the package display name, plan identifier (`type`), and Team `seatType`. Catalog prices cannot replace the final purchase quote.
   - Do not proactively ask about coupons before the first quote. Balance deduction is calculated automatically by the CLI by default; after viewing the Preview, the user may specify an exact deduction amount or use `0` to disable balance deduction.

   - Construct the Preview command from the information provided by the user to obtain a detailed quote. At this point, the user-facing message should be: `Quoting the Token Plan xx edition order…`

     ```text
     qianwen subscription tokenplan purchase <type> \
       --billing-cycle <monthly|quarterly|yearly> \
       --channel alipay \
       [--standard-seat-count N] \
       [--pro-seat-count N] \
       [--max-seat-count N] \
       [--balance-deduction <amount>] \
       (--auto-renew | --no-auto-renew) \
       [--coupon <coupon-id> | --no-coupon] \
       --preview \
       --format json
     ```

   - Omit both `--coupon` and `--no-coupon` from the first Preview so the server selects the current default coupon. The balance deduction argument has three meanings:
     - Omit `--balance-deduction`: apply balance deduction automatically.
     - `--balance-deduction 0`: do not use the balance.
     - Pass another nonnegative exact amount with no more than two decimal places: specify the deduction manually.
   - Pass the Preview stdout JSON to the validator and validate the package, billing cycle, automatic renewal setting, coupon mode, and balance deduction intent:

     ```text
     node <skill-dir>/scripts/tokenplan-preflight.mjs --validate token-plan-preview \
       --expect-token-plan-type <type> \
       --expect-billing-cycle <monthly|quarterly|yearly> \
       --expect-auto-renew <true|false> \
       --expect-coupon-mode <default|explicit|none> \
       [--expect-coupon-id <retained coupon ID>] \
       --expect-deduction-intent <auto|manual|none> \
       [--expect-cash-deduction <exact manual amount>]
     ```

   - Continue to display the quote and request user confirmation only when `validation.classification.quote_usable=true`. Even if the command exits with code `0`, stop if `fundingPlan=null`, `deductionValid=false`, or `quote_usable=false`.
   - If the Preview result indicates that an unpaid order already exists, ask the user to first visit https://platform.qianwenai.com/home/billing/subscription to pay for or cancel the existing order. If the user reports that the order has been canceled but it was not created during the current session, confirm the cancellation by checking whether the Preview command can successfully return a quote.
   - Retain the complete validated quote, `originalAmount`, `planAmount`, `promotionDedcution`, `orderAmount`, `selectedCoupon`, `fundingPlan`, the user's original Team seat arguments, and the matching package identity from the Catalog. Preview does not echo Team seat quantities, so they must not be re-derived from the Preview result.

   - Summarize the Preview quote and display information that is actually present in the response and has passed validation:
     - Token Plan name, plan identifier (`type`), billing cycle, and automatic renewal setting.
     - Each Team seat type and the quantity selected by the user.
     - Original price (`originalAmount`), discounted price (`planAmount`), promotional discount amount (`promotionDedcution`), and amount payable for the order (`orderAmount`).
     - The current coupon name and whether it is recommended.
     - Fields such as coupon face value, validity period, and coupon deduction amount only when actually present in the response.
     - Available balance, balance deduction amount, payable amount, and amount payable through Alipay.
   - Do not treat `planAmount` as the final settlement amount, derive per-seat prices or subtotals for Team, or add an “original price,” “discounted price,” or coupon information that is absent from the response.
   - When the user has multiple available coupons, also display the coupon information actually returned in the response and provide a “Do not use a coupon” option. Retain coupon IDs only in the current flow and do not display them to the user. If the user has no available coupons, do not prompt them to switch coupons.
   - Unless a coupon fully covers the order, explain that automatic balance deduction can be adjusted or disabled. When a coupon fully covers the order, balance deduction is fixed at `0` and cannot be adjusted.
   - After displaying the information, provide an AI risk notice explaining that the order information was organized by AI and may not reflect the user's actual intent; if the order information does not reflect their intent, they should not confirm it. Also ask whether the user wants to change the coupon, balance deduction amount, or other purchase information.

   - If the user changes the coupon or balance deduction information, keep the package, cycle, seats, and automatic renewal setting unchanged, and construct a new `--preview` command to obtain the latest quote:
     - If the user selects a displayed coupon, use the corresponding coupon ID retained in the current flow.
     - If the user chooses not to use a coupon, use `--no-coupon`.
     - If only the coupon changes, retain any manually specified balance deduction amount. If balance deduction was automatic, continue omitting `--balance-deduction` so the CLI recalculates it.
     - Discard the old quote and old `payment_path`, revalidate and fully display the latest quote, and ask the user to confirm again.
   - If the user changes the package type, billing cycle, Team seats, automatic renewal setting, account, payment method, or purchase scope, invalidate the current quote and confirmation, then return to the corresponding catalog lookup or purchase-configuration step.
   - This process may require multiple rounds. In every round, fully display the latest validated quote. Do not independently calculate or simulate coupon and balance changes outside Preview.
   - If the user does not authorize order creation, end the current purchase flow. If the user later asks to make a purchase, repeat the catalog lookup, Preview, and confirmation flow.

   - After each Preview passes, use `fundingPlan.externalPayable` to determine whether Alipay is required:
     - If `externalPayable > 0`, run the `token-plan-purchase` prerequisite check and independently confirm that `alipay-payment-skill` is available. Both dependency gates must pass before final user confirmation and order creation.
     - If `externalPayable=0`, do not check Alipay dependencies, and skip the Alipay flow after the order is created successfully.

   - Before the user explicitly authorizes order creation, the final confirmation must include:
     - The AI risk notice.
     - The masked Qwen AI Platform account.
     - The display name and type of the package or seats.
     - The billing cycle and nonzero Team seat quantities.
     - Whether automatic renewal is enabled.
     - The current coupon name.
     - The balance deduction amount and final amount payable through Alipay.
     - If the amount payable through Alipay is greater than `0`, state that Alipay is the payment method.
     - State that this confirmation authorizes only one order-creation request; a Team request may create multiple order records.
     - State that the user should not confirm if any information is incorrect.
   - Ask for confirmation in natural language. Do not use a mechanical numeric menu or a `Confirm/Cancel` list. Ambiguous language does not constitute authorization and must be clarified.

   - After the user explicitly confirms, run the following command again before creating the order:

     ```text
     qianwen auth status --format json
     ```

     Confirm that the current `user.aliyunId` matches the account used for the final confirmation. If the account has changed, the original confirmation is invalid; do not create the order.
   - A confirmation can authorize only one creation call and is consumed before the call. If arguments are invalid, the command is interrupted or times out, exits nonzero, or produces an uncertain result, do not automatically retry using the same confirmation.
   - At this point, the user-facing message should be: `Creating the Token Plan xx edition order…`
   - Construct the Confirm command using the final Preview result and the user's coupon and balance deduction selections:

     ```text
     qianwen subscription tokenplan purchase <type> \
       --billing-cycle <monthly|quarterly|yearly> \
       --channel alipay \
       [--standard-seat-count N] \
       [--pro-seat-count N] \
       [--max-seat-count N] \
       (--auto-renew | --no-auto-renew) \
       (--coupon <selected-coupon-id> | --no-coupon) \
       --balance-deduction <confirmed fundingPlan.cashDeduction> \
       --preview-amount <confirmed orderAmount> \
       --confirm \
       --format json
     ```

   - Confirm must explicitly provide exactly one of the two coupon choices, the precise `fundingPlan.cashDeduction` resolved by the final Preview, and the precise `orderAmount`. Even if Preview used automatic balance deduction, Confirm must pass the resolved balance deduction amount, including `0`.
   - Pass the Confirm stdout JSON, including structured stdout returned with a nonzero exit code, to the validator:

     ```text
     node <skill-dir>/scripts/tokenplan-preflight.mjs --validate token-plan-purchase \
       --expect-token-plan-type <type> \
       --expect-billing-cycle <monthly|quarterly|yearly> \
       --expect-auto-renew <true|false> \
       --expect-order-amount <confirmed orderAmount> \
       --expect-cash-deduction <confirmed fundingPlan.cashDeduction> \
       --expect-external-payable <confirmed fundingPlan.externalPayable>
     ```

   - Use only `validation.classification.settlement_mode` and the top-level `validated` object to determine the next step. `validatedOrderContext` is only for retaining order identity; it must not be used to fill in missing amounts, settlement methods, or payment links.
   - Individual normally creates only one order; Team may create multiple orders. `paymentOrderId` is the primary payment order, and `orderIds[]` is the complete set of orders:
     - Use `paymentOrderId` for the payment flow and `payment-result`.
     - Order recovery and cancellation confirmation must precisely match the complete `orderIds[]`.
     - Normally display only `paymentOrderId` to the user, and retain the complete `orderIds[]` only within the current flow.

   - Handle the validated settlement type as follows:
     - `alipay_required`: Require `validated` to contain `paymentOrderId`, a complete nonempty `orderIds`, request identity, amount, currency, balance deduction, a positive `externalPayable`, and the original `paymentUrl`. Display “The Token Plan xx edition order was created successfully. Order ID: xxx. Entering Alipay payment…”, together with the validated amount payable through Alipay and the payment channel. For Team, also display the billing cycle and confirmed total seat count, then enter the Alipay flow.
     - `internal`: Explain that the order has been created and does not require Alipay payment. Do not initialize an Alipay handoff; proceed directly to checking Token Plan activation status.
     - `unconfirmed`: Retain the validated order identity, do not use any unvalidated payment link or amount, do not retry or recreate the order, and enter the existing-order recovery flow.
   - The `status` returned by the purchase command, including `failed`, does not by itself prove whether payment succeeded or failed.
   - If business-level stop information is returned before or during order creation, handle it as follows:
     - Existing subscription: stop creation and display only the subscription management link returned in the response.
     - Existing unpaid order: stop the new purchase and display only the cancellation or management page returned in the response. Do not automatically cancel or replace the order.
     - Account in arrears: stop quoting and creation, explain that a recharge is required, and optionally ask whether the user wants to enter the Recharge flow. Do not automatically select a recharge amount or channel.
     - Account balance, subscription status, order status, purchase eligibility, or another purchase gate cannot be confirmed: keep it unknown and stop. Do not describe the package as purchasable, the user as unsubscribed, or the account as in arrears.
     - Package or cycle unavailable: display only the reason returned in the current response. If no reason is provided, state only that it is temporarily unavailable.
     - Coupon unavailable: display the reason returned in the response and do not automatically replace it with the default coupon. Run Preview again only after the user selects another displayed coupon or chooses not to use a coupon.
     - Quote changed or expired: do not retry creation. Run Preview again and obtain a new confirmation.

   - Enter the Alipay flow only when `settlement_mode=alipay_required`. Retain the original `paymentUrl`, `paymentOrderId`, positive `externalPayable`, immutable `payment_path`, `handoff_state=not_started`, and an empty `display_result`.
   - The payment link passed to Alipay must be byte-for-byte identical to the validated and retained original `paymentUrl`. Do not accept, rewrite, reconstruct, re-encode, or replace it with a link from user input, logs, order history, or another order.
   - Payment handoff supports the `direct` and `alipay-payment-skill` paths. Use the path selected by the prerequisite check, and do not switch paths after payment actions begin.

   - In the following priority order, use the first nonempty value as the `sessionId` for `alipay-bot submit-payment`: runtime `sessionId/session_id`; current-session `threadId/thread_id/conversationId/conversation_id/agentContextId` or `CODEX_THREAD_ID`; environment variable `AIPAY_SESSION_ID`. Do not generate one or ask the user for one. If none exists, omit `--session-id`.
   - Before starting the single allowed `direct` payment-handoff attempt, set `handoff_state` to `started`, then run the following command to report the payment signal for this attempt:

     ```text
     alipay-bot trigger-payment-signal \
       --payment-link '<original validated paymentUrl>' \
       --merchant-info 'Product: Qwen AI Platform Token Plan <type>; Amount: ¥<externalPayable>; Seller: Qwen AI Platform; Order number: <paymentOrderId>' \
       --amount '<externalPayable>'
     ```

   - `trigger-payment-signal` only sets `alipay-bot` to a payment-pending state. It does not initiate payment or produce user-visible output. Run this command at most once for each allowed `direct` payment-handoff attempt; the command does not accept `--session-id`.
   - Only when the payment-signal command for this attempt exits with code `0` may one payment submission be run immediately, with no new Agent decision or user interaction in between:

     ```text
     alipay-bot submit-payment \
       [--session-id '<resolved sessionId>'] \
       --payment-link '<original validated paymentUrl>' \
       --intent-summary 'Product: Qwen AI Platform Token Plan <type>; Amount: ¥<externalPayable>; Payee: Qwen AI Platform'
     ```

   - If the payment signal fails, treat the result as `ambiguous`; do not run `submit-payment` or query the payment result.
   - Once `submit-payment` is run, retain and display all user-visible output even if it exits nonzero. Once the payment handoff has entered `started`, do not automatically retry a payment command, switch paths, reset state, or replace the link. A retry using the same original payment link and the same payment path is allowed through the later recovery branch only if the user subsequently explicitly requests another Alipay attempt, the complete order history confirms that the current order remains `all_unpaid`, and existing payment materials are unavailable.
   - When using the `alipay-payment-skill` path, hand the original `paymentUrl` and available session context to that Skill. The Skill owns payment-side commands, retries, safety checks, and output. This workflow must not redisplay content that the Skill has already sent to the user.

   - Handle the Alipay result as follows:
     - If Alipay has automatically completed payment or entered a processing state requiring no user action, proceed to payment-result checking.
     - If Alipay returns payment materials that require user action, first actually display the materials to the user, then determine whether the current framework supports continuing to poll payment result in the same turn.
     - If it cannot be confirmed that payment-result polling can continue within the current turn, display the payment materials, ask the user to complete the payment and reply “Paid,” and then end the current turn.
     - If the payment result clearly failed or cannot be determined safely, retain the order and stop. Do not query or fabricate a Token Plan result.

   - Rules for displaying payment materials:
     - Display Alipay's user-facing business content verbatim and exactly once, without adding a preface, translation, summary, code block, or Token Plan status.
     - `MEDIA: <path-or-url>` is the only recognized QR-code representation. Remove each `MEDIA:` line and display the corresponding image in the original order through the media channel; if no media channel is available, append the images in the original order as Markdown images. If MEDIA: <path-or-url> is inaccessible, copy the media to a location accessible to the current session before presenting it.
     - If `MEDIA:` is available, ignore the ASCII QR code, do not generate, decode, or reconstruct a textual QR code. If no current `MEDIA:` entry exists, retain any other available payment link or text. If neither exists, treat the result as `ambiguous`.
     - Do not display nonblocking Alipay CLI update notices. Display an update notice only when a confirmed capability gap blocks the current command.
     - The Agent being able to read the payment materials does not mean the user has seen them. A real user-visible delivery boundary must exist before the payment result can be queried.

   - Determine the next step from the user's response:
     - If the user replies “Paid” or asks to view the current order status, enter existing-order recovery and perform a single payment-result check.
     - If the user asks to retry the Alipay flow or reports that a payment link, QR code, or other payment material was not displayed, first perform existing-order recovery and handle the complete order history as follows:
       - `all_paid`: clearly tell the user that the current order has been paid, do not re-enter the Alipay flow, and continue checking Token Plan activation status.
       - `all_canceled`: clearly tell the user that the current order has been canceled and do not re-enter the Alipay flow.
       - `mixed`, `not_found`, or `unconfirmed`: explain that the current order status remains unconfirmed; do not enter the Alipay flow or create another order. Prompt user to manage the orders in the console at <https://platform.qianwenai.com/home/billing/subscription>.
       - `all_unpaid`: clearly tell the user that the current order remains valid and unpaid, then check whether the retained Alipay `display_result` for the current order is complete, accessible, and available for display again.
         - If existing payment materials are available, reuse them and redisplay them in full without running Alipay commands again.
         - If no usable payment materials exist but the current order still retains its validated original `paymentUrl`, `paymentOrderId`, positive `externalPayable`, and original `payment_path`, the same payment link and same payment path may be used to start or retry one Alipay handoff. Each explicit user request permits at most one attempt. Do not switch paths, replace or reconstruct the link, or create a new order.
         - If the original payment link or other required validated context is missing, explain that the Alipay flow cannot be re-entered safely. Do not supplement the payment link from user input, order history, logs, or another order.
         - This Alipay handoff still follows the Alipay result handling and payment-material display rules above: if payment completes automatically, proceed to payment-result checking; if payment materials are returned, display them in full; if the attempt fails, has no displayable content, or produces an ambiguous result, accurately explain what happened and retain the current order without claiming that payment succeeded.
     - If the user asks to cancel the order, tell them to cancel it themselves in the console at <https://platform.qianwenai.com/home/billing/subscription>. The Agent does not perform cancellations.
     - If the user asks to create the order again, tell them that they must first cancel the old order in the console above. After the user says “Canceled,” the complete order history must still explicitly return `all_canceled` before the old state can be cleared and the catalog lookup, Preview, and confirmation flow can be repeated.

   - Same-turn payment-result check:
     - The Token Plan-specific poller may be invoked once only after the Alipay payment materials have actually been delivered to the user and the framework supports polling for the payment result within the same turn after displaying those materials.:

       ```text
       node <skill-dir>/scripts/poll-tokenplan-payment.mjs \
         --payment-order-id <paymentOrderId>
       ```

     - Do not pass time arguments; use the script's default maximum wait of 10 minutes.
     - Use only the validated `payment` and `sourceStatus` returned by the poller.
     - Poller results determine only payment-channel status. To determine Token Plan order status, always enter existing-order recovery and query order history. Even if the result is `payment_succeeded`, the order history must confirm `all_paid` before proceeding to activation checking.
     - A stopped, timed-out, or interrupted poll does not mean payment failed and does not cancel the order. Do not add Agent loops, background tasks, concurrent queries, or a second one-off query, and do not restart a long poll in a later turn.

   - Existing-order recovery:
     - Use only the complete validated `orderIds[]` retained in the current flow, and run:

       ```text
       node <skill-dir>/scripts/tokenplan-preflight.mjs --route token-plan-orders
       qianwen subscription orders \
         --type purchase --page 1 --page-size <page-size> --format json
       node <skill-dir>/scripts/tokenplan-preflight.mjs \
         --validate token-plan-orders \
         --expect-order-ids <comma-separated-orderIds> \
         --expect-page-size <same-page-size>
       ```

     - The first query may use `--page-size 20`. If validation returns `not_found`, increase the first page's size as appropriate, for example to `50` and then `100`, and revalidate each response with the same value passed to `--expect-page-size`. The CLI currently supports a maximum page size of `100`; if the orders are still not found at the limit, stop and do not continue to later pages.
     - Pass the order query's stdout JSON to the validator and precisely match the complete set of orders. Do not directly inspect raw order rows or match only `paymentOrderId`.
     - Use `validation.classification.history` to determine the result. Possible values are `all_paid`, `all_unpaid`, `all_canceled`, `mixed`, `not_found`, and `unconfirmed`.
     - `all_canceled` is the only acceptable proof for clearing old order state and making another purchase.
     - `not_found`, an empty result, a partial match, a query failure, and `unconfirmed` do not prove that an order was canceled and do not authorize another purchase.
     - `mixed` means the multiple Team orders have inconsistent statuses; keep the status unconfirmed and stop.

   - Single payment-result check:
     - If a valid result was already obtained from same-turn polling, reuse it. Otherwise, run the following sequence only once:

       ```text
       node <skill-dir>/scripts/tokenplan-preflight.mjs --route token-plan-payment-result
       qianwen subscription tokenplan payment-result \
         <paymentOrderId> \
         --format json
       node <skill-dir>/scripts/tokenplan-preflight.mjs --validate token-plan-payment-result \
         --expect-payment-order-id <paymentOrderId>
       ```

     - A single payment-result check does not authorize payment to be run again. In later turns, do not use `--wait` or repeat this result query. Enter the corresponding payment-handoff recovery branch only when the user explicitly requests another Alipay attempt and the `all_unpaid` recovery conditions above are met.
     - Classify the result as `payment_succeeded` only when `status=succeeded` and `payStatusCode=1`, but this classification still does not replace order history.
     - A `cancelled` value returned by `payment-result` does not by itself prove that the order was canceled. Only `all_canceled` from the complete order history proves cancellation.
     - If the payment-channel result conflicts with the order history, defer to the order history and explain the status discrepancy: only `all_paid` permits activation checking, `all_unpaid` means the order remains unpaid, `all_canceled` means the order has been canceled, and `mixed` or `unconfirmed` remains unconfirmed.
     - For `not_found`, increase the page size as appropriate according to the existing-order recovery steps. If the order is still not found at `100`, leave the order status unconfirmed.

   - After confirming that settlement is complete, check Token Plan activation status:
     - Alipay settlement must be confirmed by `all_paid` in the complete order history. A successful `payment-result` is only supporting information.
     - For internal settlement, use the validated creation response as proof of settlement and skip `payment-result`.
     - Take one status snapshot:

       ```text
       node <skill-dir>/scripts/tokenplan-preflight.mjs --route token-plan-status
       qianwen subscription tokenplan status --format json
       node <skill-dir>/scripts/tokenplan-preflight.mjs --validate token-plan-status \
         --expect-token-plan-type <type> \
         --expect-billing-cycle <monthly|quarterly|yearly> \
         [--expect-standard-seat-count N] \
         [--expect-pro-seat-count N] \
         [--expect-max-seat-count N]
       ```

     - Precisely match the purchased Token Plan plan identifier (`type`), billing cycle, and Team seats. State that the Token Plan is active only when `classification.activation=visible`.
     - If payment succeeded but activation status is pending, unconfirmed, or mismatched, state only that payment succeeded but activation has not yet been confirmed, and remind the user not to pay again.

   - Summarize the final result based on payment and activation status:
     - Complete order history is `all_paid` and activation is confirmed: `The order history shows that the current order has been paid, and your Token Plan is active.`
     - Complete order history is `all_unpaid`: `The order history shows that the current order has not been paid, and the Token Plan is not active. Do not create another order. To continue payment, reuse any Alipay payment materials that are still available for the current order. If the materials are unavailable, you may re-enter the Alipay flow using the current order's original payment link after the recovery conditions are met.`
     - Complete order history is `all_canceled`: `The order history shows that the current order has been canceled, and the Token Plan is not active.`
     - Complete order history is `mixed`, `not_found`, or `unconfirmed`: `The order status has not yet been confirmed. Do not pay again; you can check the current order again later.`
     - Internal settlement and activation confirmed: `Your Token Plan is active. This order does not require Alipay payment.`
     - Complete order history is `all_paid` but activation is unconfirmed: `The order history shows that the current order has been paid, but Token Plan activation has not yet been confirmed. Do not pay again; you can check the Token Plan status again later.`
     - Internal settlement completed but activation unconfirmed: `The order has completed internal settlement, but Token Plan activation has not yet been confirmed. Do not create a new order; you can check the Token Plan status again later.`
   - In the final response, display only the subscription name, type, cycle, payment amount, payment channel, automatic renewal setting, validity period, management link, and Team seat information actually present in the response.

5. Follow these general constraints throughout the workflow:
   - One confirmation authorizes one creation request only. Status queries, the user's reply “Paid,” payment-material recovery, or payment continuation do not authorize creating a new order.
   - If an order has been created but its result is unknown, do not automatically retry creation or payment, and do not advise the user to pay again. Continue handling the same order only if the user explicitly requests another Alipay attempt, the complete order history confirms `all_unpaid`, and the payment-material or original-payment-link recovery conditions are met.
   - `orderAmount`, `fundingPlan.cashDeduction`, and `fundingPlan.externalPayable` are settlement validation anchors. Do not substitute the display-only `planAmount` or the amount of an individual child order.
   - Retain complete account identifiers, order IDs, payment links, coupon IDs, and raw transaction responses only within the current flow. Do not write them to files, logs, long-term memory, or sub-Agent messages.
   - Do not ask the user for an Alipay password, bank card number, SMS verification code, API key, cookie, or pasted token.
   - Determine business status from validated response evidence, not solely from command exit codes.
   - QianWen CLI exit codes are only routing aids: `0` still requires response validation; handle `1` according to validated argument errors, business rejection, or payment failure; `2` indicates an authentication issue; `3`, `5`, and `6` indicate network, rate-limit, and server errors respectively; `4` means a configuration or purchase gate is unconfirmed; for `7`, enter recovery because no result was found; a response with `8` may still contain a processable in-progress settlement branch; `130` indicates interruption. Exit codes cannot replace response validators.
   - Business stops such as `TOKENPLAN_ACTIVE_SUBSCRIPTION`, `TOKENPLAN_UNPAID_ORDER`, `TOKENPLAN_ACCOUNT_IN_ARREARS`, `TOKENPLAN_QUOTE_CHANGED`, and `TOKENPLAN_CHECK_UNKNOWN` must be handled according to their respective semantics and must not substitute for one another.
   - When the account is in arrears, stop Token Plan quoting and creation, explain that a recharge is required, and optionally ask whether the user wants to enter the Recharge flow. Do not automatically select a recharge amount or payment channel, and do not reuse Token Plan state or validators for Recharge.
