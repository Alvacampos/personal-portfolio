// Forward-looking groups rendered after the data-driven tech groups
// on the TechTree. These aren't job experiences (no SKILLS entry, no
// range) — they're aspirations / in-flight study. The chip strings
// are literals (proper nouns / certifications), so they aren't run
// through `localized()`. The `id` on each group is the intl message
// id for the heading rendered above the chip list.
type ForwardGroup = {
  id: string;
  variant: 'learning' | 'future';
  tech: string[];
};

export const FORWARD_GROUPS: ForwardGroup[] = [
  {
    id: 'TECH_GROUP_LEARNING',
    variant: 'learning',
    tech: ['Python (deepening)'],
  },
  {
    id: 'TECH_GROUP_FUTURE',
    variant: 'future',
    tech: ["Master's in IT Management — UNSTA"],
  },
];
