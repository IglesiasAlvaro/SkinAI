/**
 * SkinAI — Servicio de Comunicación con la API de FastAPI
 * 
 * Este módulo gestiona de forma aislada las peticiones HTTP hacia el backend:
 * - GET  /health   : Verificación del estado del servidor y del modelo cargado.
 * - POST /predict  : Envío de la imagen en multipart/form-data y recepción de puntuaciones.
 * 
 * Cumple con los requisitos de seguridad: validación local previa de tamaño (<10 MB),
 * control estricto de timeouts mediante AbortController y mapeo exacto de respuestas.
 */

const SkinAIApi = (() => {

  /**
   * Verifica el estado operativo de la API llamando al endpoint GET /health
   * 
   * @param {string} [customBaseUrl] - URL base opcional a consultar
   * @returns {Promise<{ok: boolean, status: number, data?: any, error?: string}>}
   */
  async function checkHealth(customBaseUrl) {
    const baseUrl = customBaseUrl || SkinAIConfig.getApiBaseUrl();
    const targetUrl = `${baseUrl}/health`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000); // 7s timeout para health

    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return {
          ok: true,
          status: response.status,
          data,
          url: targetUrl
        };
      } else {
        return {
          ok: false,
          status: response.status,
          error: `El servidor respondió con código HTTP ${response.status} (${response.statusText || 'Error no especificado'}).`,
          url: targetUrl
        };
      }
    } catch (err) {
      clearTimeout(timeoutId);

      let errorMessage = 'No se pudo establecer conexión con el servidor.';
      if (err.name === 'AbortError') {
        errorMessage = 'Tiempo de espera agotado (Timeout) al consultar GET /health.';
      } else if (err.message && err.message.includes('Failed to fetch')) {
        errorMessage = `No se pudo conectar a "${targetUrl}". Verifica que el servidor FastAPI esté encendido y que tenga CORS habilitado.`;
      } else {
        errorMessage = err.message || errorMessage;
      }

      return {
        ok: false,
        status: 0,
        error: errorMessage,
        url: targetUrl
      };
    }
  }

  /**
   * Envía una imagen al endpoint POST /predict mediante multipart/form-data
   * 
   * @param {File} file - Objeto de archivo de imagen seleccionado por el usuario
   * @param {string} [customBaseUrl] - URL base opcional
   * @returns {Promise<{
   *   success: boolean,
   *   scores: Array<{code: string, score: number, rank: number}>,
   *   modelVersion?: string,
   *   disclaimer?: string,
   *   rawResponse?: any,
   *   error?: string
   * }>}
   */
  async function predictImage(file, customBaseUrl) {
    // 1. Validaciones de integridad previas en el cliente
    if (!file) {
      throw new Error('No se ha proporcionado ningún archivo para el análisis.');
    }

    if (file.size > SkinAIConfig.MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      throw new Error(`El archivo seleccionado tiene un tamaño de ${sizeMB} MB, lo que supera el límite máximo permitido de 10 MB.`);
    }

    const fileType = file.type ? file.type.toLowerCase() : '';
    const fileName = file.name ? file.name.toLowerCase() : '';
    const hasValidExt = SkinAIConfig.ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
    const hasValidMime = SkinAIConfig.ALLOWED_MIME_TYPES.includes(fileType);

    if (!hasValidExt && !hasValidMime) {
      throw new Error('Formato de archivo no compatible. Por favor sube una imagen en formato JPEG, JPG o PNG.');
    }

    const baseUrl = customBaseUrl || SkinAIConfig.getApiBaseUrl();
    const targetUrl = `${baseUrl}/predict`;

    // 2. Construcción de carga útil multipart/form-data
    // Tal como espera FastAPI: file: UploadFile = File(...)
    const formData = new FormData();
    formData.append('file', file, file.name);

    // 3. Petición HTTP con timeout controlado
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SkinAIConfig.REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
          // IMPORTANTE: NO fijar 'Content-Type': el navegador calcula automáticamente
          // multipart/form-data con el delimitador boundary correspondiente.
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Manejo específico de códigos de estado HTTP
      if (!response.ok) {
        let serverErrorDetail = '';
        try {
          const errorJson = await response.json();
          serverErrorDetail = errorJson.detail || errorJson.message || JSON.stringify(errorJson);
        } catch (_) {
          serverErrorDetail = await response.text();
        }

        if (response.status === 413) {
          throw new Error('El servidor rechazó la imagen porque excede el límite de 10 MB (HTTP 413 Payload Too Large).');
        } else if (response.status === 400) {
          throw new Error(`El servidor rechazó la imagen (HTTP 400 Bad Request): ${serverErrorDetail || 'Archivo dañado o formato no soportado por PIL/TensorFlow.'}`);
        } else if (response.status === 500) {
          throw new Error(`Error interno en el backend de FastAPI (HTTP 500): ${serverErrorDetail || 'Fallo durante la ejecución de model.predict().'}`);
        } else {
          throw new Error(`Error de la API (HTTP ${response.status}): ${serverErrorDetail || response.statusText}`);
        }
      }

      // 4. Parseo y normalización de la respuesta
      const jsonResponse = await response.json();
      const parsedData = normalizeInferenceResponse(jsonResponse);

      return {
        success: true,
        scores: parsedData.scores,
        modelVersion: parsedData.modelVersion,
        disclaimer: parsedData.disclaimer,
        rawResponse: jsonResponse,
        source: 'api'
      };

    } catch (err) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        throw new Error(`Tiempo de espera agotado (${SkinAIConfig.REQUEST_TIMEOUT_MS / 1000}s). El backend de FastAPI tardó demasiado en responder.`);
      }

      // Si es un error de conexión de red típico del navegador
      if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
        throw new Error(
          `No se pudo contactar a la API en "${targetUrl}". ` +
          `Asegúrate de que uvicorn esté ejecutándose y de que tu navegador permita la conexión.`
        );
      }

      throw err;
    }
  }

  /**
   * Normaliza la estructura JSON recibida de main.py
   * Soporta tanto { class_scores: {...} } como { predictions: {...} }
   * garantizando que los valores numéricos se ordenen de mayor a menor sin modificarlos.
   */
  function normalizeInferenceResponse(responseJson) {
    if (!responseJson || typeof responseJson !== 'object') {
      throw new Error('La respuesta devuelta por la API no es un objeto JSON válido.');
    }

    // Identificar el campo que contiene el mapa o array de puntuaciones
    let scoresRaw = responseJson.class_scores || responseJson.predictions || responseJson.scores;

    if (!scoresRaw && typeof responseJson === 'object') {
      // Si la API devolvió directamente el diccionario { akiec: 0.05, nv: 0.8, ... }
      const sampleKeys = Object.keys(responseJson);
      const hasDermKeys = sampleKeys.some(k => SkinAIConfig.CLASSES_METADATA[k.toLowerCase()]);
      if (hasDermKeys) {
        scoresRaw = responseJson;
      }
    }

    if (!scoresRaw) {
      throw new Error('La respuesta de la API no contiene los campos esperados "class_scores" ni "predictions".');
    }

    // Convertir a un arreglo ordenado de objetos: [{ code, score }]
    const scoresArray = [];

    if (Array.isArray(scoresRaw)) {
      // Formato array: [{ class: 'nv', score: 0.8 }, ...]
      scoresRaw.forEach(item => {
        const code = (item.class || item.label || item.code || '').toLowerCase();
        const score = typeof item.score === 'number' ? item.score : parseFloat(item.score);
        if (code && !isNaN(score)) {
          scoresArray.push({ code, score });
        }
      });
    } else if (typeof scoresRaw === 'object') {
      // Formato diccionario clave-valor: { "nv": 0.823, "mel": 0.041, ... }
      for (const [key, val] of Object.entries(scoresRaw)) {
        const code = key.toLowerCase();
        const score = typeof val === 'number' ? val : parseFloat(val);
        if (!isNaN(score)) {
          scoresArray.push({ code, score });
        }
      }
    }

    // Ordenar de mayor a menor puntuación de forma estricta y determinista
    scoresArray.sort((a, b) => b.score - a.score);

    // Asignar posición de ranking (1 a 7)
    const rankedScores = scoresArray.map((item, idx) => ({
      ...item,
      rank: idx + 1
    }));

    return {
      scores: rankedScores,
      modelVersion: responseJson.model_version || responseJson.version || 'SkinAI v2 (EfficientNetB0)',
      disclaimer: responseJson.disclaimer || 'Prototipo académico experimental sin fines de diagnóstico clínico.'
    };
  }

  /**
   * Genera un conjunto de datos de demostración claramente etiquetados
   * Exclusivamente para pruebas y calibración visual de la interfaz cuando el backend no está disponible.
   */
  function generateDemoScores() {
    // Puntuaciones de muestra realistas de una lesión benigna tipo nevo
    const sampleScores = [
      { code: 'nv', score: 0.6842 },
      { code: 'bkl', score: 0.1421 },
      { code: 'mel', score: 0.0715 },
      { code: 'bcc', score: 0.0452 },
      { code: 'akiec', score: 0.0318 },
      { code: 'vasc', score: 0.0152 },
      { code: 'df', score: 0.0100 }
    ];

    sampleScores.sort((a, b) => b.score - a.score);

    return {
      success: true,
      scores: sampleScores.map((s, idx) => ({ ...s, rank: idx + 1 })),
      modelVersion: 'SkinAI v2 (Modo Demostración Académica)',
      disclaimer: 'Simulación de prueba visual para calibración de UI. Este resultado NO fue generado por la API de inferencia.',
      source: 'demo'
    };
  }

  return {
    checkHealth,
    predictImage,
    normalizeInferenceResponse,
    generateDemoScores
  };
})();

// Exportar globalmente
window.SkinAIApi = SkinAIApi;
