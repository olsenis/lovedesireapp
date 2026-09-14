import re, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from reviews_code import load
from collections import Counter
apps = load()
Q = {
 'streak (any)': r"streak",
 'streak lost/reset complaint': r"(lost|lose|losing|reset|broke|broken|ruined|ended|gone).{0,40}streak|streak.{0,40}(lost|reset|broke|ruined|ended|gone|disappear)",
 'widget': r"widget",
 'ads': r"\bads?\b",
 'AI-written content': r"\bai\b.{0,40}(question|generat|written|slop|image|picture)|(question|content|picture|image).{0,40}\bai\b|chatgpt",
 'both pay / partner also pays': r"both (of us )?(have to |had to |need to |must )?pay|pay(ing)? (twice|separately|for both)|separate subscription|partner (also|too|doesn'?t) (has to|had to|get)",
 'one payment covers both (praise)': r"one (subscription|payment|purchase|of us).{0,30}(both|covers|partner)|partner (gets|is|has) (it )?(free|included|premium too)|only one.{0,20}pay",
 'repetitive / ran out': r"repetitive|same questions|ran out of|run out of|recycl|no new (content|questions)|not enough (content|questions)",
 'cheesy / childish / for teens': r"childish|juvenile|for (teens|teenagers|kids|high ?school|college)|immature|cheesy|cringe|corny",
 'partner will not use it': r"partner (won'?t|doesn'?t|refuses|stopped|never|isn'?t interested|lost interest)|(husband|wife|boyfriend|girlfriend|bf|gf|he|she) (won'?t|doesn'?t|stopped|refuses|never|barely) (use|do|answer|open|participate|engage)|i'?m the (only )?one (who|that)",
 'want chat / messaging': r"(wish|need|add|no|without|lack).{0,30}(chat|messag|discuss|comment)",
 'want write own questions': r"(write|create|add|make).{0,10}(our|your|my) own (question|card|dare|truth)|custom question",
 'want history / look back': r"look back|old (answers|entries|questions|notes)|past (answers|questions|entries)|history of|archive",
 'LGBTQ / gender options': r"lgbt|same.sex|gender neutral|queer|wlw|non.?binary|pronoun|heteronormative|gender option",
 'one-time purchase wish': r"one.?time (purchase|payment|fee)|lifetime (purchase|option|membership)|pay once|instead of (a )?subscription",
 'trial / billing anger': r"free trial|charged me|auto.?renew|refund|can'?t cancel|scam",
 'privacy trust': r"privacy|private|secure|encrypt|who (can|could) see|data (is|being) (sold|collected)",
 'long distance': r"long.?distance|\bldr\b",
 'notifications (too many/wrong time)': r"(too many|annoying|spam|constant|middle of the night).{0,30}notif|notif.{0,40}(too many|annoying|spam|middle of the night|3 ?am)",
 'waiting on partner': r"wait(ing)? (for|on) (my |your )?(partner|him|her|them)|until (my |your )?partner|both (have to|need to|must) answer",
 'in the mood / initiate / desire mismatch': r"in the mood|initiat|libido|mismatch|desire (gap|difference)|higher (sex )?drive|lower (sex )?drive",
 'learned about each other': r"learn(ed|ing)? (so much |a lot |things |something |more )?about (each other|my|him|her)|things (we|i) (never|didn'?t) (talked|knew)",
 'brought us closer': r"closer|brought us|reconnect|saved (our|my) (marriage|relationship)",
}
tot = sum(len(v) for v in apps.values())
print(f"total reviews {tot} across {len(apps)} apps\n")
print(f"{'concept':40} {'all':>5} {'1-3*':>5} {'4-5*':>5}  apps(>=1% of that app)")
for k, pat in Q.items():
    rx = re.compile(pat, re.I)
    n = neg = pos = 0; per = []
    for name, rows in apps.items():
        c = sum(1 for r in rows if rx.search(r['text']))
        cn = sum(1 for r in rows if r['rating'] <= 3 and rx.search(r['text']))
        n += c; neg += cn; pos += c - cn
        if rows and c / len(rows) >= 0.01 and c >= 3: per.append(f"{name}:{c}")
    print(f"{k:40} {n:5} {neg:5} {pos:5}  {len(per):2} [{', '.join(per)}]")
