import { Church, Wine, type LucideIcon } from "lucide-react";

export type WeddingEvent = {
  id: string; title: string; icon: LucideIcon;
  time: string; venue: string; address: string; map: string;
};

/* Edit these once the couple confirms details. Paste a Google Maps URL into `map` to show a "View map" button. */
export const WEDDING = {
  groom: "Jesthony",
  bride: "Danica",
  dateLong: "Sunday, June 6, 2027",
  targetISO: "2027-06-06T00:00:00+08:00",
  verse: "“When the time is right, I, the Lord will make it happen.”",
  verseRef: "Isaiah 60:22",
  /* The "View formal invitation" button only shows when this has a link. Leave it empty to hide the button. */
  invitationUrl: "", // was a placeholder (https://www.google.com); paste the real link here when it is ready
  events: [
    { id: "ceremony", title: "The Ceremony", icon: Church, time: "Time to be announced", venue: "St. Isidore the Farmer Parish Church", address: "San Isidro, San Juan, Ilocos Sur · Archdiocese of Nueva Segovia", map: "https://www.google.com/maps/search/?api=1&query=St.+Isidore+the+Farmer+Parish+Church+San+Isidro+San+Juan+Ilocos+Sur" },
    { id: "reception", title: "The Reception", icon: Wine, time: "Time to be announced", venue: "Paradise Viewdeck Resort", address: "PCGQ+RG, San Juan, Ilocos Sur", map: "https://www.google.com/maps/search/?api=1&query=Paradise+Viewdeck+Resort+PCGQ%2BRG+San+Juan+Ilocos+Sur" },
  ] as WeddingEvent[],
};

/* Route from the ceremony (origin) to the reception (destination). No API key needed. */
const enc = (s: string) => encodeURIComponent(s);
const from = `${WEDDING.events[0].venue}, ${WEDDING.events[0].address.split(" · ")[0]}`;
const to = `${WEDDING.events[1].venue}, ${WEDDING.events[1].address}`;
export const ROUTE = {
  embed: `https://maps.google.com/maps?saddr=${enc(from)}&daddr=${enc(to)}&output=embed`,
  open: `https://www.google.com/maps/dir/?api=1&origin=${enc(from)}&destination=${enc(to)}&travelmode=driving`,
};
