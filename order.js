/* =========================================================
   الحاجات المشتركة بين كل صفحات المتجر
   (البكسلات، الواتساب، السلة، قراية المنتجات والصور من قاعدة البيانات)
   ========================================================= */
(function () {
  var S = window.STORE;
  var $ = function (id) { return document.getElementById(id); };
  var RQ = window.RQ = {};

  RQ.$ = $;
  RQ.fmt = function (n) { return Math.round(Number(n) || 0).toLocaleString('en-US'); };
  RQ.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  RQ.store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set: function (k, v) {
      var s; try { s = JSON.stringify(v); } catch (e) { return false; }
      try { localStorage.setItem(k, s); return true; } catch (e) {}
      /* المساحة اتملت: نمسح الصور المتخزنة مؤقتًا (ممكن نجيبها تاني) ونجرّب */
      try {
        var del = [];
        for (var i = 0; i < localStorage.length; i++) { var x = localStorage.key(i); if (x && x !== k && (x.indexOf('rq_m_') === 0 || x === 'rq_products2')) del.push(x); }
        del.forEach(function (x) { localStorage.removeItem(x); });
        localStorage.setItem(k, s); return true;
      } catch (e2) { return false; }
    }
  };

  /* ---------- البكسلات ---------- */
  var pixelsLoaded = false;
  RQ.loadPixels = function () {
    if (pixelsLoaded) return; pixelsLoaded = true;
    if (S.facebookPixel) {
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s) }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', S.facebookPixel); fbq('track', 'PageView');
    }
    if (S.tiktokPixel) {
      !function (w, d, t) { w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || []; ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie']; ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) } }; for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]); ttq.load = function (e, n) { var i = 'https://analytics.tiktok.com/i18n/pixel/events.js'; ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = i; ttq._t = ttq._t || {}; ttq._t[e] = +new Date; ttq._o = ttq._o || {}; ttq._o[e] = n || {}; var o = d.createElement('script'); o.type = 'text/javascript'; o.async = !0; o.src = i + '?sdkid=' + e + '&lib=' + t; var a = d.getElementsByTagName('script')[0]; a.parentNode.insertBefore(o, a) }; ttq.load(S.tiktokPixel); ttq.page(); }(window, document, 'ttq');
    }
  };
  window.loadPixels = RQ.loadPixels;
  window.track = RQ.track = function (ev, data, eventId) {
    try { if (window.fbq) fbq('track', ev, data || {}, eventId ? { eventID: eventId } : undefined); } catch (e) {}
    try {
      if (window.ttq) {
        var map = { ViewContent: 'ViewContent', AddToCart: 'AddToCart', InitiateCheckout: 'InitiateCheckout', Purchase: 'CompletePayment' };
        var d = Object.assign({}, data || {}); if (eventId) d.event_id = eventId;
        ttq.track(map[ev] || ev, d);
      }
    } catch (e) {}
  };

  /* ---------- واتساب ---------- */
  var waLink = function (text) { return 'https://wa.me/' + S.whatsapp + '?text=' + encodeURIComponent(text); };
  window.waLink = RQ.waLink = waLink;
  var wa = $('waBtn');
  if (wa) wa.href = waLink('أهلًا، عندي سؤال');
  var yr = $('yr'); if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- مصدر الزيارة (فيسبوك / تيك توك) ---------- */
  RQ.src = (function () {
    var q; try { q = new URLSearchParams(location.search); } catch (e) { return 'direct'; }
    var s = q.get('utm_source') || (q.get('fbclid') ? 'facebook' : q.get('ttclid') ? 'tiktok' : '');
    var c = q.get('utm_campaign') || '';
    if (s) RQ.store.set('rq_src', s + (c ? '/' + c : ''));
    return RQ.store.get('rq_src') || 'direct';
  })();

  /* ---------- قراية قاعدة البيانات (من غير تسجيل دخول) ---------- */
  var F = S.firebase;
  var BASE = 'projects/' + F.projectId + '/databases/(default)/documents';
  RQ.BASE = BASE;
  function dec(v) {
    if (!v) return null;
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return Number(v.doubleValue);
    if ('booleanValue' in v) return v.booleanValue;
    if ('timestampValue' in v) return v.timestampValue;
    if ('nullValue' in v) return null;
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec);
    if ('mapValue' in v) return decFields(v.mapValue.fields || {});
    return null;
  }
  function decFields(f) { var o = {}; for (var k in f) o[k] = dec(f[k]); return o; }
  function getJSON(url) {
    return fetch(url).then(function (r) {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    });
  }
  RQ.fsGet = function (path) {
    return getJSON('https://firestore.googleapis.com/v1/' + BASE + '/' + path + '?key=' + F.apiKey).then(function (j) {
      if (!j || !j.fields) return null;
      var o = decFields(j.fields); o.id = j.name.split('/').pop(); return o;
    });
  };
  RQ.fsList = function (col) {
    return getJSON('https://firestore.googleapis.com/v1/' + BASE + '/' + col + '?pageSize=300&key=' + F.apiKey).then(function (j) {
      return ((j && j.documents) || []).map(function (d) { var o = decFields(d.fields || {}); o.id = d.name.split('/').pop(); o.created = d.createTime || ''; return o; });
    });
  };
  /* نسخة ثابتة من البيانات على الموقع نفسه (بتتحدّث لوحدها كل نص ساعة)
     عشان الموقع مايقعش لو قاعدة البيانات زحمت أو خلصت الحد المجاني */
  RQ.staticJSON = function (name) {
    var t = Math.floor(Date.now() / 300000); // تتجدد كل 5 دقايق
    return fetch('store-' + name + '.json?t=' + t).then(function (r) { if (!r.ok) throw new Error('static ' + r.status); return r.json(); });
  };
  // تحويل قيمة JS لصيغة Firestore (للكتابة)
  RQ.enc = function enc(v) {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
    if (typeof v === 'object') { var f = {}; for (var k in v) f[k] = enc(v[k]); return { mapValue: { fields: f } }; }
    return { stringValue: String(v) };
  };

  /* ---------- المنتجات ---------- */
  // كل منتج ليه "اختيارات سعر" (variants) زي المقاسات، ولو منتج قديم بعروض كمية نحوّله
  RQ.cleanProduct = function (p) {
    p.images = (p.images || []).filter(Boolean);
    var v = (p.variants || []).filter(function (x) { return x && Number(x.price) > 0; })
      .map(function (x) { return { name: String(x.name || '').trim(), price: Math.round(Number(x.price)), was: Math.round(Number(x.was) || 0) }; });
    if (!v.length && p.offers && p.offers.length) {
      var o = p.offers.slice().sort(function (a, b) { return a.qty - b.qty; })[0];
      v = [{ name: '', price: Math.round(o.price / (o.qty || 1)), was: 0 }];
    }
    p.variants = v;
    // كل اختيار ممكن يبقى «اسم | سعر» لو الموديل ده سعره مختلف
    p.choicePrice = {};
    p.choices = (p.choices || []).map(function (c) {
      var m = String(c).split('|'), name = m[0].trim(), pr = Math.round(Number(m[1]));
      if (name && pr > 0) p.choicePrice[name] = pr;
      return name;
    }).filter(Boolean);
    p.sub = String(p.sub || '').trim();
    p.customFee = Math.round(Number(p.customFee) || 0);
    p.maxUploads = Math.max(1, Math.min(3, Math.round(Number(p.maxUploads) || 1)));
    p.category = p.category || '';
    return p;
  };
  RQ.fromPrice = function (p) { return p.variants.length ? Math.min.apply(null, p.variants.map(function (v) { return v.price; })) : 0; };
  RQ.products = function (onData) {
    var cached = RQ.store.get('rq_products2');
    if (cached && cached.list) onData(cached.list, true);
    return RQ.staticJSON('products').then(function (j) {
      if (!j || !Array.isArray(j.list) || !j.list.length) throw new Error('empty');
      return j.list;
    }).catch(function () { return RQ.fsList('products'); }).then(function (list) {
      list = list.map(RQ.cleanProduct).filter(function (p) { return p.active !== false && p.variants.length; })
        .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
      RQ.store.set('rq_products2', { t: Date.now(), list: list });
      onData(list, false);
      return list;
    });
  };

  /* ---------- الإعدادات (البانر، الدفع، الشحن) ---------- */
  RQ.cfg = function (s) {
    s = s || {};
    var ship = Object.assign({}, S.shipping);
    if (s.shipping) for (var k in s.shipping) if (Number(s.shipping[k]) >= 0) ship[k] = Number(s.shipping[k]);
    return {
      raw: s,
      instapay: s.instapay || S.instapay, vodafone: s.vodafone || S.vodafoneCash,
      instapayLink: /^https:\/\/ipn\.eg\/[\w\/-]+$/.test(s.instapayLink || '') ? s.instapayLink : (s.instapayLink === '' ? '' : (S.instapayLink || '')),
      shipping: ship, codOn: s.codOff !== true,
      codFee: s.codFee != null && s.codFee !== '' ? Math.max(0, Math.round(Number(s.codFee)) || 0) : (S.codFee || 0),
      freeShip: s.freeShipOver != null && s.freeShipOver !== '' ? Math.max(0, Math.round(Number(s.freeShipOver)) || 0) : (S.freeShipOver || 0),
      bundles: (Array.isArray(s.caseBundles) && s.caseBundles.length ? s.caseBundles : S.caseBundles || [])
        .map(function (b) { return { qty: Math.round(Number(b.qty)), total: Math.round(Number(b.total)) }; })
        .filter(function (b) { return b.qty >= 2 && b.total > 0; }).sort(function (a, b) { return a.qty - b.qty; })
    };
  };
  RQ.settings = function (onData) {
    var cached = RQ.store.get('rq_settings');
    if (cached) onData(RQ.cfg(cached), true);
    return RQ.staticJSON('settings').catch(function () { return RQ.fsGet('settings/store'); }).then(function (s) {
      s = s || {}; RQ.store.set('rq_settings', s); onData(RQ.cfg(s), false); return RQ.cfg(s);
    }).catch(function () { if (!cached) onData(RQ.cfg({}), false); });
  };

  /* ---------- الصور: لينك عادي، أو صورة مرفوعة من لوحة التحكم (m:رقمها) ---------- */
  var mediaMem = {};
  RQ.img = function (src) {
    src = String(src || '');
    if (src.indexOf('m:') !== 0) return Promise.resolve(src);
    var id = src.slice(2);
    if (mediaMem[id]) return mediaMem[id];
    var key = 'rq_m_' + id;
    try { var hit = localStorage.getItem(key); if (hit) return (mediaMem[id] = Promise.resolve(hit)); } catch (e) {}
    // الأول من الملف الثابت على الموقع، ولو مش موجود من قاعدة البيانات
    mediaMem[id] = fetch('img/m-' + id + '.jpg', { method: 'HEAD' }).then(function (r) {
      if (r.ok) return { data: 'img/m-' + id + '.jpg', file: 1 };
      return RQ.fsGet('media/' + id);
    }).catch(function () { return RQ.fsGet('media/' + id); }).then(function (m) {
      if (m && m.file) return m.data;
      var data = (m && m.data) || '';
      if (data) { try { localStorage.setItem(key, data); } catch (e) { /* المساحة خلصت: عادي */ } }
      return data;
    }).catch(function () { delete mediaMem[id]; return ''; });
    return mediaMem[id];
  };
  RQ.setImg = function (el, src) { RQ.img(src).then(function (u) { if (u) el.src = u; }); };

  /* ---------- السلة ---------- */
  var CART = 'rq_cart';
  RQ.cart = {
    all: function () { var c = RQ.store.get(CART); return Array.isArray(c) ? c : []; },
    save: function (c) { var ok = RQ.store.set(CART, c); RQ.cart.badge(); return ok; },
    count: function () { return RQ.cart.all().reduce(function (a, i) { return a + (i.qty || 0); }, 0); },
    add: function (item) {
      var c = RQ.cart.all();
      var same = c.filter(function (i) { return i.pid === item.pid && i.variant === item.variant && i.choice === item.choice && !i.custom && !item.custom && !i.uploads && !item.uploads; })[0];
      if (same) same.qty = Math.min(10, same.qty + item.qty); else c.push(item);
      return RQ.cart.save(c.slice(0, 15));
    },
    clear: function () { RQ.cart.save([]); },
    badge: function () {
      var n = RQ.cart.count();
      [].forEach.call(document.querySelectorAll('[data-cart-count]'), function (b) { b.textContent = n; b.hidden = !n; });
    }
  };
  RQ.cart.badge();

  /* ---------- عرض البراويز: اشتري 2 والتالت ببلاش (الأرخص في كل 3 مجاني) ---------- */
  RQ.frameDiscount = function (items) {
    var units = [];
    (items || []).forEach(function (i) { if (i.cat && i.cat !== S.caseCat) for (var q = 0; q < i.qty; q++) units.push(Number(i.price) || 0); });
    units.sort(function (a, b) { return b - a; });
    var disc = 0; for (var k = 2; k < units.length; k += 3) disc += units[k];
    return { discount: Math.round(disc), count: units.length };
  };

  /* ---------- خصم عروض الجرابات (اشتري أكتر ووفّر) ---------- */
  RQ.bundleDiscount = function (items, bundles) {
    var units = [];
    (items || []).forEach(function (i) { if (i.cat === S.caseCat) for (var q = 0; q < i.qty; q++) units.push(Number(i.price) || 0); });
    if (units.length < 2 || !bundles || !bundles.length) return { discount: 0, count: units.length, used: [] };
    units.sort(function (a, b) { return a - b; });
    var left = units.length, pos = 0, disc = 0, used = [], max = bundles[bundles.length - 1];
    while (left >= bundles[0].qty) {
      var b = left >= max.qty ? max : bundles.filter(function (x) { return x.qty <= left; }).pop();
      var sum = 0; for (var k = 0; k < b.qty; k++) sum += units[pos + k];
      if (sum > b.total) { disc += sum - b.total; used.push(b); }
      pos += b.qty; left -= b.qty;
    }
    return { discount: Math.round(disc), count: units.length, used: used };
  };

  /* ---------- اختيار الموبايل (الماركة الأول وبعدين الموديل) ---------- */
  var BRANDS = [['Apple', /^iphone/i], ['Samsung', /^samsung/i], ['Oppo', /^oppo/i], ['Xiaomi', /^(redmi|xiaomi|mi )/i],
    ['Realme', /^realme/i], ['Huawei / Honor', /^(huawei|honor)/i], ['Infinix', /^infinix/i], ['Tecno', /^tecno/i], ['Vivo', /^vivo/i]];
  RQ.brandOf = function (m) {
    for (var i = 0; i < BRANDS.length; i++) if (BRANDS[i][1].test(String(m).trim())) return BRANDS[i][0];
    return 'أخرى';
  };
  RQ.isPhoneList = function (list) {
    if (!list || list.length < 3) return false;
    var n = list.filter(function (m) { return RQ.brandOf(m) !== 'أخرى'; }).length;
    return n / list.length > 0.6;
  };
  /* ---------- معرفة موديل الموبايل من المتصفح (أندرويد بس) ---------- */
  var SAM_S = { G960: 'S9', G965: 'S9 Plus', G970: 'S10e', G973: 'S10', G975: 'S10 Plus', G770: 'S10 Lite', G980: 'S20', G981: 'S20', G985: 'S20 Plus', G986: 'S20 Plus',
    G988: 'S20 Ultra', G780: 'S20 FE', G781: 'S20 FE', G990: 'S21 FE', G991: 'S21', G996: 'S21 Plus', G998: 'S21 Ultra', S901: 'S22', S906: 'S22 Plus', S908: 'S22 Ultra',
    S911: 'S23', S916: 'S23 Plus', S918: 'S23 Ultra', S711: 'S23 FE', S921: 'S24', S926: 'S24 Plus', S928: 'S24 Ultra', S721: 'S24 FE', S931: 'S25', S936: 'S25 Plus', S938: 'S25 Ultra',
    N910: 'Note 4', N960: 'Note 9', N970: 'Note 10', N975: 'Note 10 Plus', N770: 'Note 10 Lite', N980: 'Note 20', N981: 'Note 20', N985: 'Note 20 Ultra', N986: 'Note 20 Ultra' };
  var altsOf = function (m) { return String(m).split('/').map(function (a, k) { a = a.trim(); return (k && !/^(samsung|oppo|redmi|xiaomi|realme|huawei|honor)/i.test(a) ? m.split(' ')[0] + ' ' : '') + a; }); };
  // بيرجّع { name: الاسم اللي هنقوله للعميل, model: الموديل من القايمة لو متاح }
  RQ.guessPhone = function (raw, models) {
    raw = String(raw || '').trim(); if (!raw || raw === 'K') return null;
    var norm = function (t) { return String(t).toLowerCase().replace(/[^a-z0-9]/g, ''); };
    var find = function (names) {
      for (var i = 0; i < names.length; i++) for (var j = 0; j < models.length; j++)
        if (altsOf(models[j]).some(function (a) { return norm(a) === norm(names[i]); })) return models[j];
      return '';
    };
    var m = raw.toUpperCase().match(/SM-([A-Z])(\d{2})(\d)/);
    if (m) {
      var code = m[1] + m[2] + m[3], base;
      if (SAM_S[code]) base = SAM_S[code];
      else if (m[1] === 'A' || m[1] === 'M') base = m[1] + m[2];
      else return { name: 'Samsung ' + raw.replace(/^SM-/i, ''), model: '' };
      var tries = SAM_S[code] ? [base] : m[3] === '6' ? [base + ' 5G', base] : m[3] === '7' ? [base + 's', base] : [base + ' 4G', base];
      return { name: 'Samsung ' + tries[tries.length > 1 && m[3] === '7' ? 0 : tries.length - 1], model: find(tries.map(function (t) { return 'Samsung ' + t; })) };
    }
    if (/infinix|tecno|itel|vivo|nokia|motorola|moto |lenovo|zte|google|pixel|oneplus/i.test(raw)) return { name: raw, model: '' };
    var direct = find([raw]); if (direct) return { name: raw, model: direct };
    return null;
  };
  RQ.detectPhone = function () {
    var uad = navigator.userAgentData;
    var fromUA = function () { var x = navigator.userAgent.match(/Android[^;)]*;\s*([^;)]+?)(?:\s+Build|\))/); return x ? x[1].trim() : ''; };
    if (uad && uad.getHighEntropyValues) return uad.getHighEntropyValues(['model']).then(function (v) { return v.model || fromUA(); }).catch(fromUA);
    return Promise.resolve(fromUA());
  };
  RQ.miss = {};
  RQ.trackMissing = function (q) {
    q = String(q || '').trim().slice(0, 60); if (!q || RQ.miss[q]) return; RQ.miss[q] = 1;
    try { if (window.fbq) fbq('trackCustom', 'ModelNotFound', { search_string: q }); } catch (e) {}
  };
  RQ.myPhone = function (v) { if (v !== undefined) RQ.store.set('rq_phone', v); return RQ.store.get('rq_phone') || ''; };
  // بيرسم أزرار الماركات + قايمة الموديلات، وبيرجّع function تجيب الاختيار
  RQ.phonePicker = function (box, models, onChange) {
    var esc = RQ.esc, brands = [];
    models.forEach(function (m) { var b = RQ.brandOf(m); if (brands.indexOf(b) < 0) brands.push(b); });
    var cur = models.indexOf(RQ.myPhone()) >= 0 ? RQ.myPhone() : '';
    var brand = cur ? RQ.brandOf(cur) : '';
    box.innerHTML = '<div class="psearch"><input type="search" class="pq" placeholder="🔍 اكتب اسم موبايلك… مثلًا A54 أو iPhone 13" autocomplete="off" aria-label="دوّر على موبايلك"><div class="pres" hidden></div></div>' +
      '<div class="brands"></div><select class="pmodel"></select>' +
      (cur ? '' : '') + '<div class="phint">مش متأكد من الموديل؟ افتح الإعدادات ← حول الهاتف، والاسم مكتوب هناك.</div>';
    var bb = box.querySelector('.brands'), sel = box.querySelector('.pmodel');
    function paint() {
      bb.innerHTML = brands.map(function (b) { return '<button type="button" data-b="' + esc(b) + '" class="' + (b === brand ? 'on' : '') + '">' + esc(b) + '</button>'; }).join('');
      var list = models.filter(function (m) { return RQ.brandOf(m) === brand; });
      sel.innerHTML = '<option value="">' + (brand ? 'اختار الموديل' : 'اختار الماركة الأول') + '</option>' +
        list.map(function (m) { return '<option' + (m === cur ? ' selected' : '') + '>' + esc(m) + '</option>'; }).join('');
      sel.disabled = !brand;
    }
    bb.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      brand = b.dataset.b; cur = ''; paint(); sel.focus(); if (onChange) onChange('');
    });
    sel.addEventListener('change', function () { cur = sel.value; if (cur) RQ.myPhone(cur); if (onChange) onChange(cur); });
    /* البحث: العميل يكتب اسم موبايله ويطلعله على طول من كل الماركات */
    var pq = box.querySelector('.pq'), pres = box.querySelector('.pres');
    var AR = [[/سامسو?نج|سامسونغ|جالكسي|جلاكسي|galaxy/g, 'samsung'], [/آ?ا?يفون|أيفون|ابل|آبل/g, 'iphone'], [/شاومي|شياومي/g, 'xiaomi'], [/ريدمي|ردمي/g, 'redmi'],
      [/اوبو|أوبو/g, 'oppo'], [/ريلمي|ريل مي/g, 'realme'], [/هواوي/g, 'huawei'], [/هونر|هونور|اونر/g, 'honor'], [/انفنكس|انفينكس|إنفنكس/g, 'infinix'],
      [/تكنو|تيكنو/g, 'tecno'], [/فيفو/g, 'vivo'], [/برو/g, 'pro'], [/ماكس/g, 'max'], [/بلس/g, 'plus'], [/ميني/g, 'mini'], [/نوت/g, 'note'], [/الترا|ألترا/g, 'ultra'],
      [/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); }]];
    var norm = function (t) { t = String(t).toLowerCase(); AR.forEach(function (r) { t = t.replace(r[0], r[1]); }); return t.replace(/galaxy/g, 'samsung'); };
    var flat = models.map(function (m) { return [m, norm(m).replace(/[^a-z0-9]/g, '')]; });
    function search() {
      var q = norm(pq.value).replace(/[^a-z0-9 ]/g, ' ').trim();
      if (!q) { pres.hidden = true; return; }
      var toks = q.split(/\s+/).filter(Boolean);
      var hits = flat.filter(function (x) { return toks.every(function (t) { return x[1].indexOf(t) >= 0; }); }).map(function (x) { return x[0]; });
      // الأقرب الأول: اللي بيخلص بالكلام اللي اتكتب
      var tail = toks[toks.length - 1];
      hits.sort(function (a, b) { var ea = norm(a).replace(/[^a-z0-9]/g, ''), eb = norm(b).replace(/[^a-z0-9]/g, ''); return (eb.slice(-tail.length) === tail) - (ea.slice(-tail.length) === tail) || ea.length - eb.length; });
      pres.hidden = false;
      pres.innerHTML = hits.length ? hits.slice(0, 8).map(function (m) { return '<button type="button" data-m="' + esc(m) + '">' + esc(m) + ' <b>✓ متاح</b></button>'; }).join('') +
        (hits.length > 8 ? '<small>و' + (hits.length - 8) + ' موديل تاني… كمّل الاسم</small>' : '')
        : '<div class="pnone">مش لاقيين الموديل ده. اكتبه بطريقة تانية، أو <a href="' + RQ.waLink('موبايلي ' + pq.value + '، عندكم جراب ليه؟') + '" target="_blank" rel="noopener">اسألنا على واتساب</a></div>';
    }
    var missT = null;
    pq.addEventListener('input', function () {
      search(); clearTimeout(missT);
      if (pres.querySelector('.pnone') && pq.value.trim().length >= 3) missT = setTimeout(function () { RQ.trackMissing(pq.value); }, 1800);
    });
    if (!cur) RQ.detectPhone().then(function (raw) {
      var g = RQ.guessPhone(raw, models); if (!g || cur) return;
      var d = document.createElement('div'); d.className = 'pdetect';
      if (g.model) d.innerHTML = '📱 شكلك بتستخدم <b>' + esc(g.model) + '</b> · <span class="ok">✓ متاح</span><button type="button" data-m="' + esc(g.model) + '">أيوة، ده موبايلي</button>';
      else { d.className += ' no'; d.innerHTML = '📱 شكل موبايلك <b>' + esc(g.name) + '</b>، ولسه مفيش جرابات ليه 😔<small>لو ده مش موبايلك، دوّر على موديلك هنا. ولو عايز جراب لموبايلك <a href="' + RQ.waLink('عايز جراب لموبايل ' + g.name) + '" target="_blank" rel="noopener">قولّنا على واتساب</a></small>'; RQ.trackMissing('auto: ' + g.name); }
      box.insertBefore(d, box.firstChild);
      d.addEventListener('click', function (e) {
        var b = e.target.closest('[data-m]'); if (!b) return;
        cur = b.dataset.m; brand = RQ.brandOf(cur); RQ.myPhone(cur); paint(); d.remove(); if (onChange) onChange(cur);
      });
    });
    pres.addEventListener('click', function (e) {
      var b = e.target.closest('[data-m]'); if (!b) return;
      cur = b.dataset.m; brand = RQ.brandOf(cur); RQ.myPhone(cur); paint();
      pq.value = ''; pres.hidden = true; if (onChange) onChange(cur);
    });
    paint();
    return function () { return cur; };
  };

  /* ---------- رفع صور العملاء (للطباعة) ---------- */
  RQ.compress = function (file, max, maxLen) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight, s = Math.min(1, max / Math.max(w, h));
        w = Math.round(w * s); h = Math.round(h * s);
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0, w, h);
        var q = 0.9, out = c.toDataURL('image/jpeg', q);
        while (out.length > maxLen && q > 0.4) { q -= 0.08; out = c.toDataURL('image/jpeg', q); }
        URL.revokeObjectURL(url);
        if (out.length > maxLen) return rej(new Error('big'));
        res({ data: out, w: img.naturalWidth, h: img.naturalHeight });
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('bad')); };
      img.src = url;
    });
  };
  RQ.uploadPhoto = function (dataUrl) {
    var abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789', id = 'U';
    for (var i = 0; i < 19; i++) id += abc[Math.floor(Math.random() * abc.length)];
    var body = { writes: [{
      update: { name: BASE + '/uploads/' + id, fields: { data: { stringValue: dataUrl } } },
      currentDocument: { exists: false },
      updateTransforms: [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }]
    }] };
    return fetch('https://firestore.googleapis.com/v1/' + BASE + ':commit?key=' + F.apiKey, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(function (r) { if (!r.ok) throw new Error('upload ' + r.status); return id; });
  };

  RQ.loadPixels();
})();
