/**
 * Seeds the database with CGZSA's own content and the role/permission matrix.
 * Idempotent: safe to run more than once.
 *
 *   npm run db:seed
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { db } from "./index";
import * as s from "./schema";
import { and, eq, notInArray } from "drizzle-orm";
import { hashPassword } from "../lib/auth";
import { ORG, PROGRAMS, FAQS, TEAM, TARGETS } from "./content";
import { buildPassages } from "../lib/knowledge";

const PERMISSIONS: [string, string, string][] = [
  ["content.create", "Create and edit own drafts", "Content"],
  ["content.edit_others", "Edit other people's content", "Content"],
  ["content.submit", "Submit for review", "Content"],
  ["content.review", "Approve or reject", "Content"],
  ["content.publish", "Publish and schedule", "Content"],
  ["content.delete", "Delete (soft)", "Content"],
  ["content.purge", "Restore or purge", "Content"],
  ["media.upload", "Upload media", "Assets"],
  ["chat.answer", "Answer live chat", "Chat"],
  ["chat.close", "Close and tag a conversation", "Chat"],
  ["chat.transcripts", "Read chat transcripts and export", "Chat"],
  ["assistant.configure", "Configure the AI assistant", "Chat"],
  ["knowledge.edit", "Edit the knowledge base", "Chat"],
  ["team.manage", "Manage team and departments", "People"],
  ["messages.read", "Read contact messages", "People"],
  ["settings.manage", "Site settings and SEO defaults", "Administration"],
  ["users.manage", "Manage users and roles", "Administration"],
  ["audit.read", "Read audit log", "Administration"],
];

const MATRIX: Record<string, string[]> = {
  // Note: there is deliberately no "security.manage" permission. It used to be
  // seeded, granted to Super Administrator, and rendered in the matrix on the
  // users screen — while being checked by no code anywhere. An administrator
  // reading that screen would reasonably conclude that a security settings area
  // existed and was restricted. Neither was true.
  //
  // A permission that grants nothing is worse than a missing one, because it
  // misleads the person responsible for the system's security. If a security
  // settings screen is built later, add the permission back at the same time.
  SUPER_ADMIN: PERMISSIONS.map((p) => p[0]),
  ADMIN: [
    "content.create", "content.edit_others", "content.submit", "content.review", "content.publish",
    "content.delete", "media.upload", "chat.answer", "chat.close", "chat.transcripts",
    "assistant.configure", "knowledge.edit", "team.manage", "messages.read", "settings.manage",
  ],
  REVIEWER: [
    "content.create", "content.edit_others", "content.submit", "content.review", "content.publish",
    "media.upload", "chat.answer", "chat.close", "knowledge.edit",
  ],
  EDITOR: ["content.create", "content.edit_others", "content.submit", "media.upload", "chat.answer", "chat.close", "knowledge.edit"],
  CONTRIBUTOR: ["content.create", "content.submit", "media.upload"],
};

const ROLE_META: Record<string, { label: string; description: string; rank: number }> = {
  SUPER_ADMIN: { label: "Super Administrator", description: "Full system access, including users, roles and security settings.", rank: 100 },
  ADMIN: { label: "Administrator", description: "Manages all content, chat and settings. Cannot manage users or security policy.", rank: 80 },
  REVIEWER: { label: "Reviewer", description: "Reviews submitted content and publishes what is approved.", rank: 60 },
  EDITOR: { label: "Editor", description: "Creates and edits content, and submits it for review.", rank: 40 },
  CONTRIBUTOR: { label: "Contributor", description: "Creates content and submits it. Cannot publish.", rank: 20 },
};

type SeedPageStatus = "DRAFT" | "PUBLISHED";

const PAGES: [string, string, string, string, string, SeedPageStatus?][] = [
  ["about", "Who We Are", "About",
   "A youth-led, non-profit environmental organization founded on 20 April 2025 in Liberia.",
   [
     "The Clean and Green Zero Sphere Alliance is a bold, people-powered movement committed to transforming Liberia into a nation where clean water flows freely, public spaces thrive with life, and waste is no longer a threat but a resource for renewal.",
     "We are more than an environmental organization; we are a catalyst for community transformation. From the heart of rural villages to the busiest urban centres, we mobilize citizens, inspire action, and deliver practical solutions that tackle three critical challenges head-on: waste management, restoration of neglected public spaces, and access to safe drinking water.",
     "Our work begins at the grassroots, where we educate, engage and equip communities to reclaim ownership of their environment. We plant trees where the air is heavy, install clean water systems where thirst is a daily struggle, and breathe life into abandoned parks — turning them into vibrant spaces of joy, unity and hope.",
     "We believe that environmental change is not a distant dream; it is a hands-on, here-and-now mission. Every cleanup campaign, every drop of clean water provided, every restored playground is a testament to the power of collective action.",
     "The Zero Sphere in our name reflects our vision: zero pollution, zero unsafe water, zero wasted potential. With our network of passionate volunteers, strategic partners and dedicated leaders, we are rewriting the narrative — showing that when citizens unite, the future can be greener, cleaner and brighter for all.",
     "CGZSA was born out of an urgent call to action against the mounting waste pollution, unsafe water sources and deteriorating public spaces that threaten our health, dignity and the natural beauty of our environment. Across our markets, beaches, streets, schools and neighbourhoods, uncontrolled waste disposal and contaminated water have reduced economic opportunities, harmed public health and stripped communities of pride.",
     "We believe true change begins with awareness, unity and action. CGZSA serves as a beacon of responsibility, uniting young people, schools, community leaders and policymakers into a powerful movement for environmental transformation.",
   ].join("\n\n")],
  ["home", "Clean and Green Zero Sphere Alliance", "Home",
   ORG.strapline,
   "<p>Youth and communities taking practical action on waste, unsafe water, neglected public spaces and flooding.</p>"],
  ["programs", "Programmes", "Our work",
   "Five permanent programme areas, each tied to visible action in a community.",
   "<p>Each programme is a concrete route for communities, partners and volunteers to act.</p>"],
  ["projects", "Projects", "Our work",
   "Individual clean-ups, installations and restorations, by programme, county and status.",
   "<p>Projects show where programme work becomes visible in a specific community, place and timeline.</p>"],
  ["news", "News & Announcements", "Newsroom",
   "Updates from our campaigns, installations and community work.",
   "<p>Read the latest updates from CGZSA activities, partners and public announcements.</p>"],
  ["events", "Events", "Diary",
   "Come and work with us. Most of our events are open to anyone who turns up.",
   "<p>Clean-up days, workshops and training sessions appear here with date, time, location and registration details.</p>"],
  ["contact", "Contact Us", "Contact",
   "Contact CGZSA by message, email, telephone, or through the principal office.",
   "<p>Send a message to the CGZSA team or use the public contact details on this page.</p>"],
  ["resources/faqs", "Frequently Asked Questions", "Resources",
   "Answers drawn from CGZSA public information and maintained by the content team.",
   "<p>Frequently asked questions are managed from the admin dashboard and published after review.</p>"],
  ["resources/gallery", "Media Gallery", "Resources",
   "Photographs from CGZSA clean-ups, installations and community work.",
   "<p>Images uploaded to the media library appear in this gallery when they are available.</p>"],
  ["resources/publications", "Publications & Documents", "Resources",
   "Reports, policies and organizational documents, free to read and download.",
   "<p>Public documents uploaded by the content team appear here with view and download controls.</p>"],
  ["search", "Search the site", "Search",
   "One query across pages, programmes, publications and frequently asked questions.",
   "<p>Use the search box to find CGZSA pages, programmes, documents and answers.</p>"],
  ["about/why-we-were-founded", "Why CGZSA Was Founded", "About",
   "Six pressing realities across Liberia, and what the Alliance was built to do about each of them.",
   "<p>Replace this draft with the full founding analysis when the content team is ready to manage this page from the CMS.</p>",
   "DRAFT"],
  ["about/mission-vision-values", "Mission, Vision & Values", "About",
   "What we are working towards, and the principles that govern how we work.",
   "<p>Replace this draft with the full mission, vision and values text when the content team is ready.</p>",
   "DRAFT"],
  ["about/goals-and-objectives", "Goals & Objectives", "About",
   "Five goals set the destination. Seven objectives describe how we get there.",
   "<p>Replace this draft with the full goals and objectives text when the content team is ready.</p>",
   "DRAFT"],
  ["about/leadership", "Leadership & Team", "About",
   "Current leadership and team structure.",
   "<p>Replace this draft with leadership page copy when the content team is ready. Team records are managed separately in the Team area.</p>",
   "DRAFT"],
  ["about/governance", "Governance & Registration", "About",
   "How CGZSA is constituted, governed and held to account.",
   "<p>Replace this draft with governance and registration copy when the content team is ready.</p>",
   "DRAFT"],
  ["about/structure", "Organizational Structure", "About",
   "Select any role to read the duties set out in the CGZSA organizational structure document.",
   "<p>Replace this draft with an introduction to the organizational structure. Team and role records are managed separately in the Team area.</p>",
   "DRAFT"],
  ["get-involved/volunteer", "Volunteer With Us", "Get Involved",
   "Four routes into the work, taken straight from our brochure. No environmental background required — training is provided.",
   "Membership of CGZSA is open to individuals aged 18 and above who support our mission and values. Under-18s are welcome at open clean-up events when accompanied by an adult."],
  ["get-involved/partner", "Partner With Us", "Get Involved",
   "Three routes for organizations and individuals who want to fund the work directly.",
   "We are accountable by constitution: all financial transactions are recorded and audited annually, bank accounts require two signatories, and we monitor, evaluate and report on our work so partners know exactly what has been achieved."],
  ["get-involved/donate", "Support Our Work", "Get Involved",
   "Every contribution goes into materials, installations and the training that makes them last.",
   "Under Article VII of our bylaws, CGZSA is funded by donations, grants and sponsorships, and by fundraising events and projects. All financial transactions are recorded and audited annually, and every bank account requires two signatories."],
  ["privacy-policy", "Privacy Policy", "Legal",
   "What we collect, why we collect it, and what we do with it.",
   "<p>This text describes what CGZSA collects, why we collect it, and how long we retain it. You can edit this full policy directly from the Admin Panel.</p>"],
  ["cookie-policy", "Cookie Policy", "Legal",
   "The small number of cookies this website sets, and what each one does.",
   "<p>Essential cookies set by CGZSA for live chat and staff session management. You can edit this policy directly from the Admin Panel.</p>"],
  ["terms", "Terms of Use", "Legal",
   "The terms on which this website is provided.",
   "<p>Terms governing the use of CGZSA website, content, and live chat assistant. You can edit this policy directly from the Admin Panel.</p>"],
  ["accessibility", "Accessibility Statement", "Legal",
   "Our commitment, what we have done, and how to tell us when we fall short.",
   "<p>CGZSA is committed to WCAG 2.2 level AA compliance. You can edit this accessibility statement directly from the Admin Panel.</p>"],
];

const CONTENT_BLOCKS: [string, string, string, string | null, string, string, number, string?, string?][] = [
  ["home", "hero-primary-cta", "Homepage hero primary button", null, "Explore programmes",
   "", 1, "Explore programmes", "/programs"],
  ["home", "hero-secondary-cta", "Homepage hero secondary button", null, "Volunteer with us",
   "", 2, "Volunteer with us", "/get-involved/volunteer"],
  ["home", "hero-action-cleanup", "Homepage action strip: clean streets", null, "Clean up streets",
   "", 3],
  ["home", "hero-action-parks", "Homepage action strip: parks", null, "Restore parks",
   "", 4],
  ["home", "hero-action-water", "Homepage action strip: water", null, "Install water points",
   "", 5],
  ["home", "hero-action-flooding", "Homepage action strip: drains", null, "Protect drains",
   "", 6],
  ["home", "hero-action-youth", "Homepage action strip: youth", null, "Train youth teams",
   "", 7],
  ["home", "zero-sphere", "Homepage zero sphere band", null, "Zero x 3",
   "<p>Zero pollution, zero unsafe water, zero wasted potential. That is the plain promise behind the name.</p>", 10],
  ["home", "intro", "Homepage introduction", "Who we are", "Practical work people can see, join and trust",
   "<p>CGZSA turns big environmental problems into visible community work: clean-up drives, water access, park recovery, safer waiting areas and flood prevention.</p>", 20, "Learn more", "/about"],
  ["home", "intro-local", "Homepage intro badge: Local", null, "Local",
   "<p>Community-owned action</p>", 21],
  ["home", "intro-youth", "Homepage intro badge: Youth-led", null, "Youth-led",
   "<p>Training and service</p>", 22],
  ["home", "intro-practical", "Homepage intro badge: Practical", null, "Practical",
   "<p>Visible public improvements</p>", 23],
  ["home", "values", "Homepage values section", "Mission, vision & values", "What we are working towards",
   "<p>CGZSA is guided by its mission, vision and core values, with public updates as definitions are confirmed by the organization.</p>", 30, "Read what each value means", "/about/mission-vision-values"],
  ["home", "vision", "Homepage vision card", null, "Our Vision",
   `<p>${ORG.vision}</p>`, 31],
  ["home", "mission", "Homepage mission card", null, "Our Mission",
   `<p>${ORG.mission}</p>`, 32],
  ["home", "programmes", "Homepage programmes section", "Our work", "Five programmes, one alliance",
   "<p>Each programme is a concrete way for communities, partners and volunteers to act.</p>", 40],
  ["home", "impact", "Homepage impact section", "Our Five-Year Targets", "What we have committed to",
   "<p>CGZSA was founded in April 2025 and registered in September 2025. These are targets, shown honestly against progress to date.</p>", 50],
  ["home", "why", "Homepage why section", "Why we exist", "The problems that brought us together",
   "<p>The founding problems are the practical reason the Alliance exists: waste, unsafe water, degraded public spaces and flood risk.</p>", 60, "Read the analysis", "/about/why-we-were-founded"],
  ["home", "get-involved", "Homepage get involved section", "Get involved", "Three ways to be part of this",
   "<p>Choose the route that fits you: volunteer time, partner on a project, or support the materials and training behind the work.</p>", 70],
  ["home", "action-volunteer", "Homepage action card: Volunteer", null, "Volunteer",
   "<p>Join clean-up days, awareness teams, media support or monitoring work.</p>", 71, "Read more", "/get-involved/volunteer"],
  ["home", "action-partner", "Homepage action card: Partner", null, "Partner",
   "<p>Back a water point, park recovery, bus-stop bench or school campaign.</p>", 72, "Read more", "/get-involved/partner"],
  ["home", "action-donate", "Homepage action card: Support", null, "Support",
   "<p>Help fund tools, materials, installations and the training that keeps them working.</p>", 73, "Read more", "/get-involved/donate"],
];

async function main() {
  console.log("→ roles and permissions");
  const permIds = new Map<string, string>();
  for (const [key, label, group] of PERMISSIONS) {
    const [row] = await db
      .insert(s.permissions)
      .values({ key, label, group })
      .onConflictDoUpdate({ target: s.permissions.key, set: { label, group } })
      .returning({ id: s.permissions.id });
    permIds.set(key, row.id);
  }

  // Drop permissions that no longer exist, so a database seeded before they
  // were removed does not keep showing them in the matrix. The cascade on
  // role_permissions removes the grants with them.
  const liveKeys = PERMISSIONS.map(([key]) => key);
  await db.delete(s.permissions).where(notInArray(s.permissions.key, liveKeys));

  const roleIds = new Map<string, string>();
  for (const [name, meta] of Object.entries(ROLE_META)) {
    const [row] = await db
      .insert(s.roles)
      .values({ name: name as never, label: meta.label, description: meta.description, rank: meta.rank })
      .onConflictDoUpdate({ target: s.roles.name, set: { label: meta.label, description: meta.description, rank: meta.rank } })
      .returning({ id: s.roles.id });
    roleIds.set(name, row.id);
    const wantedPermissionIds = MATRIX[name].map((key) => permIds.get(key)!);
    await db
      .delete(s.rolePermissions)
      .where(and(eq(s.rolePermissions.roleId, row.id), notInArray(s.rolePermissions.permissionId, wantedPermissionIds)));
    for (const key of MATRIX[name]) {
      await db
        .insert(s.rolePermissions)
        .values({ roleId: row.id, permissionId: permIds.get(key)! })
        .onConflictDoNothing();
    }
  }

  console.log("→ users");
  // Production must choose its own password. In local development, a temporary
  // password is generated for newly created seeded users instead of keeping a
  // reusable default in source control.
  if (process.env.NODE_ENV === "production" && !process.env.SEED_ADMIN_PASSWORD) {
    throw new Error(
      "Refusing to seed in production without SEED_ADMIN_PASSWORD. " +
      "Set it to a password you have generated, run the seed, then change it after first sign-in."
    );
  }
  const generatedSeedPassword = !process.env.SEED_ADMIN_PASSWORD;
  const seedPassword = process.env.SEED_ADMIN_PASSWORD ?? randomBytes(18).toString("base64url");
  const pw = await hashPassword(seedPassword);
  const people: [string, string, string][] = [
    ["n.clark@cgzsa.org", "Nathaniel M. Clark", "SUPER_ADMIN"],
    ["a.mehn@cgzsa.org", "Amos L. Mehn", "ADMIN"],
    ["programs@cgzsa.org", "Programs Manager", "REVIEWER"],
    ["comms@cgzsa.org", "Communications Officer", "EDITOR"],
    ["merl@cgzsa.org", "MERL Officer", "CONTRIBUTOR"],
  ];
  const createdEmails: string[] = [];
  for (const [email, name, role] of people) {
    const existing = await db.query.users.findFirst({ where: (t, { eq }) => eq(t.email, email) });
    if (!existing) createdEmails.push(email);
    await db
      .insert(s.users)
      .values({ email, name, passwordHash: pw, roleId: roleIds.get(role)!, status: role === "SUPER_ADMIN" || role === "ADMIN" ? "ACTIVE" : "INVITED" })
      .onConflictDoUpdate({ target: s.users.email, set: { name, roleId: roleIds.get(role)! } });
  }

  console.log("→ site settings");
  await db
    .insert(s.siteSettings)
    .values({
      id: "singleton",
      orgName: ORG.orgName, shortName: ORG.shortName, motto: ORG.motto, strapline: ORG.strapline,
      email: ORG.email, phone1: ORG.phone1, phone2: ORG.phone2, phone3: ORG.phone3,
      office: ORG.office, registeredSeat: ORG.registeredSeat,
      registrationNo: ORG.registrationNo, showRegistrationNo: false,
      defaultDescription: ORG.defaultDescription, contactRecipient: ORG.email,
    })
    .onConflictDoNothing();

  console.log("→ programmes");
  for (const [i, p] of PROGRAMS.entries()) {
    await db
      .insert(s.programs)
      .values({
        slug: p.slug, title: p.title, tagline: p.tagline, lead: p.lead,
        activities: p.activities, rationale: p.rationale, response: p.response,
        icon: p.icon, order: i, status: "PUBLISHED",
      })
      .onConflictDoUpdate({
        target: s.programs.slug,
        set: { title: p.title, tagline: p.tagline, lead: p.lead, activities: p.activities, rationale: p.rationale, response: p.response, order: i },
      });
  }

  console.log("→ pages");
  for (const [slug, title, section, excerpt, body, status = "PUBLISHED"] of PAGES) {
    await db
      .insert(s.pages)
      .values({ slug, title, section, excerpt, body, status, publishedAt: status === "PUBLISHED" ? new Date() : null })
      .onConflictDoNothing();
  }

  console.log("content blocks");
  for (const [page, slot, label, eyebrow, title, body, order, ctaLabel, ctaHref] of CONTENT_BLOCKS) {
    await db
      .insert(s.contentBlocks)
      .values({
        page,
        slot,
        label,
        eyebrow,
        title,
        body,
        order,
        ctaLabel: ctaLabel ?? null,
        ctaHref: ctaHref ?? null,
        status: "PUBLISHED",
      })
      .onConflictDoNothing();
  }

  console.log("→ FAQs");
  for (const [i, f] of FAQS.entries()) {
    const existing = await db.query.faqs.findFirst({ where: (t, { eq }) => eq(t.question, f.question) });
    if (!existing) await db.insert(s.faqs).values({ question: f.question, answer: f.answer, order: i, status: "DRAFT" });
  }

  console.log("→ team");
  const anyTeam = await db.query.teamMembers.findFirst();
  if (!anyTeam) {
    for (const [i, m] of TEAM.entries()) {
      await db.insert(s.teamMembers).values({
        name: m.name, role: m.role, group: m.group, duties: m.duties, vacant: m.vacant, order: i,
      });
    }
  }

  console.log("→ impact targets");
  const anyMetric = await db.query.impactMetrics.findFirst();
  if (!anyMetric) {
    for (const [i, t] of TARGETS.entries()) {
      await db.insert(s.impactMetrics).values({ label: t.label, sublabel: t.sublabel, target: t.target, actual: t.actual, order: i });
    }
  }

  console.log("→ assistant settings");
  await db
    .insert(s.assistantSettings)
    .values({
      id: "singleton",
      greeting: "Hello. I am the CGZSA assistant. I answer from our published pages and documents. What would you like to know?",
      handoverMessage:
        "I could not find that in our published information, so I do not want to guess. I can pass this to the team — they answer within one working day.",
      neverDiscuss: ["Individual donor amounts", "Staff personal details", "Ongoing legal matters"],
    })
    .onConflictDoNothing();

  console.log("→ canned replies");
  const anyCanned = await db.query.cannedReplies.findFirst();
  if (!anyCanned) {
    const canned: [string, string][] = [
      ["Opening hours", "Our office at Duport Road Junction, Paynesville City is open Monday to Friday, 08:00 to 17:00."],
      ["How to volunteer", "You can join clean-up drives, our awareness teams, or offer skills in media, fundraising or monitoring and evaluation. Membership is open to anyone aged 18 and above."],
      ["Partnership routes", "There are three routes: sponsor a community project, fund a specific water tap or bench installation, or set up a longer-term corporate or international partnership."],
      ["Ask for an email address", "May I take your email address so a member of the team can send you the details?"],
    ];
    for (const [i, [label, body]] of canned.entries()) {
      await db.insert(s.cannedReplies).values({ label, body, order: i });
    }
  }

  console.log("→ indexing content for the assistant");
  const built = await buildPassages();
  console.log(`   ${built.sources} sources, ${built.passages} passages`);

  console.log("\nDone.");
  if (createdEmails.length > 0) {
    console.log("Seeded sign-in account: n.clark@cgzsa.org");
    if (generatedSeedPassword) {
      console.log(`Temporary local seed password: ${seedPassword}`);
      console.log("Store it now or set SEED_ADMIN_PASSWORD and reseed a fresh database.");
    } else {
      console.log("Password: the value you supplied in SEED_ADMIN_PASSWORD.");
    }
  } else {
    console.log("Seeded users already exist; existing passwords were left unchanged.");
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
