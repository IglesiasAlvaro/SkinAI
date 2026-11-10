/**
 * SkinAI — Servicio de Comunicación con las APIs de FastAPI
 * 
 * Gestiona de forma modular y desacoplada las peticiones HTTP hacia los dos
 * servicios backend:
 * 
 * 1. Servicio de Predicción (PREDICT_API_URL):
 *    - GET  /health   : Verificación del estado del modelo EfficientNetB0.
 *    - POST /predict  : Envío de imagen multipart/form-data (campo 'file').
 * 
 * 2. Servicio de Chatbot RAG (CHAT_API_URL):
 *    - GET  /health   : Verificación del estado del microservicio de chat.
 *    - POST /chat     : Envío de consulta médica informativa en JSON (campo 'question').
 * 
 * Reglas de conexión:
 * - PREDICT_API_URL se utiliza exclusivamente para /predict.
 * - CHAT_API_URL se utiliza exclusivamente para /chat.
 * - Wakeup silencioso al arrancar para reactivar instancias gratuitas de Render.
 * - Timeouts de 95s (>= 90s) y mapeo determinista de errores en español.
 */

const SkinAIApi = (() => {

  /**
   * Mapea códigos HTTP y excepciones de red a los mensajes estándar en español:
   * - 429: "Se alcanzó el límite gratuito de consultas. Intenta de nuevo en un minuto."
   * - 500, 502, 503, 504: "El servicio no está disponible en este momento. Intenta de nuevo."
   * - Sin conexión o timeout: "No se pudo conectar con el servidor."
   * 
   * @param {Error|any} err 
   * @param {number} [status] 
   * @returns {string} Mensaje de error para el usuario
   */
  function mapStandardErrorMessage(err, status) {
    if (status === 429) {
      return 'Se alcanzó el límite gratuito de consultas. Intenta de nuevo en un minuto.';
    }

    if ([500, 502, 503, 504].includes(status)) {
      return 'El servicio no está disponible en este momento. Intenta de nuevo.';
    }

    if (err) {
      if (err.name === 'AbortError') {
        return 'No se pudo conectar con el servidor.';
      }
      const msg = (err.message || '').toLowerCase();
      if (
        msg.includes('failed to fetch') ||
        msg.includes('networkerror') ||
        msg.includes('load failed') ||
        msg.includes('timeout') ||
        msg.includes('no se pudo conectar')
      ) {
        return 'No se pudo conectar con el servidor.';
      }
    }

    if (status && status >= 400) {
      return 'El servicio no está disponible en este momento. Intenta de nuevo.';
    }

    return 'No se pudo conectar con el servidor.';
  }

  /**
   * Realiza un GET silencioso a /health de AMBAS URLs para despertar los
   * servidores gratuitos en Render, ignorando cualquier error sin mostrárselo
   * al usuario.
   */
  function wakeupServers() {
    try {
      const predictHealthUrl = `${SkinAIConfig.getPredictApiUrl()}/health`;
      const chatHealthUrl    = `${SkinAIConfig.getChatApiUrl()}/health`;

      // Peticiones silenciosas en segundo plano (fire & forget)
      fetch(predictHealthUrl, { method: 'GET', headers: { 'Accept': 'application/json' }, cache: 'no-store' })
        .catch(() => { /* Silencioso: ignorar error intencionalmente */ });

      fetch(chatHealthUrl, { method: 'GET', headers: { 'Accept': 'application/json' }, cache: 'no-store' })
        .catch(() => { /* Silencioso: ignorar error intencionalmente */ });
    } catch (_) {
      // Silencioso
    }
  }

  /**
   * Comprueba la salud del servicio de Predicción
   * 
   * @param {string} [customBaseUrl] 
   * @returns {Promise<{ok: boolean, status: number, data?: any, error?: string, url: string}>}
   */
  async function checkPredictHealth(customBaseUrl) {
    const baseUrl = customBaseUrl || SkinAIConfig.getPredictApiUrl();
    const targetUrl = `${baseUrl}/health`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return { ok: true, status: response.status, data, url: targetUrl };
      }

      return {
        ok: false,
        status: response.status,
        error: mapStandardErrorMessage(null, response.status),
        url: targetUrl
      };
    } catch (err) {
      clearTimeout(timeoutId);
      return {
        ok: false,
        status: 0,
        error: mapStandardErrorMessage(err, 0),
        url: targetUrl
      };
    }
  }

  /**
   * Comprueba la salud del servicio de Chatbot
   * 
   * @param {string} [customBaseUrl] 
   * @returns {Promise<{ok: boolean, status: number, data?: any, error?: string, url: string}>}
   */
  async function checkChatHealth(customBaseUrl) {
    const baseUrl = customBaseUrl || SkinAIConfig.getChatApiUrl();
    const targetUrl = `${baseUrl}/health`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return { ok: true, status: response.status, data, url: targetUrl };
      }

      return {
        ok: false,
        status: response.status,
        error: mapStandardErrorMessage(null, response.status),
        url: targetUrl
      };
    } catch (err) {
      clearTimeout(timeoutId);
      return {
        ok: false,
        status: 0,
        error: mapStandardErrorMessage(err, 0),
        url: targetUrl
      };
    }
  }

  /**
   * Envía una imagen al endpoint POST /predict del servicio de PREDICCIÓN
   * Utiliza PREDICT_API_URL exclusivamente.
   * 
   * @param {File} file - Objeto de archivo de imagen seleccionado por el usuario
   * @param {string} [customBaseUrl] - URL base opcional
   * @returns {Promise<{
   *   success: boolean,
   *   scores: Array<{code: string, score: number, rank: number}>,
   *   modelVersion?: string,
   *   disclaimer?: string,
   *   rawResponse?: any,
   *   source: string
   * }>}
   */
  async function predictImage(file, customBaseUrl) {
    if (!file) {
      throw new Error('Por favor selecciona primero una imagen antes de analizar.');
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
      throw new Error('Formato de archivo no compatible. Solo se admiten imágenes en formato JPEG, JPG o PNG.');
    }

    // Usar PREDICT_API_URL exclusivamente para /predict
    const baseUrl = customBaseUrl || SkinAIConfig.getPredictApiUrl();
    const targetUrl = `${baseUrl}/predict`;

    const formData = new FormData();
    formData.append('file', file, file.name);

    const controller = new AbortController();
    // Timeout de 95 segundos (al menos 90 segundos para tolerar arranque en frío)
    const timeoutId = setTimeout(() => controller.abort(), SkinAIConfig.REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorMsg = mapStandardErrorMessage(null, response.status);
        const err = new Error(errorMsg);
        err.status = response.status;
        throw err;
      }

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

      // Si el error ya fue formateado con el mensaje estándar, propagarlo
      if (err.status) {
        throw err;
      }

      const mappedMsg = mapStandardErrorMessage(err, 0);
      const standardErr = new Error(mappedMsg);
      standardErr.original = err;
      throw standardErr;
    }
  }

  /**
   * Envía una pregunta al endpoint POST /chat del servicio de CHATBOT RAG
   * Utiliza CHAT_API_URL exclusivamente.
   * 
   * @param {string} question - Texto de la consulta del usuario
   * @param {string} [customBaseUrl] - URL base opcional
   * @returns {Promise<{
   *   success: boolean,
   *   answer: string,
   *   sources: string[]
   * }>}
   */
  async function sendChatMessage(question, customBaseUrl) {
    const cleanQuestion = (question || '').trim();
    if (!cleanQuestion || cleanQuestion.length < 3) {
      throw new Error('Por favor formula una pregunta de al menos 3 caracteres.');
    }

    // Usar CHAT_API_URL exclusivamente para /chat
    const baseUrl = customBaseUrl || SkinAIConfig.getChatApiUrl();
    const targetUrl = `${baseUrl}/chat`;

    const controller = new AbortController();
    // Timeout de 95 segundos (al menos 90 segundos)
    const timeoutId = setTimeout(() => controller.abort(), SkinAIConfig.REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ question: cleanQuestion }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorMsg = mapStandardErrorMessage(null, response.status);
        const err = new Error(errorMsg);
        err.status = response.status;
        throw err;
      }

      const data = await response.json();
      return {
        success: true,
        answer: data.answer || 'No se recibió respuesta del modelo.',
        sources: Array.isArray(data.sources) ? data.sources : []
      };

    } catch (err) {
      clearTimeout(timeoutId);

      if (err.status) {
        throw err;
      }

      const mappedMsg = mapStandardErrorMessage(err, 0);
      const standardErr = new Error(mappedMsg);
      standardErr.original = err;
      throw standardErr;
    }
  }

  /**
   * Normaliza la estructura JSON de inferencia recibida del modelo
   */
  function normalizeInferenceResponse(responseJson) {
    if (!responseJson || typeof responseJson !== 'object') {
      throw new Error('La respuesta devuelta por la API no es un objeto JSON válido.');
    }

    let scoresRaw = responseJson.class_scores || responseJson.predictions || responseJson.scores;

    if (!scoresRaw && typeof responseJson === 'object') {
      const sampleKeys = Object.keys(responseJson);
      const hasDermKeys = sampleKeys.some(k => SkinAIConfig.CLASSES_METADATA[k.toLowerCase()]);
      if (hasDermKeys) {
        scoresRaw = responseJson;
      }
    }

    if (!scoresRaw) {
      throw new Error('La respuesta de la API no contiene las puntuaciones esperadas.');
    }

    const scoresArray = [];

    if (Array.isArray(scoresRaw)) {
      scoresRaw.forEach(item => {
        const code = (item.class || item.label || item.code || '').toLowerCase();
        const score = typeof item.score === 'number' ? item.score : parseFloat(item.score);
        if (code && !isNaN(score)) {
          scoresArray.push({ code, score });
        }
      });
    } else if (typeof scoresRaw === 'object') {
      for (const [key, val] of Object.entries(scoresRaw)) {
        const code = key.toLowerCase();
        const score = typeof val === 'number' ? val : parseFloat(val);
        if (!isNaN(score)) {
          scoresArray.push({ code, score });
        }
      }
    }

    scoresArray.sort((a, b) => b.score - a.score);

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
   * Genera puntuaciones simuladas para calibración visual en Modo Demostración
   */
  function generateDemoScores() {
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
    wakeupServers,
    checkPredictHealth,
    checkChatHealth,
    checkHealth: checkPredictHealth, // Retrocompatibilidad
    predictImage,
    sendChatMessage,
    normalizeInferenceResponse,
    generateDemoScores,
    mapStandardErrorMessage
  };
})();

// Exportar globalmente
window.SkinAIApi = SkinAIApi;
