(function () {
  var $ = RQ.$, esc = RQ.esc, fmt = RQ.fmt;
  var pid = '';
  try { pid = new URLSearchParams(location.search).get('id') || ''; } catch (e) {}
  if (!/^[A-Za-z0-9]{1,40}$/.test(pid)) pid = '';

  var P = null, vSel = 0, painted = false;

  function missing(msg) { if (!painted) { $('missing').hidden = false; if (msg) $('missing').innerHTML = msg; $('crumb').textContent = 'مش متاح'; } }
  if (!pid) { missing(); return; }

  var cached = RQ.store.get('rq_products2');
  if (cached && cached.list) { var hit = cached.list.filter(function (p) { return p.id === pid; })[0]; if (hit) show(hit); }
  RQ.fsGet('products/' + pid).then(function (p) {
    if (!p || p.active === false) { if (!painted) missing(); else location.replace('./'); return; }
    p = RQ.cleanProduct(p);
    if (!p.variants.length) return missing();
    if (!painted || JSON.stringify(p) !== JSON.stringify(P)) show(p);
  }).catch(function () { missing('حصلت مشكلة في التحميل. <a href="">جرّب تاني</a>'); });

  function show(p) {
    var first = !painted;
    P = p; painted = true;
    if (vSel >= p.variants.length) vSel = 0;
    document.title = p.name + ' | رونق';
    $('crumb').textContent = p.name;
    $('pp').hidden = false; $('more').hidden = false; $('missing').hidden = true;
    $('pName').textContent = p.name;
    $('pShort').textContent = p.short || ''; $('pShort').hidden = !p.short;
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

    /* المقاسات / الأنواع */
    var showV = p.variants.length > 1 || !!p.variants[0].name;
    $('vBox').hidden = !showV;
    $('vLabel').textContent = p.variantLabel || 'المقاس';
    $('vPills').innerHTML = p.variants.map(function (v, i) {
      return '<button type="button" data-i="' + i + '" class="' + (i === vSel ? 'on' : '') + '">' + esc(v.name || 'عادي') + '<small>' + fmt(v.price) + ' ج</small></button>';
    }).join('');

    /* موديل الموبايل / اختيار */
    var sel = $('choice'), keep = sel.value;
    $('cBox').hidden = !p.choices.length;
    $('cLabel').textContent = p.choiceLabel || 'اختار';
    sel.innerHTML = '<option value="">' + esc(p.choiceLabel ? 'اختار ' + p.choiceLabel : 'اختار') + '</option>' +
      p.choices.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');
    if (keep && p.choices.indexOf(keep) >= 0) sel.value = keep;

    /* التصميم الخاص */
    $('customBox').hidden = !p.allowCustom;
    $('customFee').textContent = p.customFee ? '(+' + fmt(p.customFee) + ' ج)' : '';
    if (p.customHint) $('customText').placeholder = p.customHint;

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

  function custom() { return !!(P && P.allowCustom && $('customOn').checked); }
  function unit() { var v = P.variants[vSel]; return v.price + (custom() ? P.customFee : 0); }
  function qty() { var q = Math.round(Number($('qty').value) || 1); return Math.max(1, Math.min(10, q)); }
  function paint() {
    var v = P.variants[vSel], u = unit();
    $('price').innerHTML = fmt(u) + ' <small>ج</small>';
    $('was').hidden = !(v.was > v.price);
    $('was').textContent = fmt(v.was) + ' ج';
    [].forEach.call($('vPills').children, function (b, i) { b.className = i === vSel ? 'on' : ''; });
    $('customText').hidden = !custom();
    $('stickyBtn').textContent = 'أضف للسلة · ' + fmt(u * qty()) + ' ج';
  }

  $('vPills').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    vSel = Number(b.dataset.i); paint();
  });
  $('customOn').addEventListener('change', function () { paint(); if (custom()) $('customText').focus(); });
  $('qMinus').onclick = function () { $('qty').value = Math.max(1, qty() - 1); paint(); };
  $('qPlus').onclick = function () { $('qty').value = Math.min(10, qty() + 1); paint(); };
  $('qty').addEventListener('change', function () { $('qty').value = qty(); paint(); });
  $('choice').addEventListener('change', function () { $('cErr').style.display = 'none'; $('choice').style.borderColor = ''; });

  function add(go) {
    if (!P) return false;
    if (P.choices.length && !$('choice').value) {
      $('cErr').style.display = 'block'; $('choice').style.borderColor = 'var(--red)';
      $('cBox').scrollIntoView({ behavior: 'smooth', block: 'center' }); $('choice').focus();
      return false;
    }
    var ct = $('customText').value.trim();
    if (custom() && ct.length < 2) { $('customText').focus(); $('customText').style.borderColor = 'var(--red)'; return false; }
    var v = P.variants[vSel];
    RQ.cart.add({
      pid: P.id, name: P.name, img: P.images[0] || '', variant: v.name || '', choice: $('choice').value || '',
      qty: qty(), price: unit(), custom: custom() ? ct.slice(0, 300) : ''
    });
    track('AddToCart', { value: unit() * qty(), currency: 'EGP', content_ids: [P.id], content_name: P.name, content_type: 'product' });
    if (go) { location.href = 'cart.html'; return true; }
    $('added').style.display = 'block';
    $('customText').value = ''; $('customOn').checked = false; $('qty').value = 1; paint();
    return true;
  }
  $('addBtn').onclick = function () { add(false); };
  $('buyNow').onclick = function () { add(true); };
  $('stickyBtn').onclick = function () {
    if (P && P.choices.length && !$('choice').value) { $('cBox').scrollIntoView({ behavior: 'smooth', block: 'center' }); $('cErr').style.display = 'block'; return; }
    if (add(false)) $('added').scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  /* الزرار الثابت يختفي لما زرار السلة يبان */
  var sticky = $('sticky');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { sticky.classList.toggle('hide', e.isIntersecting); });
    }, { threshold: 0.05 }).observe($('buyBox'));
  } else sticky.classList.remove('hide');
})();
