import { Link } from 'react-router-dom';
import { LegalLayout, LegalSection } from '@/components/legal/LegalLayout';

export function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" effectiveDate="August 23, 2026">
      <p className="text-[15px] leading-relaxed text-ink-600">
        This Privacy Policy explains what information Portico collects, why, and how it’s handled.
        Portico is operated by Mouhanned Jawadi, reachable at{' '}
        <a href="mailto:mouhanned.j18@gmail.com" className="font-medium text-brass-700 hover:text-brass-800">
          mouhanned.j18@gmail.com
        </a>{' '}
        for any privacy question or request. This policy applies to studio owners, employees, and
        clients using Portico. See also our{' '}
        <Link to="/terms" className="font-medium text-brass-700 hover:text-brass-800">
          Terms of Service
        </Link>
        .
      </p>

      <LegalSection number={1} title="Information we collect">
        <p>
          <strong className="text-ink-900">Account information</strong> — name, email address,
          hashed password, company name, and role (owner, employee, or client), provided when an
          account is created.
        </p>
        <p>
          <strong className="text-ink-900">Studio content</strong> — client records, project and
          task details, invoices, messages, and files that a Studio or its clients enter into
          Portico. This may include personal data about a Studio’s own clients, which the Studio is
          responsible for having a lawful basis to store.
        </p>
        <p>
          <strong className="text-ink-900">Vault data</strong> — end-to-end encrypted secrets. We
          store only ciphertext, wrapped keys, and metadata needed to route access (see Section 3).
          We do not have the ability to read Vault contents.
        </p>
        <p>
          <strong className="text-ink-900">Usage and device data</strong> — basic technical
          information such as IP address, browser/device type, and log data (e.g. request
          timestamps, error logs) generated automatically as you use the service, used for security,
          debugging, and reliability.
        </p>
      </LegalSection>

      <LegalSection number={2} title="How we use information">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>To provide, operate, and maintain the core features of Portico (projects, tasks, invoices, messaging, notifications, the Brain graph, the Vault);</li>
          <li>To authenticate accounts and enforce access boundaries between studios, employees, and clients;</li>
          <li>To detect, investigate, and prevent security incidents, abuse, or fraud;</li>
          <li>To communicate with you about your account or material changes to the service;</li>
          <li>To fix bugs and improve reliability and performance.</li>
        </ul>
        <p>We do not sell personal information, and we do not use Studio Content to train third-party AI models.</p>
      </LegalSection>

      <LegalSection number={3} title="Zero-knowledge Vault encryption">
        <p>
          Vault items are encrypted and decrypted entirely in your browser. Your Vault passphrase
          never leaves your device, and the encryption keys used to protect your Vault items are
          derived from it locally. What reaches our servers is ciphertext and wrapped keys — data
          that is meaningless without a passphrase we never receive or store.
        </p>
        <p>
          Practically, this means: we cannot read your Vault items, we cannot hand them over in
          readable form even if legally compelled, and we cannot recover them if you lose both your
          passphrase and your one-time recovery kit. We can see metadata about Vault activity (e.g.
          that an item was created, updated, or fetched, and by whom) for audit-log purposes, but
          never the decrypted content itself.
        </p>
      </LegalSection>

      <LegalSection number={4} title="Who we share information with">
        <p>
          Within a workspace, information is shared according to the access model built into
          Portico — a Studio owner and the employees they assign can see the projects, tasks, and
          conversations relevant to their role; clients see only their own portal. We don’t share
          personal information with third parties for marketing purposes.
        </p>
        <p>
          We may use third-party infrastructure providers (for example, hosting and database
          providers) strictly to operate Portico, under obligations to protect your data. If you use
          the Brain feature, the project, task, and client data needed to answer your request is sent
          to OpenAI, our AI provider, as described in the next section. We may also disclose
          information if required by law, or to protect the rights, safety, or security of Portico,
          our users, or the public.
        </p>
      </LegalSection>

      <LegalSection number={5} title="The Brain AI feature">
        <p>
          Brain is an AI assistant, built on OpenAI's API, that can answer questions and draft work
          using your studio's projects, tasks, and clients. When you use Brain, the data needed to
          answer your request — the specific records already visible to your role, not your entire
          workspace — is sent to OpenAI to generate a response.
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-ink-900">No training.</strong> Neither we nor OpenAI use this
            data to train AI models. OpenAI's API traffic is governed by its API data-usage terms,
            which do not use API inputs or outputs to train their models — a different policy than
            the consumer ChatGPT product.
          </li>
          <li>
            <strong className="text-ink-900">Vault is never included.</strong> Brain has no access to
            Vault's zero-knowledge encrypted contents (see Section 3). It cannot read, send, or
            reference Vault items under any circumstances.
          </li>
          <li>
            <strong className="text-ink-900">Retention.</strong> Brain conversations are stored the
            same way other Studio Content is, for as long as your workspace keeps them (see Section
            7), so you can return to a thread later.
          </li>
        </ul>
      </LegalSection>

      <LegalSection number={6} title="Data security">
        <p>
          We use industry-standard measures to protect data in transit and at rest, including
          hashed passwords, scoped access controls between account types, and end-to-end encryption
          for the Vault as described above. No method of transmission or storage is perfectly
          secure, and we can’t guarantee absolute security — but Vault contents specifically are
          designed so that a breach of our servers alone cannot expose them.
        </p>
      </LegalSection>

      <LegalSection number={7} title="Data retention">
        <p>
          We retain account and Studio Content for as long as the workspace is active. If a Studio
          owner requests deletion of their workspace, we delete the associated data within a
          reasonable period, except where retention is required for legal, security, or legitimate
          business purposes (such as fraud prevention records).
        </p>
      </LegalSection>

      <LegalSection number={8} title="Your rights and choices">
        <p>
          Depending on where you’re located, you may have rights to access, correct, export, or
          delete your personal information, and to object to or restrict certain processing. Since
          employee and client accounts are managed by a Studio owner, requests about that data are
          often best directed to the Studio first; you can also contact us directly and we’ll help
          route the request appropriately.
        </p>
        <p>
          To exercise these rights, email{' '}
          <a href="mailto:mouhanned.j18@gmail.com" className="font-medium text-brass-700 hover:text-brass-800">
            mouhanned.j18@gmail.com
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection number={9} title="Children's privacy">
        <p>
          Portico is intended for business use and is not directed at children. We don’t knowingly
          collect personal information from anyone under 16. If you believe a child has provided us
          personal information, contact us and we’ll remove it.
        </p>
      </LegalSection>

      <LegalSection number={10} title="International transfers">
        <p>
          Depending on where you and our infrastructure providers are located, your information may
          be processed in a country other than your own. Where this occurs, we take reasonable steps
          to ensure it’s handled consistently with this Policy.
        </p>
      </LegalSection>

      <LegalSection number={11} title="Changes to this policy">
        <p>
          We may update this Privacy Policy as Portico evolves. Material changes will be reflected
          by updating the effective date above, and where practical, communicated directly to Studio
          owners.
        </p>
      </LegalSection>

      <LegalSection number={12} title="Contact">
        <p>
          For any question about this Policy or your data, contact{' '}
          <a href="mailto:mouhanned.j18@gmail.com" className="font-medium text-brass-700 hover:text-brass-800">
            mouhanned.j18@gmail.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
