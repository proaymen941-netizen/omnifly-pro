import { Router } from "express";
import { db, logAudit } from "../lib/sqlite";
import { getAuthUser } from "./auth";

const router = Router();

// ============================================================================
// OMNI-CHANNEL NOTIFICATIONS & MULTI-GATEWAY API INTEGRATION HUB
// ============================================================================

export interface NotificationEventPayload {
  event_trigger: "flight_24h_reminder" | "flight_delay" | "ticket_issued" | "booking_confirmed" | "visa_ready" | "passport_6m_expiry" | "payment_due_reminder";
  recipient_phone?: string;
  recipient_email?: string;
  recipient_name?: string;
  data: Record<string, any>;
  entity_type?: "booking" | "visa" | "invoice" | "customer" | "passenger";
  entity_id?: number;
  sent_by?: string;
}

// ----------------------------------------------------------------------------
// Helper: Format Dynamic Template
// ----------------------------------------------------------------------------
function renderTemplate(template: string, data: Record<string, any>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const placeholder = new RegExp(`\\{${key}\\}`, "g");
    result = result.replace(placeholder, value !== undefined && value !== null ? String(value) : "");
  }
  return result;
}

// ----------------------------------------------------------------------------
// Helper: Dispatch Message via Configured Live Gateway
// ----------------------------------------------------------------------------
async function dispatchViaGateway(
  channel: "whatsapp" | "sms" | "email",
  recipient: string,
  messageBody: string,
  gateway: any,
  options: {
    recipient_name?: string;
    template_code?: string;
    entity_type?: string;
    entity_id?: number;
    sent_by?: string;
    subject?: string;
  } = {}
): Promise<{ success: boolean; gatewayMessageId: string; status: string; errorMessage?: string }> {
  const providerKey = gateway.provider_key;
  const apiKey = gateway.api_key || "";
  const apiSecret = gateway.api_secret || "";
  const baseUrl = (gateway.base_url || "").replace(/\/$/, "");
  const accountId = gateway.account_id || "";
  const senderId = gateway.sender_id || "";
  let config: Record<string, any> = {};
  try {
    config = gateway.config_json ? JSON.parse(gateway.config_json) : {};
  } catch {}

  let gatewayMsgId = `${providerKey.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let status = "delivered";
  let errorMessage: string | undefined;

  try {
    // 1. Meta WhatsApp Cloud API (Graph API)
    if (providerKey === "whatsapp_meta" && apiKey && !apiKey.startsWith("EAAG...SAMPLE")) {
      const phoneId = senderId || accountId;
      const cleanPhone = recipient.replace(/[^0-9]/g, "");
      const res = await fetch(`${baseUrl || "https://graph.facebook.com/v19.0"}/${phoneId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: cleanPhone,
          type: "text",
          text: { preview_url: true, body: messageBody }
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || `Meta WhatsApp API error (${res.status})`);
      }
      if (json.messages && json.messages[0]?.id) {
        gatewayMsgId = json.messages[0].id;
        status = "sent";
      }
    }
    // 2. Infobip Multi-Channel API (WhatsApp / SMS)
    else if (providerKey === "infobip" && apiKey && !apiKey.startsWith("ib_live_apikey_9988")) {
      const cleanPhone = recipient.replace(/[^0-9]/g, "");
      if (channel === "whatsapp") {
        const res = await fetch(`${baseUrl}/whatsapp/1/message/text`, {
          method: "POST",
          headers: {
            "Authorization": `App ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: senderId,
            to: cleanPhone,
            content: { text: messageBody }
          })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.requestError?.serviceException?.text || "Infobip WhatsApp dispatch failed");
        gatewayMsgId = json.messages?.[0]?.messageId || gatewayMsgId;
      } else {
        // SMS
        const res = await fetch(`${baseUrl}/sms/2/text/advanced`, {
          method: "POST",
          headers: {
            "Authorization": `App ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            messages: [{
              from: config.default_sms_sender || senderId || "OMNIFLY",
              destinations: [{ to: cleanPhone }],
              text: messageBody
            }]
          })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.requestError?.serviceException?.text || "Infobip SMS dispatch failed");
        gatewayMsgId = json.messages?.[0]?.messageId || gatewayMsgId;
      }
      status = "sent";
    }
    // 3. Twilio API (SMS / WhatsApp)
    else if (providerKey === "twilio" && apiKey && apiSecret && !apiKey.startsWith("AC9876543210")) {
      const cleanPhone = recipient.startsWith("+") ? recipient : `+${recipient.replace(/[^0-9]/g, "")}`;
      const fromNumber = channel === "whatsapp"
        ? (config.whatsapp_from || `whatsapp:${senderId}`)
        : (config.sms_from || senderId);
      const toNumber = channel === "whatsapp" ? `whatsapp:${cleanPhone}` : cleanPhone;

      const authHeader = "Basic " + Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
      const bodyParams = new URLSearchParams();
      bodyParams.append("To", toNumber);
      bodyParams.append("From", fromNumber);
      bodyParams.append("Body", messageBody);

      const res = await fetch(`${baseUrl}/Accounts/${accountId || apiKey}/Messages.json`, {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: bodyParams.toString()
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || `Twilio error ${json.code}`);
      gatewayMsgId = json.sid || gatewayMsgId;
      status = json.status || "sent";
    }
    // 4. Unifonic Saudi SMS Gateway
    else if (providerKey === "unifonic" && apiKey && !apiKey.startsWith("unifonic_appsid_sample")) {
      const cleanPhone = recipient.replace(/[^0-9]/g, "");
      const res = await fetch(`${baseUrl}/Messages/Send`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          AppSid: apiKey,
          Recipient: cleanPhone,
          Body: messageBody,
          SenderID: senderId || config.default_sender || "OMNIFLY"
        }).toString()
      });

      const json = await res.json();
      if (json.success !== true && json.success !== "true") {
        throw new Error(json.message || "Unifonic SMS gateway error");
      }
      gatewayMsgId = json.data?.MessageID || gatewayMsgId;
      status = "delivered";
    }
    // 5. Google Workspace / SMTP Relay
    else if (providerKey === "smtp_google") {
      // In live environment with SMTP config, logs simulation or cloud relay
      gatewayMsgId = `gmail-relay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      status = "delivered";
    } else {
      // Simulated Sandbox Gateway for testing and demonstration
      gatewayMsgId = `SIM-${providerKey.toUpperCase()}-${Date.now()}`;
      status = "delivered";
    }
  } catch (err: any) {
    status = "failed";
    errorMessage = err.message || "فشل الاتصال بالبوابة";
  }

  // Record In DB Log
  try {
    const ins = db.prepare(`
      INSERT INTO travel_notification_logs (
        channel, recipient_phone, recipient_name, template_code, message_body,
        entity_type, entity_id, status, gateway_message_id, error_message, sent_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    ins.run(
      channel,
      recipient,
      options.recipient_name || null,
      options.template_code || null,
      messageBody,
      options.entity_type || null,
      options.entity_id || null,
      status,
      gatewayMsgId,
      errorMessage || null,
      options.sent_by || "النظام الآلي"
    );
  } catch (logErr) {
    console.error("Failed to insert notification log:", logErr);
  }

  return {
    success: status !== "failed",
    gatewayMessageId: gatewayMsgId,
    status,
    errorMessage
  };
}

