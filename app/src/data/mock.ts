export interface Team {
  id: number;
  name: string;
  company: string;
  division: "ABC" | "BFK";
  captain: string;
  totalRaised: number;
  goal: number;
}

export const teams: Team[] = [
  { id: 1, name: "Desert Closers", company: "Realty One Group", division: "ABC", captain: "Sarah Mitchell", totalRaised: 42500, goal: 50000 },
  { id: 2, name: "The Fixers", company: "CBRE", division: "BFK", captain: "Jake Reynolds", totalRaised: 38200, goal: 45000 },
  { id: 3, name: "Cactus Crew", company: "Keller Williams", division: "ABC", captain: "Amanda Torres", totalRaised: 35800, goal: 40000 },
  { id: 4, name: "Broker Battalion", company: "Cushman & Wakefield", division: "BFK", captain: "Ryan Chen", totalRaised: 33100, goal: 40000 },
  { id: 5, name: "Valley Vipers", company: "eXp Realty", division: "ABC", captain: "Megan Foster", totalRaised: 29750, goal: 35000 },
  { id: 6, name: "Deal Makers", company: "JLL", division: "BFK", captain: "Chris Hartley", totalRaised: 28400, goal: 35000 },
  { id: 7, name: "Sun Devils RE", company: "Coldwell Banker", division: "ABC", captain: "Lauren Beck", totalRaised: 26200, goal: 30000 },
  { id: 8, name: "The Landlords", company: "Colliers", division: "BFK", captain: "Marcus Webb", totalRaised: 24800, goal: 30000 },
  { id: 9, name: "Home Run Heroes", company: "Compass", division: "ABC", captain: "Jessica Nguyen", totalRaised: 22100, goal: 30000 },
  { id: 10, name: "Capital Crew", company: "Marcus & Millichap", division: "BFK", captain: "Tyler Grant", totalRaised: 21500, goal: 30000 },
  { id: 11, name: "AZ All-Stars", company: "Berkshire Hathaway", division: "ABC", captain: "Brittany Cole", totalRaised: 19800, goal: 25000 },
  { id: 12, name: "Lease Legends", company: "Lee & Associates", division: "BFK", captain: "Daniel Park", totalRaised: 18200, goal: 25000 },
  { id: 13, name: "The Closers", company: "HomeSmart", division: "ABC", captain: "Nick Ramirez", totalRaised: 16500, goal: 25000 },
  { id: 14, name: "Skyline Squad", company: "Newmark", division: "BFK", captain: "Olivia Shaw", totalRaised: 15300, goal: 25000 },
  { id: 15, name: "Phoenix Rising", company: "RE/MAX", division: "ABC", captain: "Kevin Dunn", totalRaised: 14100, goal: 20000 },
  { id: 16, name: "Brick & Mortar", company: "Kidder Mathews", division: "BFK", captain: "Emily Tran", totalRaised: 12800, goal: 20000 },
];

export const timelineEvents = [
  { date: "Jan 15", title: "Team Registration Opens", description: "Register your team of 6 for the 2026 Olympiad.", type: "deadline" as const },
  { date: "Feb 1", title: "Fundraising Season Kicks Off", description: "Start selling sponsorships, hosting events, and collecting donations.", type: "milestone" as const },
  { date: "Feb 12", title: "ABC Captains Meeting", description: "Mandatory meeting for all Agents Benefiting Children team captains.", type: "event" as const },
  { date: "Feb 28", title: "Team Registration Deadline", description: "Final day to register your team for the Olympiad.", type: "deadline" as const },
  { date: "Mar 8", title: "Hoops for Hope Tournament", description: "Charity basketball tournament at Arizona Activity Center.", type: "event" as const },
  { date: "Mar 15", title: "Mid-Season Check-In", description: "Fundraising progress update and leaderboard refresh.", type: "milestone" as const },
  { date: "Apr 1", title: "Final Fundraising Push", description: "Two weeks left — last chance to close out sponsorships and donations.", type: "milestone" as const },
  { date: "Apr 11", title: "Fundraising Deadline", description: "All funds must be submitted by end of day.", type: "deadline" as const },
  { date: "Apr 17", title: "OLYMPIAD DAY", description: "Field day at Scottsdale Stadium. Games, competition, and celebration!", type: "event" as const },
];

