import { ScrollViewStyleReset } from 'expo-router/html';

// Custom HTML shell for Expo Router web. Two roles beyond the default:
//   1. Sets a cream body/html background so the pre-mount paint matches
//      the app instead of flashing white before React hydrates.
//   2. Renders a static "Love Desire" wordmark as a sibling of Expo's
//      auto-generated #root div. It sits absolute-positioned behind
//      the React app; before React mounts, it's the only visible
//      content (browser shows cream + wordmark instead of an ugly
//      apple-touch-icon placeholder). Once React mounts, the app
//      renders full-screen over #root and naturally covers it. My
//      RootLayout splash overlay (Cormorant "Love Desire" on cream)
//      then fades out to reveal the real page — same content, same
//      layout, so the pre-mount → overlay → app chain reads as one
//      continuous splash.
//
// System serif fallback used because Cormorant Garamond hasn't loaded
// yet at pre-mount time. Size/color/italic register match the
// RootLayout overlay closely — user shouldn't notice the font swap.

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FFF8F0" />

        {/* iOS PWA */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Love Desire" />
        <link rel="apple-touch-icon" href="/icon.png" />

        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: `
          html, body {
            background-color: #FFF8F0;
            margin: 0;
          }
          #pre-mount-splash {
            position: fixed;
            inset: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background-color: #FFF8F0;
            font-family: 'Cormorant Garamond', 'Times New Roman', serif;
            color: #880E4F;
            z-index: 0;
            pointer-events: none;
          }
          #pre-mount-splash .title {
            font-size: 56px;
            letter-spacing: 1px;
            line-height: 1;
            margin: 0;
            font-weight: 600;
          }
          #pre-mount-splash .heart {
            font-size: 20px;
            color: #F4A7B9;
            margin-top: 12px;
          }
        `}} />
      </head>
      <body>
        {/* Pre-mount splash — visible during the transient window before
            React hydrates #root. Once the app mounts, it renders
            full-screen over this and naturally hides it. Stays in the
            DOM permanently as an invisible layer; no JS cleanup
            needed. */}
        <div id="pre-mount-splash">
          <p className="title">Love Desire</p>
          <span className="heart">♥</span>
        </div>
        {children}
      </body>
    </html>
  );
}