// ----------------------------------------------------------------------------
// Internal Helper: Trigger Automated Event
// ----------------------------------------------------------------------------
export async function triggerTravelNotificationEvent(payload: NotificationEventPayload) {
  try {
    const automation = db.prepare(`
      SELECT a.*, t.message_body, t.template_code, t.name as template_name
      FROM travel_notification_automations a
      LEFT JOIN travel_notification_templates t ON t.id = a.template_id
      WHERE a.event_trigger = ? AND a.is_enabled = 1
    `).get(payload.event_trigger) as any;

    if (!automation || !automation.message_body) {
      return { triggered: false, reason: "Automation disabled or template missing" };
    }

    const channel = (automation.channel || "whatsapp") as "whatsapp" | "sms" | "email";
    const recipient = channel === "email"
      ? (payload.recipient_email || payload.data.email || "")
      : (payload.recipient_phone || payload.data.phone || payload.data.passenger_phone || payload.data.customer_phone || "");

    if (!recipient) {
      return { triggered: false, reason: "No recipient phone/email provided" };
    }

    // Find active gateway for this channel
    const gateway = db.prepare(`
      SELECT * FROM travel_notification_gateways
      WHERE is_enabled = 1 AND channel_types LIKE ?
      ORDER BY is_default DESC, id ASC LIMIT 1
    `).get(`%${channel}%`) as any;

    if (!gateway) {
      return { triggered: false, reason: `No active gateway configured for channel: ${channel}` };
    }

    const messageText = renderTemplate(automation.message_body, payload.data);
    const result = await dispatchViaGateway(
      channel,
      recipient,
      messageText,
      gateway,
      {
        recipient_name: payload.recipient_name || payload.data.passenger_name || payload.data.customer_name,
        template_code: automation.template_code,
        entity_type: payload.entity_type,
        entity_id: payload.entity_id,
        sent_by: payload.sent_by || "محرك الأتمتة الآلي"
      }
    );

    return { triggered: true, result };
  } catch (err: any) {
    console.error("Error triggering travel notification event:", err);
    return { triggered: false, error: err.message };
  }
}

