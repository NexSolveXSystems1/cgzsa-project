/**
 * Organisational content, taken verbatim from the thirteen documents supplied
 * by CGZSA. Nothing here is invented. Items CGZSA has not yet supplied are
 * marked `placeholder: true` and rendered as such.
 */

export const ORG = {
  orgName: "Clean and Green Zero Sphere Alliance",
  shortName: "CGZSA",
  motto: "Local Action, Lifelong Transformation",
  strapline: "Reviving Spaces. Restoring Dignity. Reshaping Tomorrow",
  founded: "20 April 2025",
  filed: "16 September 2025",
  registrationNo: "0539 1157 9",
  email: "cleanandgreenzerosphereallianc@gmail.com",
  phone1: "+231 776 163 882",
  phone2: "+231 886 194 785",
  phone3: "+231 776 368 907",
  office: "Duport Road Junction, Paynesville City, Montserrado County, Republic of Liberia",
  registeredSeat: "Monrovia, Liberia",
  vision:
    "To see a Liberia where every community is clean, green, and thriving — free from waste, " +
    "environmental hazards, and water insecurity, empowered by youth leadership and united in " +
    "protecting the environment for current and future generations.",
  mission:
    "Clean and Green Zero Sphere Alliance is committed to building a cleaner, greener, and more " +
    "resilient Liberia by mobilizing youth and communities to tackle waste pollution, restore " +
    "neglected public spaces, and provide access to safe drinking water. Through education, " +
    "innovation, and grassroots action, we champion sustainable solutions that promote " +
    "environmental health, community well-being, and nationwide environmental stewardship.",
  defaultDescription:
    "Clean and Green Zero Sphere Alliance is a youth-led non-profit mobilizing communities across " +
    "Liberia to tackle waste pollution, restore public spaces and provide safe drinking water.",
};

export const PROGRAMS = [
  {
    slug: "waste-management-and-recycling",
    title: "Waste Management & Recycling",
    tagline: "Flagship programme",
    icon: "waste",
    lead:
      "Uncontrolled dumping is the most visible environmental failure in Monrovia and Paynesville. " +
      "We work street by street to change how waste is handled at the point where it is produced.",
    activities: [
      "Community clean-up campaigns",
      "Door-to-door education on sorting and disposal",
      "School programme on environmental education",
    ],
    rationale: [
      "Across many Liberian towns and cities, especially urban areas like Monrovia and Paynesville, unmanaged waste piles up along streets, drains, and open fields.",
      "The accumulation of waste has contributed to the spread of preventable diseases such as cholera, typhoid, and malaria.",
      "Limited waste collection services and poorly managed landfill sites have worsened the crisis, prompting the need for grassroots solutions.",
    ],
    response:
      "CGZSA was founded to raise awareness, mobilize communities, and directly engage in waste " +
      "reduction, recycling education, and advocacy for improved waste management systems.",
  },
  {
    slug: "safe-drinking-water",
    title: "Access to Safe Drinking Water",
    tagline: "50 communities by 2030",
    icon: "water",
    lead:
      "Where a community has no reliable water point, everything else — health, school attendance, " +
      "women's time, dignity — is downstream of that one problem. We install and maintain the point.",
    activities: [
      "Installation of solar-powered tap systems in local communities",
      "Community awareness on water safety",
      "Partnership with water NGOs",
    ],
    rationale: [
      "Many communities still lack reliable access to safe drinking water.",
      "Wells, hand pumps, and water kiosks often fall into disrepair due to lack of maintenance.",
      "Unclean water sources contribute to frequent outbreaks of diarrheal illnesses, particularly among children.",
    ],
    response:
      "CGZSA committed to projects such as installing solar-powered tap water systems, maintaining " +
      "wells, and promoting hygiene awareness programs.",
  },
  {
    slug: "parks-and-public-spaces",
    title: "Parks Rehabilitation & Beautification",
    tagline: "Reviving spaces",
    icon: "park",
    lead:
      "A park that has become a dumping ground takes something from a community that is hard to name " +
      "and easy to feel. Restoring it is among the cheapest, most visible wins available to us.",
    activities: [
      "Restoring abandoned and unsafe community parks and recreation sites",
      "Installing playgrounds",
      "Tree planting and mural art projects",
    ],
    rationale: [
      "Many public parks and recreational spaces have fallen into disrepair, becoming dumping grounds instead of safe, healthy gathering spots.",
      "Without clean public spaces, communities lose important places for recreation, cultural activities, and social cohesion.",
    ],
    response:
      "The Alliance prioritizes park rehabilitation, beautification projects, and community-led " +
      "maintenance programs to restore pride in shared public spaces.",
  },
  {
    slug: "benches-and-bus-stops",
    title: "Street Benches & Bus Stops",
    tagline: "Restoring dignity",
    icon: "bench",
    lead:
      "Somewhere to sit while you wait is not a small thing. It is the difference between a city that " +
      "treats people as traffic and one that treats them as citizens.",
    activities: [
      "Building benches across major bus stops nationwide",
      "Promoting comfort and public dignity",
    ],
    rationale: [
      "Public transport waiting points across Liberia typically offer no seating, shade or shelter, which falls hardest on elderly travellers, pregnant women and traders carrying goods.",
    ],
    response:
      "CGZSA builds and maintains simple, durable street furniture at major bus stops, designed and " +
      "installed with the communities that use them.",
  },
  {
    slug: "flood-mitigation-and-sanitation",
    title: "Flood Mitigation & Sanitation",
    tagline: "Climate resilience",
    icon: "flood",
    lead:
      "Urban flooding in Liberia is a waste problem before it is a weather problem. Blocked drains turn " +
      "ordinary rain into a disaster, and clearing them is work communities can do themselves.",
    activities: [
      "Community drainage cleaning projects",
      "Early-warning education for flood-prone zones",
      "Youth participation in urban planning dialogues",
    ],
    rationale: [
      "Climate change is intensifying flooding in urban areas, often worsened by blocked drains filled with waste.",
      "Deforestation, poor waste management, and pollution are eroding Liberia's natural environment.",
    ],
    response:
      "The Alliance integrates climate resilience strategies — restoring vegetation, promoting " +
      "recycling, and keeping waterways clean — into its core mission.",
  },
];

