import type { Metadata } from 'next';
import LegalPage from '../legal/LegalPage';

export const metadata: Metadata = { title: 'Privacy Policy · Scottsdale Olympiad', description: 'How The Saguaros collect, use and protect information on scottsdaleolympiad.com.' };

const CONTACT = 'scaldwell@saguaros.com';

export default function PrivacyPage() {
  return <LegalPage
    title="Privacy Policy"
    updated="October 7, 2026"
    intro={<>
      <p>The Saguaros run the Scottsdale Olympiad and this website (scottsdaleolympiad.com) to bring Arizona businesses together for a field day that raises money for Arizona children’s charities. This policy explains what information we collect, why, who can see it and the choices you have.</p>
      <p><strong>The short version:</strong> we collect only what we need to organize teams and the event. We never sell your information. Email and text updates are optional, and you can stop them at any time.</p>
    </>}
    sections={[
      { heading: 'Information we collect', body: <>
        <p><strong>Team captains</strong> give us:</p>
        <ul>
          <li>a sign-in email address (or the name and email Google shares if you choose Continue with Google)</li>
          <li>your name and phone number</li>
          <li>your business and team name, industry and an optional team introduction</li>
          <li>an optional business logo</li>
          <li>an optional referring Saguaros club member</li>
          <li>whether you want your team listed publicly</li>
        </ul>
        <p><strong>Participants</strong> (added by a captain, or by joining through a captain’s roster link) give us name, email, phone number, and shirt size and fit.</p>
        <p><strong>Communication choices:</strong> whether you asked for Olympiad email updates or text updates.</p>
        <p><strong>Organizer notes:</strong> Olympiad organizers keep private notes on team status and follow-up so we can help teams get ready.</p>
        <p><strong>Technical information:</strong> sign-in cookies that keep you logged in, and standard server logs (such as IP address, browser type and pages requested) kept by our hosting provider for security and reliability.</p>
      </> },
      { heading: 'How we use it', body: <ul>
        <li>Register and approve teams, and let captains manage their roster.</li>
        <li>Plan the event, including team shirts, check-in and game-day logistics.</li>
        <li>Contact captains and participants about their team and the event.</li>
        <li>Send email or text updates only to people who chose to receive them.</li>
        <li>Show fundraising standings and recognize teams.</li>
        <li>Keep the site secure and working.</li>
      </ul> },
      { heading: 'What is public', body: <>
        <p>A team appears in the public team directory only after organizer approval and the captain’s choice to be listed. A public listing shows only the business name, team name, industry, introduction and logo.</p>
        <p>Participant names and contact details are never shown publicly. Team fundraising totals may appear on the leaderboard.</p>
      </> },
      { heading: 'Who we share it with', body: <>
        <p>We do not sell or rent personal information. We share it only with:</p>
        <ul>
          <li><strong>Your team captain and Olympiad organizers</strong>, who can see the roster for their team (organizers can see all teams).</li>
          <li><strong>Service providers that run the site and our communications</strong> for us, under their own privacy and security commitments:
            <ul>
              <li>Supabase (database and sign-in)</li>
              <li>Vercel (website hosting)</li>
              <li>Google (if you choose Google sign-in)</li>
              <li>Mailchimp (email updates, for people who opt in)</li>
              <li>our text-message provider (for people who opt in)</li>
            </ul>
          </li>
          <li><strong>When required by law</strong>, or to protect the safety of participants or the event.</li>
        </ul>
        <p><strong>Text messaging:</strong> mobile numbers and text-message consent are not shared with third parties or affiliates for their marketing purposes.</p>
      </> },
      { heading: 'Your choices', body: <ul>
        <li><strong>Email updates:</strong> use the unsubscribe link in any update email, or change your preference in your team hub.</li>
        <li><strong>Text updates:</strong> reply STOP to any message to opt out, or HELP for help. Message frequency varies. Message and data rates may apply. Text updates are never required to participate.</li>
        <li><strong>See, correct or delete your information:</strong> captains can edit team and roster details in the team hub. Participants can ask their captain, or email us at <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</li>
        <li><strong>Public listing:</strong> captains can turn public listing on or off at any time in Team profile &amp; public visibility.</li>
      </ul> },
      { heading: 'How long we keep it', body: <p>We keep team and roster information for the current Olympiad season and a reasonable time after, so we can welcome returning teams and keep accurate fundraising records. You can ask us to delete your information sooner. We will do so unless we need to keep a record for legal, tax or accounting reasons.</p> },
      { heading: 'Security', body: <p>We use reasonable safeguards to protect your information. These include encrypted connections, password-free secure sign-in, and access limited to the captain and organizers who need it. No website can promise perfect security, so please contact us right away if you think your account has been misused.</p> },
      { heading: 'Children', body: <p>The Olympiad and this site are for adults participating with their businesses. We do not knowingly collect information from children under 13. If you believe a child has given us information, contact us and we will delete it.</p> },
      { heading: 'Changes to this policy', body: <p>If we make meaningful changes, we will update the date at the top of this page and, where appropriate, let captains know.</p> },
      { heading: 'Contact us', body: <p>Questions or requests: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. The Saguaros, Scottsdale, Arizona.</p> },
    ]}
  />;
}
