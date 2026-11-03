/* Iodine superfile helper. index.html unpacks each Iodine version into this browser's
   cache; this worker serves those files at ./__vfs/<version>/... so every version runs
   at real paths, exactly like it did on its own site.
   Each deploy ships a new BUILD, so this worker updates, deletes every cache from older
   builds, and only ever serves the current build — a redeploy can't leave stale files. */
'use strict';
var BUILD = '238a0eae67c7';
var PREFIX = 'iodine-vfs-';
var CURRENT = PREFIX + BUILD + '-';

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.map(function (n) {
        if (n.indexOf(PREFIX) === 0 && n.indexOf(CURRENT) !== 0) return caches.delete(n);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin || e.request.method !== 'GET') return;
  var scope = new URL(self.registration.scope).pathname;
  if (url.pathname.indexOf(scope + '__vfs/') !== 0) return;
  e.respondWith(serve(e.request, url, scope));
});

/* only the current build's caches, newest first */
function currentCaches() {
  return caches.keys().then(function (names) {
    return names.filter(function (n) { return n.indexOf(CURRENT) === 0; }).reverse();
  });
}
function lookup(key) {
  return currentCaches().then(function (names) {
    return (function next(i) {
      if (i >= names.length) return undefined;
      return caches.open(names[i]).then(function (c) { return c.match(key); })
        .then(function (r) { return r || next(i + 1); });
    })(0);
  });
}

function serve(req, url, scope) {
  var key = url.origin + url.pathname;
  return lookup(key).then(function (res) {
    if (!res && /\/$/.test(url.pathname)) return lookup(key + 'index.html');
    return res;
  }).then(function (res) {
    if (!res) {
      /* not unpacked on this device yet (fresh browser, cleared storage, or a new build):
         send navigations back to the launcher, which unpacks the right version and returns */
      if (req.mode === 'navigate') {
        var ver = url.pathname.slice((scope + '__vfs/').length).split('/')[0];
        return Response.redirect(scope + '?open=' + encodeURIComponent(ver), 302);
      }
      return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
    }
    var range = req.headers.get('range');
    if (!range) return res;
    return res.blob().then(function (blob) {
      var m = /bytes=(\d*)-(\d*)/.exec(range), size = blob.size;
      var start = m && m[1] ? +m[1] : 0, end = m && m[2] ? Math.min(+m[2], size - 1) : size - 1;
      if (m && !m[1] && m[2]) { start = Math.max(0, size - +m[2]); end = size - 1; }
      if (start >= size || start > end) {
        return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
      }
      var h = new Headers(res.headers);
      h.set('Content-Range', 'bytes ' + start + '-' + end + '/' + size);
      h.set('Content-Length', String(end - start + 1));
      h.set('Accept-Ranges', 'bytes');
      return new Response(blob.slice(start, end + 1), { status: 206, statusText: 'Partial Content', headers: h });
    });
  }).catch(function () {
    return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  });
}
