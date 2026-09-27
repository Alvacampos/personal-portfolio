// date-fns' Spanish locale renders month abbreviations lowercase ("ene",
// "feb" — correct Spanish orthography for running prose), but a date
// standing alone as a label (a card's date range, a calendar day
// heading) reads wrong that way — it wants the same capitalized look
// English already gets for free ("Jan" comes capitalized out of
// date-fns' English locale). Shared by formatDateRange and
// formatDayLabel, the two places that format a locale-aware date as a
// standalone label rather than inline prose.
export function capitalizeFirst(value: string): string {
  return value.length > 0 ? value[0].toUpperCase() + value.slice(1) : value;
}
