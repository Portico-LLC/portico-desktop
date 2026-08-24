import { Link } from 'react-router-dom';
import { LegalLayout, LegalSection } from '@/components/legal/LegalLayout';

export function Terms() {
  return (
    <LegalLayout title="Terms of Service" effectiveDate="August 23, 2026">
      <p className="text-[15px] leading-relaxed text-ink-600">
        These Terms of Service (“Terms”) govern access to and use of Portico, a client-portal
        workspace for studios that lets a studio owner (“Studio”, “you”) manage clients, projects,
        tasks, invoices, messaging, and shared secrets with their team and their clients. Portico is
        operated by Mouhanned Jawadi (“we”, “us”, “our”), reachable at{' '}
        <a href="mailto:mouhanned.j18@gmail.com" className="font-medium text-brass-700 hover:text-brass-800">
          mouhanned.j18@gmail.com
        </a>
        . By creating an account, logging in, or otherwise using Portico, you agree to these Terms.
        If you don’t agree, don’t use the service.
      </p>

      <LegalSection number={1} title="Who this applies to">
        <p>Portico has three kinds of accounts, and these Terms apply to all of them:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong className="text-ink-900">Studio owners</strong> — create the workspace, invite employees and clients, and are responsible for the workspace overall.</li>
          <li><strong className="text-ink-900">Employees</strong> — invited by a studio owner, with access scoped to the projects they’re assigned to.</li>
          <li><strong className="text-ink-900">Clients</strong> — invited by a studio to a private portal to track their own projects, invoices, and conversations with the studio.</li>
        </ul>
        <p>
          If you’re an employee or client, your access is controlled by the studio owner who invited
          you — they can create, modify, and revoke your account at any time.
        </p>
      </LegalSection>

      <LegalSection number={2} title="Accounts and eligibility">
        <p>
          You must provide accurate information when creating an account and keep your login
          credentials confidential. You’re responsible for all activity that happens under your
          account. Tell us immediately if you suspect unauthorized access.
        </p>
        <p>
          Studio owners are responsible for the employees and clients they invite, including making
          sure those individuals are authorized to access the studio’s data through Portico.
        </p>
      </LegalSection>

      <LegalSection number={3} title="Studio content and client data">
        <p>
          Anything a Studio uploads or enters into Portico — client records, project details, tasks,
          invoices, messages, files, and Vault items — belongs to the Studio (“Studio Content”). We
          don’t claim ownership over it. You’re solely responsible for having the right to store and
          share that content through Portico, including any personal data about your own clients.
        </p>
        <p>
          We act as a processor of Studio Content on your behalf: we store and transmit it so the
          service works, but we don’t use it for any purpose beyond operating, securing, and
          improving Portico, as described in our{' '}
          <Link to="/privacy" className="font-medium text-brass-700 hover:text-brass-800">
            Privacy Policy
          </Link>
          . If you use the Brain feature, the relevant Studio Content is sent to our AI provider,
          OpenAI, solely to generate a response to your request — never to train any AI model. See
          the Privacy Policy's "Brain AI feature" section for details.
        </p>
      </LegalSection>

      <LegalSection number={4} title="The Vault and zero-knowledge encryption">
        <p>
          Portico’s Vault feature is end-to-end (“zero-knowledge”) encrypted: items are encrypted
          and decrypted in your browser using keys derived from your Vault passphrase. We store only
          encrypted data and cannot read Vault contents, even if compelled to — we simply don’t hold
          the keys.
        </p>
        <p>
          This means <strong className="text-ink-900">we cannot recover a lost Vault passphrase</strong>.
          You’re given a one-time recovery kit when you set up the Vault — if both your passphrase
          and recovery kit are lost, the encrypted items are permanently unrecoverable. This is an
          inherent trade-off of true zero-knowledge encryption, not a service failure, and by using
          the Vault you accept this risk.
        </p>
      </LegalSection>

      <LegalSection number={5} title="Acceptable use">
        <p>You agree not to use Portico to:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Violate any applicable law, or the rights of any third party (including your own clients);</li>
          <li>Upload malicious code, or attempt to probe, scan, or breach the security of the service;</li>
          <li>Interfere with or disrupt the service, or access it through automated means beyond normal use;</li>
          <li>Use another person’s account without permission, or misrepresent your affiliation with a Studio.</li>
        </ul>
        <p>We may suspend or terminate accounts that violate this section.</p>
      </LegalSection>

      <LegalSection number={6} title="Subscriptions and payment">
        <p>
          Where Portico is offered on a paid basis, fees, billing cycles, and any trial terms will be
          presented at signup or in your workspace’s billing settings. Fees are non-refundable except
          where required by law or explicitly stated otherwise. We may change pricing on a going-
          forward basis with reasonable notice.
        </p>
      </LegalSection>

      <LegalSection number={7} title="Intellectual property">
        <p>
          Portico — its code, design, branding, and underlying technology — is our property or that
          of our licensors. These Terms don’t grant you any rights to it beyond what’s needed to use
          the service as intended. You retain all rights to your Studio Content.
        </p>
      </LegalSection>

      <LegalSection number={8} title="Termination">
        <p>
          Studio owners may stop using Portico and request deletion of their workspace at any time by
          contacting us. We may suspend or terminate access for violation of these Terms, non-payment
          (where applicable), or risk to the security or integrity of the service. Where reasonably
          possible, we’ll give notice first.
        </p>
      </LegalSection>

      <LegalSection number={9} title="Disclaimers and limitation of liability">
        <p>
          Portico is provided “as is” and “as available,” without warranties of any kind, express or
          implied, including fitness for a particular purpose or non-infringement. We don’t guarantee
          the service will be uninterrupted, error-free, or completely secure.
        </p>
        <p>
          To the fullest extent permitted by law, we are not liable for indirect, incidental,
          consequential, or punitive damages, or for lost data, profits, or business, arising from
          your use of Portico — including data lost due to a forgotten Vault passphrase as described
          in Section 4. Our total liability for any claim relating to the service is limited to the
          amount you paid us in the twelve months before the claim arose.
        </p>
      </LegalSection>

      <LegalSection number={10} title="Changes to these Terms">
        <p>
          We may update these Terms as Portico evolves. If we make material changes, we’ll update the
          effective date above and, where practical, notify Studio owners directly. Continued use of
          Portico after changes take effect means you accept the updated Terms.
        </p>
      </LegalSection>

      <LegalSection number={11} title="Contact">
        <p>
          Questions about these Terms? Reach out to{' '}
          <a href="mailto:mouhanned.j18@gmail.com" className="font-medium text-brass-700 hover:text-brass-800">
            mouhanned.j18@gmail.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
