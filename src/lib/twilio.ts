import Twilio from 'twilio'
import { put } from '@vercel/blob'
import * as crypto from 'crypto'
import { prisma } from '@/lib/prisma'

/* ---------- client singleton ---------- */
export const twilioClient = Twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

/* ---------- helpers ---------- */
const ACCT = process.env.TWILIO_ACCOUNT_SID!
const AUTH = process.env.TWILIO_AUTH_TOKEN!
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN

function assertTwilioMediaUrl(u: string) {
  // Only allow canonical media URLs for *this* account
  const ok = new RegExp(
    `^https://api\\.twilio\\.com/2010-04-01/Accounts/${ACCT}/Messages/[^/]+/Media/[^/]+$`
  ).test(u)
  if (!ok) throw new Error('Invalid media URL')
}

async function fetchMediaBytes(url: string) {
  assertTwilioMediaUrl(url)
  const res = await fetch(url, {
    headers: {
      Authorization:
        'Basic ' + Buffer.from(`${ACCT}:${AUTH}`).toString('base64'),
    },
  })
  if (!res.ok) throw new Error(`Twilio media fetch failed: ${res.status}`)
  return res.arrayBuffer()
}

/* ---------- types ---------- */
export interface SMSOptions {
  to: string
  from?: string
  body: string
  mediaUrl?: string[]
  /** Optional: pick best from-number based on org/property when no Messaging Service is set */
  orgId?: string
  propertyId?: string
}

export class TwilioService {
  private client = twilioClient

  /* --- SMS helpers ---------------------------------------------------- */
  async sendSMS(opts: SMSOptions) {
    const base: any = { body: opts.body, to: opts.to }

    // Prefer Messaging Service if configured
    if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
      base.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID
    } else {
      // Use explicit "from" if provided (e.g., webhooks reply via the incoming number)
      let from = opts.from

      // If not provided, try to choose an org/property-scoped active number
      if (!from && opts.orgId) {
        // 1) property-scoped active number
        if (opts.propertyId) {
          const n = await prisma.orgNumber.findFirst({
            where: {
              organisationId: opts.orgId,
              propertyId: opts.propertyId,
              active: true,
            },
            orderBy: { createdAt: 'desc' },
          })
          from = n?.e164
        }
        // 2) org-wide active number
        if (!from) {
          const n = await prisma.orgNumber.findFirst({
            where: { organisationId: opts.orgId, propertyId: null, active: true },
            orderBy: { createdAt: 'desc' },
          })
          from = n?.e164
        }
      }

      base.from =
        from ??
        process.env.TWILIO_FROM_E164 ??
        process.env.TWILIO_PHONE_NUMBER
    }

    if (opts.mediaUrl) base.mediaUrl = opts.mediaUrl
    await this.client.messages.create(base)
  }

  async sendMaintenanceUpdate(
    tenantPhone: string,
    ticketId: string,
    status: string,
    note?: string,
    ctx?: { orgId?: string; propertyId?: string; from?: string }
  ) {
    const body =
      `🔧 Ticket #${ticketId.slice(-6)} update: ${status}` +
      (note ? `\n${note}` : '')
    await this.sendSMS({ to: tenantPhone, body, ...ctx })
  }

  async sendCompletionNotification(
    tenantPhone: string,
    ticketId: string,
    note?: string,
    ctx?: { orgId?: string; propertyId?: string; from?: string }
  ) {
    let body = `✅ Ticket #${ticketId.slice(-6)} has been completed!`
    if (note) body += `\n\nNotes: ${note}`
    body +=
      '\n\nReply "OK" if everything looks good, or send photos if there are still issues.'
    await this.sendSMS({ to: tenantPhone, body, ...ctx })
  }

  /* --- Media download with Blob (preferred) or proxy fallback --------- */
  async downloadMediaToBlob(
    mediaUrl: string,
    contentType = 'image/jpeg'
  ): Promise<string> {
    if (BLOB_TOKEN) {
      // Store file on Vercel Blob → public URL
      const bytes = await fetchMediaBytes(mediaUrl)
      const filename = `tickets/inbound-${Date.now()}-${crypto.randomUUID()}`
      
      // Fix: Convert ArrayBuffer to Buffer which is compatible with PutBody
      const buffer = Buffer.from(bytes)
      
      const file = await put(filename, buffer, {
        access: 'public',
        contentType,
        token: BLOB_TOKEN,
      })
      return file.url
    }

    // Fallback: serve via our proxy (no public token needed)
    assertTwilioMediaUrl(mediaUrl)
    const u = encodeURIComponent(mediaUrl)
    const ct = encodeURIComponent(contentType)
    return `/api/twilio/media?u=${u}&ct=${ct}`
  }

  /* --- Webhook HMAC validation --------------------------------------- */
  validateWebhookSignature(
    signature: string,
    url: string,
    params: Record<string, string>
  ) {
    return Twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN!,
      signature,
      url,
      params
    )
  }
}

/* singleton */
export const twilioService = new TwilioService()