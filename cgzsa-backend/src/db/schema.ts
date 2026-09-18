/**
 * Clean and Green Zero Sphere Alliance — database schema.
 * Follows §12 and §14 of the design review: 44 tables across identity,
 * editorial workflow, the work, library, people, interaction, chat and system.
 */
import {
  pgTable, pgEnum, text, integer, boolean, timestamp, doublePrecision,
  index, uniqueIndex, primaryKey, jsonb, real, customType,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/** PostgreSQL's tsvector. Drizzle has no built-in for it. */
const tsvector = customType<{ data: string; driverData: string }>({
  dataType: () => "tsvector",
});

// $defaultFn generates the id in JavaScript; .default() also puts a DEFAULT in
// the table, so a row inserted by psql, a restore or a data migration does not
// fail with a not-null violation on the primary key.
const id = () =>
  text("id").primaryKey().default(sql`gen_random_uuid()::text`).$defaultFn(() => crypto.randomUUID());
const created = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updated = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

/* ───────────────────────────────── enums */

export const roleName = pgEnum("role_name", [
  "SUPER_ADMIN", "ADMIN", "REVIEWER", "EDITOR", "CONTRIBUTOR",
]);
export const userStatus = pgEnum("user_status", ["ACTIVE", "INVITED", "SUSPENDED"]);
export const contentStatus = pgEnum("content_status", [
  "DRAFT", "IN_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED",
]);
export const projectStatus = pgEnum("project_status", [
  "PLANNED", "IN_PROGRESS", "COMPLETED", "ON_HOLD",
]);
export const messageStatus = pgEnum("message_status", ["UNREAD", "READ", "REPLIED", "ARCHIVED"]);
export const conversationStatus = pgEnum("conversation_status", [
  "AI", "WAITING", "ASSIGNED", "RESOLVED", "ESCALATED", "CLOSED",
]);
export const chatAuthor = pgEnum("chat_author", ["VISITOR", "ASSISTANT", "STAFF", "SYSTEM"]);

/* ───────────────────────────────── identity and access */

export const roles = pgTable("roles", {
  id: id(),
  name: roleName("name").notNull().unique(),
  label: text("label").notNull(),
  description: text("description").notNull(),
  rank: integer("rank").notNull(),
});

export const permissions = pgTable("permissions", {
  id: id(),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  group: text("group").notNull(),
});

export const rolePermissions = pgTable("role_permissions", {
  roleId: text("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionId: text("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })]);

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash"),
  roleId: text("role_id").notNull().references(() => roles.id),
  status: userStatus("status").notNull().default("INVITED"),
  totpSecret: text("totp_secret"),
  totpEnabled: boolean("totp_enabled").notNull().default(false),
  // The last accepted TOTP time step. RFC 6238 §5.2: a code may be used once.
  totpLastStep: integer("totp_last_step"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: created(),
  updatedAt: updated(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [index("users_status_idx").on(t.status)]);

export const sessions = pgTable("sessions", {
  id: id(),
  tokenHash: text("token_hash").notNull().unique(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: created(),
  lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
}, (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expiry_idx").on(t.expiresAt)]);

export const passwordResets = pgTable("password_resets", {
  id: id(),
  tokenHash: text("token_hash").notNull().unique(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: created(),
});

export const loginAttempts = pgTable("login_attempts", {
  id: id(),
  email: text("email").notNull(),
  ip: text("ip"),
  success: boolean("success").notNull(),
  reason: text("reason"),
  createdAt: created(),
}, (t) => [
  index("login_attempts_email_idx").on(t.email, t.createdAt),
  index("login_attempts_ip_idx").on(t.ip, t.createdAt),
]);

/* ───────────────────────────────── media (declared early: referenced widely) */

export const mediaAssets = pgTable("media_assets", {
  id: id(),
  storageKey: text("storage_key").notNull().unique(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  bytes: integer("bytes").notNull(),
  width: integer("width"),
  height: integer("height"),
  altText: text("alt_text").notNull(),
  caption: text("caption"),
  blurhash: text("blurhash"),
  createdAt: created(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

/* ───────────────────────────────── editorial workflow */

export const pages = pgTable("pages", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt"),
  imageId: text("image_id").references(() => mediaAssets.id),
  body: text("body").notNull(),
  status: contentStatus("status").notNull().default("DRAFT"),
  section: text("section"),
  order: integer("order").notNull().default(0),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  authorId: text("author_id").references(() => users.id),
  createdAt: created(),
  updatedAt: updated(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [index("pages_status_published_idx").on(t.status, t.publishedAt)]);

export const pageRevisions = pgTable("page_revisions", {
  id: id(),
  pageId: text("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  authorId: text("author_id").references(() => users.id),
  createdAt: created(),
}, (t) => [uniqueIndex("page_revision_version_idx").on(t.pageId, t.version)]);

export const contentBlocks = pgTable("content_blocks", {
  id: id(),
  page: text("page").notNull(),
  slot: text("slot").notNull(),
  label: text("label").notNull(),
  eyebrow: text("eyebrow"),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  ctaLabel: text("cta_label"),
  ctaHref: text("cta_href"),
  imageId: text("image_id").references(() => mediaAssets.id),
  order: integer("order").notNull().default(0),
  status: contentStatus("status").notNull().default("DRAFT"),
  authorId: text("author_id").references(() => users.id),
  createdAt: created(),
  updatedAt: updated(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [
  uniqueIndex("content_blocks_page_slot_idx").on(t.page, t.slot),
  index("content_blocks_page_status_idx").on(t.page, t.status, t.order),
]);

export const categories = pgTable("categories", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
});

export const tags = pgTable("tags", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
});

export const articles = pgTable("articles", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  body: text("body").notNull(),
  status: contentStatus("status").notNull().default("DRAFT"),
  categoryId: text("category_id").references(() => categories.id),
  imageId: text("image_id").references(() => mediaAssets.id),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  publishAt: timestamp("publish_at", { withTimezone: true }),
  authorId: text("author_id").references(() => users.id),
  createdAt: created(),
  updatedAt: updated(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [index("articles_status_published_idx").on(t.status, t.publishedAt)]);

export const articleRevisions = pgTable("article_revisions", {
  id: id(),
  articleId: text("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  authorId: text("author_id").references(() => users.id),
  createdAt: created(),
}, (t) => [uniqueIndex("article_revision_version_idx").on(t.articleId, t.version)]);

export const articleTags = pgTable("article_tags", {
  articleId: text("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
  tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.articleId, t.tagId] })]);

/* ───────────────────────────────── the work */

export const programs = pgTable("programs", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  tagline: text("tagline").notNull(),
  lead: text("lead").notNull(),
  activities: text("activities").array().notNull().default(sql`ARRAY[]::text[]`),
  rationale: text("rationale").array().notNull().default(sql`ARRAY[]::text[]`),
  response: text("response").notNull(),
  icon: text("icon").notNull(),
  order: integer("order").notNull().default(0),
  status: contentStatus("status").notNull().default("PUBLISHED"),
  imageId: text("image_id").references(() => mediaAssets.id),
  authorId: text("author_id").references(() => users.id),
  createdAt: created(),
  updatedAt: updated(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const projects = pgTable("projects", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  imageId: text("image_id").references(() => mediaAssets.id),
  objectives: text("objectives").array().notNull().default(sql`ARRAY[]::text[]`),
  county: text("county"),
  location: text("location"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  projectStatus: projectStatus("project_status").notNull().default("PLANNED"),
  status: contentStatus("status").notNull().default("DRAFT"),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  programId: text("program_id").references(() => programs.id),
  authorId: text("author_id").references(() => users.id),
  createdAt: created(),
  updatedAt: updated(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [index("projects_status_start_idx").on(t.status, t.startDate)]);

export const partners = pgTable("partners", {
  id: id(),
  name: text("name").notNull(),
  website: text("website"),
  logoId: text("logo_id").references(() => mediaAssets.id),
});

export const impactMetrics = pgTable("impact_metrics", {
  id: id(),
  label: text("label").notNull(),
  sublabel: text("sublabel"),
  target: integer("target").notNull(),
  actual: integer("actual").notNull().default(0),
  unit: text("unit"),
  order: integer("order").notNull().default(0),
  projectId: text("project_id").references(() => projects.id),
  createdAt: created(),
  updatedAt: updated(),
});

export const events = pgTable("events", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  location: text("location").notNull(),
  county: text("county"),
  registerUrl: text("register_url"),
  status: contentStatus("status").notNull().default("DRAFT"),
  imageId: text("image_id").references(() => mediaAssets.id),
  authorId: text("author_id").references(() => users.id),
  createdAt: created(),
  updatedAt: updated(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [index("events_status_starts_idx").on(t.status, t.startsAt)]);

export const eventRegistrations = pgTable("event_registrations", {
  id: id(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  createdAt: created(),
});

/* ───────────────────────────────── library */

export const publicationCategories = pgTable("publication_categories", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
});

export const publications = pgTable("publications", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  categoryId: text("category_id").references(() => publicationCategories.id),
  fileId: text("file_id").references(() => mediaAssets.id),
  publishedOn: timestamp("published_on", { withTimezone: true }),
  allowDownload: boolean("allow_download").notNull().default(true),
  status: contentStatus("status").notNull().default("DRAFT"),
  downloads: integer("downloads").notNull().default(0),
  authorId: text("author_id").references(() => users.id),
  createdAt: created(),
  updatedAt: updated(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [index("publications_status_idx").on(t.status, t.publishedOn)]);

/* ───────────────────────────────── people */

export const departments = pgTable("departments", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  order: integer("order").notNull().default(0),
});

export const teamMembers = pgTable("team_members", {
  id: id(),
  name: text("name"),
  role: text("role").notNull(),
  biography: text("biography"),
  duties: text("duties").array().notNull().default(sql`ARRAY[]::text[]`),
  group: text("group").notNull(),
  departmentId: text("department_id").references(() => departments.id),
  photoId: text("photo_id").references(() => mediaAssets.id),
  order: integer("order").notNull().default(0),
  vacant: boolean("vacant").notNull().default(false),
  createdAt: created(),
  updatedAt: updated(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

/* ───────────────────────────────── chat and the assistant */

export const chatVisitors = pgTable("chat_visitors", {
  id: id(),
  anonymousId: text("anonymous_id").notNull().unique(),
  name: text("name"),
  email: text("email"),
  userAgent: text("user_agent"),
  approxLocation: text("approx_location"),
  consented: boolean("consented").notNull().default(false),
  blocked: boolean("blocked").notNull().default(false),
  createdAt: created(),
});

export const conversations = pgTable("conversations", {
  id: id(),
  reference: text("reference").notNull().unique(),
  status: conversationStatus("status").notNull().default("AI"),
  subject: text("subject"),
  visitorId: text("visitor_id").notNull().references(() => chatVisitors.id, { onDelete: "cascade" }),
  assignedToId: text("assigned_to_id").references(() => users.id),
  referrerPath: text("referrer_path"),
  tags: text("tags").array().notNull().default(sql`ARRAY[]::text[]`),
  aiReplies: integer("ai_replies").notNull().default(0),
  startedAt: created(),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  deleteAfter: timestamp("delete_after", { withTimezone: true }).notNull(),
}, (t) => [index("conversations_status_last_idx").on(t.status, t.lastMessageAt)]);

export const chatMessages = pgTable("chat_messages", {
  id: id(),
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  author: chatAuthor("author").notNull(),
  staffId: text("staff_id").references(() => users.id),
  body: text("body").notNull(),
  sources: jsonb("sources"),
  confidence: real("confidence"),
  model: text("model"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  createdAt: created(),
}, (t) => [index("chat_messages_conversation_idx").on(t.conversationId, t.createdAt)]);

export const cannedReplies = pgTable("canned_replies", {
  id: id(),
  label: text("label").notNull(),
  body: text("body").notNull(),
  order: integer("order").notNull().default(0),
  createdAt: created(),
});

export const assistantSettings = pgTable("assistant_settings", {
  id: text("id").primaryKey().default("singleton"),
  enabled: boolean("enabled").notNull().default(true),
  restrictToContent: boolean("restrict_to_content").notNull().default(true),
  showSources: boolean("show_sources").notNull().default(true),
  handOverWhenUnsure: boolean("hand_over_when_unsure").notNull().default(true),
  captureEmailOutOfHours: boolean("capture_email_out_of_hours").notNull().default(true),
  assistantName: text("assistant_name").notNull().default("CGZSA Assistant"),
  tone: text("tone").notNull().default("Plain and factual"),
  greeting: text("greeting").notNull(),
  handoverMessage: text("handover_message").notNull(),
  neverDiscuss: text("never_discuss").array().notNull().default(sql`ARRAY[]::text[]`),
  confidenceThreshold: real("confidence_threshold").notNull().default(0.75),
  maxRepliesPerConversation: integer("max_replies_per_conversation").notNull().default(6),
  monthlyCapUsd: real("monthly_cap_usd").notNull().default(25),
  spentThisMonthUsd: real("spent_this_month_usd").notNull().default(0),
  officeOpen: text("office_open").notNull().default("08:00"),
  officeClose: text("office_close").notNull().default("17:00"),
  officeDays: text("office_days").notNull().default("Monday to Friday"),
  updatedAt: updated(),
});

export const knowledgeSources = pgTable("knowledge_sources", {
  id: id(),
  kind: text("kind").notNull(),
  label: text("label").notNull(),
  automatic: boolean("automatic").notNull().default(true),
  itemCount: integer("item_count").notNull().default(0),
  lastIndexedAt: timestamp("last_indexed_at", { withTimezone: true }),
  createdAt: created(),
});

export const knowledgePassages = pgTable("knowledge_passages", {
  id: id(),
  sourceId: text("source_id").notNull().references(() => knowledgeSources.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  url: text("url").notNull(),
  body: text("body").notNull(),
  terms: text("terms").array().notNull().default(sql`ARRAY[]::text[]`),
  tokens: integer("tokens").notNull().default(0),
  embedding: doublePrecision("embedding").array(),
  // Maintained by PostgreSQL. Both search queries previously called
  // to_tsvector() on every row at query time, which no index can serve.
  search: tsvector("search").generatedAlwaysAs(
    sql`to_tsvector('english', title || ' ' || body)`,
  ),
  createdAt: created(),
}, (t) => [
  index("knowledge_passages_source_idx").on(t.sourceId),
  index("knowledge_passages_search_idx").using("gin", t.search),
]);

export const unansweredQuestions = pgTable("unanswered_questions", {
  id: id(),
  question: text("question").notNull().unique(),
  timesAsked: integer("times_asked").notNull().default(1),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolution: text("resolution"),
  createdAt: created(),
  updatedAt: updated(),
});

/* ───────────────────────────────── interaction */

export const contactMessages = pgTable("contact_messages", {
  id: id(),
  reference: text("reference").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: messageStatus("status").notNull().default("UNREAD"),
  source: text("source").notNull().default("contact_form"),
  // "set null", not the default NO ACTION. An escalated chat creates a contact
  // message pointing at the conversation; conversations are deleted after twelve
  // months and contact messages after twenty-four, so without a delete rule the
  // retention job hits a foreign-key violation and aborts — taking scheduled
  // publishing and session cleanup down with it.
  conversationId: text("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
  ip: text("ip"),
  createdAt: created(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [index("contact_messages_status_idx").on(t.status, t.createdAt)]);

export const volunteerApplications = pgTable("volunteer_applications", {
  id: id(),
  reference: text("reference").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  county: text("county"),
  interest: text("interest").notNull(),
  note: text("note"),
  status: messageStatus("status").notNull().default("UNREAD"),
  createdAt: created(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const faqs = pgTable("faqs", {
  id: id(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  order: integer("order").notNull().default(0),
  status: contentStatus("status").notNull().default("DRAFT"),
  createdAt: created(),
  updatedAt: updated(),
});

/* ───────────────────────────────── system */

export const siteSettings = pgTable("site_settings", {
  id: text("id").primaryKey().default("singleton"),
  orgName: text("org_name").notNull(),
  shortName: text("short_name").notNull(),
  motto: text("motto").notNull(),
  strapline: text("strapline").notNull(),
  email: text("email").notNull(),
  phone1: text("phone1").notNull(),
  phone2: text("phone2"),
  phone3: text("phone3"),
  office: text("office").notNull(),
  registeredSeat: text("registered_seat").notNull(),
  officeHours: text("office_hours"),
  registrationNo: text("registration_no"),
  showRegistrationNo: boolean("show_registration_no").notNull().default(false),
  facebookUrl: text("facebook_url"),
  twitterUrl: text("twitter_url"),
  instagramUrl: text("instagram_url"),
  linkedinUrl: text("linkedin_url"),
  youtubeUrl: text("youtube_url"),
  canonicalDomain: text("canonical_domain").notNull().default("cgzsa.org"),
  titleTemplate: text("title_template").notNull().default("%s | CGZSA"),
  defaultDescription: text("default_description").notNull(),
  impactBandLabel: text("impact_band_label").notNull().default("Our Five-Year Targets"),
  contactRecipient: text("contact_recipient").notNull(),
  logoId: text("logo_id").references(() => mediaAssets.id),
  homeHeroImageId: text("home_hero_image_id").references(() => mediaAssets.id),
  homeIntroImageId: text("home_intro_image_id").references(() => mediaAssets.id),
  homeWasteImageId: text("home_waste_image_id").references(() => mediaAssets.id),
  homePublicSpaceImageId: text("home_public_space_image_id").references(() => mediaAssets.id),
  homeWaterImageId: text("home_water_image_id").references(() => mediaAssets.id),
  homeVolunteerImageId: text("home_volunteer_image_id").references(() => mediaAssets.id),
  homePartnerImageId: text("home_partner_image_id").references(() => mediaAssets.id),
  homeDonateImageId: text("home_donate_image_id").references(() => mediaAssets.id),
  programsPageImageId: text("programs_page_image_id").references(() => mediaAssets.id),
  projectsPageImageId: text("projects_page_image_id").references(() => mediaAssets.id),
  newsPageImageId: text("news_page_image_id").references(() => mediaAssets.id),
  eventsPageImageId: text("events_page_image_id").references(() => mediaAssets.id),
  contactPageImageId: text("contact_page_image_id").references(() => mediaAssets.id),
  updatedAt: updated(),
});

/**
 * Per-page SEO overrides. The table existed from the start and was read by
 * nothing, which is why the audit found no canonical tag, Open Graph image or
 * structured data on any page — the storage was built and never connected.
 *
 * Each row points at exactly one content record. The unique indexes make that a
 * database rule rather than a convention, so a page cannot end up with two
 * conflicting sets of metadata.
 */
export const seoMeta = pgTable("seo_meta", {
  id: id(),
  title: text("title"),
  description: text("description"),
  canonical: text("canonical"),
  ogImageId: text("og_image_id").references(() => mediaAssets.id),
  noindex: boolean("noindex").notNull().default(false),
  pageId: text("page_id").references(() => pages.id, { onDelete: "cascade" }),
  articleId: text("article_id").references(() => articles.id, { onDelete: "cascade" }),
  programId: text("program_id").references(() => programs.id, { onDelete: "cascade" }),
}, (t) => [
  uniqueIndex("seo_meta_page_idx").on(t.pageId),
  uniqueIndex("seo_meta_article_idx").on(t.articleId),
  uniqueIndex("seo_meta_program_idx").on(t.programId),
]);

export const redirects = pgTable("redirects", {
  id: id(),
  from: text("from").notNull().unique(),
  to: text("to").notNull(),
  code: integer("code").notNull().default(301),
  createdAt: created(),
});

export const auditLogs = pgTable("audit_logs", {
  id: id(),
  actorId: text("actor_id").references(() => users.id),
  actorLabel: text("actor_label").notNull(),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  detail: text("detail"),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: created(),
}, (t) => [index("audit_created_idx").on(t.createdAt), index("audit_action_idx").on(t.action)]);

/* ───────────────────────────────── relations */

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, { fields: [users.roleId], references: [roles.id] }),
  sessions: many(sessions),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
  permissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, { fields: [rolePermissions.permissionId], references: [permissions.id] }),
}));

export const programsRelations = relations(programs, ({ many }) => ({
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one }) => ({
  program: one(programs, { fields: [projects.programId], references: [programs.id] }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  visitor: one(chatVisitors, { fields: [conversations.visitorId], references: [chatVisitors.id] }),
  assignedTo: one(users, { fields: [conversations.assignedToId], references: [users.id] }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  conversation: one(conversations, { fields: [chatMessages.conversationId], references: [conversations.id] }),
  staff: one(users, { fields: [chatMessages.staffId], references: [users.id] }),
}));

export const knowledgePassagesRelations = relations(knowledgePassages, ({ one }) => ({
  source: one(knowledgeSources, { fields: [knowledgePassages.sourceId], references: [knowledgeSources.id] }),
}));
