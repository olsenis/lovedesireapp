import json, os, re, sys, glob, io
from collections import Counter
sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
NL = '\n'

THEMES = {
 'pay_twice':    r"both (of us )?(have to |had to |need to |must )?pay|pay(ing)? (twice|separately|for both)|separate subscription|each (partner|person) (has|needs) to pay|two subscriptions|partner (also|too) (has to|had to) pay",
 'one_sub_both': r"one (subscription|payment|purchase) (covers|for) (both|us)|only one of (us|you) (has|needs) to pay|partner (gets|is) (free|included)",
 'expensive':    r"too expensive|overpriced|cash grab|money grab|not worth (the|\$)|rip ?off|ridiculous(ly)? (price|expensive)|pricey|way too much money|\$\d+ (a|per) (month|year|week)",
 'trial_trap':   r"free trial|charged me|auto.?renew|refund|cancel(led|ed|ling)? (my |the )?(subscription|trial)|scam|without (my )?(permission|consent|warning)",
 'paywall':      r"paywall|behind a pay|everything (is|costs)|have to pay for everything|premium (to|for) (do|access|use) anything|locked behind|nothing (is )?free",
 'streak':       r"streak",
 'pressure':     r"\bchore\b|feels? like (homework|work|a task|an obligation)|obligat|pressure|guilt|nag(ging|s)?\b|reminders? (are|is|get|got) (annoying|too)|too many notifications|notification spam|spam(my|s)? (me|us)",
 'partner_wont': r"partner (won'?t|doesn'?t|refuses|stopped|never|isn'?t interested|lost interest)|(husband|wife|boyfriend|girlfriend|bf|gf|he|she) (won'?t|doesn'?t|stopped|refuses|never) (use|do|answer|open|participate|engage)|i'?m the (only )?one (who|that|paying)|one.?sided|get (him|her) to (use|do|answer)",
 'waiting':      r"wait(ing)? (for|on) (my |your )?(partner|him|her|them)|have to wait|can'?t (do|answer|see|continue) (anything |it )?until|both (have to|need to|must) answer|stuck until",
 'repetitive':   r"repetitive|repeat(ed|ing|s)?\b|same questions|ran out of|run out of|recycl|already (seen|answered)|no new (content|questions)|not enough (content|questions)|gets? (old|boring|stale)|boring",
 'childish':     r"childish|juvenile|for (teens|teenagers|kids|children|highschool|high school|college)|immature|cheesy|cringe|corny|silly|cutesy|too cute",
 'too_tame':     r"too (tame|soft|vanilla|mild|pg|basic|innocent)|not (spicy|explicit|sexy|hot|dirty) enough|nothing (spicy|explicit)|watered down",
 'too_explicit': r"too (explicit|sexual|dirty|graphic|vulgar|raunchy|crude|kinky)|inappropriate|uncomfortable|disgusting|gross|degrading",
 'therapy':      r"therap|counsel|clinical|homework|like (a )?(textbook|school|a class)|preachy|lecture",
 'deep_talk':    r"deep(er)? (conversation|talk|question|connection)|meaningful|things (we|i) (never|didn'?t) (talked|knew)|learn(ed|ing)? (so much |a lot |things |something )?about (each other|my|him|her)|open(ed)? up",
 'fun':          r"\bfun\b|laugh|enjoy|playful|entertaining|excited|love (playing|doing) (this|it)",
 'closer':       r"closer|brought us|bring(s)? us|connect(ed|ion|s)? (more|better|again|with)|reconnect|stronger|saved (our|my) (marriage|relationship)|spark",
 'sex_life':     r"sex life|in (the )?bedroom|intimacy|intimate|spice|turned on|libido|desire",
 'ldr':          r"long.?distance|\bldr\b|time ?zone|miles apart|different countr|apart from",
 'bugs':         r"\bbug|crash|glitch|freez|won'?t (load|open|sync)|not (loading|syncing|working)|lost (all|my|our) (data|answers|history)|log(ged)? (me )?out|can'?t (log|sign) in|error|broken|doesn'?t work",
 'sync':         r"sync|pair(ing)? (code|issue|problem)|connect (to|with) (my )?partner|link(ing)? (our|my) (accounts?|partner)|invite (code|link)",
 'privacy':      r"privacy|private|secure|data (is|being) (sold|collected)|who (can|could) see|screenshot|encrypt|anonym|safe",
 'widget':       r"widget|lock ?screen|home ?screen",
 'daily_ritual': r"every (day|night|morning)|daily|each day|nightly|routine|habit|part of our (day|night|evening)",
 'ads':          r"\bads?\b|advertis",
 'ai':           r"\bai\b|chatgpt|artificial|generated|bot\b",
 'design':       r"beautiful|design|interface|\bui\b|clean|aesthetic|ugly|clunky|confusing|intuitive|easy to use",
 'reply_dev':    r"developer|support (team|was|is|responded|never)|customer service|emailed|no response",
 'wish':         r"\bwish\b|would be (nice|great|cool|better) if|please add|should (add|have|let|allow)|i'?d love (to|if)|it'?d be|hope(fully)? (they|you) add|needs? (an? |more |the )?option|missing|feature request|suggestion",
 'quit':         r"delet(ed|ing) (the|this|it)|uninstall|stopped using|gave up|switched to|going back to|cancel(led|ing)?\b|unsubscrib",
}
RX = {k: re.compile(v, re.I) for k, v in THEMES.items()}
BAD_PLAY = {'koopla', 'sexify', 'nice_intimacy', 'spicer', 'kindu'}  # wrong app matched on Play


