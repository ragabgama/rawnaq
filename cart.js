(function () {
  var $ = RQ.$, esc = RQ.esc, fmt = RQ.fmt;
  var CFG = RQ.cfg(RQ.store.get('rq_settings'));
  var pay = '', plan = 'full', rc = { id: '', busy: false, nums: null };

  /* المحافظات */
  var gov = $('gov');
  STORE.governorates.forEach(function (g) { var o = document.createElement('option'); o.value = o.textContent = g; gov.appendChild(o); });
  var lastGov = RQ.store.get('rq_gov'); if (lastGov && STORE.governorates.indexOf(lastGov) >= 0) gov.value = lastGov;

  var items = function () { return RQ.cart.all(); };
  // الجرابات اللي ليها موديل موبايل
  var phoneModels = function () { var o = []; items().forEach(function (i) { if (i.choice && /جراب/.test(i.cat || i.name || '') && o.indexOf(i.choice) < 0) o.push(i.choice); }); return o; };
  var hasCustom = function () { return items().some(function (i) { return !!i.custom || !!(i.uploads && i.uploads.length); }); };
  var subtotal = function () { return items().reduce(function (a, i) { return a + i.price * i.qty; }, 0); };
  var caseDisc = function () { return RQ.bundleDiscount(items(), CFG.bundles).discount; };
  var frameDisc = function () { return RQ.frameDiscount(items()).discount; };
  var discount = function () { return caseDisc() + frameDisc(); };
  var isPre = function () { return pay === 'instapay' || pay === 'vodafone'; };
  // التصميم الخاص: يا المبلغ كله مقدم، يا نصه مقدم والباقي عند الاستلام
  var isHalf = function () { return isPre() && hasCustom() && plan === 'half'; };
  var codFee = function () { return pay === 'cod' || isHalf() ? (CFG.codFee || 0) : 0; };
  var freeShip = function () { return CFG.freeShip > 0 && subtotal() - discount() >= CFG.freeShip; };
  var shipping = function () { return gov.value && !freeShip() ? (Number(CFG.shipping[gov.value]) || 0) : 0; };

  function renderItems() {
    var c = items();
    $('empty').hidden = !!c.length; $('page').hidden = !c.length;
    if (!c.length) return;
    $('items').innerHTML = c.map(function (i, k) {
      return '<div class="ci" data-k="' + k + '"><img alt="" data-src="' + esc(i.img) + '">' +
        '<div><div class="n">' + esc(i.name) + '</div>' +
        '<div class="m">' + [i.variant, i.choice && /جراب/.test(i.cat || i.name || '') ? '' : i.choice].filter(Boolean).map(esc).join(' · ') + '</div>' +
        (i.choice && /جراب/.test(i.cat || i.name || '') ? ((RQ._out || []).indexOf(i.choice) >= 0 ? '<span class="mtag out">⛔ ' + esc(i.choice) + ' خلص مؤقتًا</span>' : '<span class="mtag">📱 لموبايل ' + esc(i.choice) + '</span>') : '') +
        (i.custom ? '<span class="c">' + esc(i.custom) + '</span>' : '') +
        (i.thumbs && i.thumbs.length ? '<div class="ups">' + i.thumbs.map(function (t) { return '<img alt="" src="' + esc(t) + '">'; }).join('') + '<span class="c">صورتك ✓</span></div>' : '') + '</div>' +
        '<div class="r"><b>' + fmt(i.price * i.qty) + ' ج</b>' +
        '<div class="qty"><button type="button" data-a="-">−</button><input value="' + i.qty + '" readonly aria-label="الكمية"><button type="button" data-a="+">+</button></div>' +
        '<button type="button" class="x" data-a="x">شيل</button></div></div>';
    }).join('');
    [].forEach.call($('items').querySelectorAll('img[data-src]'), function (im) { if (im.dataset.src) RQ.setImg(im, im.dataset.src); });
    renderSum();
  }
  function renderModels() {
    var ms = phoneModels(), out = RQ._out || []; $('modelBox').hidden = !ms.length;
    $('modelList').innerHTML = ms.map(function (m) { return out.indexOf(m) >= 0 ? '<span class="mtag out">⛔ ' + esc(m) + ' · خلص مؤقتًا، شيله من السلة</span>' : '<span class="mtag">' + esc(m) + '</span>'; }).join(' ');
  }
  RQ.outModels().then(function (o) { RQ._out = o; if (o.length && items().length) renderItems(); });
  function renderSum() {
    renderModels();
    var sub = subtotal(), sh = shipping(), bd = RQ.bundleDiscount(items(), CFG.bundles), fd = RQ.frameDiscount(items()), ds = bd.discount;
    $('sSub').textContent = fmt(sub) + ' ج';
    $('sDiscRow').hidden = !ds; $('sDisc').textContent = '− ' + fmt(ds) + ' ج';
    $('sFDiscRow').hidden = !fd.discount; $('sFDisc').textContent = '− ' + fmt(fd.discount) + ' ج';
    ds += fd.discount;
    var fleft = fd.count % 3 === 2 ? 1 : 0;
    $('frameHint').hidden = !(fd.count >= 1 && fd.count % 3 !== 0);
    $('frameHint').innerHTML = fleft ? '🎁 ضيف برواز كمان والتالت عليك ببلاش (الأرخص فيهم). <a href="frames.html">شوف البراويز</a>' : '🎁 اشتري 2 براويز والتالت ببلاش. <a href="frames.html">كمّل التجميعة</a>';
    var nb = CFG.bundles.filter(function (b) { return b.qty > bd.count; })[0];
    $('bundleHint').hidden = !(bd.count >= 1 && nb);
    if (nb) $('bundleHint').innerHTML = '🎁 ضيف ' + (nb.qty - bd.count) + ' جراب كمان وخد الـ ' + nb.qty + ' جرابات بـ <b>' + fmt(nb.total) + ' ج</b> بس. <a href="cases.html">شوف الجرابات</a>';
    $('sShip').textContent = freeShip() ? 'مجاني 🎉' : gov.value ? fmt(sh) + ' ج (' + gov.value + ')' : 'اختار المحافظة';
    var left = CFG.freeShip - (sub - ds);
    $('shipHint').hidden = !(CFG.freeShip > 0);
    $('shipHint').innerHTML = left > 0 ? '🚚 فاضلك <b>' + fmt(left) + ' ج</b> وتاخد الشحن مجاني' : '🎉 مبروك! الشحن عليك مجاني';
    var cf = codFee();
    $('sCodRow').hidden = !cf; $('sCod').textContent = '+ ' + fmt(cf) + ' ج';
    $('sTot').textContent = fmt(sub - ds + sh + cf) + ' ج';
    // الدفع عند الاستلام مش متاح للتصميم الخاص
    var codOk = CFG.codOn && !hasCustom();
    var cod = document.querySelector('.payopt[data-p=cod]');
    cod.classList.toggle('off', !codOk);
    cod.querySelector('input').disabled = !codOk;
    $('codNote').textContent = codOk ? 'كاش للمندوب لما الطلب يوصلك' + (CFG.codFee ? ' · رسوم ' + fmt(CFG.codFee) + ' ج' : '') : (hasCustom() ? 'مش متاح للمنتجات المخصوصة (صورتك أو اسمك)، بتتدفع مقدم' : 'مش متاح دلوقتي');
    if (!codOk && pay === 'cod') { setPay('', true); cf = 0; }
    if (!pay && codOk) { setPay('cod', true); cf = codFee(); $('sCodRow').hidden = !cf; $('sCod').textContent = '+ ' + fmt(cf) + ' ج'; }
    $('sTot').textContent = fmt(sub - ds + sh + cf) + ' ج';
    var tot = sub - ds + sh + cf, dep = isHalf() ? Math.ceil(tot / 2) : tot;
    $('planBox').hidden = !(isPre() && hasCustom());
    $('halfNote').textContent = 'تحوّل ' + fmt(Math.ceil(tot / 2)) + ' ج دلوقتي، والباقي ' + fmt(tot - Math.ceil(tot / 2)) + ' ج للمندوب' + (CFG.codFee ? ' (شامل ' + fmt(CFG.codFee) + ' ج رسوم الاستلام)' : '');
    [].forEach.call(document.querySelectorAll('[data-plan]'), function (l) { var on = l.dataset.plan === plan; l.classList.toggle('on', on); l.querySelector('input').checked = on; });
    $('prepayBox').hidden = !isPre();
    if (isPre()) {
      var num = pay === 'instapay' ? CFG.instapay : CFG.vodafone;
      $('ppAmt').textContent = fmt(dep) + ' ج';
      $('ppWhy').textContent = hasCustom() ? 'طلبك بيتطبع مخصوص ليك، عشان كده بيتدفع مقدم.' : 'حوّل المبلغ وارفع صورة التحويل، وبعدها أكّد الطلب.';
      $('ppLabel').textContent = pay === 'instapay' ? 'إنستاباي' : 'فودافون كاش';
      $('ppNum').textContent = num || '';
      var ipl = pay === 'instapay' && CFG.instapayLink;
      $('ppIpLink').hidden = !ipl; if (ipl) $('ppIpLink').href = CFG.instapayLink;
    }
    if (typeof paintRcpt === 'function') paintRcpt();
    $('submitBtn').textContent = isPre() ? 'حوّلت ' + fmt(dep) + ' ج · أكّد الطلب' : 'تأكيد الطلب · ' + fmt(tot) + ' ج';
  }
  function setPay(p, quiet) {
    pay = p;
    [].forEach.call(document.querySelectorAll('.payopt'), function (l) {
      var on = l.dataset.p === p; l.classList.toggle('on', on); l.querySelector('input').checked = on;
    });
    if (p) $('payErr').style.display = 'none';
    if (!quiet && items().length) renderSum();
  }
  $('payopts').addEventListener('change', function (e) { if (e.target.name === 'pay') setPay(e.target.value); });
  $('planopts').addEventListener('change', function (e) { if (e.target.name === 'plan') { plan = e.target.value; renderSum(); } });
  $('ppCopy').addEventListener('click', function () {
    var b = this, num = $('ppNum').textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(num) : Promise.reject()).then(function () { b.textContent = 'اتنسخ ✓'; }, function () { prompt('انسخ الرقم:', num); });
  });
  /* صورة التحويل: بتترفع أول ما العميل يختارها */
  /* قراية الأرقام من صورة التحويل (بتتحمّل بس لما العميل يرفع صورة) */
  var ocrLib = null;
  function readNums(dataUrl) {
    if (!ocrLib) ocrLib = new Promise(function (res, rej) {
      var sc = document.createElement('script'); sc.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
      sc.onload = function () { res(window.Tesseract); }; sc.onerror = rej; document.head.appendChild(sc);
    });
    var job = ocrLib.then(function (T) { return T.recognize(dataUrl, 'eng'); }).then(function (r) {
      var t = String(r && r.data && r.data.text || '').replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); }).replace(/(\d),(\d{3})/g, '$1$2');
      return (t.match(/\d+(?:\.\d{1,2})?/g) || []).map(function (n) { return Math.round(Number(n)); });
    });
    var timeout = new Promise(function (res) { setTimeout(function () { res(null); }, 30000); });
    return Promise.race([job, timeout]).catch(function () { return null; });
  }
  var depNow = function () { var t = subtotal() - discount() + shipping() + codFee(); return isHalf() ? Math.ceil(t / 2) : t; };
  // ok = المبلغ ظاهر في الصورة، unclear = مش ظاهر، unknown = ماعرفناش نقرا الصورة
  var rcptState = function () { if (!rc.id) return ''; if (!rc.nums) return 'unknown'; return rc.nums.indexOf(depNow()) >= 0 ? 'ok' : 'unclear'; };
  function paintRcpt() {
    var st = rcptState(), txt = $('rcptTxt'), lab = document.querySelector('.rcpt');
    if (!rc.id || rc.busy) { $('rcptWarn').hidden = true; return; }
    lab.classList.toggle('done', st !== 'unclear'); lab.classList.toggle('warn', st === 'unclear');
    txt.textContent = st === 'ok' ? '✓ صورة التحويل اترفعت ولقينا فيها مبلغ ' + fmt(depNow()) + ' ج' : st === 'unclear' ? '⚠️ صورة التحويل مش واضحة (دوس عشان تغيّرها)' : '✓ صورة التحويل اترفعت (دوس لو عايز تغيّرها)';
    $('rcptWarn').hidden = st !== 'unclear'; $('rwAmt').textContent = fmt(depNow()) + ' ج';
  }
  $('rcpt').addEventListener('change', function () {
    var f = this.files && this.files[0]; if (!f) return;
    var lab = document.querySelector('.rcpt'), txt = $('rcptTxt');
    rc.id = ''; rc.nums = null; rc.busy = true; lab.classList.remove('done', 'warn'); $('rcptWarn').hidden = true; $('rcptSure').checked = false;
    txt.textContent = '⏳ بنرفع الصورة ونراجعها…'; $('f-rcpt').classList.remove('bad');
    RQ.compress(f, 1600, 900000).then(function (r) {
      $('rcptPrev').src = r.data; $('rcptPrev').hidden = false;
      return Promise.all([RQ.uploadPhoto(r.data), readNums(r.data)]);
    }).then(function (x) {
      rc.id = x[0]; rc.nums = x[1]; rc.busy = false; paintRcpt();
    }).catch(function () {
      rc.busy = false; txt.textContent = '⚠️ الصورة ماترفعتش، جرّب تاني'; $('f-rcpt').classList.add('bad');
    });
  });
  $('modelOk').addEventListener('change', function () { $('modelBox').classList.remove('bad'); });
  $('rcptSure').addEventListener('change', function () { $('rcptWarn').classList.remove('bad'); });
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
      if (price !== i.price || p.name !== i.name || i.cat !== (p.category || '')) { i.price = price; i.name = p.name; i.cat = p.category || ''; changed = true; }
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
    if (phoneModels().length && !$('modelOk').checked) { ok = false; $('modelBox').classList.add('bad'); if (!first) $('modelBox').scrollIntoView({ block: 'center' }); }
    if (!pay) { ok = false; $('payErr').style.display = 'block'; }
    if (isPre() && !rc.id) { ok = false; $('f-rcpt').classList.add('bad'); if (!first) $('prepayBox').scrollIntoView({ block: 'center' }); }
    else if (isPre() && rcptState() === 'unclear' && !$('rcptSure').checked) { ok = false; $('rcptWarn').classList.add('bad'); if (!first) $('rcptWarn').scrollIntoView({ block: 'center' }); }
    var sender = $('sender').value.trim();
    if (isPre() && sender.length < 3) { ok = false; $('f-sender').classList.add('bad'); if (!first && rc.id) $('sender').focus(); }
    if (first) $(first).focus();
    return ok ? { name: name, phone: phone, gov: gov.value, address: address } : null;
  }
  ['name', 'phone', 'gov', 'address', 'sender'].forEach(function (id) { $(id).addEventListener('input', function () { $('f-' + id).classList.remove('bad'); }); });

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
    var outNow = (RQ._out || []).filter(function (m) { return phoneModels().indexOf(m) >= 0; });
    if (outNow.length) { msg.innerHTML = '⛔ جرابات ' + outNow.map(esc).join(' و ') + ' خلصت مؤقتًا عند المصنع. شيل الجراب ده من السلة أو اختار موديل تاني.'; msg.style.display = 'block'; msg.scrollIntoView({ block: 'center' }); return; }
    if (rc.busy) { msg.textContent = 'استنى ثانية، صورة التحويل لسه بتترفع.'; msg.style.display = 'block'; return; }
    var d = validate(); if (!d) return;
    if (pay === 'cod' && hasCustom()) { msg.textContent = 'المنتجات المخصوصة (صورتك أو اسمك) بتتدفع مقدم. اختار إنستاباي أو فودافون كاش.'; msg.style.display = 'block'; return; }

    busy = true;
    var btn = $('submitBtn'); btn.disabled = true; btn.textContent = 'بنسجّل طلبك…';
    var c = items(), sub = subtotal(), sh = shipping(), ds = discount(), cf = codFee(), tot = sub - ds + sh + cf;
    var id = 'RQ' + Date.now().toString(36).toUpperCase().slice(-6) + Math.floor(Math.random() * 90 + 10);
    var status = pay === 'cod' ? 'جديد' : 'مستني الدفع';
    var lineItems = c.map(function (i) {
      return { pid: String(i.pid), name: String(i.name).slice(0, 90), variant: String(i.variant || '').slice(0, 40), choice: String(i.choice || '').slice(0, 60),
        qty: Math.round(i.qty), price: Math.round(i.price), custom: String(i.custom || '').slice(0, 300), uploads: (i.uploads || []).slice(0, 3).map(String) };
    });
    var paid = isPre() ? (isHalf() ? Math.ceil(tot / 2) : tot) : 0;
    // بيانات الدفع المقدم بتتسجل مع أول منتج (قواعد قاعدة البيانات مابتقبلش حقول جديدة للطلب)
    var rst = rcptState(), snd = $('sender').value.trim().slice(0, 40), ref = $('ref').value.trim().slice(0, 30);
    if (paid) lineItems[0].pp = { paid: paid, plan: isHalf() ? 'half' : 'full', receipt: rc.id, check: rst, sender: snd, ref: ref };
    var payTag = paid ? (isHalf() ? '💳 دفع نص المبلغ مقدم ' + paid + ' ج والباقي ' + (tot - paid) + ' ج عند الاستلام' : '💳 دفع المبلغ كامل مقدم ' + paid + ' ج') + (rst === 'ok' ? ' ✓ المبلغ ظاهر في الإيصال' : ' ⚠️ راجع الإيصال') + ' | من: ' + snd + (ref ? ' | عملية: ' + ref : '') : '';
    var order = { id: id, items: lineItems, subtotal: sub, discount: ds, codFee: cf, shipping: sh, total: tot, name: d.name, phone: d.phone, gov: d.gov, address: d.address, pay: pay, status: status, paid: paid, plan: paid ? lineItems[0].pp.plan : '', receipt: rc.id, rcheck: rst };

    function done(state) {
      order.state = state;
      RQ.store.set('rq_order', order);
      if (state === 'ok') RQ.cart.clear();
      location.href = 'thanks.html';
    }
    if (this.website.value) { done('ok'); return; }

    var F = STORE.firebase, base = RQ.BASE, day = cairoDay();
    var fields = {
      // رسوم الدفع عند الاستلام بتتسجل مع الشحن (قواعد قاعدة البيانات بتقبل الحقول دي بس)
      id: id, items: lineItems, subtotal: sub, discount: ds, shipping: sh + cf, total: tot,
      name: d.name.slice(0, 80), phone: d.phone, gov: d.gov, address: d.address.slice(0, 250), custNote: [payTag, $('note').value.trim()].filter(Boolean).join(' | ').slice(0, 200),
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
