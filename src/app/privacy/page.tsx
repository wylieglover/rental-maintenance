// src/app/privacy/page.tsx
import Link from 'next/link'
import { Card } from '@/components/ui/card'

export const metadata = {
  title: 'Privacy Policy — UnitFix',
  description:
    'How UnitFix collects, uses, and protects your information, including SMS/MMS content used to create maintenance tickets.',
}

// Keep the date explicit so it doesn’t change on re-deploys.
const LAST_UPDATED = 'August 14, 2025'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Page header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Privacy Policy</h1>
              <p className="mt-1 text-sm text-gray-500">
                Last updated: {LAST_UPDATED}
              </p>
            </div>
            <Link
              href="/"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Intro */}
        <Card className="p-6">
          <p className="text-sm text-gray-600">
            This Privacy Policy explains how <strong>UnitFix</strong> (“we,” “us,” or
            “our”) collects, uses, and shares information when you use our websites, the
            dashboard, and related services that turn tenant SMS/MMS into maintenance tickets
            (the “Services”). If you do not agree with this policy, please do not use the
            Services.
          </p>
        </Card>

        {/* Table of contents */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">What’s in this policy</h2>
          <ul className="mt-3 list-inside list-disc text-sm text-gray-700">
            <li><a href="#info-we-collect" className="text-blue-600 hover:underline">Information we collect</a></li>
            <li><a href="#how-we-use" className="text-blue-600 hover:underline">How we use information</a></li>
            <li><a href="#sharing" className="text-blue-600 hover:underline">How we share information</a></li>
            <li><a href="#legal-bases" className="text-blue-600 hover:underline">Legal bases (EEA/UK)</a></li>
            <li><a href="#retention" className="text-blue-600 hover:underline">Retention</a></li>
            <li><a href="#security" className="text-blue-600 hover:underline">Security</a></li>
            <li><a href="#your-rights" className="text-blue-600 hover:underline">Your rights & choices</a></li>
            <li><a href="#international" className="text-blue-600 hover:underline">International transfers</a></li>
            <li><a href="#children" className="text-blue-600 hover:underline">Children’s privacy</a></li>
            <li><a href="#changes" className="text-blue-600 hover:underline">Changes to this policy</a></li>
            <li><a href="#contact" className="text-blue-600 hover:underline">Contact us</a></li>
          </ul>
        </Card>

        {/* Information we collect */}
        <Card id="info-we-collect" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">Information we collect</h2>
          <div className="mt-3 space-y-3 text-sm text-gray-700">
            <p className="font-medium">Account & organization data</p>
            <ul className="list-inside list-disc">
              <li>Google Sign-In profile details (e.g., name, email, avatar) to authenticate users.</li>
              <li>Organization metadata (name, slug/subdomain) and role assignments (OWNER/MANAGER/STAFF/TENANT).</li>
            </ul>

            <p className="mt-3 font-medium">Ticket & communications content</p>
            <ul className="list-inside list-disc">
              <li>Tenant SMS/MMS messages and photos sent to your organization’s number (via our telephony provider).</li>
              <li>System notes, comments, and attachments added by staff in the dashboard.</li>
            </ul>

            <p className="mt-3 font-medium">Device & usage</p>
            <ul className="list-inside list-disc">
              <li>Log data such as IP address, browser type, pages viewed, timestamps, and referral URLs.</li>
              <li>Cookies or similar technologies to keep you signed in and to improve the app.</li>
            </ul>

            <p className="mt-3 font-medium">Support</p>
            <ul className="list-inside list-disc">
              <li>Any information you send to support (e.g., email content, attachments).</li>
            </ul>
          </div>
        </Card>

        {/* How we use */}
        <Card id="how-we-use" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">How we use information</h2>
          <ul className="mt-3 list-inside list-disc text-sm text-gray-700">
            <li>Provide and secure the Services, including authentication and role-based access.</li>
            <li>Create, store, and manage tickets based on tenant SMS/MMS and staff actions.</li>
            <li>Process uploaded or messaged images to extract relevant details that help triage tickets.</li>
            <li>Operate organization phone numbers and route messages (e.g., via our telephony vendor).</li>
            <li>Monitor usage, fix issues, and improve performance and UX.</li>
            <li>Comply with legal obligations and enforce our Terms.</li>
          </ul>
        </Card>

        {/* Sharing */}
        <Card id="sharing" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">How we share information</h2>
          <ul className="mt-3 list-inside list-disc text-sm text-gray-700">
            <li><span className="font-medium">Vendors / subprocessors.</span> We work with service providers (e.g., cloud hosting, logging/analytics, email, and telephony/SMS providers such as Twilio) that process data for us under contract.</li>
            <li><span className="font-medium">Organization access.</span> Within your org, data is visible to authorized users based on their role.</li>
            <li><span className="font-medium">Legal reasons.</span> We may disclose information to comply with law, protect rights, or respond to lawful requests.</li>
            <li><span className="font-medium">Business transfers.</span> If we undergo a merger, acquisition, or asset sale, your data may transfer as part of that transaction.</li>
          </ul>
        </Card>

        {/* Legal bases */}
        <Card id="legal-bases" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">Legal bases for processing (EEA/UK)</h2>
          <ul className="mt-3 list-inside list-disc text-sm text-gray-700">
            <li><span className="font-medium">Contract.</span> To provide the Services to you and your organization.</li>
            <li><span className="font-medium">Legitimate interests.</span> To secure and improve the Services and support customers.</li>
            <li><span className="font-medium">Consent.</span> Where required (e.g., certain cookies); you can withdraw consent at any time.</li>
            <li><span className="font-medium">Legal obligation.</span> To comply with applicable laws.</li>
          </ul>
        </Card>

        {/* Retention */}
        <Card id="retention" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">Retention</h2>
          <p className="mt-3 text-sm text-gray-700">
            We retain information for as long as necessary to provide the Services, comply with
            legal obligations, resolve disputes, and enforce agreements. Organizations may request
            deletion of specific tenant content or accounts subject to applicable law and
            technical feasibility.
          </p>
        </Card>

        {/* Security */}
        <Card id="security" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">Security</h2>
          <p className="mt-3 text-sm text-gray-700">
            We use administrative, technical, and physical safeguards appropriate to the nature of
            the data. No method of transmission or storage is 100% secure; we cannot guarantee
            absolute security.
          </p>
        </Card>

        {/* Rights & choices */}
        <Card id="your-rights" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">Your rights & choices</h2>
          <ul className="mt-3 list-inside list-disc text-sm text-gray-700">
            <li>Access, update, or delete certain data from within the app (subject to org policies).</li>
            <li>Request a copy, correction, or deletion by contacting us (see below). We may ask for verification.</li>
            <li>Disable cookies in your browser; some features may not work as intended.</li>
            <li>For EEA/UK residents, you may have additional rights under GDPR, including data portability and the right to object or restrict processing.</li>
            <li>California residents may have rights under the CCPA/CPRA, including requesting details about categories of data collected and deletion, subject to exceptions.</li>
          </ul>
        </Card>

        {/* International transfers */}
        <Card id="international" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">International data transfers</h2>
          <p className="mt-3 text-sm text-gray-700">
            We may process and store information in countries other than where you live. Where
            required, we use appropriate safeguards (such as Standard Contractual Clauses) for
            cross-border transfers.
          </p>
        </Card>

        {/* Children */}
        <Card id="children" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">Children’s privacy</h2>
          <p className="mt-3 text-sm text-gray-700">
            Our Services are not directed to children under 13 (or the age required by your
            jurisdiction). We do not knowingly collect personal information from children. If you
            believe a child provided us information, please contact us and we will take
            appropriate steps.
          </p>
        </Card>

        {/* Changes */}
        <Card id="changes" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">Changes to this policy</h2>
          <p className="mt-3 text-sm text-gray-700">
            We may update this Privacy Policy from time to time. When we do, we will revise the
            “Last updated” date above. If changes are material, we may provide additional notice
            (e.g., in-app or by email).
          </p>
        </Card>

        {/* Contact */}
        <Card id="contact" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">Contact us</h2>
          <p className="mt-3 text-sm text-gray-700">
            If you have questions about this policy or our data practices, contact us at{' '}
            <a href="mailto:support@example.com" className="text-blue-600 hover:underline">
              support@example.com
            </a>.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            If you are an EEA/UK resident and believe your concerns were not addressed, you may
            have the right to lodge a complaint with your local supervisory authority.
          </p>
        </Card>
      </section>
    </main>
  )
}