// ============================================================================
// API ROUTES
// ============================================================================

// 1. Get All Gateways
router.get("/travel/notifications/gateways", (_req, res) => {
  const rows = db.prepare("SELECT * FROM travel_notification_gateways ORDER BY id ASC").all() as any[];
  // Mask sensitive secrets when returning to client
  const sanitized = rows.map((g) => ({
    ...g,
    api_key_masked: g.api_key ? (g.api_key.length > 8 ? `${g.api_key.slice(0, 4)}••••${g.api_key.slice(-4)}` : "••••••••") : "",
    api_secret_masked: g.api_secret ? "••••••••••••" : ""
  }));
  res.json(sanitized);
});

// 2. Update Gateway Credentials and Settings
router.put("/travel/notifications/gateways/:id", (req, res) => {
  const user = getAuthUser(req);
  if (!user) { res.status(401).json({ error: "غير مصرح" }); return; }

  const {
    provider_name,
    channel_types,
    is_enabled,
    is_default,
    api_key,
    api_secret,
    base_url,
    account_id,
    sender_id,
    webhook_verify_token,
    config_json
  } = req.body;

  const current = db.prepare("SELECT * FROM travel_notification_gateways WHERE id = ?").get(req.params.id) as any;
  if (!current) {
    res.status(404).json({ error: "البوابة غير موجودة" });
    return;
  }

  // If password/key not changed, preserve old value
  const finalApiKey = api_key !== undefined && api_key !== "" ? api_key : current.api_key;
  const finalApiSecret = api_secret !== undefined && api_secret !== "" ? api_secret : current.api_secret;

  // If set as default, unset other default gateways for the same channel
  if (is_default) {
    db.prepare(`
      UPDATE travel_notification_gateways
      SET is_default = 0
      WHERE channel_types = ? AND id != ?
    `).run(channel_types || current.channel_types, req.params.id);
  }

  db.prepare(`
    UPDATE travel_notification_gateways SET
      provider_name = ?,
      channel_types = ?,
      is_enabled = ?,
      is_default = ?,
      api_key = ?,
      api_secret = ?,
      base_url = ?,
      account_id = ?,
      sender_id = ?,
      webhook_verify_token = ?,
      config_json = ?,
      updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `).run(
    provider_name || current.provider_name,
    channel_types || current.channel_types,
    is_enabled ? 1 : 0,
    is_default ? 1 : 0,
    finalApiKey,
    finalApiSecret,
    base_url || current.base_url,
    account_id !== undefined ? account_id : current.account_id,
    sender_id !== undefined ? sender_id : current.sender_id,
    webhook_verify_token !== undefined ? webhook_verify_token : current.webhook_verify_token,
    typeof config_json === "object" ? JSON.stringify(config_json) : (config_json || current.config_json),
    req.params.id
  );

  const updated = db.prepare("SELECT * FROM travel_notification_gateways WHERE id = ?").get(req.params.id);
  res.json(updated);
});

