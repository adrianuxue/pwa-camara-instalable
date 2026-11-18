/* Inspección Visual PWA — lógica de instalación y cámara.
   Requisitos de la práctica:
   - JavaScript vanilla, sin librerías externas.
   - Asincronía resuelta únicamente con .then() / .catch() / .finally(). */

(function () {
  'use strict';

  /* ---------------------------------------------------------------------------
     Referencias del DOM
     --------------------------------------------------------------------------- */
  var visor = document.getElementById('visor-camara');
  var placeholder = document.getElementById('visor-placeholder');
  var mensajeEstado = document.getElementById('mensaje-estado');
  var lenteActiva = document.getElementById('lente-activa');

  var btnPreparar = document.getElementById('btn-preparar-camara');
  var btnAlternar = document.getElementById('btn-alternar-camara');
  var btnApagar = document.getElementById('btn-apagar-camara');
  var btnCapturar = document.getElementById('btn-capturar');

  var avisoPermiso = document.getElementById('aviso-permiso');
  var btnConfirmar = document.getElementById('btn-confirmar-permiso');
  var btnCancelar = document.getElementById('btn-cancelar-permiso');

  var btnInstalar = document.getElementById('btn-instalar');
  var instruccionesIOS = document.getElementById('instrucciones-ios');
  var chipSW = document.getElementById('estado-sw');

  var resultadoCaptura = document.getElementById('resultado-captura');
  var fotoCapturada = document.getElementById('foto-capturada');
  var enlaceDescarga = document.getElementById('enlace-descarga');

  /* ---------------------------------------------------------------------------
     Estado de la aplicación
     --------------------------------------------------------------------------- */
  var streamActual = null;
  var modoCamaraActual = 'environment'; // 'environment' = trasera | 'user' = frontal
  var eventoInstalacionDiferido = null;

  /* ---------------------------------------------------------------------------
     Utilidades de interfaz
     --------------------------------------------------------------------------- */
  function setEstado(texto, tono) {
    if (!mensajeEstado) {
      return;
    }
    mensajeEstado.textContent = texto;
    mensajeEstado.setAttribute('data-tono', tono || 'neutral');
  }

  function nombreLente(modo) {
    return modo === 'user' ? 'Frontal' : 'Trasera';
  }

  function actualizarEtiquetaLente() {
    if (lenteActiva) {
      lenteActiva.textContent = nombreLente(modoCamaraActual);
    }
  }

  function actualizarControles(activa) {
    btnPreparar.hidden = activa;
    btnAlternar.hidden = !activa;
    btnApagar.hidden = !activa;
    btnCapturar.hidden = !activa;
    if (lenteActiva) {
      lenteActiva.hidden = !activa;
    }
    placeholder.hidden = activa;
  }

  /* ---------------------------------------------------------------------------
     Hardware: liberación y encendido del sensor
     --------------------------------------------------------------------------- */

  // Nunca se solicita un lente nuevo sin liberar antes el anterior: en móviles,
  // el sistema operativo rechaza la segunda promesa si el sensor sigue activo.
  function detenerCamaraActiva() {
    if (streamActual) {
      streamActual.getTracks().forEach(function (track) {
        track.stop();
      });
      streamActual = null;
    }
    if (visor && visor.srcObject) {
      visor.srcObject = null;
    }
  }

  function describirError(error) {
    var nombre = (error && error.name) || 'ErrorDesconocido';

    switch (nombre) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return 'Permiso denegado. Actívalo en los ajustes del navegador (en iPhone: Ajustes › Safari › Cámara) y vuelve a intentarlo.';
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'No se detectó el sensor de cámara solicitado en este dispositivo.';
      case 'NotReadableError':
      case 'TrackStartError':
        return 'El sensor está ocupado por otra aplicación o el sistema lo bloqueó. Cierra otras apps que usen la cámara e inténtalo de nuevo.';
      case 'OverconstrainedError':
      case 'ConstraintNotSatisfiedError':
        return 'Este dispositivo no ofrece la cámara solicitada. Prueba con la otra lente.';
      case 'SecurityError':
      case 'TypeError':
        return 'El navegador bloqueó la cámara por seguridad: esta API solo funciona en HTTPS o en localhost.';
      case 'AbortError':
        return 'El sistema canceló la activación de la cámara. Inténtalo otra vez.';
      default:
        return 'Error al acceder al hardware: ' + ((error && error.message) || nombre) + '.';
    }
  }

  function iniciarCamara(modo) {
    detenerCamaraActiva();

    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      actualizarControles(false);
      setEstado('Este navegador no expone la cámara. Abre la app por HTTPS (GitHub Pages) o en localhost.', 'error');
      return Promise.resolve();
    }

    var restricciones = {
      audio: false,
      // "ideal" evita OverconstrainedError en equipos sin doble lente.
      video: { facingMode: { ideal: modo } }
    };

    btnPreparar.disabled = true;
    btnConfirmar.disabled = true;
    setEstado('Solicitando acceso al sensor…', 'info');

    return navigator.mediaDevices.getUserMedia(restricciones)
      .then(function (stream) {
        streamActual = stream;
        visor.srcObject = stream;

        var reproduccion = visor.play();
        if (reproduccion && typeof reproduccion.catch === 'function') {
          // En iOS play() puede rechazar hasta que exista una interacción; no es fatal.
          reproduccion.catch(function () {});
        }

        // Reflejamos la lente real entregada por el sistema, no solo la solicitada.
        var pista = stream.getVideoTracks()[0];
        var ajustes = (pista && typeof pista.getSettings === 'function') ? pista.getSettings() : {};
        if (ajustes.facingMode === 'user' || ajustes.facingMode === 'environment') {
          modoCamaraActual = ajustes.facingMode;
        }

        actualizarEtiquetaLente();
        actualizarControles(true);
        setEstado('Cámara activa (' + nombreLente(modoCamaraActual).toLowerCase() + '). El video se procesa solo en tu dispositivo.', 'ok');
      })
      .catch(function (error) {
        detenerCamaraActiva();
        actualizarControles(false);
        setEstado(describirError(error), 'error');
      })
      .finally(function () {
        btnPreparar.disabled = false;
        btnConfirmar.disabled = false;
      });
  }

  function apagarCamara() {
    detenerCamaraActiva();
    actualizarControles(false);
    setEstado('Cámara apagada. El sensor quedó liberado.', 'neutral');
  }

  function alternarCamara() {
    modoCamaraActual = modoCamaraActual === 'environment' ? 'user' : 'environment';
    actualizarEtiquetaLente();
    setEstado('Cambiando a cámara ' + nombreLente(modoCamaraActual).toLowerCase() + '…', 'info');
    iniciarCamara(modoCamaraActual);
  }

  /* ---------------------------------------------------------------------------
     Captura local (la imagen nunca sale del dispositivo)
     --------------------------------------------------------------------------- */
  function capturarFoto() {
    if (!streamActual || !visor.videoWidth || !visor.videoHeight) {
      setEstado('Enciende la cámara antes de capturar.', 'info');
      return;
    }

    var ancho = visor.videoWidth;
    var alto = visor.videoHeight;
    var lienzo = document.createElement('canvas');
    lienzo.width = ancho;
    lienzo.height = alto;

    var contexto = lienzo.getContext('2d');
    contexto.drawImage(visor, 0, 0, ancho, alto);

    var datos;
    try {
      datos = lienzo.toDataURL('image/jpeg', 0.92);
    } catch (error) {
      setEstado('No se pudo generar la captura: ' + error.message, 'error');
      return;
    }

    fotoCapturada.src = datos;
    fotoCapturada.alt = 'Fotografía capturada desde la cámara ' + nombreLente(modoCamaraActual).toLowerCase();
    enlaceDescarga.href = datos;
    enlaceDescarga.download = 'evidencia-' + Date.now() + '.jpg';
    resultadoCaptura.hidden = false;
    setEstado('Captura generada localmente. Puedes descargarla o repetirla.', 'ok');

    if (typeof resultadoCaptura.scrollIntoView === 'function') {
      resultadoCaptura.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /* ---------------------------------------------------------------------------
     Instalación (beforeinstallprompt) y detección de iOS
     --------------------------------------------------------------------------- */
  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    eventoInstalacionDiferido = event;
    if (btnInstalar) {
      btnInstalar.hidden = false;
    }
  });

  if (btnInstalar) {
    btnInstalar.addEventListener('click', function () {
      if (!eventoInstalacionDiferido) {
        return;
      }

      var evento = eventoInstalacionDiferido;
      eventoInstalacionDiferido = null;
      btnInstalar.disabled = true;
      btnInstalar.hidden = true;

      evento.prompt();

      evento.userChoice
        .then(function (resultado) {
          if (resultado && resultado.outcome === 'accepted') {
            setEstado('Instalación aceptada. Busca el icono de Inspección Visual en tu pantalla de inicio.', 'ok');
          } else {
            setEstado('Instalación cancelada. Puedes retomarla desde el menú del navegador.', 'info');
          }
        })
        .catch(function (error) {
          setEstado('No se pudo completar la instalación: ' + ((error && error.message) || 'error desconocido') + '.', 'error');
        })
        .finally(function () {
          btnInstalar.disabled = false;
        });
    });
  }

  window.addEventListener('appinstalled', function () {
    eventoInstalacionDiferido = null;
    if (btnInstalar) {
      btnInstalar.hidden = true;
    }
    if (instruccionesIOS) {
      instruccionesIOS.hidden = true;
    }
    setEstado('Aplicación instalada. Ábrela desde el icono para usarla en modo standalone.', 'ok');
  });

  function verificarEntornoIOS() {
    var esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    var estaInstalada = window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;

    if (!esIOS) {
      return;
    }

    // Safari en iOS nunca dispara beforeinstallprompt: el botón jamás aparecería.
    if (btnInstalar) {
      btnInstalar.hidden = true;
    }

    if (!estaInstalada && instruccionesIOS) {
      instruccionesIOS.hidden = false;
    }
  }

  /* ---------------------------------------------------------------------------
     Flujo de Pre-Permiso (consentimiento consciente)
     --------------------------------------------------------------------------- */
  if (btnPreparar) {
    btnPreparar.addEventListener('click', function () {
      avisoPermiso.hidden = false;
      setEstado('Lee el aviso y confirma el acceso consciente a la cámara.', 'info');
      // Llevamos el foco y la vista al aviso para que nadie lo pase por alto.
      if (typeof avisoPermiso.scrollIntoView === 'function') {
        avisoPermiso.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      btnConfirmar.focus();
    });
  }

  if (btnConfirmar) {
    btnConfirmar.addEventListener('click', function () {
      avisoPermiso.hidden = true;
      iniciarCamara(modoCamaraActual);
    });
  }

  if (btnCancelar) {
    btnCancelar.addEventListener('click', function () {
      avisoPermiso.hidden = true;
      setEstado('Acceso no solicitado. La cámara sigue apagada y puedes activarla cuando quieras.', 'neutral');
    });
  }

  if (btnAlternar) {
    btnAlternar.addEventListener('click', alternarCamara);
  }

  if (btnApagar) {
    btnApagar.addEventListener('click', apagarCamara);
  }

  if (btnCapturar) {
    btnCapturar.addEventListener('click', capturarFoto);
  }

  /* ---------------------------------------------------------------------------
     Liberación del sensor al salir de la app (ética de recursos)
     --------------------------------------------------------------------------- */
  window.addEventListener('pagehide', detenerCamaraActiva);

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && streamActual) {
      detenerCamaraActiva();
      actualizarControles(false);
      setEstado('Cámara liberada al salir de la aplicación.', 'neutral');
    }
  });

  /* ---------------------------------------------------------------------------
     Registro del Service Worker
     --------------------------------------------------------------------------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js')
        .then(function () {
          if (chipSW) {
            chipSW.textContent = 'Offline listo';
            chipSW.hidden = false;
          }
        })
        .catch(function (error) {
          if (chipSW) {
            chipSW.textContent = 'Sin modo offline';
            chipSW.hidden = false;
          }
          if (window.console && console.warn) {
            console.warn('Service Worker no registrado:', error && error.message);
          }
        });
    });
  }

  /* ---------------------------------------------------------------------------
     Arranque
     --------------------------------------------------------------------------- */
  actualizarControles(false);
  actualizarEtiquetaLente();
  verificarEntornoIOS();
  setEstado('Listo. Cuando quieras, solicita el acceso a la cámara.', 'neutral');
})();
