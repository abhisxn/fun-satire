export interface VideoEntry {
  readonly kind: "video";
  readonly videoId: string;
  readonly title: string;
  readonly channel: string;
}

export interface SourceEntry {
  readonly kind: "source";
  readonly href: string;
  readonly label: string;
  readonly icon: string;
}

export type GalleryEntry = VideoEntry | SourceEntry;

export function buildYouTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function buildYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function shuffleVideos(
  entries: readonly VideoEntry[],
  rng: () => number = Math.random,
): VideoEntry[] {
  const result = [...entries];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

export const GALLERY_ENTRIES: readonly GalleryEntry[] = [
  { kind: "video", videoId: "0j0vUAo52PM", title: "Reality of 20th July Protest", channel: "Sarthak Documentaries" },
  { kind: "video", videoId: "DEsAc_NP1DM", title: "Vo Bheed Chahti Kya Thi? Sun Lo", channel: "Unfiltered by Samdish" },
  { kind: "video", videoId: "6MTXCAaOy3o", title: "This is How It Went Down on the 20th", channel: "Unfiltered by Samdish" },
  { kind: "video", videoId: "QXGWiMxELE8", title: "The Night That Changed CJP's Jantar Mantar Protest ft. Sonal", channel: "Jist" },
  { kind: "video", videoId: "bKGmZI2CCgk", title: "What is CJP's Next Step After Jantar Mantar Protest? ft. Pragati", channel: "Jist" },
  { kind: "video", videoId: "RFWOnRBIyTw", title: "The Night Cockroaches Refused to Sleep — NL's Jantar Mantar Ground Report", channel: "Newslaundry" },
  { kind: "video", videoId: "Sg31DwsPCps", title: "Jharkhand Vs Jantar Mantar — Good protester vs bad protester (TV Newsance 349)", channel: "Newslaundry" },
  { kind: "video", videoId: "ie2EZQ6yxUw", title: "How CJP Won at Jantar Mantar — Vibe Check with Abhinandan Sekhri", channel: "Newslaundry" },
  { kind: "video", videoId: "1-f2Kgv0UnQ", title: "डरी हुई, मरी हुई जनता नहीं है, जंतर मंतर पर हज़ारों की संख्या में पहुंचे लोग", channel: "Ravish Kumar Official" },
  { kind: "video", videoId: "d-bxa264z60", title: "सोनम वांगचुक को ले गई पुलिस, अभिजीत दीपके का अनशन शुरू, जंतर-मंतर पर भारी भीड़ #cjp", channel: "Ravish Kumar Official" },
  { kind: "video", videoId: "lQn6I0VBeKI", title: "The Many Revolts Of India — What's Fueling The Wave Of Protests Across The Nation?", channel: "The Deshbhakt" },
  { kind: "video", videoId: "b2VAqkLX1S8", title: "Pt.9 — Police Crush Protestors, Can CJP Still Win Now?", channel: "The Deshbhakt" },
  { kind: "video", videoId: "C8lw803JwQ8", title: "CJP Protest: 10 States Join Cockroaches, Going Global", channel: "Being Honest" },
  { kind: "video", videoId: "TfTmxq2KOwA", title: "CJP Protest: Modi Govt. on the Back Foot? Students Beaten! Lathi Charge & Tear Gas!", channel: "Being Honest" },
  { kind: "video", videoId: "tweydqL91M4", title: "What is keeping the Jantar Mantar protest going?", channel: "Brut India" },
  { kind: "video", videoId: "NIQL_LWOYE0", title: "What Went Wrong at CJP's Jantar Mantar Protest ft. Medha", channel: "Jist" },
  { kind: "video", videoId: "aM36ooXVhPI", title: "20 July 2026 Student Protest in Delhi: A Blow by Blow Account", channel: "The Wire" },
  {
    kind: "source",
    href: "https://www.newslaundry.com/",
    label: "Newslaundry",
    icon: "N",
  },
  {
    kind: "source",
    href: "https://www.thecockroachjantaparty.org.in/voice",
    label: "Voice of the Swarm (CJP)",
    icon: "🪳",
  },
  {
    kind: "source",
    href: "https://andhbhakt.org/",
    label: "Andhbhakt — PIB vs CAG tracker",
    icon: "🐊",
  },
];
