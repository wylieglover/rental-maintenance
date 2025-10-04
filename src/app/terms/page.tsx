// src/app/terms/page.tsx
import Link from 'next/link'
import { Card } from '@/components/ui/card'

export const metadata = {
  title: 'Terms of Service — UnitFix',
  description:
    'The terms that govern your use of UnitFix, including account rules, acceptable use, SMS/MMS handling, limitations of liability, and more.',
}

// Keep explicit so it doesn’t change on re-deploys
const LAST_UPDATED = 'August 14, 2025'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Terms of Service</h1>
              <p className="mt-1 text-sm text-gray-500">Last updated: {LAST_UPDATED}</p>
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
            These Terms of Service (“<strong>Terms</strong>”) govern your access to and use of
            <strong> UnitFix</strong> (the “<strong>Service</strong>”). By accessing or
            using the Service, you agree to be bound by these Terms and our{' '}
            <Link href="/privacy" className="text-blue-600 hover:underline">
              Privacy Policy
            </Link>
            . If you are using the Service on behalf of an organization, you represent that you
            have authority to bind that organization to these Terms.
          </p>
        </Card>

        {/* TOC */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">What’s in these Terms</h2>
          <ul className="mt-3 list-inside list-disc text-sm text-gray-700">
            <li><a href="#agreement" className="text-blue-600 hover:underline">Agreement & eligibility</a></li>
            <li><a href="#accounts" className="text-blue-600 hover:underline">Accounts & access</a></li>
            <li><a href="#roles" className="text-blue-600 hover:underline">Organization roles</a></li>
            <li><a href="#acceptable-use" className="text-blue-600 hover:underline">Acceptable use</a></li>
            <li><a href="#sms" className="text-blue-600 hover:underline">SMS/MMS & telephony</a></li>
            <li><a href="#billing" className="text-blue-600 hover:underline">Fees & billing</a></li>
            <li><a href="#ip" className="text-blue-600 hover:underline">Intellectual property</a></li>
            <li><a href="#confidentiality" className="text-blue-600 hover:underline">Confidentiality</a></li>
            <li><a href="#third-party" className="text-blue-600 hover:underline">Third-party services</a></li>
            <li><a href="#warranty" className="text-blue-600 hover:underline">Disclaimers</a></li>
            <li><a href="#liability" className="text-blue-600 hover:underline">Limitation of liability</a></li>
            <li><a href="#indemnity" className="text-blue-600 hover:underline">Indemnification</a></li>
            <li><a href="#termination" className="text-blue-600 hover:underline">Term & termination</a></li>
            <li><a href="#law" className="text-blue-600 hover:underline">Governing law</a></li>
            <li><a href="#changes" className="text-blue-600 hover:underline">Changes to these Terms</a></li>
            <li><a href="#contact" className="text-blue-600 hover:underline">Contact</a></li>
          </ul>
        </Card>

        {/* Sections */}
        <Card id="agreement" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">1) Agreement & eligibility</h2>
          <p className="mt-3 text-sm text-gray-700">
            You must be at least the age of majority in your jurisdiction and capable of entering
            into a binding contract. You may use the Service only in compliance with these Terms
            and all applicable laws.
          </p>
        </Card>

        <Card id="accounts" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">2) Accounts & access</h2>
          <ul className="mt-3 list-inside list-disc text-sm text-gray-700">
            <li>Authentication is provided via Google Sign-In. You are responsible for safeguarding your credentials.</li>
            <li>You must provide accurate account information and keep it up to date.</li>
            <li>We may suspend or terminate access for policy violations or suspected misuse.</li>
          </ul>
        </Card>

        <Card id="roles" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">3) Organization roles</h2>
          <p className="mt-3 text-sm text-gray-700">
            The Service supports role-based access (e.g., OWNER, MANAGER, STAFF, TENANT). Your
            organization controls invitations, role assignments, and data visibility. You
            acknowledge that certain users in your organization may access and manage content
            created by others within the organization.
          </p>
        </Card>

        <Card id="acceptable-use" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">4) Acceptable use</h2>
          <ul className="mt-3 list-inside list-disc text-sm text-gray-700">
            <li>No illegal, fraudulent, or harmful activities.</li>
            <li>No harassment, hate speech, or content that violates others’ rights.</li>
            <li>No reverse engineering, scraping, or disrupting the Service.</li>
            <li>Only upload/send content you have the right to share; do not include highly sensitive personal data unless strictly necessary.</li>
          </ul>
        </Card>

        <Card id="sms" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">5) SMS/MMS & telephony</h2>
          <ul className="mt-3 list-inside list-disc text-sm text-gray-700">
            <li>We process tenant SMS/MMS and media to create and update tickets for your organization.</li>
            <li>Telephony features rely on third-party providers (e.g., SMS gateways). Availability and delivery are not guaranteed.</li>
            <li>You are responsible for complying with applicable messaging laws and obtaining any consents required to contact tenants.</li>
          </ul>
        </Card>

        <Card id="billing" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">6) Fees & billing</h2>
          <p className="mt-3 text-sm text-gray-700">
            If your plan includes paid features, you agree to pay all fees, taxes, and carrier
            charges disclosed at purchase or in your order form. Fees are typically billed in
            advance and are non-refundable except where required by law or explicitly stated
            otherwise.
          </p>
        </Card>

        <Card id="ip" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">7) Intellectual property</h2>
          <p className="mt-3 text-sm text-gray-700">
            We retain all rights, title, and interest in and to the Service, including software,
            designs, and trademarks. You retain rights to content you submit to the Service; you
            grant us a limited license to host, process, and display that content solely to provide
            the Service and as otherwise permitted by these Terms.
          </p>
        </Card>

        <Card id="confidentiality" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">8) Confidentiality</h2>
          <p className="mt-3 text-sm text-gray-700">
            We will not disclose your non-public information except to provide the Service, comply
            with law, or with your consent. You agree to keep confidential any non-public
            information about the Service that we disclose to you.
          </p>
        </Card>

        <Card id="third-party" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">9) Third-party services</h2>
          <p className="mt-3 text-sm text-gray-700">
            The Service integrates with third parties (e.g., Google Sign-In, SMS providers,
            storage, analytics). Their terms and privacy policies apply to their services. We are
            not responsible for third-party actions or availability.
          </p>
        </Card>

        <Card id="warranty" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">10) Disclaimers</h2>
          <p className="mt-3 text-sm text-gray-700">
            THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM EXTENT PERMITTED BY
            LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS
            FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. We do not guarantee uninterrupted or
            error-free operation, message delivery, or that content is accurate or complete.
          </p>
        </Card>

        <Card id="liability" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">11) Limitation of liability</h2>
          <p className="mt-3 text-sm text-gray-700">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEITHER WE NOR OUR SUPPLIERS WILL BE LIABLE
            FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES,
            OR FOR LOST PROFITS, REVENUE, DATA, OR GOODWILL. OUR TOTAL LIABILITY FOR ANY CLAIMS
            RELATING TO THE SERVICE IS LIMITED TO THE AMOUNTS YOU PAID FOR THE SERVICE IN THE
            12&nbsp;MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM.
          </p>
        </Card>

        <Card id="indemnity" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">12) Indemnification</h2>
          <p className="mt-3 text-sm text-gray-700">
            You will defend, indemnify, and hold us harmless from any claims, liabilities, and
            expenses (including reasonable attorneys’ fees) arising from your use of the Service,
            your content, or your violation of these Terms or applicable law.
          </p>
        </Card>

        <Card id="termination" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">13) Term & termination</h2>
          <p className="mt-3 text-sm text-gray-700">
            These Terms remain in effect until terminated. You may stop using the Service at any
            time. We may suspend or terminate access immediately for any breach or suspected
            misuse. Upon termination, your right to access the Service ceases, but provisions that
            by their nature should survive (e.g., IP, confidentiality, disclaimers, limitation of
            liability, indemnity) will survive.
          </p>
        </Card>

        <Card id="law" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">14) Governing law</h2>
          <p className="mt-3 text-sm text-gray-700">
            These Terms are governed by the laws applicable in your primary operating jurisdiction
            (or, if specified in an order form, that jurisdiction), without regard to conflict of
            laws principles. Venue and jurisdiction for any disputes will lie exclusively in the
            courts located there.
          </p>
        </Card>

        <Card id="changes" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">15) Changes to these Terms</h2>
          <p className="mt-3 text-sm text-gray-700">
            We may update these Terms from time to time. If changes are material, we will provide
            reasonable notice (e.g., in-app or by email). Your continued use of the Service after
            the effective date constitutes acceptance of the updated Terms.
          </p>
        </Card>

        <Card id="contact" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">Contact</h2>
          <p className="mt-3 text-sm text-gray-700">
            Questions about these Terms? Email{' '}
            <a href="mailto:support@example.com" className="text-blue-600 hover:underline">
              support@example.com
            </a>. For privacy questions, see our{' '}
            <Link href="/privacy" className="text-blue-600 hover:underline">
              Privacy Policy
            </Link>.
          </p>
        </Card>
      </section>
    </main>
  )
}
