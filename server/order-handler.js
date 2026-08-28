import { readOrSeedCatalog } from './store.js';
import { validateOrder, formatOrderText, resolveOrderProduct } from './order.js';
import { telegramConfigured, emailConfigured, sendTelegram, sendOrderEmail } from './notify.js';
import { saveOrder, markOrderTelegramSent, markOrderEmailSent } from './orders.js';
import { metaCapiConfigured, sendLeadEvent } from './meta-capi.js';
import { normalizePhone, normalizePostalCode, normalizeShippingCountry } from './order-data.js';

const DEFAULT_DEPENDENCIES = {
  readOrSeedCatalog,
  validateOrder,
  resolveOrderProduct,
  formatOrderText,
  saveOrder,
  telegramConfigured,
  emailConfigured,
  sendTelegram,
  sendOrderEmail,
  markOrderTelegramSent,
  markOrderEmailSent,
  metaCapiConfigured,
  sendLeadEvent,
};

export function buildDurableOrder(body, authoritativeProduct) {
  const country = normalizeShippingCountry(body.country);
  return {
    eventId: body.eventId,
    name: body.name.trim(),
    phone: normalizePhone(body.phone, country),
    country,
    postalCode: normalizePostalCode(body.postalCode),
    address: body.address?.trim() ?? '',
    comment: body.comment?.trim() ?? '',
    attribution: body.attribution ?? null,
    ...authoritativeProduct,
  };
}

function sendBestEffortEvents(req, orderId, durableOrder, dependencies) {
  const {
    telegramConfigured: hasTelegram,
    sendTelegram: notifyTelegram,
    markOrderTelegramSent: markTelegramSent,
    metaCapiConfigured: hasMetaCapi,
    sendLeadEvent: notifyMeta,
  } = dependencies;
  const text = dependencies.formatOrderText(durableOrder);

  if (hasTelegram()) {
    notifyTelegram(text)
      .then(() => {
        markTelegramSent(orderId).catch((err) => console.error('[order] DB update failed:', err));
      })
      .catch((err) => console.error('[order] Telegram notify failed:', err.message));
  }

  if (hasMetaCapi()) {
    notifyMeta({
      name: durableOrder.name,
      phone: durableOrder.phone,
      country: durableOrder.country,
      postalCode: durableOrder.postalCode,
      eventId: durableOrder.eventId,
      fbp: req.body.fbp,
      fbc: req.body.fbc,
      eventSourceUrl: req.body.eventSourceUrl,
      clientIp: req.ip,
      userAgent: req.get('user-agent'),
      productName: durableOrder.productName,
      productId: durableOrder.productId,
      value: durableOrder.price,
    }).catch((err) => console.error('[order] Meta CAPI failed:', err.message));
  }

  return text;
}

export function createOrderHandler(overrides = {}) {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };

  return async function handleOrder(req, res) {
    // Honeypot: bots fill the hidden form field — pretend success, drop silently.
    if (req.body?._gotcha) return res.json({ ok: true });

    const invalid = dependencies.validateOrder(req.body);
    if (invalid) return res.status(400).json({ error: invalid });

    try {
      const authoritativeProduct = dependencies.resolveOrderProduct(
        await dependencies.readOrSeedCatalog(),
        req.body.productId,
      );
      if (!authoritativeProduct) return res.status(404).json({ error: 'Product not found' });

      const durableOrder = buildDurableOrder(req.body, authoritativeProduct);
      const { id: orderId, created } = await dependencies.saveOrder(durableOrder);
      if (!created) return res.json({ ok: true });

      console.log(`[order] saved id=${orderId} product=${durableOrder.productId}`);
      if (!dependencies.telegramConfigured() && !dependencies.emailConfigured()) {
        console.error('[order] saved but no notification channel is configured');
      }

      if (dependencies.emailConfigured()) {
        try {
          await dependencies.sendOrderEmail(
            'Nueva solicitud de pedido — Mirage Muebles',
            dependencies.formatOrderText(durableOrder),
          );
          await dependencies.markOrderEmailSent(orderId);
        } catch (err) {
          console.error('[order] email notify failed:', err);
        }
      }

      sendBestEffortEvents(req, orderId, durableOrder, dependencies);
      return res.json({ ok: true });
    } catch (err) {
      console.error('order POST failed', err);
      return res.status(500).json({ error: 'Failed to send order' });
    }
  };
}

export const handleOrder = createOrderHandler();
