// Lichte SVG-iconenset (stroke-stijl, consistent). Geen emoji als icoon.
const base = {
  width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
};

export const IcoHome = (p) => (<svg {...base} {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>);
export const IcoAgenda = (p) => (<svg {...base} {...p}><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9h18M8 3v3M16 3v3" /></svg>);
export const IcoCheck = (p) => (<svg {...base} {...p}><path d="M4 12.5 9 17.5 20 6.5" /></svg>);
export const IcoHeart = (p) => (<svg {...base} {...p}><path d="M12 20s-7-4.6-7-9.6A3.9 3.9 0 0 1 12 7a3.9 3.9 0 0 1 7 3.4C19 15.4 12 20 12 20Z" /></svg>);
export const IcoFork = (p) => (<svg {...base} {...p}><path d="M6 3v7a2 2 0 0 0 4 0V3M8 3v18M18 3c-1.5 1-2 3-2 6s.5 4 2 4v8" /></svg>);
export const IcoCog = (p) => (<svg {...base} {...p}><circle cx="12" cy="12" r="3.2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" /></svg>);
export const IcoBell = (p) => (<svg {...base} {...p}><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M10.5 20a1.8 1.8 0 0 0 3 0" /></svg>);
export const IcoBolt = (p) => (<svg {...base} {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" /></svg>);
export const IcoBike = (p) => (<svg {...base} {...p}><circle cx="6" cy="17" r="3.4" /><circle cx="18" cy="17" r="3.4" /><path d="M6 17l4-7h5l-3 7M10 10l-2-3H6m9 0h3" /></svg>);
export const IcoMoon = (p) => (<svg {...base} {...p}><path d="M20 13.5A8 8 0 1 1 10.5 4 6.3 6.3 0 0 0 20 13.5Z" /></svg>);
export const IcoSun = (p) => (<svg {...base} {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></svg>);
export const IcoFlame = (p) => (<svg {...base} {...p}><path d="M12 3c2 3 5 4.5 5 8.5A5 5 0 0 1 7 12c0-1.5.5-2.5 1.5-3.5C9 9.5 10 10 10.5 10c-.5-2 .5-5 1.5-7Z" /></svg>);
export const IcoPlus = (p) => (<svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>);
export const IcoTrash = (p) => (<svg {...base} {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>);
export const IcoEdit = (p) => (<svg {...base} {...p}><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="M14 6l4 4" /></svg>);
export const IcoLogout = (p) => (<svg {...base} {...p}><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /><path d="M10 12H3m0 0 3-3m-3 3 3 3" /></svg>);
export const IcoClock = (p) => (<svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>);
export const IcoChevron = (p) => (<svg {...base} {...p}><path d="M9 6l6 6-6 6" /></svg>);
export const IcoPulse = (p) => (<svg {...base} {...p}><path d="M3 12h4l2-5 4 10 2-5h6" /></svg>);
export const IcoBadge = (p) => (<svg {...base} {...p}><circle cx="12" cy="9" r="6" /><path d="M9 14.5 7.5 21l4.5-2.5 4.5 2.5-1.5-6.5" /></svg>);
