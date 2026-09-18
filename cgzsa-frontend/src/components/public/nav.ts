export const NAV = [
  {
    label: "About",
    href: "/about",
    items: [
      ["/about", "Who We Are", "Introduction and background"],
      ["/about/why-we-were-founded", "Why We Were Founded", "The six problems we answer"],
      ["/about/mission-vision-values", "Mission, Vision & Values", "And our twelve core values"],
      ["/about/goals-and-objectives", "Goals & Objectives", "Five goals, seven objectives"],
      ["/about/leadership", "Leadership & Team", "Board, executive and departments"],
      ["/about/governance", "Governance & Registration", "Bylaws, code of conduct, legal status"],
    ],
  },
  {
    label: "Our Work",
    href: "/programs",
    items: [
      ["/programs", "All Programmes", "The five programme areas"],
      ["/projects", "Projects", "Individual installations by county"],
    ],
  },
  {
    label: "Resources",
    href: "/news",
    items: [
      ["/news", "News & Announcements", "Updates from our campaigns and community work"],
      ["/resources/faqs", "Frequently Asked Questions", ""],
      ["/resources/publications", "Publications & Documents", "Reports, policies, organizational documents"],
    ],
  },
  {
    label: "Get Involved",
    href: "/get-involved/volunteer",
    items: [
      ["/get-involved/volunteer", "Volunteer With Us", "Four routes into the work"],
      ["/get-involved/partner", "Partner With Us", "Sponsor a project or an installation"],
      ["/get-involved/donate", "Support Our Work", "Fund materials and installations"],
    ],
  },
  { label: "Contact", href: "/contact", items: [] },
] as const;
