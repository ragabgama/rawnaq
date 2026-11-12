/* =========================================================
   الحاجات المشتركة بين كل صفحات المتجر
   (البكسلات، الواتساب، قراية المنتجات والصور من قاعدة البيانات)
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
        var map = { ViewContent: 'ViewContent', InitiateCheckout: 'InitiateCheckout', Purchase: 'CompletePayment' };
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

  /* ---------- المنتجات (مع نسخة محفوظة عشان الصفحة تفتح بسرعة) ---------- */
  RQ.cleanProduct = function (p) {
    p.offers = (p.offers || []).filter(function (o) { return o && o.qty > 0 && o.price > 0; })
      .sort(function (a, b) { return a.qty - b.qty; });
    p.images = (p.images || []).filter(Boolean);
    return p;
  };
  RQ.products = function (onData) {
    var cached = RQ.store.get('rq_products');
    if (cached && cached.list) onData(cached.list, true);
    return RQ.fsList('products').then(function (list) {
      list = list.map(RQ.cleanProduct).filter(function (p) { return p.active !== false && p.offers.length; })
        .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
      RQ.store.set('rq_products', { t: Date.now(), list: list });
      onData(list, false);
      return list;
    });
  };
  RQ.settings = function (onData) {
    var cached = RQ.store.get('rq_settings');
    if (cached) onData(cached, true);
    return RQ.fsGet('settings/store').then(function (s) {
      s = s || {}; RQ.store.set('rq_settings', s); onData(s, false); return s;
    }).catch(function () {});
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
  RQ.setImg = function (el, src) {
    RQ.img(src).then(function (u) { if (u) el.src = u; });
  };

  /* ---------- أقل سعر (قطعة واحدة) ---------- */
  RQ.fromPrice = function (p) { return p.offers.length ? p.offers[0].price : 0; };

  RQ.loadPixels();
})();
