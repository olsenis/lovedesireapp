# research/

Scripts and raw material behind [USER_VOICE.md](../USER_VOICE.md) (review mining, Sep 13 2026) and [COMPETITORS.md](../COMPETITORS.md). Scripts are committed; `data/` is gitignored (18,320 third-party reviews, 7.5 MB) and lives only on the dev machine. Rerun the pull to rebuild it.

## Layout

```
research/
  reviews_pull.py         App Store customer-reviews feed → data/reviews/<app>.json
  reviews_code.py         theme tagging, per-app reports, summary / themes / quotes / grep modes
  counts.py               concept counts across all apps (the table in USER_VOICE §2 and §3)
  gplay/pull.mjs          Google Play reviews via google-play-scraper → data/gplay/gplay_reviews.json
  gplay/package.json      npm i inside research/gplay (node_modules gitignored)
  agent_reports/          the two Reddit passes, full text as delivered (intimacy, general)
  data/                   gitignored: reviews/, gplay/, reports/, threads/, pull logs
```

## Rerun (about 40 minutes, mostly waiting)

```bash
# 1. App Store, all apps in APPS, four storefronts, both sorts (~30 min; skips apps already in data/reviews)
python research/reviews_pull.py

# 2. Google Play, 300 most helpful per app (~3 min)
cd research/gplay && npm i --no-audit --no-fund && node pull.mjs && cd ../..

# 3. Reports and tables
python research/reviews_code.py report      # data/reports/<app>.md
python research/reviews_code.py summary     # one line per app
python research/reviews_code.py themes      # theme × apps
python research/counts.py                   # concept counts
python research/reviews_code.py quotes paired streak 3 10   # <app> <theme> <maxrating> <n>
python research/reviews_code.py grep "one.?time purchase" 5 20
```

To add a competitor: put its App Store id in `APPS` in `reviews_pull.py` (find it with `https://itunes.apple.com/search?term=<name>&entity=software&country=us`) and a search term in `TERMS` in `gplay/pull.mjs`. Check the Play match by title in the log; `BAD_PLAY` in `reviews_code.py` lists apps where Play matched the wrong product (koopla → Hoopla, Kindu → Kindred, Nice, Spicer, Sexify).

## Sources and access notes (Sep 2026)

- **App Store feed:** `https://itunes.apple.com/{cc}/rss/customerreviews/id={id}/sortBy={mostRecent|mostHelpful}/page={1..10}/json`. 50 per page, 10 pages, per storefront. No auth, no key. The pull script waits 0.6 s between calls and backs off on 403/429.
- **iTunes Search API:** ids, rating, count, seller, release date. `entity=software`.
- **Google Play:** page fetches are JS-rendered; `google-play-scraper` v10 works. Reviews sorted by helpfulness over-represent complaints.
- **Reddit:** search, listing and subreddit RSS return 403/429 to non-browser clients. What works: a known thread's `.rss` (`https://www.reddit.com/r/<sub>/comments/<id>/.rss`) with a feed-reader user agent (`Feedly/1.0 (+http://www.feedly.com/fetcher.html; like FeedFetcher-Google)`) at one request per ten seconds, and the arctic_shift archive (`https://arctic-shift.photon-reddit.com/api/posts/search`, `/api/comments/search?link_id=<id>`) for discovery and older comments. Thread text from the intimacy pass is in `data/threads/<id>.txt`.
- **Blocked:** Trustpilot, justuseapp, pullpush.io, redlib mirrors, web search on reddit.com. Product Hunt and App Store "see all reviews" pages fetch fine.

## Rules for using the material

Quotes in repo docs stay under 25 words, attributed by app + store + month, never by username. Raw reviews are other people's words about other products; they stay out of git and out of anything published.

## Monthly routine (E1 in USER_VOICE_TODO.md)

Run the pull, run `themes` and `counts`, diff against the numbers in USER_VOICE.md §2 and §3, update the header date, and add any app that has crossed 1,000 ratings.