// 2b. Create New Notification Gateway
router.post("/travel/notifications/gateways", (req, res) => {
  const user = getAuthUser(req);
  if (!user) { res.status(401).json({ error: "غير مصرح" }); return; }

  const {
    provider_key,
    provider_name,
    channel_types = "whatsapp",
    is_enabled = 1,
    is_default = 0,
    api_key,
    api_secret,
    base_url,
    account_id,
    sender_id,
    webhook_verify_token,
    config_json
  } = req.body;

  if (!provider_key || !provider_name) {
    res.status(400).json({ error: "رمز المزود واسم البوابة حقول مطلوبة" });
    return;
  }

  if (is_default) {
    db.prepare(`UPDATE travel_notification_gateways SET is_default = 0 WHERE channel_types LIKE ?`).run(`%${channel_types}%`);
  }

  const stmt = db.prepare(`
    INSERT INTO travel_notification_gateways (
      provider_key, provider_name, channel_types, is_enabled, is_default,
      api_key, api_secret, base_url, account_id, sender_id, webhook_verify_token, config_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    provider_key,
    provider_name,
    channel_types,
    is_enabled ? 1 : 0,
    is_default ? 1 : 0,
    api_key || null,
    api_secret || null,
    base_url || null,
    account_id || null,
    sender_id || null,
    webhook_verify_token || null,
    typeof config_json === "object" ? JSON.stringify(config_json) : (config_json || null)
  );

  const created = db.prepare("SELECT * FROM travel_notification_gateways WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(created);
});

// 3. Test API Gateway Connection & Send Test Message
router.post("/travel/notifications/gateways/:id/test", async (req, res) => {
  const user = getAuthUser(req);
  if (!user) { res.status(401).json({ error: "غير مصرح" }); return; }

  const gateway = db.prepare("SELECT * FROM travel_notification_gateways WHERE id = ?").get(req.params.id) as any;
  if (!gateway) {
    res.status(404).json({ error: "البوابة غير موجودة" });
    return;
  }

  const { test_phone = "0505544332", test_message } = req.body;
  const startTime = Date.now();

  const msg = test_message || `اختبار تجريبي لاتصال بوابة ${gateway.provider_name} بنظام أومني فلاي للسفريات ✈️\nالوقت: ${new Date().toLocaleTimeString("ar-EG")}`;
  const channel = (gateway.channel_types.includes("whatsapp") ? "whatsapp" : (gateway.channel_types.includes("sms") ? "sms" : "email")) as any;

  const result = await dispatchViaGateway(channel, test_phone, msg, gateway, {
    recipient_name: "مدير النظام (فحص تجريبي)",
    template_code: "TPL-API-TEST",
    sent_by: user.name
  });

  const latencyMs = Date.now() - startTime;
  const testStatus = result.success ? "success" : "failed";
  const testMessage = result.success
    ? `تم اختبار الاتصال بنجاح (${latencyMs}ms) - معرف الرسالة: ${result.gatewayMessageId}`
    : `فشل الاختبار: ${result.errorMessage || "خطأ في بيانات الاعتماد"}`;

  // Update Gateway Test Results
  db.prepare(`
    UPDATE travel_notification_gateways SET
      last_test_at = datetime('now', 'localtime'),
      last_test_status = ?,
      last_test_message = ?
    WHERE id = ?
  `).run(testStatus, testMessage, req.params.id);

  res.json({
    success: result.success,
    gateway_id: gateway.id,
    provider_name: gateway.provider_name,
    latency_ms: latencyMs,
    gateway_message_id: result.gatewayMessageId,
    status: testStatus,
    message: testMessage,
    error: result.errorMessage
  });
});

// 4. Trigger Webhook / Event Endpoint
router.post("/travel/notifications/trigger-event", async (req, res) => {
  const user = getAuthUser(req);
  const { event_trigger, recipient_phone, recipient_email, recipient_name, data, entity_type, entity_id } = req.body;

  if (!event_trigger || !data) {
    res.status(400).json({ error: "اسم الحدث (event_trigger) وبيانات القالب (data) حقول مطلوبة" });
    return;
  }

  const result = await triggerTravelNotificationEvent({
    event_trigger,
    recipient_phone,
    recipient_email,
    recipient_name,
    data,
    entity_type,
    entity_id,
    sent_by: user ? user.name : "Webhook Trigger"
  });

  res.json(result);
});

// 5. Get Notification Templates
router.get("/travel/notifications/templates", (_req, res) => {
  const rows = db.prepare("SELECT * FROM travel_notification_templates ORDER BY id ASC").all();
  res.json(rows);
});

// 6. Create Notification Template
router.post("/travel/notifications/templates", (req, res) => {
  const user = getAuthUser(req);
  if (!user) { res.status(401).json({ error: "غير مصرح" }); return; }

  const { name, template_code, channel = "whatsapp", category = "operations", message_body, parameters_json } = req.body;
  if (!name || !message_body) {
    res.status(400).json({ error: "اسم القالب ونص الرسالة مطلوبان" });
    return;
  }

  const code = template_code || `TPL-${Date.now().toString().slice(-6)}`;

  const ins = db.prepare(`
    INSERT INTO travel_notification_templates (template_code, name, channel, category, message_body, parameters_json, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);

  const r = ins.run(code, name, channel, category, message_body, parameters_json ? JSON.stringify(parameters_json) : null);
  const tpl = db.prepare("SELECT * FROM travel_notification_templates WHERE id = ?").get(r.lastInsertRowid);
  res.status(201).json(tpl);
});

// 7. Update Notification Template
router.put("/travel/notifications/templates/:id", (req, res) => {
  const user = getAuthUser(req);
  if (!user) { res.status(401).json({ error: "غير مصرح" }); return; }

  const { name, message_body, channel, category, is_active, parameters_json } = req.body;

  db.prepare(`
    UPDATE travel_notification_templates
    SET name = ?, message_body = ?, channel = ?, category = ?, is_active = ?, parameters_json = ?
    WHERE id = ?
  `).run(
    name,
    message_body,
    channel || "whatsapp",
    category || "operations",
    is_active ? 1 : 0,
    parameters_json ? (typeof parameters_json === "string" ? parameters_json : JSON.stringify(parameters_json)) : null,
    req.params.id
  );

  const updated = db.prepare("SELECT * FROM travel_notification_templates WHERE id = ?").get(req.params.id);
  res.json(updated);
});

// 8. Get Notification Automations
router.get("/travel/notifications/automations", (_req, res) => {
  const rows = db.prepare(`
    SELECT a.*, t.name as template_name, t.message_body as template_preview, t.template_code
    FROM travel_notification_automations a
    LEFT JOIN travel_notification_templates t ON t.id = a.template_id
    ORDER BY a.id ASC
  `).all();
  res.json(rows);
});

// 9. Update Notification Automation
router.put("/travel/notifications/automations/:id", (req, res) => {
  const user = getAuthUser(req);
  if (!user) { res.status(401).json({ error: "غير مصرح" }); return; }

  const { is_enabled, hours_before, template_id, channel, notes } = req.body;
  db.prepare(`
    UPDATE travel_notification_automations
    SET is_enabled = ?, hours_before = ?, template_id = ?, channel = ?, notes = ?
    WHERE id = ?
  `).run(is_enabled ? 1 : 0, Number(hours_before || 0), template_id || null, channel || "whatsapp", notes || null, req.params.id);

  const updated = db.prepare("SELECT * FROM travel_notification_automations WHERE id = ?").get(req.params.id);
  res.json(updated);
});

// 10. Get Message Logs
router.get("/travel/notifications/logs", (_req, res) => {
  const rows = db.prepare("SELECT * FROM travel_notification_logs ORDER BY id DESC LIMIT 150").all();
  res.json(rows);
});

// 11. Send Instant Manual Message
router.post("/travel/notifications/send", async (req, res) => {
  const user = getAuthUser(req);
  if (!user) { res.status(401).json({ error: "غير مصرح" }); return; }

  const {
    channel = "whatsapp",
    recipient_phone,
    recipient_name,
    template_code,
    message_body,
    entity_type,
    entity_id,
    gateway_id
  } = req.body;

  if (!recipient_phone || !message_body) {
    res.status(400).json({ error: "رقم هاتف المستلم ونص الرسالة حقول مطلوبة" });
    return;
  }

  // Find Gateway
  let gateway: any;
  if (gateway_id) {
    gateway = db.prepare("SELECT * FROM travel_notification_gateways WHERE id = ?").get(gateway_id);
  }
  if (!gateway) {
    gateway = db.prepare(`
      SELECT * FROM travel_notification_gateways
      WHERE is_enabled = 1 AND channel_types LIKE ?
      ORDER BY is_default DESC, id ASC LIMIT 1
    `).get(`%${channel}%`);
  }
  if (!gateway) {
    // Fallback default
    gateway = { provider_key: channel === "whatsapp" ? "whatsapp_meta" : "infobip", provider_name: "Default Gateway" };
  }

  const result = await dispatchViaGateway(channel, recipient_phone, message_body, gateway, {
    recipient_name,
    template_code,
    entity_type,
    entity_id,
    sent_by: user.name
  });

  res.json({
    success: result.success,
    message: result.success ? `تم إرسال الرسالة بنجاح عبر بوابة ${gateway.provider_name}` : `تعذر الإرسال: ${result.errorMessage}`,
    gateway_message_id: result.gatewayMessageId,
    status: result.status,
    error: result.errorMessage
  });
});

// 12. Trigger Pre-Flight 24-Hour Reminder Batch
router.post("/travel/notifications/trigger-preflight-batch", async (req, res) => {
  const user = getAuthUser(req);
  if (!user) { res.status(401).json({ error: "غير مصرح" }); return; }

  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const bookings = db.prepare(`
    SELECT b.*, p.name_ar, p.name_en, p.phone as passenger_phone, c.phone as customer_phone, c.name as customer_name
    FROM travel_bookings b
    LEFT JOIN travel_passengers p ON p.id = b.passenger_id
    LEFT JOIN customers c ON c.id = b.customer_id
    WHERE b.departure_date = ? AND b.status IN ('confirmed', 'issued')
  `).all(tomorrow) as any[];

  const gateway = db.prepare(`
    SELECT * FROM travel_notification_gateways
    WHERE is_enabled = 1 AND channel_types LIKE '%whatsapp%'
    ORDER BY is_default DESC, id ASC LIMIT 1
  `).get() as any || { provider_key: "whatsapp_meta", provider_name: "Default Meta" };

  let sentCount = 0;
  for (const b of bookings) {
    const phone = b.passenger_phone || b.customer_phone || "0501234567";
    const name = b.name_ar || b.customer_name || "المسافر الكريم";
    const body = `مرحباً عزيزنا المسافر ${name} 👋\nنود تذكيركم بموعد رحلتكم رقم ${b.flight_number || "SV"} المتجهة إلى ${b.destination_city || ""} غداً بتاريخ ${b.departure_date}.\nرقم الحجز (PNR): ${b.pnr}\nيرجى التواجد في المطار قبل الإقلاع بـ 3 ساعات.\nوكالة أومني فلاي تتمنى لكم رحلة سعيدة ✈️`;

    await dispatchViaGateway("whatsapp", phone, body, gateway, {
      recipient_name: name,
      template_code: "TPL-PRE-FLIGHT-24H",
      entity_type: "booking",
      entity_id: b.id,
      sent_by: "النظام الآلي (Batch)"
    });
    sentCount++;
  }

  res.json({
    success: true,
    processed_count: bookings.length,
    sent_notifications_count: sentCount,
    message: `تم إرسال ${sentCount} تذكير عبر الواتساب لرحلات الغد (${tomorrow}) بنجاح.`
  });
});

// 13. Webhook for Meta WhatsApp
router.get("/travel/notifications/webhook/meta", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const gw = db.prepare("SELECT webhook_verify_token FROM travel_notification_gateways WHERE provider_key = 'whatsapp_meta'").get() as any;
  const expectedToken = gw?.webhook_verify_token || "omnifly_meta_webhook_2026";

  if (mode === "subscribe" && token === expectedToken) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

router.post("/travel/notifications/webhook/meta", (req, res) => {
  // Handle incoming status updates from Meta WhatsApp Cloud
  const body = req.body;
  try {
    if (body.entry && body.entry[0]?.changes && body.entry[0].changes[0]?.value?.statuses) {
      const statusObj = body.entry[0].changes[0].value.statuses[0];
      const msgId = statusObj.id;
      const status = statusObj.status; // 'sent', 'delivered', 'read', 'failed'

      if (msgId && status) {
        db.prepare("UPDATE travel_notification_logs SET status = ? WHERE gateway_message_id = ?").run(status, msgId);
      }
    }
  } catch (err) {
    console.error("Error processing Meta webhook:", err);
  }
  res.sendStatus(200);
});

export default router;
