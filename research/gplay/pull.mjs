import gplay from 'google-play-scraper';
import fs from 'fs';
const TERMS = {
  paired: 'Paired couples relationship', cozy_couples: 'Cozy Couples', couple_joy: 'Couple Joy', agape: 'Agapé couples',
  lasting: 'Lasting marriage', couples_games_chouic: 'Couples Games & Challenges Chouic', between: 'Between couples',
  sumone: 'SumOne', love_nudge: 'Love Nudge', candle: 'Candle couples relationship', evergreen: 'Evergreen relationship growth',
  couple_game: 'Couple Game relationship quiz', nice_intimacy: 'Nice intimacy tracker', spicer: 'Spicer sex ideas',
  intimately_us: 'Intimately Us', coral: 'Coral couples intimacy', sexify: 'Sexify couples', desire_couples_game: 'Desire couples game',
  lovbirdz: 'LovBirdz', flamme: 'Flamme couples', koopla: 'koopla', lovewick: 'Lovewick', lovify: 'Lovify', deepq: 'DeepQ couple',
  kindu: 'Kindu couples', pikant: 'Pikant couple challenges',
};
const out = {};
for (const [k, term] of Object.entries(TERMS)) {
  try {
    const s = await gplay.search({ term, num: 3 });
    if (!s.length) { console.log(k, 'no result'); continue; }
    const app = s[0];
    const res = await gplay.reviews({ appId: app.appId, sort: gplay.sort.HELPFULNESS, num: 300 });
    const all = res.data.map(r => ({ score: r.score, text: r.text, date: (r.date||'').toString().slice(0,15), thumbs: r.thumbsUp, version: r.version }));
    out[k] = { appId: app.appId, title: app.title, score: app.score, installs: app.installs, reviews: all };
    const c = [1,2,3,4,5].map(n => all.filter(r => r.score === n).length);
    console.log(k.padEnd(22), app.appId.padEnd(32), app.title.slice(0,35).padEnd(36), 'n=' + all.length, c.join('/'));
  } catch (e) { console.log(k, 'ERR', e.message); }
}
fs.writeFileSync(new URL('../data/gplay/gplay_reviews.json', import.meta.url), JSON.stringify(out));
console.log('done');
