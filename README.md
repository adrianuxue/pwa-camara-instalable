# Inspección Visual PWA

PWA instalable con acceso ético a la cámara (pre-permiso) y alternancia entre lente
trasera y frontal. JavaScript vanilla, sin `async/await` y sin librerías externas.

## Estructura

```
pwa-camara-instalable/
├── index.html
├── styles.css
├── app.js
├── sw.js
├── manifest.json
├── icons/
│   ├── icon-192.png   (192x192 exactos)
│   └── icon-512.png   (512x512 exactos)
├── .nojekyll
└── README.md
```

## Probar en local

La API de cámara y el Service Worker exigen contexto seguro: `localhost` o HTTPS.
Abrir `index.html` con doble clic (`file://`) **no** funciona.

```powershell
# Opción A: Python (viene instalado en la mayoría de equipos)
python -m http.server 8000

# Opción B: Node
npx serve .
```

Luego abre `http://localhost:8000` en el navegador.

## Publicar en GitHub Pages

```powershell
git init
git add .
git commit -m "feat: pwa instalable con camara y pre-permiso"
git branch -M main
git remote add origin https://github.com/<TU-USUARIO>/pwa-camara-instalable.git
git push -u origin main
```

En GitHub: **Settings → Pages → Source: Deploy from a branch → Branch: `main` / `/ (root)` → Save**.

La URL queda como `https://<TU-USUARIO>.github.io/pwa-camara-instalable/`.
Todas las rutas del proyecto son relativas (`./`), así que funcionan dentro del subdirectorio.

## Checklist de verificación antes de clase

### Escritorio (DevTools)

- `F12 → Application → Manifest`: sin errores, ambos iconos cargan (192 y 512).
- `Application → Service Workers`: `sw.js` en estado *activated and is running*.
- `Application → Manifest → Installability`: sin advertencias de instalación.
- `Lighthouse → PWA`: auditoría sin fallos críticos.

### Teléfono (Android / Chrome)

1. Abrir la URL HTTPS e instalar con el botón **Instalar aplicación**.
2. Verificar que abre en ventana propia (`standalone`), sin barra de direcciones.
3. Pulsar **Solicitar acceso a la cámara** → aparece el aviso ético **antes** del diálogo nativo.
4. Confirmar, comprobar la vista previa y alternar entre trasera y frontal.
5. Pulsar **Apagar cámara** y confirmar que el LED/indicador del sensor se apaga.

### iPhone (iOS / Safari)

- Safari no dispara `beforeinstallprompt`: el botón de instalación queda oculto y en su lugar
  aparece la guía **Compartir → Agregar a inicio**.
- El `<video>` incluye `autoplay playsinline muted`; sin `playsinline`, iOS abre el reproductor
  a pantalla completa y oculta los botones.
- Safari y la app instalada **no comparten permisos**: el aviso de pre-permiso vuelve a
  aparecer en la app instalada (comportamiento esperado de WebKit).
- Al alternar lentes, `detenerCamaraActiva()` ejecuta `track.stop()` antes de pedir el nuevo
  sensor; sin eso, WebKit rechaza la promesa con `NotReadableError`.

## Notas técnicas

- **Iconos:** PNG reales de 192x192 y 512x512, generados con fondo full-bleed y glifo dentro
  de la zona segura para que `purpose: "any maskable"` no recorte el dibujo. Si los reemplazas,
  mantén exactamente esas dimensiones: Chrome rechaza la instalación si no coinciden.
- **Pre-permiso:** ningún `getUserMedia()` se ejecuta al cargar. El primer clic solo muestra la
  tarjeta informativa; el segundo confirma y dispara la API. Así se evita el bloqueo permanente
  del permiso por desconfianza.
- **Cache First:** el Service Worker precachea `./`, `index.html`, `styles.css`, `app.js`,
  `manifest.json` y ambos iconos. Para publicar cambios, incrementa `CACHE_NOMBRE` en `sw.js`.
- **Fotos:** la captura se genera con `<canvas>` y `toDataURL()` en memoria; no se sube a
  ningún servidor.
