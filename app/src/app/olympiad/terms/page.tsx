import type { Metadata } from 'next';
import LegalPage from '../legal/LegalPage';

export const metadata: Metadata = { title: 'Terms of Use · Scottsdale Olympiad', description: 'The terms for using scottsdaleolympiad.com and registering an Olympiad team.' };

const CONTACT = 'scaldwell@saguaros.com';

export default function TermsPage() {
  return <LegalPage
    title="Terms of Use"
    updated="October 7, 2026"
    intro={<p>These terms cover your use of scottsdaleolympiad.com and the team hub, run by The Saguaros. By using the site or registering a team, you agree to them. If you don’t agree, please don’t use the site.</p>}
    sections={[
      { heading: 'Who can use the site', body: <p>You must be at least 18. If you register a team, you confirm that you are allowed to register it on behalf of your business. Your business is the sponsor of the team.</p> },
      { heading: 'Your account', body: <>
        <p>Captains sign in with Google or a secure email link. Keep access to that email account secure, and don’t share sign-in links.</p>
        <p>You are responsible for activity on your team. Tell us right away if you think someone has accessed it without permission.</p>
      </> },
      { heading: 'Teams and registration', body: <ul>
        <li>Each team needs at least six participants, including the captain, and commits to a $3,000 fundraising minimum.</li>
        <li>Registrations are reviewed by Olympiad organizers. We may approve, ask for changes to, or decline a registration. We may also remove a team that doesn’t follow these terms.</li>
        <li>Event dates, schedules, games, awards and package details may change. Information marked as historical or 2026 is for planning only.</li>
      </ul> },
      { heading: 'Roster information you add', body: <p>When you add teammates to your roster or share your roster link, you confirm you have their permission to share their contact details with us for the event. Each teammate’s information is handled under our <a href="/privacy">Privacy Policy</a>.</p> },
      { heading: 'Fundraising, purchases and taxes', body: <>
        <p>This site does not collect payments. Sponsorship packages, tickets and donations are purchased through the official Saguaros store and are subject to its terms.</p>
        <p>Information about Arizona tax credits or deductions is general and is not tax advice. Talk to your tax advisor about your situation.</p>
      </> },
      { heading: 'Event participation', body: <p>Taking part in the Olympiad on event day is a physical activity. It may require each participant to sign a separate participant waiver and agree to event rules, including any photo and media release. Those event-day documents control participation; these terms cover use of the website.</p> },
      { heading: 'Content you share', body: <>
        <p>When you upload a logo or write a team introduction, you confirm you have the right to share it. You allow The Saguaros to display it on this site, the leaderboard and Olympiad materials while your team participates. You keep ownership of your content.</p>
        <p>Content appears publicly only if your team is approved and you choose public listing.</p>
      </> },
      { heading: 'Acceptable use', body: <>
        <p>Please don’t:</p>
        <ul>
          <li>submit false information</li>
          <li>impersonate another business or person</li>
          <li>upload anything unlawful, offensive or that you don’t have rights to</li>
          <li>try to access other teams’ information or organizer tools</li>
          <li>disrupt the site, or use automated tools to collect data from it</li>
        </ul>
      </> },
      { heading: 'Our content', body: <p>The site’s text, design, photos and Olympiad materials belong to The Saguaros or are used with permission. You may share links and your own team page. Please ask before reusing our materials for other purposes.</p> },
      { heading: 'Disclaimers and limits', body: <>
        <p>We work hard to keep the site accurate and available, but it is provided “as is,” without warranties. To the extent the law allows, The Saguaros and its members and volunteers are not liable for indirect or consequential losses from using the site.</p>
        <p>Links to other websites are provided for convenience. We are not responsible for their content.</p>
      </> },
      { heading: 'Changes and governing law', body: <p>We may update these terms. If we do, we will change the date at the top of this page. Continued use of the site means you accept the updated terms. These terms are governed by the laws of the State of Arizona.</p> },
      { heading: 'Contact us', body: <p>Questions about these terms: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p> },
    ]}
  />;
}
