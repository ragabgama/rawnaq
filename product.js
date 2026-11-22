(function () {
  var $ = RQ.$, esc = RQ.esc, fmt = RQ.fmt;
  var pid = '';
  try { pid = new URLSearchParams(location.search).get('id') || ''; } catch (e) {}
  if (!/^[A-Za-z0-9]{1,40}$/.test(pid)) pid = '';

  var P = null, tSel = '', vSel = 0, painted = false, getPhone = null, phoneMode = false;
  var ups = [];   // الصور اللي العميل اختارها: {data, thumb, w, h}

  function missing(msg) { if (!painted) { $('missing').hidden = false; if (msg) $('missing').innerHTML = msg; $('crumb').textContent = 'مش متاح'; } }
  if (!pid) { missing(); return; }

  var cached = RQ.store.get('rq_products2');
  if (cached && cached.list) { var hit = cached.list.filter(function (p) { return p.id === pid; })[0]; if (hit) show(hit); }
  // المنتج من النسخة الثابتة على الموقع، ولو منتج جديد لسه مانزلش فيها نجيبه من قاعدة البيانات
  function fromDb() {
    return RQ.fsGet('products/' + pid).then(function (p) {
      if (!p || p.active === false) { if (!painted) missing(); else location.replace('./'); return; }
      p = RQ.cleanProduct(p);
      if (!p.variants.length) return missing();
      if (!painted || JSON.stringify(p) !== JSON.stringify(P)) show(p);
    });
  }
  RQ.products(function (list, fromCache) {
    var p = list.filter(function (x) { return x.id === pid; })[0];
    if (p) { if (!painted || JSON.stringify(p) !== JSON.stringify(P)) show(p); }
    else if (!fromCache) fromDb().catch(function () { missing('حصلت مشكلة في التحميل. <a href="">جرّب تاني</a>'); });
  }).catch(function () { if (!painted) fromDb().catch(function () { missing('حصلت مشكلة في التحميل. <a href="">جرّب تاني</a>'); }); });

  function show(p) {
    var first = !painted;
    P = p; painted = true;
    if (vSel >= p.variants.length) vSel = 0;
    document.title = p.name + ' | رونق';
    $('crumb').textContent = p.name;
    var isC0 = p.category === STORE.caseCat; $('crumbCat').href = isC0 ? 'cases.html' : 'frames.html'; $('crumbCat').textContent = isC0 ? 'جرابات الموبايل' : 'براويز ولوحات';
    $('pp').hidden = false; $('more').hidden = false; $('missing').hidden = true;
    $('pName').textContent = p.name;
    $('pShort').textContent = p.short || ''; $('pShort').hidden = !p.short;
    $('waBtn').href = RQ.waLink('أهلًا، عندي سؤال عن ' + p.name);
    $('wallBtn').hidden = isC0 || !!p.allowUpload; $('wallBtn').href = 'frames.html?add=' + encodeURIComponent(p.id) + '#wall';

    /* الصور */
    var thumbs = $('thumbs'), main = $('mainImg');
    main.alt = p.name; thumbs.innerHTML = '';
    main.parentElement.classList.toggle('casebg', p.category === STORE.caseCat);
    var bl = RQ.cfg(RQ.store.get('rq_settings')).bundles, isCase = p.category === STORE.caseCat;
    // الشحن قبل السلة: أقل وأعلى سعر فعلي من أسعار المحافظات
    var cfg0 = RQ.cfg(RQ.store.get('rq_settings')), fso = cfg0.freeShip;
    var shv = Object.keys(cfg0.shipping).map(function (k) { return Number(cfg0.shipping[k]) || 0; }).filter(function (x) { return x > 0; });
    if (shv.length) {
      var smin = Math.min.apply(null, shv), smax = Math.max.apply(null, shv);
      $('shipNote').innerHTML = '🚚 <span style="white-space:nowrap">الشحن من ' + fmt(smin) + (smax > smin ? ' لـ ' + fmt(smax) : '') + ' ج</span> حسب المحافظة' + (fso > 0 ? ' · <span style="white-space:nowrap">مجاني من ' + fmt(fso) + ' ج</span>' : '');
    } else if (fso > 0) $('shipNote').textContent = '🚚 الشحن مجاني للطلبات من ' + fmt(fso) + ' ج، وأقل من كده حسب محافظتك';
    // العروض: الجرابات بالكمية، والبراويز اشتري 2 والتالت ببلاش
    var showB = isCase ? bl.length > 0 : !p.allowUpload;
    $('bundleNote').hidden = !showB;
    if (isCase && bl.length) $('bundleNote').innerHTML = '<b>🎁 وفّر لما تاخد أكتر (أي تصميمات):</b><span class="bchips">' + bl.map(function (b) { return '<span>' + b.qty + ' جرابات بـ ' + fmt(b.total) + ' ج</span>'; }).join('') + '</span>';
    else if (showB) $('bundleNote').innerHTML = '<b>🎁 عرض البراويز:</b><span class="bchips"><span>اشتري 2 والتالت ببلاش</span></span><small style="display:block;margin-top:6px">اختار أي 3 براويز أو تابلوهات، والأرخص فيهم عليك ببلاش.</small>';
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

    /* المقاسات / الأنواع */
    var showV = p.variants.length > 1 || !!p.variants[0].name;
    $('vBox').hidden = !showV;
    $('vLabel').textContent = p.variantLabel || 'المقاس';
    var types = typesOf(p);
    $('tBox').hidden = types.length < 2;
    if (types.length > 1) {
      if (types.indexOf(tSel) < 0) tSel = typeOf(p.variants[vSel].name) || types[0];
      $('tPills').innerHTML = types.map(function (t) {
        var mn = Math.min.apply(null, p.variants.filter(function (v) { return typeOf(v.name) === t; }).map(function (v) { return v.price; }));
        return '<button type="button" data-t="' + esc(t) + '">' + esc(t) + '<small>من ' + fmt(mn) + ' ج</small></button>';
      }).join('');
    } else tSel = '';
    renderSizes();

    /* موديل الموبايل (الماركة الأول) أو قايمة عادية */
    $('cBox').hidden = !p.choices.length || noFrame();
    $('cLabel').textContent = p.choiceLabel || 'اختار';
    phoneMode = RQ.isPhoneList(p.choices);
    $('phoneBox').hidden = !phoneMode; $('choice').hidden = phoneMode;
    if (phoneMode) {
      getPhone = RQ.phonePicker($('phoneBox'), p.choices, function () { $('cErr').style.display = 'none'; if (P) paint(); });
    } else {
      var sel = $('choice'), keep = sel.value;
      sel.innerHTML = '<option value="">' + esc(p.choiceLabel ? 'اختار ' + p.choiceLabel : 'اختار') + '</option>' +
        p.choices.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');
      if (keep && p.choices.indexOf(keep) >= 0) sel.value = keep;
    }

    /* رفع الصور */
    $('upBox').hidden = !p.allowUpload;
    $('upFile').multiple = p.maxUploads > 1;
    $('upLabel').textContent = p.maxUploads > 1 ? 'ارفع صورك (لحد ' + p.maxUploads + ' صور)' : 'ارفع صورتك';
    paintUps();

    /* الاسم / الكلام على التصميم */
    $('customBox').hidden = !p.allowCustom;
    $('customFee').textContent = p.customFee ? '(+' + fmt(p.customFee) + ' ج)' : '';
    if (p.customHint) $('customText').placeholder = p.customHint;
    if (p.allowUpload) { $('customTitle').textContent = 'عايز تكتب اسم أو كلام كمان؟'; $('customSmall').textContent = 'اختياري: اكتب الاسم أو أي ملاحظة على التصميم.'; }
    $('prepaidNote').hidden = !(p.allowUpload || p.allowCustom);

    paint();

    /* الوصف: ## عنوان، - نقطة، وأي سطر تاني فقرة */
    var html = '', inList = false;
    String(p.description || '').split(/\r?\n/).forEach(function (line) {
      var t = line.trim(), li = /^[-•*]\s*/.test(t);
      if (inList && !li) { html += '</ul>'; inList = false; }
      if (!t) return;
      if (t.charAt(0) === '#') html += '<h2>' + esc(t.replace(/^#+\s*/, '')) + '</h2>';
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

    if (first) track('ViewContent', { value: unit(), currency: 'EGP', content_name: p.name, content_ids: [p.id], content_type: 'product' });
  }

  /* ---------- الصور اللي العميل بيرفعها ---------- */
  function paintUps() {
    $('upThumbs').innerHTML = ups.map(function (u, i) {
      var low = u.w < 900 && u.h < 900;
      return '<div><img src="' + u.thumb + '" alt=""><button type="button" data-i="' + i + '" aria-label="شيل">✕</button>' + (low ? '<span class="warn">الصورة صغيرة</span>' : '') + '</div>';
    }).join('');
    if (P) $('upFile').disabled = ups.length >= P.maxUploads;
  }
  $('upThumbs').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    ups.splice(Number(b.dataset.i), 1); paintUps();
  });
  $('upFile').addEventListener('change', function () {
    var files = [].slice.call(this.files || []); this.value = '';
    $('upErr').style.display = 'none';
    var room = (P ? P.maxUploads : 1) - ups.length;
    files.slice(0, Math.max(0, room)).forEach(function (f) {
      RQ.compress(f, 2200, 950000).then(function (big) {
        return RQ.compress(f, 220, 40000).then(function (small) {
          ups.push({ data: big.data, thumb: small.data, w: big.w, h: big.h }); paintUps();
        });
      }).catch(function () { $('upErr').textContent = 'الصورة دي مش راضية تتفتح، جرّب صورة تانية'; $('upErr').style.display = 'block'; });
    });
  });

  function typeOf(n) { n = String(n || ''); var k = n.indexOf(' · '); return k > 0 ? n.slice(0, k) : ''; }
  function sizeOf(n) { n = String(n || ''); var k = n.indexOf(' · '); return k > 0 ? n.slice(k + 3) : n; }
  function typesOf(p) { var t = []; p.variants.forEach(function (v) { var x = typeOf(v.name); if (x && t.indexOf(x) < 0) t.push(x); }); return t.length && p.variants.every(function (v) { return typeOf(v.name); }) ? t : []; }
  function noFrame() { return !!tSel && !/برواز/.test(tSel.replace(/من غير برواز|بدون برواز/, '')) ; }
  function sizeHtml(s) { var m = /^(\d+\s*×\s*\d+)(.*)$/.exec(s || ''); return m ? '<bdi dir="ltr">' + esc(m[1]) + '</bdi>' + esc(m[2]) : esc(s || 'عادي'); }
  function renderSizes() {
    if (tSel && typeOf(P.variants[vSel].name) !== tSel) {
      var want = sizeOf(P.variants[vSel].name), j = -1;
      P.variants.forEach(function (v, i) { if (j < 0 && typeOf(v.name) === tSel && sizeOf(v.name) === want) j = i; });
      if (j < 0) P.variants.forEach(function (v, i) { if (j < 0 && typeOf(v.name) === tSel) j = i; });
      vSel = j < 0 ? 0 : j;
    }
    $('vPills').innerHTML = P.variants.map(function (v, i) {
      if (tSel && typeOf(v.name) !== tSel) return '';
      return '<button type="button" data-i="' + i + '" class="' + (i === vSel ? 'on' : '') + '">' + sizeHtml(sizeOf(v.name)) + '<small>' + fmt(v.price) + ' ج</small></button>';
    }).join('');
    [].forEach.call($('tPills').children, function (b) { b.className = b.dataset.t === tSel ? 'on' : ''; });
    var nf = noFrame();
    $('tNote').textContent = !tSel ? '' : nf ? 'لوحة مطبوعة على خشب MDF، خفيفة وجاهزة للتعليق، من غير برواز ولا أكريليك.' : 'برواز خشب قدامه أكريليك، جاهز للتعليق.';
    $('cBox').hidden = !P.choices.length || nf;
    if (tSel) {
      var pick = P.images.filter(function (s) { return nf ? /\/tab-/.test(s) : !/\/tab-/.test(s); })[0];
      if (pick) RQ.setImg($('mainImg'), pick);
    }
  }
  function customText() { return P && P.allowCustom && $('customOn').checked ? $('customText').value.trim() : ''; }
  function base() { var c = $('cBox').hidden ? '' : choiceVal(); return (c && P.choicePrice[c]) || P.variants[vSel].price; }
  function unit() { return base() + (P.allowCustom && $('customOn').checked ? P.customFee : 0); }
  function qty() { var q = Math.round(Number($('qty').value) || 1); return Math.max(1, Math.min(10, q)); }
  function choiceVal() { return phoneMode ? (getPhone ? getPhone() : '') : $('choice').value; }
  function paint() {
    var v = P.variants[vSel], u = unit();
    $('price').innerHTML = fmt(u) + ' <small>ج</small>';
    $('was').hidden = !(v.was > base());
    $('was').textContent = fmt(v.was) + ' ج';
    [].forEach.call($('vPills').children, function (b) { b.className = Number(b.dataset.i) === vSel ? 'on' : ''; });
    $('customText').hidden = !(P.allowCustom && $('customOn').checked);
    $('stickyBtn').textContent = 'أضف للسلة · ' + fmt(u * qty()) + ' ج';
  }

  $('tPills').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || !P) return;
    tSel = b.dataset.t; renderSizes(); paint();
  });
  $('vPills').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    vSel = Number(b.dataset.i); paint();
  });
  $('customOn').addEventListener('change', function () { paint(); if ($('customOn').checked) $('customText').focus(); });
  $('qMinus').onclick = function () { $('qty').value = Math.max(1, qty() - 1); paint(); };
  $('qPlus').onclick = function () { $('qty').value = Math.min(10, qty() + 1); paint(); };
  $('qty').addEventListener('change', function () { $('qty').value = qty(); paint(); });
  $('choice').addEventListener('change', function () { $('cErr').style.display = 'none'; $('choice').style.borderColor = ''; if (P) paint(); });

  var busy = false;
  function check() {
    if (!P) return false;
    if (P.allowUpload && !ups.length) {
      $('upErr').textContent = 'ارفع الصورة الأول'; $('upErr').style.display = 'block';
      $('upBox').scrollIntoView({ behavior: 'smooth', block: 'center' }); return false;
    }
    if (P.choices.length && !$('cBox').hidden && !choiceVal()) {
      $('cErr').style.display = 'block'; if (!phoneMode) $('choice').style.borderColor = 'var(--red)';
      $('cBox').scrollIntoView({ behavior: 'smooth', block: 'center' }); return false;
    }
    if (P.allowCustom && $('customOn').checked && $('customText').value.trim().length < 2) {
      $('customText').focus(); $('customText').style.borderColor = 'var(--red)'; return false;
    }
    return true;
  }
  function add(go) {
    if (busy || !check()) return;
    var v = P.variants[vSel];
    var item = { pid: P.id, name: P.name, cat: P.category || '', img: P.images[0] || '', variant: v.name || '', choice: $('cBox').hidden ? '' : (choiceVal() || ''),
      qty: qty(), price: unit(), custom: customText().slice(0, 300) };
    function finish(ids) {
      if (ids && ids.length) { item.uploads = ids; item.thumbs = ups.map(function (u) { return u.thumb; }); }
      if (!RQ.cart.add(item)) { delete item.thumbs; if (!RQ.cart.add(item)) { alert('مش قادرين نحفظ السلة على المتصفح ده. جرّب تقفل وتفتح الصفحة، أو كلمنا على واتساب.'); busy = false; return; } }
      track('AddToCart', { value: item.price * item.qty, currency: 'EGP', content_ids: [P.id], content_name: P.name, content_type: 'product' });
      if (go) { location.href = 'cart.html'; return; }
      $('added').style.display = 'block'; $('added').scrollIntoView({ behavior: 'smooth', block: 'center' });
      $('customText').value = ''; $('customOn').checked = false; $('qty').value = 1; ups = []; paintUps(); paint();
    }
    if (!P.allowUpload) return finish(null);
    // نرفع الصور الأول
    busy = true;
    var btns = [$('addBtn'), $('buyNow'), $('stickyBtn')];
    btns.forEach(function (b) { b.disabled = true; });
    $('addBtn').textContent = 'بنرفع صورتك…';
    Promise.all(ups.map(function (u) { return RQ.uploadPhoto(u.data); })).then(function (ids) {
      busy = false; btns.forEach(function (b) { b.disabled = false; }); $('addBtn').textContent = 'أضف للسلة';
      finish(ids);
    }).catch(function () {
      busy = false; btns.forEach(function (b) { b.disabled = false; }); $('addBtn').textContent = 'أضف للسلة';
      $('upErr').textContent = 'ماعرفناش نرفع الصورة. جرّب تاني، أو ابعتهالنا على واتساب.'; $('upErr').style.display = 'block';
    });
  }
  $('addBtn').onclick = function () { add(false); };
  $('buyNow').onclick = function () { add(true); };
  $('stickyBtn').onclick = function () { add(false); };

  /* الزرار الثابت يختفي لما زرار السلة يبان */
  var sticky = $('sticky');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { sticky.classList.toggle('hide', e.isIntersecting); });
    }, { threshold: 0.05 }).observe($('buyBox'));
  } else sticky.classList.remove('hide');
})();
