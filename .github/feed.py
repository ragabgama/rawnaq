# رونق: بيعمل نسخة ثابتة من بيانات المتجر على الموقع نفسه (بيشتغل لوحده على GitHub Actions)
#  - store-products.json و store-settings.json: الموقع بيقرا منهم بدل قاعدة البيانات،
#    عشان الموقع مايقعش لو Firebase زحم أو خلص الحد المجاني
#  - img/m-<id>.jpg: الصور اللي اترفعت من لوحة التحكم
#  - feed.csv: كتالوج فيسبوك
# لو قاعدة البيانات مش بترد، بيسيب الملفات القديمة زي ما هي ومايبوّظش حاجة
import json, urllib.request, csv, re, sys, os, base64, time
P = 'rawnaq-store-8e40c'
SITE = 'https://rawnaqly.com/'
DOCS = 'https://firestore.googleapis.com/v1/projects/%s/databases/(default)/documents/' % P

def get(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return json.load(r)

def val(v):
    if 'stringValue' in v: return v['stringValue']
    if 'integerValue' in v: return int(v['integerValue'])
    if 'doubleValue' in v: return v['doubleValue']
    if 'booleanValue' in v: return v['booleanValue']
    if 'timestampValue' in v: return v['timestampValue']
    if 'nullValue' in v: return None
    if 'arrayValue' in v: return [val(x) for x in v['arrayValue'].get('values', [])]
    if 'mapValue' in v: return {k: val(x) for k, x in v['mapValue'].get('fields', {}).items()}
    return None

try:
    docs, tok = [], ''
    while True:
        d = get(DOCS + 'products?pageSize=300' + ('&pageToken=' + tok if tok else ''))
        docs += d.get('documents', [])
        tok = d.get('nextPageToken')
        if not tok: break
except Exception as e:
    print('database not reachable, keeping old files:', e); sys.exit(0)
if not docs:
    print('no products returned, keeping old files'); sys.exit(0)

products = []
for doc in docs:
    p = {k: val(v) for k, v in doc.get('fields', {}).items()}
    p.pop('supplierUrl', None); p.pop('updatedAt', None)
    p['id'] = doc['name'].rsplit('/', 1)[1]
    p['created'] = doc.get('createTime', '')
    products.append(p)
products.sort(key=lambda p: (p.get('order') or 0))

settings = None
try:
    s = get(DOCS + 'settings/store')
    settings = {k: val(v) for k, v in s.get('fields', {}).items()}
except Exception as e:
    print('settings not read:', e)

# الصور المرفوعة من لوحة التحكم (m:رقم) → ملفات
refs = set(re.findall(r'"m:([A-Za-z0-9_-]{4,60})"', json.dumps(products) + json.dumps(settings or {})))
for mid in sorted(refs):
    path = 'img/m-%s.jpg' % mid
    if os.path.exists(path): continue
    try:
        m = get(DOCS + 'media/' + mid)
        data = m.get('fields', {}).get('data', {}).get('stringValue', '')
        if data.startswith('data:') and ',' in data:
            open(path, 'wb').write(base64.b64decode(data.split(',', 1)[1]))
    except Exception as e:
        print('media', mid, e)

json.dump({'list': products}, open('store-products.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
if settings is not None:
    json.dump(settings, open('store-settings.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))

# ---------- كتالوج فيسبوك ----------
def absu(u): return u if u.startswith('http') else SITE + u.lstrip('./')
def clean(t):
    t = re.sub(r'[#*_`>]+', '', t or '')
    t = re.sub(r'^\s*-\s*', '• ', t, flags=re.M)
    return re.sub(r'\n{2,}', '\n', t).strip()
def imgurl(i):
    if not isinstance(i, str): return ''
    if i.startswith('m:'): return absu('img/m-%s.jpg' % i[2:]) if os.path.exists('img/m-%s.jpg' % i[2:]) else ''
    return absu(i) if (i.startswith('http') or i.startswith('img/')) else ''

rows = []
for p in products:
    imgs = [u for u in map(imgurl, p.get('images') or []) if u]
    vs = [v for v in (p.get('variants') or []) if (v.get('price') or 0) > 0]
    if p.get('active') is False or not imgs or not vs: continue
    cat = p.get('category', '')
    rows.append({
        'id': p.get('sku') or p['id'],
        'title': (p.get('name') or '')[:150],
        'description': (clean(p.get('description')) or p.get('short') or p.get('name') or '')[:5000],
        'availability': 'in stock',
        'condition': 'new',
        'price': '%d EGP' % vs[0]['price'],
        'link': SITE + 'product.html?id=' + p['id'],
        'image_link': imgs[0],
        'additional_image_link': ','.join(imgs[1:11]),
        'brand': 'رونق',
        'product_type': ' > '.join(x for x in [cat, p.get('sub', '')] if x),
        'google_product_category': 'Electronics > Communications > Telephony > Mobile Phone Accessories > Mobile Phone Cases' if 'جراب' in cat else 'Home & Garden > Decor > Artwork',
        'custom_label_0': cat,
        'custom_label_1': p.get('sub', ''),
    })
rows.sort(key=lambda r: r['id'])
with open('feed.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
    w.writeheader(); w.writerows(rows)
print(len(products), 'products,', len(rows), 'in feed,', len(refs), 'media')

# ---------- خريطة الموقع لجوجل ----------
import datetime
today = datetime.date.today().isoformat()
urls = [SITE, SITE + 'cases.html', SITE + 'frames.html', SITE + 'custom.html', SITE + 'shipping.html', SITE + 'contact.html']
urls += [SITE + 'product.html?id=' + p['id'] for p in products if p.get('active') is not False and p.get('category') != 'دروب شيبينج']
with open('sitemap.xml', 'w', encoding='utf-8') as f:
    f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
    for u in urls: f.write('<url><loc>%s</loc><lastmod>%s</lastmod></url>\n' % (u.replace('&', '&amp;'), today))
    f.write('</urlset>\n')
print('sitemap', len(urls))
