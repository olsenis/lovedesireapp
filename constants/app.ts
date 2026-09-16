// App identity used in user-facing copy that leaves the app (share sheets,
// links). One place to change if H43 (rename) lands; store metadata and
// the marketing site have their own copies (MARKETING.md, web/).
export const APP_NAME = 'Love Desire';
export const SITE_URL = 'https://lovedesireapp.com';
export const JOIN_URL = `${SITE_URL}/join`;

// The invite text for the share sheet (pairing screen and the unpaired Home
// card). The link lands on /join, which shows the code and the store badges.
export const inviteMessage = (code: string): string =>
  `Join me on ${APP_NAME}, a private app for two. Install it, then enter my code ${code}. ${JOIN_URL}?code=${code}`;
