import LegalLayout from "./LegalLayout";

const EFFECTIVE_DATE = "August 6, 2026";
const CONTACT_EMAIL = "gonzales12098@gmail.com";

export default function Terms() {
  return (
    <LegalLayout title="Terms of Service" effectiveDate={EFFECTIVE_DATE}>
      <section>
        <h2>1. Agreement to Terms</h2>
        <p>
          These Terms of Service ("Terms") govern your access to and use of Reelette, including
          our website, apps, and related services (collectively, the "Service"). By creating an
          account or otherwise using the Service, you agree to be bound by these Terms and our{" "}
          <a href="/privacy">Privacy Policy</a>. If you do not agree, do not use the Service.
        </p>
      </section>

      <section>
        <h2>2. Eligibility</h2>
        <p>
          You must be at least 13 years old to use Reelette. By using the Service, you represent
          that you meet this requirement and that any information you provide is accurate.
        </p>
      </section>

      <section>
        <h2>3. Your Account</h2>
        <p>
          You're responsible for safeguarding your login credentials and for all activity under
          your account. Notify us immediately of any unauthorized use. We may suspend or
          terminate accounts that violate these Terms or are inactive, fraudulent, or abusive.
        </p>
      </section>

      <section>
        <h2>4. The Service</h2>
        <p>
          Reelette helps you discover, track, rate, and share movies with friends, and pulls
          movie metadata, artwork, and streaming availability from third-party sources such as
          The Movie Database (TMDB). Streaming availability and other third-party data are
          provided for convenience only, may be inaccurate or out of date, and are not guaranteed.
        </p>
      </section>

      <section>
        <h2>5. User Content &amp; Conduct</h2>
        <p>
          You keep ownership of any content you post (reviews, ratings, lists, messages, profile
          info), but you grant Reelette a non-exclusive, worldwide, royalty-free license to host,
          display, and share that content as needed to operate the Service — for example, showing
          your activity to friends you connect with.
        </p>
        <p>You agree not to:</p>
        <ul>
          <li>Post unlawful, harassing, hateful, or infringing content</li>
          <li>Impersonate another person or misrepresent your affiliation</li>
          <li>Attempt to access another user's account without authorization</li>
          <li>Scrape, reverse-engineer, or interfere with the Service's operation</li>
          <li>Use the Service for any purpose that violates applicable law</li>
        </ul>
      </section>

      <section>
        <h2>6. Third-Party Services &amp; Attribution</h2>
        <p>
          Reelette uses the TMDB API but is not endorsed or certified by TMDB. Movie posters,
          titles, and metadata are the property of their respective owners. Streaming service
          logos and names belong to their respective providers and are used solely to identify
          where content may be available.
        </p>
      </section>

      <section>
        <h2>7. Intellectual Property</h2>
        <p>
          The Reelette name, logo, and app design are owned by us or our licensors and may not be
          used without permission. All other trademarks referenced belong to their respective
          owners.
        </p>
      </section>

      <section>
        <h2>8. Disclaimers</h2>
        <p>
          The Service is provided "as is" and "as available," without warranties of any kind,
          express or implied. We don't guarantee the Service will be uninterrupted, error-free,
          or that content (including streaming availability) will be accurate or current.
        </p>
      </section>

      <section>
        <h2>9. Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by law, Reelette and its creators will not be liable
          for any indirect, incidental, special, or consequential damages arising from your use
          of the Service.
        </p>
      </section>

      <section>
        <h2>10. Termination</h2>
        <p>
          You may stop using the Service and delete your account at any time from your profile
          settings. We may suspend or terminate your access if you violate these Terms.
        </p>
      </section>

      <section>
        <h2>11. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. If we make material changes, we'll post
          the updated Terms here with a new effective date. Continued use of the Service after
          changes take effect means you accept the revised Terms.
        </p>
      </section>

      <section>
        <h2>12. Contact</h2>
        <p>
          Questions about these Terms? Reach us at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
