(function () {
  var S = window.STORE, P = S.product;
  var $ = function (id) { return document.getElementById(id); };
  var fmt = function (n) { return Number(n).toLocaleString('en-US'); };
  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------- البكسلات ---------- */
  window.loadPixels = function () {
    if (S.facebookPixel) {
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s) }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', S.facebookPixel); fbq('track', 'PageView');
    }
    if (S.tiktokPixel) {
      !function (w, d, t) { w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || []; ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie']; ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) } }; for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]); ttq.load = function (e, n) { var i = 'https://analytics.tiktok.com/i18n/pixel/events.js'; ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = i; ttq._t = ttq._t || {}; ttq._t[e] = +new Date; ttq._o = ttq._o || {}; ttq._o[e] = n || {}; var o = d.createElement('script'); o.type = 'text/javascript'; o.async = !0; o.src = i + '?sdkid=' + e + '&lib=' + t; var a = d.getElementsByTagName('script')[0]; a.parentNode.insertBefore(o, a) }; ttq.load(S.tiktokPixel); ttq.page(); }(window, document, 'ttq');
    }
  };
  window.track = function (ev, data, eventId) {
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
  window.waLink = waLink;
  var wa = $('waBtn');
  if (wa) wa.href = waLink('أهلًا، عندي سؤال عن ' + P.name);
  var yr = $('yr'); if (yr) yr.textContent = new Date().getFullYear();

  if (!$('orderForm')) { loadPixels(); return; }   // الصفحات التانية

  /* ---------- الصور ---------- */
  var imgs = ['img/p1.webp', 'img/p2.webp', 'img/p4.webp', 'img/p5.webp', 'img/p3.webp', 'img/p6.webp'];
  var thumbs = $('thumbs'), main = $('mainImg');
  imgs.forEach(function (src, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.setAttribute('aria-label', 'صورة ' + (i + 1));
    b.setAttribute('aria-current', i === 0 ? 'true' : 'false');
    b.innerHTML = '<img src="' + src + '" loading="lazy" width="62" height="62" alt="">';
    b.onclick = function () {
      main.src = src;
      thumbs.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-current', 'false'); });
      b.setAttribute('aria-current', 'true');
    };
    thumbs.appendChild(b);
  });

  /* ---------- العروض ---------- */
  var base = P.offers[0].price;
  var sel = P.offers.filter(function (o) { return o.default; })[0] || P.offers[0];
  var box = $('offers');
  P.offers.forEach(function (o) {
    var save = base * o.qty - o.price;
    var l = document.createElement('label');
    l.className = 'offer';
    l.innerHTML = (o.badge ? '<span class="badge">' + o.badge + '</span>' : '') +
      '<input type="radio" name="offer" value="' + o.qty + '"' + (o === sel ? ' checked' : '') + '>' +
      '<span class="dot"></span>' +
      '<span class="t"><b>' + o.label + '</b>' + (o.note ? '<small>' + o.note + '</small>' : '') +
      (o.qty > 1 ? '<small>القطعة بـ ' + fmt(Math.round(o.price / o.qty)) + ' ج</small>' : '') + '</span>' +
      '<span class="p"><b>' + fmt(o.price) + ' ج</b>' + (save > 0 ? '<span class="save">وفّر ' + fmt(save) + ' ج</span>' : '<span class="save" style="color:#4D6468">شامل التوصيل</span>') + '</span>';
    l.querySelector('input').onchange = function () { sel = o; paint(); };
    box.appendChild(l);
  });
  function paint() {
    $('heroPrice').innerHTML = fmt(sel.price) + ' <small>ج</small>';
    $('heroPer').textContent = sel.qty > 1 ? '(' + sel.label + ')' : '';
    $('sumLabel').textContent = sel.label;
    $('sumPrice').textContent = fmt(sel.price) + ' ج';
    $('sumTotal').textContent = fmt(sel.price) + ' ج';
    $('stickyBtn').textContent = 'اطلب الآن · ' + fmt(sel.price) + ' ج';
  }
  paint();

  /* ---------- المحافظات ---------- */
  var gov = $('gov');
  S.governorates.forEach(function (g) { var o = document.createElement('option'); o.value = o.textContent = g; gov.appendChild(o); });

  /* ---------- الزرار الثابت ---------- */
  var sticky = $('sticky');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { sticky.classList.toggle('hide', e.isIntersecting); });
    }, { threshold: 0.05 }).observe($('order'));
  }

  /* ---------- التحقق ---------- */
  function normPhone(v) {
    v = String(v || '').replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); })
      .replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); }).replace(/\D/g, '');
    if (v.indexOf('0020') === 0) v = v.slice(4);
    else if (v.indexOf('20') === 0 && v.length === 12) v = v.slice(2);
    if (v.length === 10 && v[0] === '1') v = '0' + v;
    return v;
  }
  function setBad(id, bad) { $('f-' + id).classList.toggle('bad', bad); return !bad; }
  function validate() {
    var ok = true, first = null;
    var name = $('name').value.trim().replace(/\s+/g, ' ');
    var phone = normPhone($('phone').value);
    var address = $('address').value.trim();
    [['name', name.length >= 5 && name.split(' ').length >= 2],
     ['phone', /^01[0125]\d{8}$/.test(phone)],
     ['gov', !!gov.value],
     ['address', address.length >= 10]].forEach(function (c) {
      if (!setBad(c[0], !c[1])) { ok = false; first = first || c[0]; }
    });
    if (first) $(first).focus();
    return ok ? { name: name, phone: phone, gov: gov.value, address: address } : null;
  }
  ['name', 'phone', 'gov', 'address'].forEach(function (id) {
    $(id).addEventListener('input', function () { $('f-' + id).classList.remove('bad'); });
  });

  var cairoDay = function () { return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }); };
  var src = (function () {
    var q = new URLSearchParams(location.search);
    var s = q.get('utm_source') || (q.get('fbclid') ? 'facebook' : q.get('ttclid') ? 'tiktok' : '');
    var c = q.get('utm_campaign') || '';
    if (s) store.set('rq_src', s + (c ? '/' + c : ''));
    return store.get('rq_src') || 'direct';
  })();

  /* ---------- الإرسال ---------- */
  var busy = false;
  $('orderForm').addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    var msg = $('formMsg'); msg.style.display = 'none';
    var d = validate(); if (!d) return;
    var hp = this.website.value;

    var seen = store.get('rq_last');
    if (seen && seen.phone === d.phone && seen.day === cairoDay()) {
      msg.textContent = 'طلبك من الرقم ده وصلنا النهارده خلاص، وهنتصل بيك نأكده.';
      msg.style.display = 'block'; return;
    }

    busy = true;
    var btn = $('submitBtn'); btn.disabled = true; btn.textContent = 'بنسجّل طلبك…';
    track('InitiateCheckout', { value: sel.price, currency: 'EGP', num_items: sel.qty });

    var id = 'RQ' + Date.now().toString(36).toUpperCase().slice(-6) + Math.floor(Math.random() * 90 + 10);
    var order = { id: id, qty: sel.qty, price: sel.price, label: sel.label, name: d.name, phone: d.phone, gov: d.gov, address: d.address, sku: P.sku, product: P.name, src: src, hp: hp };

    function done(state) {
      order.state = state;           // ok | offline
      delete order.hp;
      store.set('rq_order', order);
      if (state === 'ok') store.set('rq_last', { phone: d.phone, day: cairoDay() });
      location.href = 'thanks.html';
    }

    if (hp) { done('ok'); return; }                       // روبوت: مانسجلش حاجة
    var F = S.firebase;
    if (!F || !F.projectId) { done('offline'); return; }

    // رقم المستند = الموبايل + تاريخ النهارده (بتوقيت القاهرة) → نفس الرقم مايطلبش مرتين في نفس اليوم
    var docId = d.phone + '_' + cairoDay().replace(/-/g, '');
    var base = 'projects/' + F.projectId + '/databases/(default)/documents';
    var sv = function (v) { return { stringValue: String(v) }; };
    var body = { writes: [{
      update: { name: base + '/orders/' + docId, fields: {
        id: sv(id), qty: { integerValue: String(sel.qty) }, total: { integerValue: String(sel.price) },
        name: sv(d.name.slice(0, 80)), phone: sv(d.phone), gov: sv(d.gov), address: sv(d.address.slice(0, 250)),
        sku: sv(P.sku), src: sv(String(src).slice(0, 60)), status: sv('جديد'), notes: sv(''), taagerNo: sv('')
      } },
      currentDocument: { exists: false },
      updateTransforms: [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }]
    }] };

    var ctl = 'AbortController' in window ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 15000);
    fetch('https://firestore.googleapis.com/v1/' + base + ':commit?key=' + F.apiKey, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined
    })
      .then(function (r) {
        clearTimeout(timer);
        if (r.ok) return done('ok');
        if (r.status === 409) {                            // نفس الرقم طلب النهارده
          store.set('rq_last', { phone: d.phone, day: cairoDay() });
          msg.textContent = 'طلبك من الرقم ده وصلنا النهارده خلاص، وهنتصل بيك نأكده.';
          msg.style.display = 'block';
          busy = false; btn.disabled = false; btn.textContent = 'تأكيد الطلب';
          return;
        }
        done('offline');                                   // أي مشكلة تانية: الطلب يروح واتساب
      })
      .catch(function () { clearTimeout(timer); done('offline'); });
  });

  loadPixels();
  track('ViewContent', { value: sel.price, currency: 'EGP', content_name: P.name, content_ids: [P.sku], content_type: 'product' });
})();
