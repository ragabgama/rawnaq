(function () {
  var S = window.STORE, $ = RQ.$, esc = RQ.esc, fmt = RQ.fmt;
  var pid = '';
  try { pid = new URLSearchParams(location.search).get('id') || ''; } catch (e) {}
  if (!/^[A-Za-z0-9]{1,40}$/.test(pid)) pid = '';

  var P = null, sel = null, painted = false;
  var offerLabel = function (o) { return o.label || (o.qty === 1 ? 'قطعة واحدة' : o.qty === 2 ? 'قطعتين' : o.qty + ' قطع'); };

  function missing() { if (!painted) { $('missing').hidden = false; $('crumb').textContent = 'مش متاح'; } }

  /* نفتح بسرعة من النسخة المحفوظة، وبعدين نجيب الأحدث */
  if (!pid) { missing(); return; }
  var cached = RQ.store.get('rq_products');
  if (cached && cached.list) { var hit = cached.list.filter(function (p) { return p.id === pid; })[0]; if (hit) show(hit); }
  RQ.fsGet('products/' + pid).then(function (p) {
    if (!p || p.active === false) { if (!painted) missing(); else if (p && p.active === false) location.replace('./'); return; }
    p = RQ.cleanProduct(p);
    if (!p.offers.length) return missing();
    if (!painted || JSON.stringify(p) !== JSON.stringify(P)) show(p);
  }).catch(function () { if (!painted) { $('missing').hidden = false; $('missing').innerHTML = 'حصلت مشكلة في التحميل. <a href="">جرّب تاني</a>'; } });

  function show(p) {
    var first = !painted;
    P = p; painted = true;
    document.title = p.name + ' | رونق';
    $('crumb').textContent = p.name;
    $('pp').hidden = false; $('more').hidden = false; $('missing').hidden = true;
    $('pName').textContent = p.name;
    $('pShort').textContent = p.short || '';
    $('pShort').hidden = !p.short;
    $('waBtn').href = RQ.waLink('أهلًا، عندي سؤال عن ' + p.name);

    /* الصور */
    var thumbs = $('thumbs'), main = $('mainImg');
    main.alt = p.name; thumbs.innerHTML = '';
    if (p.images[0]) RQ.setImg(main, p.images[0]);
    if (p.images.length > 1) p.images.forEach(function (src, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.setAttribute('aria-label', 'صورة ' + (i + 1));
      b.setAttribute('aria-current', i === 0 ? 'true' : 'false');
      var im = document.createElement('img'); im.width = 64; im.height = 64; im.alt = ''; im.loading = 'lazy';
      b.appendChild(im); RQ.setImg(im, src);
      b.onclick = function () {
        RQ.setImg(main, src);
        [].forEach.call(thumbs.querySelectorAll('button'), function (x) { x.setAttribute('aria-current', 'false'); });
        b.setAttribute('aria-current', 'true');
      };
      thumbs.appendChild(b);
    });

    /* العروض */
    var keep = sel && p.offers.filter(function (o) { return o.qty === sel.qty; })[0];
    sel = keep || p.offers.filter(function (o) { return o.default; })[0] || p.offers[0];
    var base = p.offers[0].price / p.offers[0].qty;
    var box = $('offers'); box.innerHTML = '';
    $('offersTitle').hidden = p.offers.length < 2;
    p.offers.forEach(function (o) {
      var save = Math.round(base * o.qty - o.price);
      var l = document.createElement('label');
      l.className = 'offer' + (o === sel ? ' on' : '');
      l.innerHTML = (o.badge ? '<span class="badge">' + esc(o.badge) + '</span>' : '') +
        '<input type="radio" name="offer" value="' + o.qty + '"' + (o === sel ? ' checked' : '') + '>' +
        '<span class="dot"></span>' +
        '<span class="t"><b>' + esc(offerLabel(o)) + '</b>' + (o.note ? '<small>' + esc(o.note) + '</small>' : '') +
        (o.qty > 1 ? '<small>القطعة بـ ' + fmt(o.price / o.qty) + ' ج</small>' : '') + '</span>' +
        '<span class="p"><b>' + fmt(o.price) + ' ج</b>' + (save > 0 ? '<span class="save">وفّر ' + fmt(save) + ' ج</span>' : '<span class="save" style="color:#4D6468">شامل التوصيل</span>') + '</span>';
      var inp = l.querySelector('input');
      inp.onchange = function () {
        sel = o; paint();
        [].forEach.call(box.querySelectorAll('.offer'), function (x) { x.className = 'offer'; });
        l.className = 'offer on';
      };
      inp.onfocus = function () { l.className += ' focus'; };
      inp.onblur = function () { l.className = l.className.replace(' focus', ''); };
      box.appendChild(l);
    });
    paint();

    /* الوصف: ## عنوان، - نقطة، وأي سطر تاني فقرة */
    var html = '', inList = false;
    String(p.description || '').split(/\r?\n/).forEach(function (line) {
      var t = line.trim();
      var li = /^[-•*]\s*/.test(t);
      if (inList && !li) { html += '</ul>'; inList = false; }
      if (!t) return;
      if (/^##?\s*/.test(t) && t.charAt(0) === '#') html += '<h2>' + esc(t.replace(/^#+\s*/, '')) + '</h2>';
      else if (li) { if (!inList) { html += '<ul>'; inList = true; } html += '<li><span>' + esc(t.replace(/^[-•*]\s*/, '')) + '</span></li>'; }
      else html += '<p>' + esc(t) + '</p>';
    });
    if (inList) html += '</ul>';
    $('desc').innerHTML = html;

    /* الفيديو */
    var v = String(p.video || '').trim(), vb = $('vidBox');
    vb.innerHTML = '';
    var yt = v.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
    if (yt) vb.innerHTML = '<div class="vid"><iframe src="https://www.youtube.com/embed/' + yt[1] + '" title="فيديو المنتج" allow="autoplay; encrypted-media" allowfullscreen loading="lazy"></iframe></div>';
    else if (/^(https?:\/\/|img\/)[^"'<>\s]+$/.test(v)) {
      vb.innerHTML = '<div class="vid"><video src="' + esc(v) + '" muted loop playsinline controls preload="none"></video></div>';
      var vid = vb.querySelector('video');
      if (p.images[0]) RQ.img(p.images[0]).then(function (u) { if (u) vid.poster = u; });
      if ('IntersectionObserver' in window) new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { var pr = vid.play(); if (pr && pr.catch) pr.catch(function () {}); } else vid.pause(); });
      }, { threshold: 0.4 }).observe(vid);
    }

    if (first) track('ViewContent', { value: sel.price, currency: 'EGP', content_name: p.name, content_ids: [p.sku || p.id], content_type: 'product' });
  }

  function paint() {
    $('heroPrice').innerHTML = fmt(sel.price) + ' <small>ج</small>';
    var was = Number(P.compareAt) || 0, wasTotal = was ? was * sel.qty : 0;
    $('heroWas').hidden = !(wasTotal > sel.price);
    $('heroWas').textContent = fmt(wasTotal) + ' ج';
    $('sumLabel').textContent = offerLabel(sel);
    $('sumPrice').textContent = fmt(sel.price) + ' ج';
    $('sumTotal').textContent = fmt(sel.price) + ' ج';
    $('stickyBtn').textContent = 'اطلب الآن · ' + fmt(sel.price) + ' ج';
  }

  /* المحافظات */
  var gov = $('gov');
  S.governorates.forEach(function (g) { var o = document.createElement('option'); o.value = o.textContent = g; gov.appendChild(o); });

  /* الزرار الثابت يختفي لما الفورم يبان */
  var sticky = $('sticky');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { sticky.classList.toggle('hide', e.isIntersecting); });
    }, { threshold: 0.05 }).observe($('order'));
  } else sticky.classList.remove('hide');

  /* التحقق */
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
    var ok = true, firstBad = null;
    var name = $('name').value.trim().replace(/\s+/g, ' ');
    var phone = normPhone($('phone').value);
    var address = $('address').value.trim();
    [['name', name.length >= 5 && name.split(' ').length >= 2],
     ['phone', /^01[0125]\d{8}$/.test(phone)],
     ['gov', !!gov.value],
     ['address', address.length >= 10]].forEach(function (c) {
      if (!setBad(c[0], !c[1])) { ok = false; firstBad = firstBad || c[0]; }
    });
    if (firstBad) $(firstBad).focus();
    return ok ? { name: name, phone: phone, gov: gov.value, address: address } : null;
  }
  ['name', 'phone', 'gov', 'address'].forEach(function (id) {
    $(id).addEventListener('input', function () { $('f-' + id).classList.remove('bad'); });
  });

  var cairoDay = function () {
    var d = new Date();
    try {
      var p = {};
      new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' })
        .formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
      if (/^\d{4}$/.test(p.year) && /^\d{2}$/.test(p.month) && /^\d{2}$/.test(p.day)) return p.year + p.month + p.day;
    } catch (e) {}
    var c = new Date(d.getTime() + 2 * 3600000);
    var z = function (n) { return (n < 10 ? '0' : '') + n; };
    return c.getUTCFullYear() + z(c.getUTCMonth() + 1) + z(c.getUTCDate());
  };

  /* الإرسال */
  var busy = false;
  var dupMsg = 'طلبك للمنتج ده من الرقم ده وصلنا النهارده خلاص، وهنتصل بيك نأكده.';
  $('orderForm').addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy || !P) return;
    var msg = $('formMsg'); msg.style.display = 'none';
    var d = validate(); if (!d) return;
    var hp = this.website.value;
    var day = cairoDay();
    var lastKey = d.phone + '_' + day + '_' + P.id;
    var last = RQ.store.get('rq_last') || [];
    if (!Array.isArray(last)) last = [];
    if (last.indexOf(lastKey) >= 0) { msg.textContent = dupMsg; msg.style.display = 'block'; return; }

    busy = true;
    var btn = $('submitBtn'); btn.disabled = true; btn.textContent = 'بنسجّل طلبك…';
    track('InitiateCheckout', { value: sel.price, currency: 'EGP', num_items: sel.qty, content_ids: [P.sku || P.id] });

    var id = 'RQ' + Date.now().toString(36).toUpperCase().slice(-6) + Math.floor(Math.random() * 90 + 10);
    var label = offerLabel(sel);
    var order = { id: id, qty: sel.qty, price: sel.price, label: label, name: d.name, phone: d.phone, gov: d.gov, address: d.address, sku: P.sku || '', product: P.name, productId: P.id };

    function done(state) {
      order.state = state;
      RQ.store.set('rq_order', order);
      if (state === 'ok') { last.push(lastKey); RQ.store.set('rq_last', last.slice(-20)); }
      location.href = 'thanks.html';
    }
    if (hp) { done('ok'); return; }

    var F = S.firebase, base = RQ.BASE;
    var sv = function (v) { return { stringValue: String(v) }; };
    var body = { writes: [{
      update: { name: base + '/orders/' + lastKey, fields: {
        id: sv(id), productId: sv(P.id), product: sv(P.name), sku: sv(P.sku || ''), label: sv(label.slice(0, 40)),
        qty: { integerValue: String(sel.qty) }, total: { integerValue: String(sel.price) },
        name: sv(d.name.slice(0, 80)), phone: sv(d.phone), gov: sv(d.gov), address: sv(d.address.slice(0, 250)),
        src: sv(String(RQ.src).slice(0, 60)), status: sv('جديد'), notes: sv(''), taagerNo: sv('')
      } },
      currentDocument: { exists: false },
      updateTransforms: [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }]
    }] };

    var ctl = 'AbortController' in window ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 15000);
    fetch('https://firestore.googleapis.com/v1/' + base + ':commit?key=' + F.apiKey, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined
    }).then(function (r) {
      clearTimeout(timer);
      if (r.ok) return done('ok');
      if (r.status === 409) {
        last.push(lastKey); RQ.store.set('rq_last', last.slice(-20));
        msg.textContent = dupMsg; msg.style.display = 'block';
        busy = false; btn.disabled = false; btn.textContent = 'تأكيد الطلب';
        return;
      }
      done('offline');
    }).catch(function () { clearTimeout(timer); done('offline'); });
  });
})();
