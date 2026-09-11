# Running the dev server for phone testing

How to start Desire in Expo Go on real phones. One terminal, one command, then scan or reopen. Written Sep 2026 for SDK 57.

## Start (tunnel, works from any network)

1. Open a terminal in `G:\forrit\Desire` (Windows Terminal, PowerShell or Git Bash, not from inside Claude).
2. Run:

```
npx expo start --tunnel --clear
```

3. Wait for the QR code. The tunnel is Cloudflare (`expo-cloudflared`), so the URL looks like `exp://xxxx.trycloudflare.com`.
4. On each phone: open **Expo Go** and scan the QR (Android: scan button in Expo Go; iPhone: Camera app, then tap the banner).

That is it. Leave the terminal open while testing. `--clear` empties Metro's cache, which avoids stale-bundle surprises after a `git pull`; drop it for faster restarts when nothing structural changed.

## If it does not start

- **First run after a fresh install** downloads `cloudflared` into `~/.expo/expo-cloudflared/`. It can hit Expo's startup timeout or a Windows Firewall prompt. Allow it and run the command again.
- **"Project is incompatible with this version of Expo Go"**: the phone's Expo Go is older or newer than SDK 57. Update Expo Go from the store.
- **iPhone shows nothing after scanning**: Expo Go 57 on iOS needs a login on both ends. Terminal: `npx expo login` (account `olsenis`, email + password, do not use `--sso` on Windows). Phone: avatar icon top-right in Expo Go, same account. Android does not need this.
- **"Cannot connect to Expo CLI" on the phone**: the tunnel died. Ctrl+C in the terminal and start again, then rescan.
- **Port 8081 busy**: another Metro is still running. Close it or accept the "use port 8082" prompt, then rescan.

## Reopening without scanning

Expo Go keeps a **Recently opened** list. Tap "Desire" there instead of scanning, as long as the same terminal is still running. A new `npx expo start --tunnel` gets a new Cloudflare URL, so after a restart you scan once per phone again.

To stop rescanning after every restart, use LAN mode at home:

```
npx expo start --lan
```

The URL becomes `exp://<PC IP>:8081`, which stays the same as long as the PC keeps its IP. Give the PC a fixed IP (Windows: Settings → Network → Wi-Fi → your network → IP assignment → Manual, or a DHCP reservation in the router). Then "Recently opened" survives restarts. Requirements: all phones on the same Wi-Fi, and on iPhone Expo Go needs Local Network permission (Settings → Expo Go → Local Network). Use tunnel again when a phone is away from home.

## While testing

- Yellow warnings in the phone overlay: dismiss. Known-harmless on SDK 57: Firestore "transport errored", expo-router "state update on unmounted", `Response.blob()` perf hint.
- Red errors or anything visibly wrong: screenshot and send.
- Dev flags: `MEMORY_LANE_DEV_UNLOCK` is on in HEAD for the test period. `DEV_IGNORE_WEEKDAY_GATES` (`constants/devFlags.ts`) is flipped per session to see weekday cards (Wed WYR, Thu Memory Lane, Fri Lovers tip) and flipped back before committing.
- Shake the phone (or press `m` in the terminal) for the dev menu; `r` in the terminal reloads all phones.

## Stop

Ctrl+C in the terminal. Windows Update restarts kill it too; set Active hours (Settings → Windows Update → Advanced options) so a restart does not land mid-session.
