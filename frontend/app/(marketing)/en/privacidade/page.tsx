export const metadata = {
  title: "Privacy Policy — TeamAgents",
  description: "How TeamAgents handles data, including Google (Gmail) data.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-[15px] leading-relaxed text-black/80">
      <h1 className="text-2xl font-semibold text-black">Privacy Policy</h1>
      <p className="mt-1 text-sm text-black/45">Last updated: June 9, 2026</p>

      <p className="mt-6">
        TeamAgents (operated by Bitzen Software) is an AI-agent platform for sales and executive
        teams. This policy explains what data we collect, how we use it, and the rights you have over
        it. By using the service, you agree to what is described here.
      </p>

      <Section titulo="1. Data we collect">
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Account data:</strong> email and user identifier, company name.</li>
          <li><strong>Data you enter:</strong> campaigns, skills (company knowledge), email/meeting-notes text you paste or upload.</li>
          <li><strong>Google (Gmail) data, if you connect the account:</strong> content and metadata of your recent emails (sender, subject, body), accessed in read-only mode only.</li>
          <li><strong>Access tokens (OAuth):</strong> stored securely to enable syncing, associated only with your company.</li>
        </ul>
      </Section>

      <Section titulo="2. How we use Google data">
        <p>
          When you connect your Gmail, we access your recent emails <strong>solely to process them
          with AI</strong> and return an executive summary — priorities, actions and decisions. Access
          is <strong>read-only</strong> (scope{" "}
          <code className="rounded bg-black/8 px-1">gmail.readonly</code>). We never send, alter or
          delete emails.
        </p>
        <p className="mt-3">
          Email content is processed in memory at the moment of syncing. We store the result of the
          processing (the summary) in your account; we do not keep persistent copies of the original
          messages beyond what is needed for processing.
        </p>
      </Section>

      <Section titulo="3. Limited Use (Google's Limited Use Policy)">
        <p className="rounded-lg border border-black/10 bg-black/[0.02] p-4">
          TeamAgents' use and transfer of information received from Google APIs adheres to the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            className="text-brand underline"
            target="_blank"
            rel="noreferrer"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements. Specifically: we do not use Gmail data for
          advertising; we do not sell it; we do not transfer it to third parties except to operate or
          improve the service with your consent, for security reasons, or when required by law; and we
          do not allow humans to read the data unless with your explicit consent, for security, or
          when required by law.
        </p>
      </Section>

      <Section titulo="4. Sharing and processors">
        <p>
          We do not sell personal data. To operate the service, we rely on infrastructure and AI
          providers that process data on our behalf: Supabase (database), Render (backend), Vercel
          (frontend) and Anthropic (AI models, to generate the summaries). These providers are subject
          to confidentiality and security obligations.
        </p>
      </Section>

      <Section titulo="5. Retention and deletion">
        <p>
          We keep the data while your account is active. You can <strong>disconnect Gmail</strong>{" "}
          at any time in Settings → Email, which deletes the stored tokens. You can also revoke access
          directly at{" "}
          <a href="https://myaccount.google.com/permissions" className="text-brand underline" target="_blank" rel="noreferrer">
            myaccount.google.com/permissions
          </a>
          . To delete your account and associated data, contact us.
        </p>
      </Section>

      <Section titulo="6. Security">
        <p>
          We use encrypted connections (HTTPS) and per-company isolated credential storage. Despite
          our efforts, no system is 100% secure; please report any security concern to us.
        </p>
      </Section>

      <Section titulo="7. Contact">
        <p>
          Questions about privacy? Write to{" "}
          <a href="mailto:bitzensoftware@bitzen.app" className="text-brand underline">
            bitzensoftware@bitzen.app
          </a>
          .
        </p>
      </Section>
    </main>
  );
}

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-2 text-lg font-semibold text-black">{titulo}</h2>
      {children}
    </section>
  );
}
