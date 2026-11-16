/* رونق: صفحة البراويز = اختار لوحاتك وشوفها على الحيطة بمقاسها الحقيقي */
(function () {
  var $ = RQ.$, esc = RQ.esc, fmt = RQ.fmt;
  var NS = 'http://www.w3.org/2000/svg';
  var SW = 270, SH = 202.5;            // المشهد: حيطة عرضها 2.7 متر وارتفاعها 2 متر (بالسنتي)
  var MAXP = 6, MAXPIECES = 9;
  var ROOMS = [
    { k: 'living', t: 'الصالة', wall: '#EDE6DC', top: 86 },
    { k: 'bed', t: 'أوضة النوم', wall: '#E3E8E4', top: 112 },
    { k: 'office', t: 'المكتب', wall: '#E9E4DA', top: 76 },
    { k: 'entry', t: 'المدخل', wall: '#E6DED3', top: 82 },
    { k: 'mine', t: '📷 حيطتك', wall: '#EDE6DC', top: 0 }
  ];
  var WALLS = ['#EDE6DC', '#F6F3EE', '#D8D5CF', '#CFDCD5', '#E9D2C1', '#BFCAD4', '#2E3B40'];

  var all = [], prods = [], sub = '', sel = [], room = 'living', wall = '', type = 'برواز', size = '30×40', color = 'أسود';
  var mine = { url: '', scale: 1, dx: 0, dy: 0 };
  try { var saved = JSON.parse(localStorage.getItem('rq_wall') || '{}'); if (saved.wall) wall = saved.wall; if (saved.room && saved.room !== 'mine') room = saved.room; } catch (e) {}
  var q = new URLSearchParams(location.search), wantAdd = q.get('add'), wantSize = q.get('size');
  if (wantSize) size = wantSize.replace('x', '×');

  function typeOf(n) { var k = n.indexOf(' · '); return k > 0 ? n.slice(0, k) : ''; }
  function sizeOf(n) { var k = n.indexOf(' · '); var s = k > 0 ? n.slice(k + 3) : n; return s.replace(/ سم.*$/, '').trim(); }
  function isSet(p) { return (p.art || []).length > 1; }
  function pieces(p) { return Math.max(1, (p.art || []).length); }
  function variantFor(p, t, s) { return p.variants.filter(function (v) { return typeOf(v.name) === t && sizeOf(v.name) === s; })[0]; }
  function byId(id) { return prods.filter(function (p) { return p.id === id; })[0]; }
  function frameType() { return /برواز/.test(type); }
  function types() { var t = []; prods.forEach(function (p) { p.variants.forEach(function (v) { var x = typeOf(v.name); if (x && t.indexOf(x) < 0) t.push(x); }); }); return t; }
  function sizes() {
    var s = [];
    prods.forEach(function (p) { p.variants.forEach(function (v) { if (typeOf(v.name) === type) { var z = sizeOf(v.name); if (s.indexOf(z) < 0) s.push(z); } }); });
    return s.sort(function (a, b) { return area(a) - area(b); });
  }
  function dims(s) { var m = String(s).match(/(\d+)\s*×\s*(\d+)/); if (!m) return [30, 40]; var a = +m[1], b = +m[2]; return [Math.min(a, b), Math.max(a, b)]; }
  function area(s) { var d = dims(s); return d[0] * d[1]; }
  function selPieces() { return sel.reduce(function (n, id) { var p = byId(id); return n + (p ? pieces(p) : 0); }, 0); }

  /* ---------- الكروت ---------- */
  function paintSubs() {
    var subs = []; prods.forEach(function (p) { if (p.sub && subs.indexOf(p.sub) < 0) subs.push(p.sub); });
    if (sub && subs.indexOf(sub) < 0) subs.push(sub);
    $('subs').innerHTML = ['<button data-s="" class="' + (!sub ? 'on' : '') + '">الكل <b>' + prods.length + '</b></button>'].concat(subs.map(function (s) {
      return '<button data-s="' + esc(s) + '" class="' + (s === sub ? 'on' : '') + '">' + esc(s) + ' <b>' + prods.filter(function (p) { return p.sub === s; }).length + '</b></button>';
    })).join('');
  }
  function paintGrid() {
    var up = all.filter(function (p) { return !RQ.isCase(p) && p.allowUpload; })[0];
    var list = prods.filter(function (p) { return !sub || p.sub === sub; });
    var h = (!sub && up ? '<a class="wcard wup" href="product.html?id=' + encodeURIComponent(up.id) + '"><div class="wimg"><span class="wplus">+</span><b>ارفع صورتك</b><small>ونطبعهالك في برواز</small></div><div class="winfo"><b>برواز بصورتك</b><small>من ' + fmt(RQ.fromPrice(up)) + ' ج</small></div></a>' : '');
    h += list.map(function (p) {
      var n = sel.indexOf(p.id) + 1, pr = RQ.fromPrice(p);
      return '<div class="wcard' + (n ? ' on' : '') + '" data-id="' + esc(p.id) + '" role="button" tabindex="0" aria-pressed="' + (n ? 'true' : 'false') + '" aria-label="' + esc(p.name) + '">' +
        '<div class="wimg"><img data-src="' + esc(p.images[0] || '') + '" alt="" loading="lazy" width="400" height="400">' +
        '<span class="wadd">' + (n ? n : '+') + '</span>' + (isSet(p) ? '<span class="wset">طقم ' + pieces(p) + '</span>' : '') + '</div>' +
        '<div class="winfo"><b>' + esc(p.name) + '</b><small>من ' + fmt(pr) + ' ج</small><a href="product.html?id=' + encodeURIComponent(p.id) + '">التفاصيل ‹</a></div></div>';
    }).join('');
    $('grid').innerHTML = h || '<div class="empty" style="grid-column:1/-1">قريب هنضيف لوحات جديدة</div>';
    RQ.lazy($('grid'));
  }
  function markCards() {
    [].forEach.call($('grid').querySelectorAll('.wcard[data-id]'), function (c) {
      var n = sel.indexOf(c.dataset.id) + 1;
      c.classList.toggle('on', !!n); c.setAttribute('aria-pressed', n ? 'true' : 'false');
      c.querySelector('.wadd').textContent = n ? n : '+';
    });
  }
  function toggle(id) {
    var i = sel.indexOf(id);
    if (i >= 0) sel.splice(i, 1);
    else {
      var p = byId(id); if (!p) return;
      if (sel.length >= MAXP || selPieces() + pieces(p) > MAXPIECES) { flash('كفاية كده على حيطة واحدة 🙂 شيل لوحة الأول'); return; }
      sel.push(id);
      if (window.innerWidth < 900) flash('اتضافت للحيطة ✓ <a href="#wall">شوفها</a>');
    }
    fixSize(); markCards(); render(); paintBar();
  }
  var ft;
  function flash(h) { var t = $('wtoast'); t.innerHTML = h; t.classList.add('show'); clearTimeout(ft); ft = setTimeout(function () { t.classList.remove('show'); }, 2600); }

  /* ---------- المقاس اللي متاح لكل اللي اخترته ---------- */
  function okSize(s) { return sel.every(function (id) { var p = byId(id); return p && variantFor(p, type, s); }); }
  function fixSize() {
    if (okSize(size) && sizes().indexOf(size) >= 0) return;
    var s = sizes().filter(okSize);
    if (s.length) size = s.indexOf('30×40') >= 0 ? '30×40' : s[0];
  }

  /* ---------- الرسم على الحيطة ---------- */
  function el(n, a, kids) { var e = document.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); (kids || []).forEach(function (c) { e.appendChild(c); }); return e; }
  function furniture(k) {
    var g = el('g', { 'class': 'furn', transform: 'translate(-25 0)' });
    function r(x, y, w, h, f, rx) { g.appendChild(el('rect', { x: x, y: SH - y - h, width: w, height: h, fill: f, rx: rx || 0 })); }
    if (k === 'living') {
      r(52, 0, 4, 9, '#5B4636'); r(264, 0, 4, 9, '#5B4636');
      r(50, 8, 220, 32, '#8E9B8F', 6); r(50, 8, 18, 56, '#7F8C80', 8); r(252, 8, 18, 56, '#7F8C80', 8);
      r(64, 36, 192, 50, '#9AA79B', 9);
      r(70, 38, 58, 24, '#A9B5A9', 6); r(131, 38, 58, 24, '#A9B5A9', 6); r(192, 38, 58, 24, '#A9B5A9', 6);
      r(84, 44, 30, 26, '#D9B26F', 7); r(206, 44, 30, 26, '#C6CEC6', 7);
      r(286, 0, 22, 34, '#C9A27A', 4); r(294, 34, 6, 46, '#5B4636'); g.appendChild(el('ellipse', { cx: 297, cy: SH - 92, rx: 20, ry: 24, fill: '#6E8F6A' }));
    } else if (k === 'bed') {
      r(70, 0, 180, 112, '#B49A80', 8); r(76, 0, 168, 50, '#F1ECE4', 6); r(76, 36, 168, 18, '#DCCFBF', 5);
      r(88, 52, 66, 22, '#FFFFFF', 9); r(166, 52, 66, 22, '#FFFFFF', 9);
      r(18, 0, 44, 52, '#9C8167', 4); r(258, 0, 44, 52, '#9C8167', 4);
      r(30, 52, 18, 28, '#E8D6B8', 6); r(272, 52, 18, 28, '#E8D6B8', 6);
    } else if (k === 'office') {
      r(90, 0, 4, 72, '#4A3B30'); r(226, 0, 4, 72, '#4A3B30'); r(86, 72, 148, 5, '#7A5E47', 2);
      r(140, 77, 50, 30, '#2B2F33', 3); r(162, 77, 6, 4, '#2B2F33');
      r(150, 0, 30, 6, '#33383C'); r(160, 6, 10, 38, '#33383C'); r(146, 44, 38, 8, '#3D4348', 4); r(150, 52, 30, 40, '#3D4348', 6);
      r(104, 77, 10, 18, '#6E8F6A', 3); r(208, 77, 14, 10, '#D9B26F', 2);
    } else if (k === 'entry') {
      r(104, 0, 4, 78, '#4A3B30'); r(212, 0, 4, 78, '#4A3B30'); r(100, 76, 120, 6, '#6B5140', 2); r(108, 22, 104, 4, '#6B5140');
      r(118, 82, 14, 26, '#C7B49B', 6); g.appendChild(el('ellipse', { cx: 125, cy: SH - 118, rx: 10, ry: 14, fill: '#6E8F6A' }));
      r(190, 82, 18, 6, '#D9B26F', 2); r(150, 26, 22, 14, '#B79E84', 3);
    }
    return g;
  }
  function layout(list) {
    // نرصّ البراويز في صفوف، بين كل برواز والتاني 6 سم، وأقصى عرض 250 سم
    var d = dims(size), gap = 6, maxW = 230, rows = [[]], rw = 0;
    list.forEach(function (it) {
      var w = d[0];
      if (rows[rows.length - 1].length && rw + gap + w > maxW) { rows.push([]); rw = 0; }
      rw += (rows[rows.length - 1].length ? gap : 0) + w; rows[rows.length - 1].push(it);
    });
    var totW = 0, totH = rows.length * d[1] + (rows.length - 1) * gap, out = [];
    rows.forEach(function (row, ri) {
      var w = row.length * d[0] + (row.length - 1) * gap; totW = Math.max(totW, w);
      row.forEach(function (it, i) { out.push({ it: it, x: -w / 2 + i * (d[0] + gap), y: ri * (d[1] + gap), w: d[0], h: d[1] }); });
    });
    return { items: out, w: totW, h: totH };
  }
  function render() {
    var R = ROOMS.filter(function (x) { return x.k === room; })[0], svg = $('wsvg');
    var wc = wall || R.wall, dark = isDark(wc);
    svg.innerHTML = '';
    var defs = el('defs');
    defs.innerHTML = '<filter id="fsh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0.6" dy="1.6" stdDeviation="1.4" flood-color="#000" flood-opacity="' + (dark ? .55 : .28) + '"/></filter>' +
      '<linearGradient id="wl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".10"/><stop offset="1" stop-color="#000" stop-opacity=".07"/></linearGradient>' +
      '<linearGradient id="gl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/></linearGradient>';
    svg.appendChild(defs);
    if (room === 'mine') {
      if (mine.url) svg.appendChild(el('image', { href: mine.url, x: 0, y: 0, width: SW, height: SH, preserveAspectRatio: 'xMidYMid slice' }));
      else svg.appendChild(el('rect', { x: 0, y: 0, width: SW, height: SH, fill: '#E9E4DC' }));
    } else {
      svg.appendChild(el('rect', { x: 0, y: 0, width: SW, height: SH, fill: wc }));
      svg.appendChild(el('rect', { x: 0, y: 0, width: SW, height: SH, fill: 'url(#wl)' }));
      svg.appendChild(el('rect', { x: 0, y: SH - 10, width: SW, height: 10, fill: dark ? '#1F2629' : '#CDBFAE' }));
      svg.appendChild(el('rect', { x: 0, y: SH - 11, width: SW, height: 1.2, fill: dark ? '#3A464B' : '#F6F1EA' }));
      svg.appendChild(furniture(room));
    }
    var list = [];
    sel.forEach(function (id) { var p = byId(id); if (p) (p.art && p.art.length ? p.art : [p.images[0]]).forEach(function (a) { list.push({ p: p, src: a }); }); });
    $('wempty').hidden = !!list.length;
    if (!list.length) { $('wdim').textContent = ''; $('wwarn').hidden = true; return; }
    var L = layout(list), top = room === 'mine' ? 0 : R.top;
    var cy = Math.max(145, top + 24 + L.h / 2);              // نص البراويز على ارتفاع النظر تقريبًا، وفوق الكنبة بـ 24 سم على الأقل
    if (cy + L.h / 2 > SH - 12) cy = SH - 12 - L.h / 2;
    var g = el('g', { id: 'wfr' }), ox = SW / 2, oy = SH - cy - L.h / 2;
    var fw = frameType() ? 1.8 : 0, fc = color === 'أبيض' ? '#F7F6F3' : '#161616';
    L.items.forEach(function (b, i) {
      var x = ox + b.x, y = oy + b.y, cid = 'c' + i;
      var fr = el('g', { filter: 'url(#fsh)' });
      if (frameType()) {
        var mat = Math.max(1.5, b.w * 0.08);
        fr.appendChild(el('rect', { x: x, y: y, width: b.w, height: b.h, fill: fc }));
        fr.appendChild(el('rect', { x: x + fw, y: y + fw, width: b.w - 2 * fw, height: b.h - 2 * fw, fill: '#FBFAF7' }));
        var ax = x + fw + mat, ay = y + fw + mat, aw = b.w - 2 * (fw + mat), ah = b.h - 2 * (fw + mat);
      } else {
        fr.appendChild(el('rect', { x: x + .8, y: y + .8, width: b.w, height: b.h, fill: '#8B6B3E' }));
        ax = x; ay = y; aw = b.w; ah = b.h;
      }
      var cp = el('clipPath', { id: cid }, [el('rect', { x: ax, y: ay, width: aw, height: ah })]);
      defs.appendChild(cp);
      var im = el('image', { x: ax, y: ay, width: aw, height: ah, preserveAspectRatio: 'xMidYMid slice', 'clip-path': 'url(#' + cid + ')' });
      RQ.img(b.it.src).then(function (u) { if (u) im.setAttribute('href', u); });
      fr.appendChild(im);
      fr.appendChild(el('rect', { x: x, y: y, width: b.w, height: b.h, fill: 'url(#gl)' }));
      g.appendChild(fr);
    });
    // خط المقاس فوق البراويز
    var my = oy - 7, mx1 = ox - L.w / 2, mx2 = ox + L.w / 2, lc = room === 'mine' ? '#fff' : (dark ? '#E8E2D8' : '#5C4A35');
    var dim = el('g', { 'class': 'wdimln' });
    dim.appendChild(el('line', { x1: mx1, y1: my, x2: mx2, y2: my, stroke: lc, 'stroke-width': .5 }));
    dim.appendChild(el('line', { x1: mx1, y1: my - 2, x2: mx1, y2: my + 2, stroke: lc, 'stroke-width': .5 }));
    dim.appendChild(el('line', { x1: mx2, y1: my - 2, x2: mx2, y2: my + 2, stroke: lc, 'stroke-width': .5 }));
    var tx = el('text', { x: ox, y: my - 2.2, 'text-anchor': 'middle', 'font-size': 6, fill: lc, 'font-weight': 700 }); tx.textContent = '≈ ' + Math.round(L.w) + ' سم';
    var bgw = 26; dim.insertBefore(el('rect', { x: ox - bgw / 2, y: my - 8.5, width: bgw, height: 8, rx: 4, fill: room === 'mine' ? '#0008' : (dark ? '#0006' : '#fffc') }), dim.firstChild);
    dim.appendChild(tx); g.appendChild(dim);
    if (room === 'mine') g.setAttribute('transform', 'translate(' + mine.dx + ' ' + mine.dy + ') translate(' + SW / 2 + ' ' + SH / 2 + ') scale(' + mine.scale + ') translate(' + (-SW / 2) + ' ' + (-SH / 2) + ')');
    svg.appendChild(g);
    $('wdim').textContent = list.length + (list.length === 1 ? ' لوحة' : ' لوحات') + ' · \u2066' + size + '\u2069 سم · ' + (frameType() ? 'برواز ' + color : 'تابلوه من غير برواز');
    var tooBig = room !== 'mine' && (cy - L.h / 2 < top + 4 || L.w > SW - 10);
    $('wwarn').hidden = !tooBig;
  }
  function isDark(c) { var m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(c || ''); if (!m) return false; return (parseInt(m[1], 16) * 299 + parseInt(m[2], 16) * 587 + parseInt(m[3], 16) * 114) / 1000 < 110; }

  /* ---------- الغرف والألوان ---------- */
  function paintRooms() {
    $('rooms').innerHTML = ROOMS.map(function (r) { return '<button type="button" data-r="' + r.k + '" class="' + (r.k === room ? 'on' : '') + '">' + r.t + '</button>'; }).join('');
    var R = ROOMS.filter(function (x) { return x.k === room; })[0], cur = wall || R.wall;
    $('swatches').innerHTML = WALLS.map(function (c) { return '<button type="button" data-c="' + c + '" style="background:' + c + '" class="' + (c.toLowerCase() === cur.toLowerCase() ? 'on' : '') + '" aria-label="لون الحيطة"></button>'; }).join('');
    $('wcolor').value = cur;
    $('wcolBox').hidden = room === 'mine'; $('mineBox').hidden = room !== 'mine';
    $('wvNote').textContent = room === 'mine' ? 'صوّر حيطتك من قدام وبعيد شوية، وحرّك البراويز بصباعك أو بالماوس.' : ({ living: 'الكنبة عرضها حوالي 2.2 متر، عشان تتخيل المقاس.', bed: 'السرير عرضه 1.8 متر، عشان تتخيل المقاس.', office: 'المكتب عرضه 1.5 متر تقريبًا.', entry: 'الكونسول عرضه 1.2 متر تقريبًا.' })[room];
  }
  function saveWall() { try { localStorage.setItem('rq_wall', JSON.stringify({ wall: wall, room: room })); } catch (e) {} }
  $('rooms').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; room = b.dataset.r; paintRooms(); render(); saveWall(); });
  $('swatches').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; wall = b.dataset.c; paintRooms(); render(); saveWall(); });
  $('wcolor').addEventListener('input', function () { wall = this.value; render(); [].forEach.call($('swatches').children, function (b) { b.className = ''; }); });
  $('wcolor').addEventListener('change', saveWall);
  $('mineFile').addEventListener('change', function () {
    var f = this.files && this.files[0]; if (!f) return;
    if (mine.url) URL.revokeObjectURL(mine.url);
    mine.url = URL.createObjectURL(f); mine.dx = 0; mine.dy = 0; render();
    $('mineLbl').textContent = 'غيّر الصورة';
  });
  $('mineScale').addEventListener('input', function () { mine.scale = Number(this.value) / 100; render(); });
  (function drag() {
    var svg = $('wsvg'), st = null;
    function pt(e) { var r = svg.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * SW, y: (e.clientY - r.top) / r.height * SH }; }
    svg.addEventListener('pointerdown', function (e) { if (room !== 'mine' || !sel.length) return; st = { p: pt(e), dx: mine.dx, dy: mine.dy }; svg.setPointerCapture(e.pointerId); });
    svg.addEventListener('pointermove', function (e) { if (!st) return; var p = pt(e); mine.dx = st.dx + p.x - st.p.x; mine.dy = st.dy + p.y - st.p.y; var g = $('wfr'); if (g) g.setAttribute('transform', 'translate(' + mine.dx + ' ' + mine.dy + ') translate(' + SW / 2 + ' ' + SH / 2 + ') scale(' + mine.scale + ') translate(' + (-SW / 2) + ' ' + (-SH / 2) + ')'); });
    svg.addEventListener('pointerup', function () { st = null; });
    svg.addEventListener('pointercancel', function () { st = null; });
  })();

  /* ---------- الشريط اللي تحت: المقاس واللون والسعر ---------- */
  function total() { return sel.reduce(function (a, id) { var p = byId(id), v = p && variantFor(p, type, size); return a + (v ? v.price : 0); }, 0); }
  function paintBar() {
    var on = sel.length > 0;
    $('setbar').hidden = !on; document.body.classList.toggle('sb-on', on);
    if (!on) return;
    $('sbThumbs').innerHTML = sel.map(function (id) { var p = byId(id); return p ? '<button type="button" data-id="' + esc(id) + '" aria-label="شيل ' + esc(p.name) + '"><img data-src="' + esc(p.images[0] || '') + '" alt=""><i>×</i></button>' : ''; }).join('');
    RQ.lazy($('sbThumbs'));
    var n = selPieces();
    $('sbCount').textContent = 'اخترت ' + sel.length + (sel.length === 1 ? ' تصميم' : ' تصميمات') + (n > sel.length ? ' (' + n + ' قطع)' : '');
    var T = types();
    $('sbType').innerHTML = T.length > 1 ? T.map(function (t) { return '<button type="button" data-t="' + esc(t) + '" class="' + (t === type ? 'on' : '') + '">' + (/برواز/.test(t) ? 'ببرواز' : 'تابلوه من غير برواز') + '</button>'; }).join('') : '';
    $('sbSize').innerHTML = sizes().map(function (s) {
      var ok = okSize(s);
      return '<button type="button" data-s="' + esc(s) + '" class="' + (s === size ? 'on' : '') + '"' + (ok ? '' : ' disabled title="مش متاح لكل اللي اخترته"') + '><bdi dir="ltr">' + esc(s) + '</bdi></button>';
    }).join('');
    var anyC = frameType() && sel.some(function (id) { var p = byId(id); return p && p.choices.length; });
    $('sbColor').innerHTML = anyC ? ['أسود', 'أبيض'].map(function (c) { return '<button type="button" data-c="' + c + '" class="' + (c === color ? 'on' : '') + '"><i style="background:' + (c === 'أبيض' ? '#fff' : '#161616') + '"></i>' + c + '</button>'; }).join('') : '';
    $('sbTotal').textContent = fmt(total()) + ' ج';
    var was = sel.reduce(function (a, id) { var p = byId(id), v = p && variantFor(p, type, size); return a + (v ? Math.max(v.was || 0, v.price) : 0); }, 0);
    $('sbWas').textContent = was > total() ? fmt(was) + ' ج' : '';
  }
  $('sbThumbs').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) toggle(b.dataset.id); });
  $('sbType').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; type = b.dataset.t; fixSize(); render(); paintBar(); });
  $('sbSize').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b || b.disabled) return; size = b.dataset.s; render(); paintBar(); });
  $('sbColor').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; color = b.dataset.c; render(); paintBar(); });
  function addAll(go) {
    var bad = 0;
    sel.forEach(function (id) {
      var p = byId(id), v = p && variantFor(p, type, size); if (!v) { bad++; return; }
      var item = { pid: p.id, name: p.name, cat: p.category || '', img: (!frameType() && p.images.filter(function (s) { return /\/tab-/.test(s); })[0]) || p.images[0] || '', variant: v.name,
        choice: frameType() && p.choices.length ? (p.choices.indexOf(color) >= 0 ? color : p.choices[0]) : '', qty: 1, price: v.price, custom: '' };
      if (!RQ.cart.add(item)) bad++;
    });
    if (bad) { alert('في حاجة ماتضافتش للسلة. جرّب تاني أو كلمنا على واتساب.'); return; }
    if (window.fbq) try { fbq('track', 'AddToCart', { value: total(), currency: 'EGP', content_ids: sel.slice(), content_type: 'product' }); } catch (e) {}
    if (go) { location.href = 'cart.html'; return; }
    flash('✓ اتضافوا للسلة. <a href="cart.html">كمّل الطلب</a>');
  }
  $('sbAdd').onclick = function () { addAll(false); };
  $('sbBuy').onclick = function () { addAll(true); };

  /* ---------- الكروت: دوسة = تضيف / تشيل ---------- */
  $('grid').addEventListener('click', function (e) {
    if (e.target.closest('a')) return;
    var c = e.target.closest('.wcard[data-id]'); if (c) toggle(c.dataset.id);
  });
  $('grid').addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return; var c = e.target.closest('.wcard[data-id]'); if (c) { e.preventDefault(); toggle(c.dataset.id); }
  });
  $('subs').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return; sub = b.dataset.s;
    history.replaceState(null, '', sub ? '?sub=' + encodeURIComponent(sub) : location.pathname); paintSubs(); paintGrid();
  });
  sub = q.get('sub') || '';

  paintRooms(); render();
  var key = '';
  RQ.products(function (list) {
    all = list;
    prods = list.filter(function (p) { return !RQ.isCase(p) && !p.allowUpload; });
    var k = prods.map(function (p) { return p.id + p.images[0] + RQ.fromPrice(p) + (p.art || []).join(); }).join();
    sel = sel.filter(byId);
    if (wantAdd && byId(wantAdd) && sel.indexOf(wantAdd) < 0) { sel.push(wantAdd); var t0 = typeOf((byId(wantAdd).variants[0] || {}).name || ''); if (q.get('type')) type = q.get('type'); }
    var jump = !!wantAdd && location.hash === '#wall';
    wantAdd = '';
    fixSize();
    if (k !== key) { key = k; paintSubs(); paintGrid(); }
    markCards(); render(); paintBar();
    if (jump) setTimeout(function () { $('wall').scrollIntoView({ block: 'start' }); }, 60);
  }).catch(function () {
    if (!key) $('grid').innerHTML = '<div class="empty" style="grid-column:1/-1">حصلت مشكلة في التحميل. <a href="">جرّب تاني</a></div>';
  });
})();
