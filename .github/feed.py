# رونق: بيعمل feed.csv لكتالوج فيسبوك من منتجات Firestore (بيشتغل لوحده على GitHub Actions)
import json, urllib.request, csv, re, sys
P = 'rawnaq-store-8e40c'
SITE = 'https://ragabgama.github.io/rawnaq/'
URL = 'https://firestore.googleapis.com/v1/projects/%s/databases/(default)/documents/products?pageSize=300' % P

def val(v):
    if 'stringValue' in v: return v['stringValue']
    if 'integerValue' in v: return int(v['integerValue'])
    if 'doubleValue' in v: return v['doubleValue']
    if 'booleanValue' in v: return v['booleanValue']
    if 'arrayValue' in v: return [val(x) for x in v['arrayValue'].get('values', [])]
    if 'mapValue' in v: return {k: val(x) for k, x in v['mapValue'].get('fields', {}).items()}
    return None

docs, tok = [], ''
while True:
    with urllib.request.urlopen(URL + ('&pageToken=' + tok if tok else ''), timeout=60) as r:
        d = json.load(r)
    docs += d.get('documents', [])
    tok = d.get('nextPageToken')
    if not tok: break

def absu(u): return u if u.startswith('http') else SITE + u.lstrip('./')
def clean(t):
    t = re.sub(r'[#*_`>]+', '', t or '')
    t = re.sub(r'^\s*-\s*', '• ', t, flags=re.M)
    return re.sub(r'\n{2,}', '\n', t).strip()

rows = []
for doc in docs:
    p = {k: val(v) for k, v in doc.get('fields', {}).items()}
    pid = doc['name'].rsplit('/', 1)[1]
    imgs = [i for i in (p.get('images') or []) if isinstance(i, str) and (i.startswith('http') or i.startswith('img/'))]
    vs = [v for v in (p.get('variants') or []) if (v.get('price') or 0) > 0]
    if p.get('active') is False or not imgs or not vs: continue
    price = vs[0]['price']
    cat = p.get('category', '')
    desc = clean(p.get('description')) or p.get('short') or p.get('name')
    rows.append({
        'id': p.get('sku') or pid,
        'title': p.get('name', '')[:150],
        'description': desc[:5000],
        'availability': 'in stock',
        'condition': 'new',
        'price': '%d EGP' % price,
        'link': SITE + 'product.html?id=' + pid,
        'image_link': absu(imgs[0]),
        'additional_image_link': ','.join(absu(i) for i in imgs[1:11]),
        'brand': 'رونق',
        'product_type': ' > '.join(x for x in [cat, p.get('sub', '')] if x),
        'google_product_category': 'Electronics > Communications > Telephony > Mobile Phone Accessories > Mobile Phone Cases' if 'جراب' in cat else 'Home & Garden > Decor > Artwork',
        'custom_label_0': cat,
        'custom_label_1': p.get('sub', ''),
    })
rows.sort(key=lambda r: r['id'])
out = sys.argv[1] if len(sys.argv) > 1 else 'feed.csv'
with open(out, 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
    w.writeheader(); w.writerows(rows)
print(len(rows), 'products ->', out)
