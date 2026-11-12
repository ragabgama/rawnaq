(function () {
  var $ = RQ.$, esc = RQ.esc, fmt = RQ.fmt;
  var CFG = RQ.cfg(RQ.store.get('rq_settings'));
  var pay = '';

  /* المحافظات */
  var gov = $('gov');
  STORE.governorates.forEach(function (g) { var o = document.createElement('option'); o.value = o.textContent = g; gov.appendChild(o); });
  var lastGov = RQ.store.get('rq_gov'); if (lastGov && STORE.governorates.indexOf(lastGov) >= 0) gov.value = lastGov;

  var items = function () { return RQ.cart.all(); };
  var hasCustom = function () { return items().some(function (i) { return !!i.custom || !!(i.uploads && i.uploads.length); }); };
  var subtotal = function () { return items().reduce(function (a, i) { return a + i.price * i.qty; }, 0); };
  var shipping = function () { return gov.value ? (Number(CFG.shipping[gov.value]) || 0) : 0; };

  function renderItems() {
    var c = items();
    $('empty').hidden = !!c.length; $('page').hidden = !c.length;
    if (!c.length) return;
    $('items').innerHTML = c.map(function (i, k) {
      return '<div class="ci" data-k="' + k + '"><img alt="" data-src="' + esc(i.img) + '">' +
        '<div><div class="n">' + esc(i.name) + '</div>' +
        '<div class="m">' + [i.variant, i.choice].filter(Boolean).map(esc).join(' · ') + '</div>' +
        (i.custom ? '<span class="c">' + esc(i.custom) + '</span>' : '') +
        (i.thumbs && i.thumbs.length ? '<div class="ups">' + i.thumbs.map(function (t) { return '<img alt="" src="' + esc(t) + '">'; }).join('') + '<span class="c">صورتك ✓</span></div>' : '') + '</div>' +
        '<div class="r"><b>' + fmt(i.price * i.qty) + ' ج</b>' +
        '<div class="qty"><button type="button" data-a="-">−</button><input value="' + i.qty + '" readonly aria-label="الكمية"><button type="button" data-a="+">+</button></div>' +
        '<button type="button" class="x" data-a="x">شيل</button></div></div>';
    }).join('');
    [].forEach.call($('items').querySelectorAll('img[data-src]'), function (im) { if (im.dataset.src) RQ.setImg(im, im.dataset.src); });
    renderSum();
  }
  function renderSum() {
    var sub = subtotal(), sh = shipping();
    $('sSub').textContent = fmt(sub) + ' ج';
    $('sShip').textContent = gov.value ? fmt(sh) + ' ج (' + gov.value + ')' : 'اختار المحافظة';
    $('sTot').textContent = fmt(sub + sh) + ' ج';
    // الدفع عند الاستلام مش متاح للتصميم الخاص
    var codOk = CFG.codOn && !hasCustom();
    var cod = document.querySelector('.payopt[data-p=cod]');
    cod.classList.toggle('off', !codOk);
    cod.querySelector('input').disabled = !codOk;
    $('codNote').textContent = codOk ? 'كاش للمندوب لما الطلب يوصلك' : (hasCustom() ? 'مش متاح للمنتجات المخصوصة (صورتك أو اسمك)، بتتدفع مقدم' : 'مش متاح دلوقتي');
    if (!codOk && pay === 'cod') setPay('');
    if (!pay && codOk) setPay('cod');
    $('submitBtn').textContent = 'تأكيد الطلب · ' + fmt(sub + sh) + ' ج';
  }
  function setPay(p) {
    pay = p;
    [].forEach.call(document.querySelectorAll('.payopt'), function (l) {
      var on = l.dataset.p === p; l.classList.toggle('on', on); l.querySelector('input').checked = on;
    });
    if (p) $('payErr').style.display = 'none';
  }
  $('payopts').addEventListener('change', function (e) { if (e.target.name === 'pay') setPay(e.target.value); });
  gov.addEventListener('change', function () { RQ.store.set('rq_gov', gov.value); renderSum(); });

  $('items').addEventListener('click', function (e) {
    var b = e.target.closest('[data-a]'); if (!b) return;
    var k = Number(b.closest('.ci').dataset.k), c = items(), i = c[k]; if (!i) return;
    if (b.dataset.a === '+') i.qty = Math.min(10, i.qty + 1);
    if (b.dataset.a === '-') i.qty = Math.max(1, i.qty - 1);
    if (b.dataset.a === 'x') c.splice(k, 1);
    RQ.cart.save(c); renderItems();
  });

  /* نحدّث الأسعار من المنتجات (لو السعر اتغيّر أو المنتج اتشال) */
  RQ.products(function (list, fromCache) {
    if (fromCache) return;
    var c = items(), changed = false;
    c = c.filter(function (i) {
      var p = list.filter(function (x) { return x.id === i.pid; })[0];
      if (!p) { changed = true; return false; }
      var v = p.variants.filter(function (x) { return (x.name || '') === (i.variant || ''); })[0];
      if (!v) { changed = true; return false; }
      var price = ((i.choice && p.choicePrice[i.choice]) || v.price) + (i.custom ? p.customFee : 0);
      if (price !== i.price || p.name !== i.name) { i.price = price; i.name = p.name; changed = true; }
      return true;
    });
    if (changed) { RQ.cart.save(c); renderItems(); }
  }).catch(function () {});
  RQ.settings(function (cfg) { CFG = cfg; if (items().length) renderSum(); });

  renderItems();
  if (items().length) track('InitiateCheckout', { value: subtotal(), currency: 'EGP', num_items: RQ.cart.count() });

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
    var ok = true, first = null;
    var name = $('name').value.trim().replace(/\s+/g, ' ');
    var phone = normPhone($('phone').value);
    var address = $('address').value.trim();
    [['name', name.length >= 5 && name.split(' ').length >= 2], ['phone', /^01[0125]\d{8}$/.test(phone)],
     ['gov', !!gov.value], ['address', address.length >= 10]].forEach(function (c) {
      if (!setBad(c[0], !c[1])) { ok = false; first = first || c[0]; }
    });
    if (!pay) { ok = false; $('payErr').style.display = 'block'; }
    if (first) $(first).focus();
    return ok ? { name: name, phone: phone, gov: gov.value, address: address } : null;
  }
  ['name', 'phone', 'gov', 'address'].forEach(function (id) { $(id).addEventListener('input', function () { $('f-' + id).classList.remove('bad'); }); });

  var cairoDay = function () {
    var d = new Date();
    try {
      var p = {};
      new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' })
        .formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
      if (/^\d{4}$/.test(p.year) && /^\d{2}$/.test(p.month) && /^\d{2}$/.test(p.day)) return p.year + p.month + p.day;
    } catch (e) {}
    var c = new Date(d.getTime() + 2 * 3600000), z = function (n) { return (n < 10 ? '0' : '') + n; };
    return c.getUTCFullYear() + z(c.getUTCMonth() + 1) + z(c.getUTCDate());
  };

  /* الإرسال */
  var busy = false;
  $('orderForm').addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy || !items().length) return;
    var msg = $('formMsg'); msg.style.display = 'none';
    var d = validate(); if (!d) return;
    if (pay === 'cod' && hasCustom()) { msg.textContent = 'المنتجات المخصوصة (صورتك أو اسمك) بتتدفع مقدم. اختار إنستاباي أو فودافون كاش.'; msg.style.display = 'block'; return; }

    busy = true;
    var btn = $('submitBtn'); btn.disabled = true; btn.textContent = 'بنسجّل طلبك…';
    var c = items(), sub = subtotal(), sh = shipping(), tot = sub + sh;
    var id = 'RQ' + Date.now().toString(36).toUpperCase().slice(-6) + Math.floor(Math.random() * 90 + 10);
    var status = pay === 'cod' ? 'جديد' : 'مستني الدفع';
    var lineItems = c.map(function (i) {
      return { pid: String(i.pid), name: String(i.name).slice(0, 90), variant: String(i.variant || '').slice(0, 40), choice: String(i.choice || '').slice(0, 60),
        qty: Math.round(i.qty), price: Math.round(i.price), custom: String(i.custom || '').slice(0, 300), uploads: (i.uploads || []).slice(0, 3).map(String) };
    });
    var order = { id: id, items: lineItems, subtotal: sub, shipping: sh, total: tot, name: d.name, phone: d.phone, gov: d.gov, address: d.address, pay: pay, status: status };

    function done(state) {
      order.state = state;
      RQ.store.set('rq_order', order);
      if (state === 'ok') RQ.cart.clear();
      location.href = 'thanks.html';
    }
    if (this.website.value) { done('ok'); return; }

    var F = STORE.firebase, base = RQ.BASE, day = cairoDay();
    var fields = {
      id: id, items: lineItems, subtotal: sub, shipping: sh, total: tot,
      name: d.name.slice(0, 80), phone: d.phone, gov: d.gov, address: d.address.slice(0, 250), custNote: $('note').value.trim().slice(0, 200),
      pay: pay, src: String(RQ.src).slice(0, 60), status: status, notes: '', taagerNo: ''
    };
    var encFields = {}; for (var k in fields) encFields[k] = RQ.enc(fields[k]);

    // رقم الطلب = الموبايل + تاريخ النهارده + رقم من 1 لـ 5 (أقصى 5 طلبات للرقم في اليوم)
    function attempt(n) {
      var body = { writes: [{
        update: { name: base + '/orders/' + d.phone + '_' + day + '_' + n, fields: encFields },
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
        if (r.status === 409 && n < 5) return attempt(n + 1);
        if (r.status === 409) {
          msg.textContent = 'وصلنا طلبات كتير من الرقم ده النهارده. كلّمنا على واتساب نكمّل معاك.';
          msg.style.display = 'block'; busy = false; btn.disabled = false; renderSum(); return;
        }
        done('offline');
      }).catch(function () { clearTimeout(timer); done('offline'); });
    }
    attempt(1);
  });
})();
