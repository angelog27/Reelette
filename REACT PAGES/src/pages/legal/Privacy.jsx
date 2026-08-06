import LegalLayout from "./LegalLayout";

const EFFECTIVE_DATE = "August 6, 2026";
const CONTACT_EMAIL = "gonzales12098@gmail.com";

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" effectiveDate={EFFECTIVE_DATE}>
      <section>
        <h2>1. Overview</h2>
        <p>
          This Privacy Policy explains what information Reelette collects, how we use it, and the
          choices you have. It applies to our website and app (the "Service").
        </p>
      </section>

      <section>
        <h2>2. Information We Collect</h2>
        <p>
          <strong>Account information</strong> — username, email address, and password (stored
          securely via Firebase Authentication; we never see or store your plaintext password).
        </p>
        <p>
          <strong>Profile &amp; preferences</strong> — bio, avatar, streaming services you select,
          favorite genres, content rating preferences, and similar settings.
        </p>
        <p>
          <strong>Activity data</strong> — movies you watch, rate, save, or spin via the roulette
          feature, and interactions with friends (messages, reactions, shared lists).
        </p>
        <p>
          <strong>Cookies &amp; local storage</strong> — small pieces of data stored in your
          browser to keep you signed in and to remember that you've visited before. See the
          Cookies section below for details.
        </p>
      </section>

      <section>
        <h2>3. Cookies &amp; Similar Technologies</h2>
        <p>We use a small number of cookies and browser local-storage entries:</p>
        <ul>
          <li>
            <strong>Essential</strong> — used to keep you logged in and remember your account
            (e.g. a session identifier). Without these, the Service won't function.
          </li>
          <li>
            <strong>Functional</strong> — remember whether you've already seen the landing page
            (<code>reelette_visited</code>) so we don't repeat the intro on your next visit.
          </li>
        </ul>
        <p>
          We do not currently use third-party advertising or cross-site tracking cookies. You can
          block or delete cookies in your browser settings, but doing so may prevent parts of the
          Service (like staying signed in) from working properly.
        </p>
      </section>

      <section>
        <h2>4. How We Use Information</h2>
        <ul>
          <li>To create and maintain your account</li>
          <li>To operate core features — movie discovery, roulette, watchlists, and social sharing with friends</li>
          <li>To personalize recommendations based on your preferences and activity</li>
          <li>To communicate with you about your account (e.g. password resets)</li>
          <li>To keep the Service secure and prevent abuse</li>
        </ul>
      </section>

      <section>
        <h2>5. How We Share Information</h2>
        <p>
          We don't sell your personal information. We share data only with:
        </p>
        <ul>
          <li>
            <strong>Service providers</strong> we rely on to run Reelette, such as Firebase
            (Google) for authentication and data storage, and TMDB for movie metadata and artwork.
          </li>
          <li>
            <strong>Other users</strong>, limited to what you choose to make visible — e.g.
            profile info, watch activity, and messages shared with friends you connect with.
          </li>
          <li>
            <strong>Legal reasons</strong>, if required to comply with the law or protect the
            rights, safety, and security of Reelette or its users.
          </li>
        </ul>
      </section>

      <section>
        <h2>6. Data Retention &amp; Deletion</h2>
        <p>
          We keep your information for as long as your account is active. You can delete your
          account at any time from your profile settings, which removes your account data from
          our systems, aside from what we're required to retain for legal or security purposes.
        </p>
      </section>

      <section>
        <h2>7. Your Rights</h2>
        <p>
          Depending on where you live, you may have rights to access, correct, export, or delete
          your personal information. You can manage most of this yourself from your account
          settings, or contact us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and
          we'll help.
        </p>
      </section>

      <section>
        <h2>8. Children's Privacy</h2>
        <p>
          Reelette is not directed at children under 13, and we do not knowingly collect personal
          information from children under 13. If you believe a child has provided us information,
          contact us and we'll remove it.
        </p>
      </section>

      <section>
        <h2>9. Security</h2>
        <p>
          We use industry-standard practices (including Firebase's built-in security
          infrastructure) to protect your information, but no method of transmission or storage
          is 100% secure. We can't guarantee absolute security.
        </p>
      </section>

      <section>
        <h2>10. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. Material changes will be posted
          here with a new effective date.
        </p>
      </section>

      <section>
        <h2>11. Contact</h2>
        <p>
          Questions about this Policy or your data? Reach us at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
