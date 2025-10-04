// src/lib/logger.ts
// Centralized pino instance so every layer shares the same structured logger.
// Usage:
//   import logger from '@/lib/logger'
//   logger.info({ foo: 'bar' }, 'message')
//
// In Lambda / Vercel functions, pino logs are automatically picked up by
// the platform and appear as JSON in the dashboard.

import pino from 'pino'

/**
 * In production, default to `info` to avoid noisy debug logs.
 * In preview/local dev (`vercel dev` or `next dev`), allow `debug`.
 */
const level: pino.Level = process.env.NODE_ENV === 'production' ? 'info' : 'debug'

/**
 * You can enrich logs with request‑id correlation by calling:
 *   const requestLogger = logger.child({ reqId })
 * from inside a route or middleware.
 */
const logger = pino({ level, name: 'rental-maintenance' })

export default logger