export const fundraisingMethods = [
  {
    title: "Sponsorship Packages",
    icon: "briefcase",
    description: "Sell sponsorship packages to local businesses. Packages range from $500 to $10,000+ and include logo placement, event tickets, and brand visibility at the Olympiad.",
    tips: [
      "Start with your own company — many employers will sponsor",
      "Reach out to vendors and partners you work with regularly",
      "Use the sponsorship deck in the Assets section below",
      "Follow up within 48 hours of your initial outreach",
    ],
  },
  {
    title: "AZ State Tax Credits",
    icon: "receipt",
    description: "Arizona residents can donate up to $470 (individual) or $938 (couples filing jointly) and receive a dollar-for-dollar Arizona State tax credit. It's essentially free money for donors.",
    tips: [
      "Lead with the tax credit angle — it costs donors nothing",
      "Share the one-pager from the Assets section with potential donors",
      "Great for friends, family, and colleagues who want to help",
      "Donations must be made directly to The Saguaros Foundation",
    ],
  },
  {
    title: "Team-Hosted Events",
    icon: "calendar",
    description: "Host your own fundraising events — happy hours, golf outings, poker nights, fitness challenges, or anything creative. Saguaros members can help you plan and execute.",
    tips: [
      "Partner with a local bar or restaurant for a hosted happy hour",
      "Charge a cover or donation minimum at the door",
      "Raffle off donated items or experiences at your event",
      "Promote on social media using #SaguarosOlympiad",
    ],
  },
  {
    title: "Raffle Ticket Sales",
    icon: "ticket",
    description: "Sell raffle tickets for prizes donated by sponsors and partners. Tickets are typically $20–$50 each, and prizes include resort stays, dining packages, and sports memorabilia.",
    tips: [
      "Sell tickets at your team events and through social media",
      "Ask your network for prize donations to add to the raffle",
      "Bundle raffle tickets with event admission for better value",
    ],
  },
  {
    title: "Direct Donations",
    icon: "heart",
    description: "Accept direct donations from anyone who wants to support your team's fundraising goal. Every dollar counts toward the Captain's Cup and Broker's Cup races.",
    tips: [
      "Share your team's donation link on social media",
      "Send personal asks to close contacts — direct outreach works best",
      "Thank every donor publicly (with permission) to encourage others",
    ],
  },
];

export const marketingAssets = [
  { name: "Olympiad Logo Pack", category: "Logos", description: "Primary logo, horizontal, stacked, and icon-only versions in PNG and SVG.", fileType: "ZIP" },
  { name: "Saguaros Brand Guide", category: "Brand", description: "Colors, fonts, tone of voice, and logo usage guidelines.", fileType: "PDF" },
  { name: "Instagram Story Templates", category: "Social", description: "5 customizable story templates for promoting your team and events.", fileType: "ZIP" },
  { name: "LinkedIn Post Graphics", category: "Social", description: "Professional graphics sized for LinkedIn posts and articles.", fileType: "ZIP" },
  { name: "Sponsor Outreach Email", category: "Email", description: "Pre-written email template for reaching out to potential sponsors.", fileType: "DOCX" },
  { name: "Donation Ask Email", category: "Email", description: "Email template for soliciting direct donations and tax credit contributions.", fileType: "DOCX" },
  { name: "Event Invite Template", category: "Email", description: "Customizable email invite for team-hosted fundraising events.", fileType: "DOCX" },
  { name: "Printable Flyer", category: "Print", description: "8.5x11 flyer template with Olympiad branding — add your team info.", fileType: "PDF" },
  { name: "Tax Credit One-Pager", category: "Print", description: "Explains the AZ state tax credit in simple terms for potential donors.", fileType: "PDF" },
  { name: "Sponsorship Deck", category: "Print", description: "Professional pitch deck outlining sponsorship tiers and benefits.", fileType: "PDF" },
];

export const faqItems = [
  {
    question: "How many people are on a team?",
    answer: "Each team consists of 6 members. All 6 participate in the field day games at Scottsdale Stadium on Olympiad day.",
  },
  {
    question: "What's the difference between ABC and BFK?",
    answer: "Agents Benefiting Children (ABC) is for residential real estate professionals. Brokers for Kids (BFK) is for commercial real estate professionals. Each division has its own fundraising competition — ABC teams compete for the Captain's Cup, BFK teams for the Broker's Cup.",
  },
  {
    question: "When does fundraising start and end?",
    answer: "Fundraising officially kicks off in early February and the deadline is April 11, 2026. All funds must be submitted by end of day on the deadline. The earlier you start, the more time you have to close sponsorships.",
  },
  {
    question: "What games are played on Olympiad day?",
    answer: "Teams compete in field day-style games including cornhole, dodgeball, pop-a-shot, kong pong, and pickleball skill shot. The team with the most combined game points wins the Saguaros Cup.",
  },
  {
    question: "How does the AZ tax credit work?",
    answer: "The Saguaros is a Qualified Charitable Organization (QCO). Arizona residents can donate up to $470 (individual) or $938 (married filing jointly) and receive a dollar-for-dollar state tax credit. This means the donation effectively costs the donor nothing.",
  },
  {
    question: "Can the public attend the Olympiad?",
    answer: "Yes! General admission tickets are $100 and include food, drinks, live music, and access to the beer garden spectator area to watch the competition.",
  },
  {
    question: "Where do the funds go?",
    answer: "All proceeds go to The Saguaros Foundation, a 501(c)(3). 70% is distributed as grants to children's charities across Arizona, and 30% goes into an endowment fund for long-term impact.",
  },
  {
    question: "Who do I contact for help?",
    answer: "Reach out to the Olympiad committee at olympiad@saguaros.com or visit saguaros.com/olympiad for more information. Your assigned Saguaros member liaison is also available to help with event planning and logistics.",
  },
];