export const VALUES: { name: string; definition: string; placeholder?: boolean }[] = [
  { name: "Sustainability", definition: "We are committed to creating solutions that last, not quick fixes. Every waste management project, park rehabilitation and clean water system is designed to benefit communities today and for generations to come — using environmentally friendly methods, promoting renewable energy such as solar-powered water pumps, and encouraging eco-conscious lifestyles." },
  { name: "Integrity", definition: "We operate with honesty, transparency and accountability in all our actions. Whether managing funds, engaging volunteers or reporting project results, we maintain the highest ethical standards. Integrity to us means doing the right thing even when no one is watching." },
  { name: "Community Empowerment", definition: "Lasting change happens when communities are equipped with knowledge, tools and opportunities to act. We do not just work for communities — we work with them, making them active partners in waste reduction, water safety and environmental protection." },
  { name: "Innovation", definition: "We embrace creativity and new ideas in solving old problems like waste pollution, unsafe water and neglected parks: modern recycling methods, community-driven clean-up models, and cost-effective low-tech solutions that fit Liberia's context." },
  { name: "Environmental Stewardship", definition: "We see ourselves as caretakers of Liberia's natural resources — using our environment wisely, protecting it from harm and restoring damaged areas. We treat every beach, park, tree and river as a national treasure to be preserved." },
  { name: "Collaboration", definition: "We value partnerships with local leaders, government agencies, schools and other organizations. Working together allows us to pool resources, share expertise and amplify impact." },
  { name: "Accountability", definition: "We take full responsibility for the results of our actions. We monitor, evaluate and report on our work so supporters, partners and communities know exactly what we have achieved and where we need improvement." },
  { name: "Youth Leadership", definition: "As a youth-led organization, we believe the energy, creativity and vision of young people are essential for transforming Liberia's environmental future. We invest in training and mentoring young leaders who can inspire others." },
  { name: "Service", definition: "We exist to serve people and the planet — putting the needs of communities first, responding to environmental crises quickly, and going the extra mile to make Liberia cleaner, greener and safer." },
  { name: "Resilience", definition: "Challenges like flooding, poor waste infrastructure and limited resources will test us. Resilience means we keep pushing forward, learning from setbacks and adapting to change without losing sight of our goals." },
  { name: "Transparency", definition: "", placeholder: true },
  { name: "Inclusiveness", definition: "", placeholder: true },
];

export const GOALS = [
  "Transform polluted and unsafe public areas into green, clean and safe community spaces.",
  "Provide safe drinking water to at least 50 communities within the next five years.",
  "Achieve a reduction in waste in all CGZSA partner communities.",
  "Build a strong grassroots movement of youth and community leaders actively involved in environmental action.",
  "Position Liberia as a regional leader in sustainability and environmental innovation.",
];

