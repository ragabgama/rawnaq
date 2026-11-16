/* رونق: تلوين حيطة في صورة حقيقية مع الحفاظ على الإضاءة والظلال */
(function () {
  // seeds: نقط على الحيطة [x,y]، box: حدود الحيطة [x1,y1,x2,y2]
  function lum(r, g, b) { return 0.299 * r + 0.587 * g + 0.114 * b; }
  function buildMask(data, W, H, seeds, box, inc, exc) {
    var N = W * H, L = new Float32Array(N), mask = new Uint8Array(N), seen = new Uint8Array(N), stack = [];
    for (var p = 0, i = 0; p < N; p++, i += 4) L[p] = lum(data[i], data[i + 1], data[i + 2]);
    // حدود الأثاث = تغيّر واضح في الإضاءة (Sobel على صورة متنعّمة شوية)
    var B = new Float32Array(N);
    for (var y = 1; y < H - 1; y++) for (var x = 1; x < W - 1; x++) { var q = y * W + x; B[q] = (L[q] * 4 + L[q - 1] + L[q + 1] + L[q - W] + L[q + W]) / 8; }
    var E = new Float32Array(N);
    for (y = 2; y < H - 2; y++) for (x = 2; x < W - 2; x++) {
      q = y * W + x;
      var gx = B[q - W + 1] + 2 * B[q + 1] + B[q + W + 1] - B[q - W - 1] - 2 * B[q - 1] - B[q + W - 1];
      var gy = B[q + W - 1] + 2 * B[q + W] + B[q + W + 1] - B[q - W - 1] - 2 * B[q - W] - B[q - W + 1];
      E[q] = Math.sqrt(gx * gx + gy * gy);
    }
    var sr = 0, sg = 0, sb = 0, n = 0;
    seeds.forEach(function (s) { for (var dy = -3; dy <= 3; dy++) for (var dx = -3; dx <= 3; dx++) { var i = ((s[1] + dy) * W + s[0] + dx) * 4; sr += data[i]; sg += data[i + 1]; sb += data[i + 2]; n++; } });
    sr /= n; sg /= n; sb /= n;
    var sl = lum(sr, sg, sb) || 1, cr = sr / sl, cg = sg / sl, cb = sb / sl;
    function okPix(p) {
      if (E[p] > 26) return false;
      var i = p * 4, r = data[i], g = data[i + 1], b = data[i + 2], l = L[p];
      if (l < sl * 0.5) return false;
      return Math.abs(r / l - cr) + Math.abs(g / l - cg) + Math.abs(b / l - cb) < 0.2;
    }
    seeds.forEach(function (s) { var p = s[1] * W + s[0]; if (!seen[p]) { seen[p] = 1; stack.push(p); } });
    while (stack.length) {
      var p0 = stack.pop(); mask[p0] = 255;
      var x0 = p0 % W, y0 = (p0 - x0) / W;
      var ns = [x0 > box[0] ? p0 - 1 : -1, x0 < box[2] ? p0 + 1 : -1, y0 > box[1] ? p0 - W : -1, y0 < box[3] ? p0 + W : -1];
      for (var k = 0; k < 4; k++) { var q2 = ns[k]; if (q2 >= 0 && !seen[q2]) { seen[q2] = 1; if (Math.abs(L[q2] - L[p0]) < 8 && okPix(q2)) stack.push(q2); } }
    }
    // نوسّع القناع بيكسل لحد الحرف عشان مايبقاش فيه خط أبيض حوالين الأثاث
    var grow = new Uint8Array(N);
    for (y = 1; y < H - 1; y++) for (x = 1; x < W - 1; x++) { q = y * W + x; if (mask[q] || ((mask[q - 1] || mask[q + 1] || mask[q - W] || mask[q + W]) && E[q] < 40 && L[q] > sl * 0.5)) grow[q] = 255; }
    mask = grow;
    function rects(list, v) { (list || []).forEach(function (r) { for (var yy = r[1]; yy < r[3]; yy++) for (var xx = r[0]; xx < r[2]; xx++) mask[yy * W + xx] = v; }); }
    rects(inc, 255); rects(exc, 0);
    // نقفل الثقوب الصغيرة وننعّم الحروف
    var soft = new Uint8Array(W * H);
    for (y = 1; y < H - 1; y++) for (x = 1; x < W - 1; x++) {
      var p = y * W + x, s = 0;
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) s += mask[p + dy * W + dx];
      soft[p] = s / 9;
    }
    // الإضاءة المرجعية = أفتح جزء في الحيطة
    var ls = [];
    for (var p2 = 0; p2 < W * H; p2 += 37) if (mask[p2]) { var i2 = p2 * 4; ls.push(lum(data[i2], data[i2 + 1], data[i2 + 2])); }
    ls.sort(function (a, b) { return a - b; });
    return { mask: soft, ref: ls.length ? ls[Math.floor(ls.length * 0.97)] : sl };
  }
  function hex(c) { var m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(c); return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null; }

  /* RQ.paintRoom(src, seeds, box) → وعد فيه paint(color) بيرجّع لينك صورة متلونة */
  window.RQpaintRoom = function (src, seeds, box, inc, exc) {
    return new Promise(function (ok, bad) {
      var im = new Image();
      im.onload = function () {
        var W = im.naturalWidth, H = im.naturalHeight, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
        var cx = cv.getContext('2d'); cx.drawImage(im, 0, 0);
        var base = cx.getImageData(0, 0, W, H), M = buildMask(base.data, W, H, seeds, box, inc, exc);
        var out = cx.createImageData(W, H);
        ok(function paint(color) {
          var t = hex(color); if (!t) return src;
          var a = base.data, o = out.data, mk = M.mask, ref = M.ref;
          for (var p = 0, i = 0; p < W * H; p++, i += 4) {
            var m = mk[p];
            if (!m) { o[i] = a[i]; o[i + 1] = a[i + 1]; o[i + 2] = a[i + 2]; o[i + 3] = 255; continue; }
            var sh = lum(a[i], a[i + 1], a[i + 2]) / ref; if (sh > 1.06) sh = 1.06;
            var f = m / 255, r = t[0] * sh, g = t[1] * sh, b = t[2] * sh;
            o[i] = a[i] + (r - a[i]) * f; o[i + 1] = a[i + 1] + (g - a[i + 1]) * f; o[i + 2] = a[i + 2] + (b - a[i + 2]) * f; o[i + 3] = 255;
          }
          cx.putImageData(out, 0, 0);
          return cv.toDataURL('image/jpeg', 0.9);
        });
      };
      im.onerror = bad;
      im.src = src;
    });
  };
})();
