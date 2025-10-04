// src/lib/image-analysis.ts
import { TicketCategory, TicketPriority } from '@prisma/client'
import { GoogleGenerativeAI } from '@google/generative-ai'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */
export interface MaintenanceAnalysis {
  category: TicketCategory
  priority: TicketPriority
  confidence: number          // 0 → 1
  description?: string        // short explanation / summary
}

/* ------------------------------------------------------------------ */
/*  Keyword heuristics (instant, 0-cost)                              */
/* ------------------------------------------------------------------ */
const CATEGORY_KEYWORDS: Record<TicketCategory, string[]> = {
  [TicketCategory.PLUMBING]: [
    'leak','water','faucet','toilet','drain','pipe','shower','bath',
    'sink','disposal','flooding','clogged','dripping'
  ],
  [TicketCategory.ELECTRICAL]: [
    'outlet','switch','light','electric','power','breaker','wiring',
    'sparks','flickering','dim'
  ],
  [TicketCategory.HVAC]: [
    'heat','cold','ac','a/c','air','conditioning','thermostat','vent',
    'temperature','hot','cool','fan','filter'
  ],
  [TicketCategory.APPLIANCE]: [
    'refrigerator','fridge','stove','oven','dishwasher','washer',
    'dryer','microwave','garbage disposal','freezer'
  ],
  [TicketCategory.PEST_CONTROL]: [
    'bug','roach','ant','spider','mouse','rat','pest',
    'infestation','exterminator'
  ],
  [TicketCategory.SECURITY]: [
    'lock','door','window','key','broken','security','deadbolt','handle'
  ],
  [TicketCategory.COSMETIC]: [
    'paint','wall','ceiling','floor','carpet','tile','scratch',
    'hole','stain','chip','crack'
  ],
  [TicketCategory.OTHER]:   [],
  [TicketCategory.UNKNOWN]: []
}

const EMERGENCY_KEYWORDS = [
  'flood','gas','smoke','fire','sparks','electrical fire',
  'no heat','no power','broken lock','security','emergency','urgent',
  'major leak','water everywhere','can’t get in','locked out'
]

const HIGH_PRIORITY_KEYWORDS = [
  'not working','broken','major','significant','important','asap',
  'soon as possible','refrigerator','stove','heat','ac','a/c'
]

/* ------------------------------------------------------------------ */
/*  Public helper                                                     */
/* ------------------------------------------------------------------ */

/** Combine text heuristics with optional Gemini Vision analysis. */
export async function analyzeMaintenanceIssue(
  description: string,
  imageUrls: string[]
): Promise<MaintenanceAnalysis> {
  // 1) Cheap text heuristic
  const kw = keywordAnalysis(description)

  // 2) Vision (if configured and we actually have images)
  const apiKey = process.env.GEMINI_API_KEY
  if (imageUrls.length && apiKey) {
    try {
      const parts = await imagesToInlineParts(imageUrls.slice(0, 4)) // cap to 4 images
      if (parts.length) {
        const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
        const client = new GoogleGenerativeAI(apiKey)
        const model = client.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 128,
            // Ask the SDK to return JSON. (Handled by newer SDKs)
            responseMimeType: 'application/json',
          } as any,
        })

        const instruction = [
          'You are a maintenance triage assistant.',
          'Look at the attached image(s) and decide:',
          `- category: one of ${Object.values(TicketCategory).join(', ')}`,
          '- priority: one of EMERGENCY, HIGH, MEDIUM, LOW',
          '- short_reason: 3-12 words explaining why.',
          '',
          'Return ONLY minified JSON like:',
          '{"category":"HVAC","priority":"HIGH","short_reason":"Condensate line leaking"}',
        ].join('\n')

        const res = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: instruction }, ...parts] }],
        })

        const text = res.response.text()
        const parsed = parseJsonLoose(text)

        const cat = normalizeCategory(parsed?.category) ?? kw.category
        const pri = normalizePriority(parsed?.priority) ?? kw.priority
        const reason = typeof parsed?.short_reason === 'string' && parsed.short_reason.trim().length
          ? parsed.short_reason.trim()
          : description

        // Confidence heuristic: bump if model agrees with keywords
        let conf = 0.85
        if (cat === kw.category) conf += 0.05
        if (pri === kw.priority) conf += 0.05

        return { category: cat, priority: pri, confidence: Math.min(conf, 0.95), description: reason }
      }
    } catch (err) {
      console.error('Gemini vision failed', err)
      // fall through to keyword result
    }
  }

  // 3) Fallback to text-only
  return { category: kw.category, priority: kw.priority, confidence: kw.confidence, description }
}

