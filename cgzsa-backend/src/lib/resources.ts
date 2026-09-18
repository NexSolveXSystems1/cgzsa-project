/**
 * The content-type registry. Kept out of the "use server" module because a
 * server-action file may only export async functions.
 */
import {
  articles, contentBlocks, events, faqs, pages, programs, projects, publications, teamMembers,
} from "@/db/schema";

type Descriptor = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: any;
  label: string;
  adminPath: string;
  publicPath?: (slug: string) => string;
  hasStatus: boolean;
  hasSlug: boolean;
  hasPublishedAt?: boolean;
};

export const RESOURCES = {
  pages: { table: pages, label: "Page", adminPath: "/admin/pages", publicPath: (s: string) => `/${s}`, hasStatus: true, hasSlug: true, hasPublishedAt: true },
  contentBlocks: { table: contentBlocks, label: "Content block", adminPath: "/admin/content-blocks", hasStatus: true, hasSlug: false },
  news: { table: articles, label: "Article", adminPath: "/admin/news", publicPath: (s: string) => `/news/${s}`, hasStatus: true, hasSlug: true, hasPublishedAt: true },
  programmes: { table: programs, label: "Programme", adminPath: "/admin/programmes", publicPath: (s: string) => `/programs/${s}`, hasStatus: true, hasSlug: true },
  projects: { table: projects, label: "Project", adminPath: "/admin/projects", publicPath: (s: string) => `/projects/${s}`, hasStatus: true, hasSlug: true },
  events: { table: events, label: "Event", adminPath: "/admin/events", publicPath: (s: string) => `/events/${s}`, hasStatus: true, hasSlug: true },
  publications: { table: publications, label: "Publication", adminPath: "/admin/publications", publicPath: (s: string) => `/resources/publications/${s}`, hasStatus: true, hasSlug: true },
  faqs: { table: faqs, label: "Question", adminPath: "/admin/faqs", hasStatus: true, hasSlug: false },
  team: { table: teamMembers, label: "Team member", adminPath: "/admin/team", hasStatus: false, hasSlug: false },
} as Record<string, Descriptor>;

export type ResourceKey =
  | "pages" | "contentBlocks" | "news" | "programmes" | "projects" | "events" | "publications" | "faqs" | "team";