export const OBJECTIVES = [
  "Reduce waste pollution through regular clean-up campaigns, recycling programs and community waste management education.",
  "Provide safe drinking water by installing solar-powered purification systems, community water points, and promoting water safety awareness.",
  "Restore and protect public spaces through park rehabilitation projects, urban greening, and creation of safe recreational areas.",
  "Establish environmental clubs in schools and universities to promote sustainability practices.",
  "Foster partnerships with local and international stakeholders to fund and scale clean water and public space projects.",
  "Promote eco-friendly behaviours such as waste sorting, composting and reduced plastic use.",
  "Advocate for and support policies that ensure sustainable urban planning, clean water access and environmental protection.",
];

export const FOUNDING = [
  {
    title: "A growing waste management crisis",
    points: [
      "Uncontrolled waste disposal — unmanaged waste piles up along streets, drains and open fields, especially in Monrovia and Paynesville.",
      "Health hazards — accumulated waste has contributed to preventable diseases including cholera, typhoid and malaria.",
      "Weak infrastructure — limited collection services and poorly managed landfill sites have worsened the crisis.",
    ],
    response: "CGZSA was founded to raise awareness, mobilize communities and directly engage in waste reduction, recycling education and advocacy for improved waste management systems.",
  },
  {
    title: "Neglected public spaces and parks",
    points: [
      "Loss of green spaces — many public parks and recreational spaces have fallen into disrepair, becoming dumping grounds.",
      "Social disconnection — without clean public spaces, communities lose places for recreation, cultural activities and social cohesion.",
    ],
    response: "The Alliance prioritizes park rehabilitation, beautification projects and community-led maintenance programs to restore pride in shared public spaces.",
  },
  {
    title: "Unsafe drinking water and sanitation gaps",
    points: [
      "Limited access — many communities still lack reliable access to safe drinking water.",
      "Infrastructure decay — wells, hand pumps and water kiosks often fall into disrepair through lack of maintenance.",
      "Waterborne disease — unclean sources contribute to frequent diarrheal outbreaks, particularly among children.",
    ],
    response: "CGZSA committed to installing solar-powered tap water systems, maintaining wells and promoting hygiene awareness programs.",
  },
  {
    title: "Youth empowerment and engagement",
    points: [
      "Untapped potential — Liberia has a large youth population with the energy, creativity and will to drive change, but often no structured platform for meaningful engagement.",
      "Reducing unemployment — environmental work provides skill development, income opportunities and community leadership experience.",
    ],
    response: "CGZSA was designed as a youth-led movement where young volunteers lead campaigns, coordinate cleanups and develop sustainable community solutions.",
  },
  {
    title: "Environmental resilience and climate action",
    points: [
      "Flooding and drainage — climate change is intensifying urban flooding, often worsened by drains blocked with waste.",
      "Ecosystem degradation — deforestation, poor waste management and pollution are eroding Liberia's natural environment.",
    ],
    response: "The Alliance integrates climate resilience strategies — restoring vegetation, promoting recycling and keeping waterways clean — into its core mission.",
  },
  {
    title: "No nationwide, community-rooted action",
    points: [
      "Gap in coordination — some organizations address parts of the problem, but there has been no consistent, youth-led, nationwide approach combining waste management, clean water and public space renewal.",
      "Need for inclusive participation — sustainable change requires grassroots involvement, not top-down directives.",
    ],
    response: "CGZSA was built with a nationwide vision, ensuring its programs extend beyond Monrovia to reach rural and underserved areas.",
  },
];

