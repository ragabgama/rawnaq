/* رونق: كروت المنتجات وصفحات الأقسام (جرابات / براويز) */
(function () {
  var $ = RQ.$, esc = RQ.esc, fmt = RQ.fmt;
  function code(p) { return (p.sku || '').replace(/^RNQ-?/i, 'R'); }
  RQ.isCase = function (p) { return p.category === STORE.caseCat; };
  RQ.card = function (p, phone) {
    var price = RQ.fromPrice(p), isC = RQ.isCase(p), set = /طقم/.test((p.sub || '') + p.name);
    var v0 = p.variants.filter(function (v) { return v.price === price; })[0] || {}, was = Number(v0.was) || 0, off = was > price ? Math.round((1 - price / was) * 100) : 0;
    var ok = isC && phone && p.choices.indexOf(phone) >= 0;
    var tag = p.allowUpload ? '📸 بصورتك' : p.allowCustom ? '✍️ باسمك' : set ? 'طقم 3 براويز' : '';
    return '<a class="pcard" href="product.html?id=' + encodeURIComponent(p.id) + '">' +
      '<div class="pimg">' + (off >= 5 ? '<span class="poff">خصم ' + off + '%</span>' : '') + (tag ? '<span class="ptag">' + tag + '</span>' : '') +
      '<img data-src="' + esc(p.images[0] || '') + '" alt="' + esc(p.name) + '" loading="lazy" width="540" height="540"></div>' +
      '<div class="pinfo"><small>' + [code(p), p.sub].filter(Boolean).map(esc).join(' · ') + '</small><b>' + esc(p.name) + '</b>' +
      '<div class="pprice">' + (p.variants.length > 1 ? '<i>من</i> ' : '') + fmt(price) + ' ج' + (off >= 5 ? ' <s>' + fmt(was) + ' ج</s>' : '') + '</div>' +
      (ok ? '<em>✓ متاح لـ ' + esc(phone) + '</em>' : (!isC && p.variants.length > 1 ? '<em class="g">' + (p.variants.some(function (v) { return / · /.test(v.name); }) ? 'ببرواز أو تابلوه من غير برواز' : p.variants.length + ' مقاسات · أسود أو أبيض') + '</em>' : '')) +
      '</div></a>';
  };
  RQ.lazy = function (box) { [].forEach.call(box.querySelectorAll('img[data-src]'), function (im) { if (im.dataset.src) RQ.setImg(im, im.dataset.src); im.removeAttribute('data-src'); }); };

  /* صفحة قسم كامل */
  RQ.listPage = function (o) {
    var all = [], phone = RQ.myPhone(), sub = new URLSearchParams(location.search).get('sub') || '', sort = 'def', key = '';
    function paint() {
      var list = all.filter(function (p) { return o.isCase ? RQ.isCase(p) : !RQ.isCase(p); });
      var subs = []; list.forEach(function (p) { if (p.sub && subs.indexOf(p.sub) < 0) subs.push(p.sub); });
      if (sub && subs.indexOf(sub) < 0) sub = '';
      $('subs').innerHTML = subs.length > 1 ? ['<button data-s="" class="' + (!sub ? 'on' : '') + '">الكل <b>' + list.length + '</b></button>'].concat(subs.map(function (s) {
        var n = list.filter(function (p) { return p.sub === s; }).length;
        return '<button data-s="' + esc(s) + '" class="' + (s === sub ? 'on' : '') + '">' + esc(s) + ' <b>' + n + '</b></button>';
      })).join('') : '';
      var v = list.filter(function (p) { return !sub || p.sub === sub; });
      if (sort === 'low') v = v.slice().sort(function (a, b) { return RQ.fromPrice(a) - RQ.fromPrice(b); });
      if (sort === 'high') v = v.slice().sort(function (a, b) { return RQ.fromPrice(b) - RQ.fromPrice(a); });
      if (sort === 'new') v = v.slice().sort(function (a, b) { return (b.order || 0) - (a.order || 0); });
      $('count').textContent = v.length + ' تصميم' + (sub ? ' في «' + sub + '»' : '');
      var k = sub + sort + phone + v.map(function (p) { return p.id + p.images[0] + RQ.fromPrice(p); }).join();
      if (k === key) return; key = k;
      $('grid').innerHTML = v.length ? v.map(function (p) { return RQ.card(p, phone); }).join('') : '<div class="empty" style="grid-column:1/-1">قريب هنضيف تصميمات جديدة هنا</div>';
      RQ.lazy($('grid'));
    }
    $('subs').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return; sub = b.dataset.s;
      history.replaceState(null, '', sub ? '?sub=' + encodeURIComponent(sub) : location.pathname); paint();
    });
    $('sort').addEventListener('change', function () { sort = this.value; paint(); });
    if (o.isCase && $('mpBox')) RQ.phonePicker($('mpBox'), window.ZINK_MODELS || [], function (m) {
      phone = m; key = ''; $('mpText').textContent = m ? 'تمام، كل الجرابات اللي تحت متاحة لـ ' + m + ' ✓' : 'اختاره مرة واحدة، وهيظهرلك على طول في صفحة أي جراب.'; paint();
    });
    if (o.isCase && phone && $('mpText')) $('mpText').textContent = 'موبايلك: ' + phone + ' ✓';
    RQ.products(function (list) { all = list; paint(); }).catch(function () {
      if (!key) $('grid').innerHTML = '<div class="empty" style="grid-column:1/-1">حصلت مشكلة في التحميل. <a href="">جرّب تاني</a></div>';
    });
  };

  /* عروض الجرابات */
  RQ.paintBundles = function (box, bundles, single) {
    try {
      var L = (RQ.store.get('rq_products2') || {}).list || [];
      var cp = L.filter(function (p) { return p.category === STORE.caseCat && !p.allowUpload && !p.allowCustom; }).map(RQ.fromPrice).filter(function (x) { return x > 0; });
      if (cp.length) single = Math.min.apply(null, cp);
    } catch (e) {}
    box.innerHTML = bundles.map(function (b) {
      var save = single * b.qty - b.total;
      return '<div class="bundle"><b>' + b.qty + ' جرابات</b><span class="bp">' + fmt(b.total) + ' ج</span><span class="be">القطعة بـ ' + fmt(Math.round(b.total / b.qty)) + ' ج</span>' + (save > 0 ? '<span class="bs">وفّر ' + fmt(save) + ' ج</span>' : '') + '</div>';
    }).join('');
  };
})();
