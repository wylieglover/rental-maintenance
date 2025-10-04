'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

function guessOrgFromHost(host?: string | null) {
  if (!host) return null;
  if (host.startsWith('localhost') || /^\d+\.\d+\.\d+\.\d+/.test(host)) return null;
  const [first] = host.split('.');
  if (!first || first === 'www') return null;
  return first;
}

export default function NeedAccessPage() {
  const params = useSearchParams();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const orgFromQuery = params.get('org') || undefined;
  const orgFromHost = typeof window !== 'undefined' ? guessOrgFromHost(window.location.hostname) : null;
  const [org, setOrg] = useState<string | undefined>(orgFromQuery || orgFromHost || undefined);

  useEffect(() => {
    if (!org && orgFromQuery) setOrg(orgFromQuery);
  }, [org, orgFromQuery]);

  const canSubmit = !!org && /\S+@\S+\.\S+/.test(email);

  const submit = async () => {
    if (!org) return;
    try {
      const res = await fetch(`/api/orgs/${encodeURIComponent(org)}/access-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Request failed');
      toast.success('Request sent. An admin will review it.');
      router.push('/signin'); // back to sign-in
    } catch (e: any) {
      toast.error(e?.message || 'Could not send request');
    }
  };

  return (
    <main className="mx-auto max-w-md p-6">
      <Card className="space-y-4 p-6">
        <h1 className="text-xl font-semibold">Request access</h1>
        <p className="text-sm text-gray-600">
          Tell the administrators you need access {org ? `to “${org}”` : ''}.
        </p>

        {/* Org slug (editable if we couldn't detect it) */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Organisation (slug)</label>
          <Input
            placeholder="e.g. acme"
            value={org ?? ''}
            onChange={(e) => setOrg(e.target.value.trim() || undefined)}
          />
          <p className="mt-1 text-xs text-gray-500">
            Usually the subdomain, e.g. <code>acme.yourapp.com</code> → <b>acme</b>.
          </p>
        </div>

        {/* Email */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Your email</label>
          <Input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Message (optional) */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Message (optional)</label>
          <textarea
            rows={4}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Share any context (role, property, etc.)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => router.push('/signin')}>Back</Button>
          <Button onClick={submit} disabled={!canSubmit}>Send request</Button>
        </div>
      </Card>
    </main>
  );
}