def load():
    apps = {}
    for p in sorted(glob.glob(os.path.join(HERE, 'data', 'reviews', '*.json'))):
        name = os.path.basename(p)[:-5]
        rows = json.load(open(p, encoding='utf-8'))
        for r in rows:
            r['src'] = 'ios'
            r['text'] = r['title'] + '. ' + r['body']
        apps[name] = rows
    gp = os.path.join(HERE, 'data', 'gplay', 'gplay_reviews.json')
    if os.path.exists(gp):
        for name, d in json.load(open(gp, encoding='utf-8')).items():
            if name in BAD_PLAY: continue
            rows = [{'rating': r['score'], 'title': '', 'body': r['text'] or '', 'text': r['text'] or '',
                     'date': r['date'], 'cc': 'play', 'src': 'play', 'thumbs': r.get('thumbs', 0)} for r in d['reviews']]
            apps.setdefault(name, []).extend(rows)
    for rows in apps.values():
        for r in rows:
            r['themes'] = [k for k, rx in RX.items() if rx.search(r['text'])]
    return apps


def one(r, width=320):
    return f"[{r['rating']}* {r['src']} {r['date'][:10]}] " + r['text'][:width].replace(NL, ' ')


def show(r, width=380):
    print(one(r, width)); print()


if __name__ == '__main__':
    apps = load()
    mode = sys.argv[1] if len(sys.argv) > 1 else 'summary'
    if mode == 'summary':
        print(f"{'app':22} {'n':>5} {'ios':>5} {'play':>5} {'neg%':>5}  complaint themes (share of 1-3*) | praise themes (share of 4-5*)")
        for name, rows in apps.items():
            neg = [r for r in rows if r['rating'] <= 3]
            pos = [r for r in rows if r['rating'] >= 4]
            cn = Counter(t for r in neg for t in r['themes'])
            cp = Counter(t for r in pos for t in r['themes'])
            ios = sum(1 for r in rows if r['src'] == 'ios')
            tn = ', '.join(f"{k} {100 * v // max(1, len(neg))}%" for k, v in cn.most_common(7))
            tp = ', '.join(f"{k} {100 * v // max(1, len(pos))}%" for k, v in cp.most_common(5))
            print(f"{name:22} {len(rows):5} {ios:5} {len(rows) - ios:5} {100 * len(neg) // max(1, len(rows)):4}%  {tn} | {tp}")
    elif mode == 'themes':
        tot = Counter(); appsN = Counter(); totpos = Counter(); appsP = Counter()
        for name, rows in apps.items():
            neg = [r for r in rows if r['rating'] <= 3]
            pos = [r for r in rows if r['rating'] >= 4]
            cn = Counter(t for r in neg for t in r['themes'])
            cp = Counter(t for r in pos for t in r['themes'])
            for k, v in cn.items():
                tot[k] += v
                if len(neg) >= 20 and v / len(neg) >= 0.05: appsN[k] += 1
            for k, v in cp.items():
                totpos[k] += v
                if len(pos) >= 20 and v / len(pos) >= 0.05: appsP[k] += 1
        print('NEGATIVE (1-3*): theme, apps where >=5% of negatives carry it, total negative reviews')
        for k, v in sorted(tot.items(), key=lambda x: (-appsN[x[0]], -x[1])):
            print(f"  {k:14} apps={appsN[k]:2} reviews={v}")
        print('POSITIVE (4-5*):')
        for k, v in sorted(totpos.items(), key=lambda x: (-appsP[x[0]], -x[1])):
            print(f"  {k:14} apps={appsP[k]:2} reviews={v}")
    elif mode == 'quotes':
        name, theme = sys.argv[2], sys.argv[3]
        maxr = int(sys.argv[4]) if len(sys.argv) > 4 else 3
        n = int(sys.argv[5]) if len(sys.argv) > 5 else 12
        rows = [r for r in apps[name] if theme in r['themes'] and (r['rating'] <= maxr if maxr <= 3 else r['rating'] >= maxr)]
        rows.sort(key=lambda r: r['date'], reverse=True)
        for r in rows[:n]: show(r)
    elif mode == 'neg':
        name = sys.argv[2]; n = int(sys.argv[3]) if len(sys.argv) > 3 else 40
        rows = [r for r in apps[name] if r['rating'] <= 3]
        rows.sort(key=lambda r: r['date'], reverse=True)
        for r in rows[:n]: show(r, 320)
    elif mode == 'report':
        os.makedirs(os.path.join(HERE, 'data', 'reports'), exist_ok=True)
        NEG_T = ['pay_twice', 'expensive', 'paywall', 'trial_trap', 'streak', 'pressure', 'partner_wont', 'waiting',
                 'repetitive', 'childish', 'too_tame', 'too_explicit', 'therapy', 'privacy', 'widget', 'ads', 'ai', 'sync', 'quit']
        POS_T = ['closer', 'deep_talk', 'fun', 'daily_ritual', 'ldr', 'sex_life', 'privacy', 'widget', 'design']
        for name, rows in apps.items():
            out = []
            neg = [r for r in rows if r['rating'] <= 3]
            pos = [r for r in rows if r['rating'] >= 4]
            out.append(f"# {name}: n={len(rows)} neg={len(neg)} pos={len(pos)}" + NL)
            for t in NEG_T:
                sel = sorted([r for r in neg if t in r['themes']], key=lambda r: r['date'], reverse=True)
                if not sel: continue
                out.append(f"## NEG {t} ({len(sel)}, {100 * len(sel) // max(1, len(neg))}% of neg)")
                out.extend(one(r, 230) for r in sel[:3])
                out.append('')
            sel = sorted([r for r in rows if 'wish' in r['themes']], key=lambda r: r['date'], reverse=True)
            out.append(f"## WISH ({len(sel)})")
            for r in sel[:8]:
                m = RX['wish'].search(r['text']); st = max(0, m.start() - 120)
                out.append(f"[{r['rating']}* {r['src']} {r['date'][:10]}] ..." + r['text'][st:st + 200].replace(NL, ' '))
            out.append('')
            for t in POS_T:
                sel = sorted([r for r in pos if t in r['themes']], key=lambda r: r['date'], reverse=True)
                if not sel: continue
                out.append(f"## POS {t} ({len(sel)}, {100 * len(sel) // max(1, len(pos))}% of pos)")
                out.extend(one(r, 200) for r in sel[:2])
                out.append('')
            io.open(os.path.join(HERE, 'data', 'reports', name + '.md'), 'w', encoding='utf-8').write(NL.join(out))
        print('reports written')
    elif mode == 'grep':
        rx = re.compile(sys.argv[2], re.I)
        maxr = int(sys.argv[3]) if len(sys.argv) > 3 else 5
        n = int(sys.argv[4]) if len(sys.argv) > 4 else 25
        hits = [(name, r) for name, rows in apps.items() for r in rows if r['rating'] <= maxr and rx.search(r['text'])]
        print(len(hits), 'hits')
        for name, r in hits[:n]:
            m = rx.search(r['text']); s = max(0, m.start() - 150)
            print(f"[{name} {r['rating']}* {r['src']} {r['date'][:10]}] ..." + r['text'][s:s + 320].replace(NL, ' '))
            print()
