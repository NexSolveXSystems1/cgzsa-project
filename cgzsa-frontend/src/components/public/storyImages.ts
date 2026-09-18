export type StoryImage = {
  src: string;
  alt: string;
  credit: string;
};

export const STORY_IMAGES = {
  communityCleanup: {
    src: "/photos/hero-cleanup.jpg",
    alt: "Volunteers collecting litter in a green public space.",
    credit: "Pexels / Galib Rahman Nadim",
  },
  wasteAction: {
    src: "/photos/waste-action.jpg",
    alt: "Volunteers collecting plastic waste during an outdoor cleanup.",
    credit: "Pexels / Ron Lach",
  },
  safeWater: {
    src: "/photos/water-access.jpg",
    alt: "Children gathered around a community water pump.",
    credit: "Unsplash / Hannah Dean",
  },
  publicSpace: {
    src: "/photos/public-space.jpg",
    alt: "Volunteers restoring a dry playground and public space.",
    credit: "Pexels / Gonzalo Angueira",
  },
  busStop: {
    src: "/photos/bus-stop.jpg",
    alt: "People boarding a public bus at a roadside stop in West Africa.",
    credit: "Pexels / Nannawa Badiya",
  },
  floodCleanup: {
    src: "/photos/flood-cleanup.jpg",
    alt: "A worker clearing debris from polluted floodwater.",
    credit: "Pexels / JESUS ADRIAN SAAVEDRA",
  },
} satisfies Record<string, StoryImage>;

const PROGRAMME_IMAGES: Record<string, StoryImage> = {
  "waste-management-and-recycling": STORY_IMAGES.wasteAction,
  "safe-drinking-water": STORY_IMAGES.safeWater,
  "parks-and-public-spaces": STORY_IMAGES.publicSpace,
  "benches-and-bus-stops": STORY_IMAGES.busStop,
  "flood-mitigation-and-sanitation": STORY_IMAGES.floodCleanup,
};

export function programmeImage(slug: string | null | undefined): StoryImage {
  return (slug && PROGRAMME_IMAGES[slug]) || STORY_IMAGES.communityCleanup;
}

export function mediaStoryImage(
  storageKey: string | null | undefined,
  alt: string | null | undefined,
  fallback: StoryImage,
): StoryImage {
  return storageKey
    ? { src: `/api/media/${storageKey}`, alt: alt || fallback.alt, credit: "CMS upload" }
    : fallback;
}