export const TEAM = [
  { name: "Nathaniel M. Clark", role: "Co-founder & Executive Director", group: "Executive Team", vacant: false, duties: ["Leads overall strategic and operational management", "Implements Board decisions and reports to the Board", "Represents the organization in national and international settings", "Supervises departmental heads and ensures program effectiveness", "Ensures legal, ethical and financial compliance"] },
  { name: "Amos L. Mehn", role: "Co-founder & Chief Operating Officer", group: "Executive Team", vacant: false, duties: ["Supports and substitutes for the Executive Director", "Coordinates inter-departmental functions", "Leads internal systems improvement", "Oversees special projects and regional initiatives"] },
  { name: null, role: "Chairperson", group: "Board of Directors", vacant: true, duties: ["Provides strategic direction and leadership to the Board", "Chairs Board meetings and ensures governance best practices", "Represents the Board in public or high-level meetings", "Oversees the performance of the Executive Director"] },
  { name: null, role: "Vice Chairperson", group: "Board of Directors", vacant: true, duties: ["Supports the Chairperson and acts in their absence", "Helps maintain board functionality and cohesion", "May lead special board committees"] },
  { name: null, role: "Secretary", group: "Board of Directors", vacant: true, duties: ["Maintains all official Board records", "Prepares agendas and minutes of Board meetings", "Ensures compliance with legal filings and recordkeeping"] },
  { name: null, role: "Treasurer", group: "Board of Directors", vacant: true, duties: ["Oversees financial health and budget approval", "Reviews financial reports and audits", "Advises the Board on financial planning and resource allocation"] },
  { name: null, role: "Board Members (up to four)", group: "Board of Directors", vacant: true, duties: ["Participate in governance decisions and fundraising", "Serve on committees such as audit, HR and projects", "Provide oversight and guidance to executive management"] },
  { name: null, role: "Programs Manager", group: "Departments", vacant: true, duties: ["Designs, plans and implements core environmental programs — waste, water, parks", "Oversees field staff and project teams", "Coordinates with Monitoring & Evaluation for impact tracking", "Prepares program reports and recommendations"] },
  { name: null, role: "Community Engagement & Awareness Officer", group: "Departments", vacant: true, duties: ["Develops and executes community awareness campaigns", "Organizes workshops, school outreach and clean-up days", "Mobilizes youth and volunteers", "Gathers community feedback and promotes citizen participation"] },
  { name: null, role: "Monitoring, Evaluation, Research & Learning Officer", group: "Departments", vacant: true, duties: ["Designs tools for data collection and baseline surveys", "Tracks progress and performance indicators", "Conducts post-activity evaluations and prepares reports", "Supports learning and evidence-based decision-making"] },
  { name: null, role: "Finance & Administrative Manager", group: "Departments", vacant: true, duties: ["Manages financial planning, budgeting and reporting", "Maintains proper accounting systems and internal controls", "Oversees HR, procurement, logistics and office administration", "Ensures regulatory compliance and prepares audits"] },
  { name: null, role: "Communications Officer", group: "Departments", vacant: true, duties: ["Manages social media, website, press releases and branding", "Designs awareness materials, reports and newsletters", "Handles media relations and event promotion", "Coordinates internal and external communication"] },
  { name: null, role: "Partnerships & Resource Mobilization Officer", group: "Departments", vacant: true, duties: ["Develops proposals and funding applications", "Builds relationships with donors, partners and government agencies", "Identifies income-generating opportunities and strategic partnerships", "Tracks donor requirements and reporting obligations"] },
  { name: null, role: "Regional / County Coordinators", group: "Field Structure", vacant: true, duties: ["Lead operations in assigned counties or regions", "Liaise with local authorities, schools and community groups", "Ensure project consistency and quality at grassroots level", "Supervise community teams and volunteers"] },
  { name: null, role: "Youth Volunteer Team Leaders", group: "Field Structure", vacant: true, duties: ["Coordinate community cleanups, awareness events and local activities", "Report to Regional Coordinators or the Community Engagement Officer", "Motivate and manage volunteer teams", "Maintain attendance, reports and activity logs"] },
  { name: null, role: "General Volunteers", group: "Field Structure", vacant: true, duties: ["Participate in cleanup drives, tree planting, workshops and school programs", "Assist in awareness campaigns and data collection", "Advocate for environmental best practices in their communities"] },
];

export const CONDUCT = [
  { title: "Integrity and honesty", detail: "Always represent CGZSA truthfully and avoid misleading information. Never misuse funds, resources or privileges." },
  { title: "Respect and inclusion", detail: "Treat all members, communities and partners with dignity. Promote equality regardless of gender, ethnicity, religion or background." },
  { title: "Professionalism", detail: "Perform duties with diligence, punctuality and accountability. Dress appropriately during official functions." },
  { title: "Environmental responsibility", detail: "Lead by example in waste reduction and eco-friendly practices. Avoid activities harmful to the environment." },
  { title: "Conflict of interest", detail: "Avoid using the organization for personal gain." },
  { title: "Confidentiality", detail: "Respect and protect the confidential information of the organization." },
  { title: "Accountability", detail: "Be answerable for actions and decisions. Report misuse, abuse or misconduct immediately." },
  { title: "Prohibited behaviour", detail: "Discrimination, harassment, corruption, theft or violence. Spreading false information about the organization." },
];

