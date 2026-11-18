/* Inspección Visual PWA — Service Worker
   Estrategia: Cache First para el app shell (requisito de la práctica).
   Sube el número de versión de CACHE para invalidar el precache. */

'use strict';

var CACHE_NOMBRE = 'inspeccion-visual-v2';

var APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NOMBRE)
      .then(function (cache) {
        return cache.addAll(APP_SHELL);
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (claves) {
        return Promise.all(claves.map(function (clave) {
          if (clave === CACHE_NOMBRE) {
            return Promise.resolve();
          }
          return caches.delete(clave);
        }));
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', function (event) {
  var solicitud = event.request;

  if (solicitud.method !== 'GET') {
    return;
  }

  var url = new URL(solicitud.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(solicitud, { ignoreSearch: true })
      .then(function (enCache) {
        if (enCache) {
          return enCache;
        }

        return fetch(solicitud)
          .then(function (respuesta) {
            if (respuesta && respuesta.ok) {
              var copia = respuesta.clone();
              caches.open(CACHE_NOMBRE).then(function (cache) {
                cache.put(solicitud, copia);
              });
            }
            return respuesta;
          })
          .catch(function () {
            if (solicitud.mode === 'navigate') {
              return caches.match('./index.html');
            }
            return new Response('', {
              status: 504,
              statusText: 'Sin conexión'
            });
          });
      })
      .then(function (respuesta) {
        if (respuesta) {
          return respuesta;
        }
        // Último recurso: si el shell no está en caché, al menos devolvemos algo válido.
        return new Response('Recurso no disponible sin conexión.', {
          status: 504,
          statusText: 'Sin conexión',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })
  );
});