/* ------------------------------------------------------------------ */
/*  Internals                                                         */
/* ------------------------------------------------------------------ */

function keywordAnalysis(textRaw: string) {
  const text = (textRaw || '').toLowerCase()

  // category by max keyword matches
  let bestCat: TicketCategory = TicketCategory.UNKNOWN
  let bestHits = 0
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS) as [TicketCategory, string[]][]) {
    const hits = words.reduce((sum, w) => sum + (text.includes(w) ? 1 : 0), 0)
    if (hits > bestHits) {
      bestHits = hits
      bestCat = cat
    }
  }

  // priority
  let priority: TicketPriority = TicketPriority.MEDIUM
  if (EMERGENCY_KEYWORDS.some((k) => text.includes(k))) priority = TicketPriority.EMERGENCY
  else if (HIGH_PRIORITY_KEYWORDS.some((k) => text.includes(k))) priority = TicketPriority.HIGH
  else if (bestCat === TicketCategory.COSMETIC) priority = TicketPriority.LOW

  return {
    category: bestCat,
    priority,
    confidence: bestHits ? 0.8 : 0.3,
  }
}

function normalizeCategory(v?: string): TicketCategory | null {
  if (!v) return null
  const s = v.toUpperCase().replace(/[^A-Z_]/g, '')
  if ((TicketCategory as any)[s]) return s as TicketCategory

  // Common synonyms
  if (['AC', 'HVAC', 'AIRCONDITIONING', 'AIR_CONDITIONING', 'A_C'].includes(s)) return TicketCategory.HVAC
  if (['ELECTRIC', 'ELECTRICALISSUE'].includes(s)) return TicketCategory.ELECTRICAL
  if (['PLUMB', 'WATER'].includes(s)) return TicketCategory.PLUMBING
  if (['APPLIANCES'].includes(s)) return TicketCategory.APPLIANCE
  if (['PEST', 'PESTS', 'VERMIN'].includes(s)) return TicketCategory.PEST_CONTROL
  if (['LOCKS', 'SECURITYISSUE'].includes(s)) return TicketCategory.SECURITY
  if (['COSMETICS'].includes(s)) return TicketCategory.COSMETIC
  if (['OTHERISSUE', 'MISC', 'GENERAL'].includes(s)) return TicketCategory.OTHER
  return null
}

function normalizePriority(v?: string): TicketPriority | null {
  if (!v) return null
  const s = v.toUpperCase().replace(/[^A-Z_]/g, '')
  if ((TicketPriority as any)[s]) return s as TicketPriority
  if (s === 'URGENT') return TicketPriority.HIGH
  return null
}

function parseJsonLoose(text: string) {
  if (!text) return null
  const stripped = text.replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(stripped)
  } catch {
    // try to extract the first {...} block
    const m = stripped.match(/\{[\s\S]*\}/)
    if (m) {
      try { return JSON.parse(m[0]) } catch {}
    }
  }
  return null
}

async function imagesToInlineParts(urls: string[]) {
  const parts: Array<{ inlineData: { data: string; mimeType: string } }> = []
  for (const url of urls) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const mime = res.headers.get('content-type') || 'image/jpeg'
      if (!mime.startsWith('image/')) continue
      const buf = Buffer.from(await res.arrayBuffer())
      parts.push({ inlineData: { data: buf.toString('base64'), mimeType: mime } })
    } catch {
      // ignore individual image failures
    }
  }
  return parts
}