export const BYLAWS = [
  ["Article I", "Name, status and location", "The official name is Clean and Green Zero Sphere Alliance (CGZSA). CGZSA is a youth-led, non-governmental, nonprofit and non-political organization registered in accordance with the laws of Liberia, with authority to establish chapters and branches nationwide."],
  ["Article II", "Vision, mission and objectives", "Sets out the vision, the mission, and five objectives covering waste reduction and recycling, park renovation and maintenance, safe drinking water including solar-powered taps, environmental awareness, and policy advocacy."],
  ["Article III", "Membership", "Open to individuals aged 18 and above who support the mission and values. Three categories: founding members who signed the Articles of Incorporation, regular members admitted on application, and honorary members recognized for exceptional contributions."],
  ["Article IV", "Governance structure", "The General Assembly is the supreme decision-making body, meeting annually to approve policies, budgets and strategic plans. The Board of Directors comprises a Chairperson, Vice Chairperson, Secretary, Treasurer and up to four additional members. Executive Management is headed by the Executive Director."],
  ["Article V", "Officers and duties", "Defines the duties of the Chairperson, Vice Chairperson, Secretary, Treasurer and Executive Director."],
  ["Article VI", "Meetings", "General Assembly once per year; Board meetings at least quarterly; special meetings may be called by the Chairperson or on the request of one third of members."],
  ["Article VII", "Finance", "Funding comes from donations, grants and sponsorships, and from fundraising events and projects. All financial transactions are recorded and audited annually."],
  ["Article VIII", "Disciplinary measures", "Grounds for discipline and the sanctions available are set out in full in the bylaws and applied by the Disciplinary Committee."],
  ["Article IX", "Amendments", "The bylaws may be amended by a two-thirds majority of the General Assembly."],
];

export const FAQS = [
  { question: "Is CGZSA a registered organization?", answer: "Yes. Clean and Green Zero Sphere Alliance filed its Articles of Incorporation with the Liberia Business Registry on 16 September 2025 and holds a Certificate of Business Registration as a not-for-profit NGO in Montserrado County." },
  { question: "Where does CGZSA work?", answer: "Our principal office is at Duport Road Junction, Paynesville City, Montserrado County. The bylaws give us authority to establish chapters and branches nationwide, and our programmes are designed to extend beyond Monrovia to rural and underserved areas." },
  { question: "How is CGZSA funded?", answer: "Under Article VII of our bylaws, funding comes from donations, grants and sponsorships, and from fundraising events and projects. All financial transactions are recorded and audited annually." },
  { question: "Who can become a member?", answer: "Membership is open to individuals aged 18 and above who support the mission and values of CGZSA. There are three categories: founding members, regular members admitted on application, and honorary members recognized for exceptional contributions." },
  { question: "Can I volunteer if I have no environmental background?", answer: "Yes. Our volunteer routes include clean-up drives, awareness teams, and skilled support in media, fundraising and monitoring and evaluation. Training is provided." },
  { question: "How do I partner with CGZSA?", answer: "Three routes are open: sponsor a community project, contribute to a water tap or bench installation project, or become a corporate or international partner. Use the contact form and we will respond." },
];

export const TARGETS = [
  { label: "Communities to receive safe drinking water", sublabel: "Five-year goal", target: 50, actual: 0 },
  { label: "Core programme areas in operation", sublabel: "Waste, water, parks, benches, flood", target: 5, actual: 5 },
  { label: "Counties in nationwide scope", sublabel: "Chapters authorised under Article I", target: 15, actual: 1 },
];

export const GET_INVOLVED = {
  volunteer: [
    ["Help with clean-up drives", "Community clean-up campaigns and drainage clearing, usually on Saturday mornings."],
    ["Join our awareness teams", "Door-to-door education on sorting and disposal, school outreach and community workshops."],
    ["Offer your skills in media", "Photography, video, social media and design for campaigns and reports."],
    ["Fundraising or M&E", "Proposal writing, donor relations, data collection, baseline surveys and evaluation."],
  ],
  partner: [
    ["Sponsor a community project", "Fund a complete clean-up campaign, park restoration or school programme in a named community, with reporting on what your support delivered."],
    ["Fund a tap or a bench", "Contribute to a specific solar-powered water tap or a bus stop bench installation — the two most tangible things we build."],
    ["Corporate or international partnership", "A longer-term relationship covering multiple programmes, with formal reporting against agreed indicators."],
  ],
};
