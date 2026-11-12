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
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
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
      return ((j && j.documents) || []).map(function (d) { var o = decFields(d.fields || {}); o.id = d.name.split('/').pop(); return o; });
    });
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
    return RQ.fsList('products').then(function (list) {
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
      shipping: ship, codOn: s.codOff !== true
    };
  };
  RQ.settings = function (onData) {
    var cached = RQ.store.get('rq_settings');
    if (cached) onData(RQ.cfg(cached), true);
    return RQ.fsGet('settings/store').then(function (s) {
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
    mediaMem[id] = RQ.fsGet('media/' + id).then(function (m) {
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
    save: function (c) { RQ.store.set(CART, c); RQ.cart.badge(); },
    count: function () { return RQ.cart.all().reduce(function (a, i) { return a + (i.qty || 0); }, 0); },
    add: function (item) {
      var c = RQ.cart.all();
      var same = c.filter(function (i) { return i.pid === item.pid && i.variant === item.variant && i.choice === item.choice && !i.custom && !item.custom && !i.uploads && !item.uploads; })[0];
      if (same) same.qty = Math.min(10, same.qty + item.qty); else c.push(item);
      RQ.cart.save(c.slice(0, 15));
    },
    clear: function () { RQ.cart.save([]); },
    badge: function () {
      var n = RQ.cart.count();
      [].forEach.call(document.querySelectorAll('[data-cart-count]'), function (b) { b.textContent = n; b.hidden = !n; });
    }
  };
  RQ.cart.badge();

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
  RQ.myPhone = function (v) { if (v !== undefined) RQ.store.set('rq_phone', v); return RQ.store.get('rq_phone') || ''; };
  // بيرسم أزرار الماركات + قايمة الموديلات، وبيرجّع function تجيب الاختيار
  RQ.phonePicker = function (box, models, onChange) {
    var esc = RQ.esc, brands = [];
    models.forEach(function (m) { var b = RQ.brandOf(m); if (brands.indexOf(b) < 0) brands.push(b); });
    var cur = models.indexOf(RQ.myPhone()) >= 0 ? RQ.myPhone() : '';
    var brand = cur ? RQ.brandOf(cur) : '';
    box.innerHTML = '<div class="brands"></div><select class="pmodel"></select>' +
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
