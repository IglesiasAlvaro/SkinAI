/**
 * SkinAI — Archivo de Configuración del Cliente Web
 * 
 * Este archivo centraliza la configuración del frontend, la definición de las
 * siete clases dermatológicas del modelo y los parámetros de conexión con
 * los dos servicios del backend:
 * 1. Servicio de Inferencia / Predicción (FastAPI + EfficientNetB0)
 * 2. Servicio de Chatbot RAG (FastAPI + Gemini + Supabase pgvector)
 */

const SkinAIConfig = (() => {
  // Claves de almacenamiento en localStorage
  const STORAGE_KEY_PREDICT_URL = 'skinai_predict_api_url';
  const STORAGE_KEY_CHAT_URL    = 'skinai_chat_api_url';
  const STORAGE_KEY_ENV         = 'skinai_environment';
  const STORAGE_KEY_DEMO_MODE   = 'skinai_demo_mode_enabled';

  // ============================================================================
  // CONFIGURACIÓN DE ENTORNOS (LOCAL vs PRODUCCIÓN)
  // ============================================================================
  // FORMA SENCILLA DE ALTERNAR ENTRE LOCAL Y PRODUCCIÓN:
  // Cambia DEFAULT_ENVIRONMENT a:
  //   - 'production' : Fuerza los servicios desplegados en la nube (Render).
  //   - 'local'      : Fuerza los servicios en ejecución local (127.0.0.1).
  //   - 'auto'       : Detecta automáticamente (local si se abre desde localhost,
  //                    127.0.0.1 o archivo local file://; producción en caso contrario).
  const DEFAULT_ENVIRONMENT = 'auto'; // 'auto' | 'production' | 'local'

  // URLs de los dos servicios en PRODUCCIÓN (Render)
  const PRODUCTION_PREDICT_URL = 'https://skinai-backend-ena4.onrender.com';
  const PRODUCTION_CHAT_URL    = 'https://skinai-backend-chat.onrender.com';

  // URLs de los dos servicios en DESARROLLO LOCAL
  const LOCAL_PREDICT_URL      = 'http://127.0.0.1:8000';
  const LOCAL_CHAT_URL         = 'http://127.0.0.1:8001';

  /**
   * Determina si el entorno actual se resuelve a Local o a Producción
   */
  function isLocalMode() {
    // 1. Revisar si el usuario seleccionó un entorno explícito en localStorage
    try {
      const storedEnv = localStorage.getItem(STORAGE_KEY_ENV);
      if (storedEnv === 'local') return true;
      if (storedEnv === 'production') return false;
    } catch (_) {}

    // 2. Si la constante global está fijada explícitamente
    if (DEFAULT_ENVIRONMENT === 'local') return true;
    if (DEFAULT_ENVIRONMENT === 'production') return false;

    // 3. Modo 'auto': verificar origen del navegador
    try {
      if (typeof window !== 'undefined' && window.location) {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        if (hostname === 'localhost' || hostname === '127.0.0.1' || protocol === 'file:') {
          return true;
        }
      }
    } catch (_) {}

    return false;
  }

  // Constantes de configuración independientes según el entorno activo
  const PREDICT_API_URL = isLocalMode() ? LOCAL_PREDICT_URL : PRODUCTION_PREDICT_URL;
  const CHAT_API_URL    = isLocalMode() ? LOCAL_CHAT_URL    : PRODUCTION_CHAT_URL;

  // Límite de tamaño de archivo (10 MB exactos en bytes)
  const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10,485,760 bytes

  // Formatos MIME permitidos
  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

  // Extensiones de archivo válidas para verificación de nombre
  const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

  // Tiempo límite para peticiones HTTP: al menos 90 segundos (95s para tolerancia de arranque en frío en Render)
  const REQUEST_TIMEOUT_MS = 95000;

  /**
   * Diccionario oficial de las siete clases dermatológicas entrenadas con HAM10000.
   * El orden y código corresponden al mapeo de label_mapping.json auditado del modelo:
   * ['akiec', 'bcc', 'bkl', 'df', 'mel', 'nv', 'vasc']
   */
  const CLASSES_METADATA = {
    akiec: {
      code: 'akiec',
      shortName: 'Queratosis actínica / Carcinoma intraepitelial',
      scientificName: 'Actinic keratoses and intraepithelial carcinoma (Bowen)',
      description: 'Lesiones queratósicas premalignas superficiales o carcinomas epidermoides in situ inducidos comúnmente por radiación ultravioleta.',
      category: 'Lesión premaligna / in situ',
      index: 0
    },
    bcc: {
      code: 'bcc',
      shortName: 'Carcinoma basocelular',
      scientificName: 'Basal cell carcinoma',
      description: 'El tipo más común de cáncer cutáneo. Lesión epitelial maligna de crecimiento típicamente lento y bajo potencial metastásico.',
      category: 'Neoplasia maligna no melanocítica',
      index: 1
    },
    bkl: {
      code: 'bkl',
      shortName: 'Lesiones queratósicas benignas',
      scientificName: 'Benign keratosis-like lesions',
      description: 'Grupo heterogéneo benigno que engloba queratosis seborreica, léntigo solar y queratosis liquenoide.',
      category: 'Lesión cutánea benigna',
      index: 2
    },
    df: {
      code: 'df',
      shortName: 'Dermatofibroma',
      scientificName: 'Dermatofibroma (histiocitoma fibroso benigno)',
      description: 'Nódulo dérmico benigno de origen fibrohistiocítico, frecuente en extremidades inferiores.',
      category: 'Lesión mesenquimal benigna',
      index: 3
    },
    mel: {
      code: 'mel',
      shortName: 'Melanoma',
      scientificName: 'Melanoma (maligno invasivo o in situ)',
      description: 'Neoplasia maligna originada en los melanocitos. Es el cáncer de piel con mayor tasa de letalidad y requiere detección precoz.',
      category: 'Neoplasia melanocítica maligna',
      index: 4
    },
    nv: {
      code: 'nv',
      shortName: 'Nevo melanocítico',
      scientificName: 'Melanocytic nevi (lunar común)',
      description: 'Proliferación benigna común de melanocitos en la epidermis o dermis. Constituye la gran mayoría de lesiones cutáneas usuales.',
      category: 'Neoplasia melanocítica benigna',
      index: 5
    },
    vasc: {
      code: 'vasc',
      shortName: 'Lesiones vasculares',
      scientificName: 'Vascular lesions',
      description: 'Anomalías vasculares cutáneas que incluyen angiomas en cereza, angioqueratomas y granulomas piógenos.',
      category: 'Lesión vascular benigna',
      index: 6
    }
  };

  /**
   * Obtiene la URL base de Predicción configurada (persistida o predeterminada)
   */
  function getPredictApiUrl() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PREDICT_URL) || localStorage.getItem('skinai_api_base_url');
      if (stored && stored.trim() !== '') {
        return cleanUrl(stored.trim());
      }
    } catch (e) {
      console.warn('No se pudo acceder a localStorage para recuperar la URL de predicción:', e);
    }
    return isLocalMode() ? LOCAL_PREDICT_URL : PRODUCTION_PREDICT_URL;
  }

  /**
   * Obtiene la URL base del Chatbot configurada (persistida o predeterminada)
   */
  function getChatApiUrl() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CHAT_URL);
      if (stored && stored.trim() !== '') {
        return cleanUrl(stored.trim());
      }
    } catch (e) {
      console.warn('No se pudo acceder a localStorage para recuperar la URL del chat:', e);
    }
    return isLocalMode() ? LOCAL_CHAT_URL : PRODUCTION_CHAT_URL;
  }

  /**
   * Guarda una nueva URL base para el servicio de Predicción
   */
  function setPredictApiUrl(url) {
    const cleaned = cleanUrl(url);
    try {
      localStorage.setItem(STORAGE_KEY_PREDICT_URL, cleaned);
      localStorage.setItem('skinai_api_base_url', cleaned);
    } catch (e) {
      console.warn('No se pudo guardar la URL de predicción en localStorage:', e);
    }
    return cleaned;
  }

  /**
   * Guarda una nueva URL base para el servicio de Chatbot
   */
  function setChatApiUrl(url) {
    const cleaned = cleanUrl(url);
    try {
      localStorage.setItem(STORAGE_KEY_CHAT_URL, cleaned);
    } catch (e) {
      console.warn('No se pudo guardar la URL del chat en localStorage:', e);
    }
    return cleaned;
  }

  /**
   * Restablece la URL de predicción al valor predeterminado del entorno activo
   */
  function resetPredictApiUrl() {
    try {
      localStorage.removeItem(STORAGE_KEY_PREDICT_URL);
      localStorage.removeItem('skinai_api_base_url');
    } catch (e) {
      console.warn('Error al limpiar localStorage:', e);
    }
    return isLocalMode() ? LOCAL_PREDICT_URL : PRODUCTION_PREDICT_URL;
  }

  /**
   * Restablece la URL de chat al valor predeterminado del entorno activo
   */
  function resetChatApiUrl() {
    try {
      localStorage.removeItem(STORAGE_KEY_CHAT_URL);
    } catch (e) {
      console.warn('Error al limpiar localStorage:', e);
    }
    return isLocalMode() ? LOCAL_CHAT_URL : PRODUCTION_CHAT_URL;
  }

  /**
   * Alterna el entorno activo de forma sencilla ('auto' | 'local' | 'production')
   */
  function setEnvironment(env) {
    try {
      if (env === 'auto') {
        localStorage.removeItem(STORAGE_KEY_ENV);
      } else {
        localStorage.setItem(STORAGE_KEY_ENV, env);
      }
    } catch (e) {
      console.warn('Error al cambiar entorno en localStorage:', e);
    }
  }

  function getEnvironment() {
    try {
      return localStorage.getItem(STORAGE_KEY_ENV) || DEFAULT_ENVIRONMENT;
    } catch (_) {
      return DEFAULT_ENVIRONMENT;
    }
  }

  /**
   * Consulta el estado del modo demostración
   */
  function isDemoModeEnabled() {
    try {
      return localStorage.getItem(STORAGE_KEY_DEMO_MODE) === 'true';
    } catch (e) {
      return false;
    }
  }

  /**
   * Activa o desactiva el modo demostración
   */
  function setDemoModeEnabled(enabled) {
    try {
      localStorage.setItem(STORAGE_KEY_DEMO_MODE, enabled ? 'true' : 'false');
    } catch (e) {
      console.warn('Error al guardar el estado de demo en localStorage:', e);
    }
    return enabled;
  }

  /**
   * Normaliza la URL eliminando barras finales
   */
  function cleanUrl(url) {
    if (!url) return '';
    return url.trim().replace(/\/+$/, '');
  }

  // Compatibilidad con código previo que usaba getApiBaseUrl
  function getApiBaseUrl() {
    return getPredictApiUrl();
  }
  function setApiBaseUrl(url) {
    return setPredictApiUrl(url);
  }
  function resetApiBaseUrl() {
    return resetPredictApiUrl();
  }

  return {
    // Constantes de configuración independientes solicitadas
    PREDICT_API_URL,
    CHAT_API_URL,
    PRODUCTION_PREDICT_URL,
    PRODUCTION_CHAT_URL,
    LOCAL_PREDICT_URL,
    LOCAL_CHAT_URL,
    DEFAULT_ENVIRONMENT,
    isLocalMode,
    getEnvironment,
    setEnvironment,
    getPredictApiUrl,
    getChatApiUrl,
    setPredictApiUrl,
    setChatApiUrl,
    resetPredictApiUrl,
    resetChatApiUrl,
    // Compatibilidad retroactiva
    getApiBaseUrl,
    setApiBaseUrl,
    resetApiBaseUrl,
    get DEFAULT_API_BASE_URL() {
      return getPredictApiUrl();
    },
    MAX_FILE_SIZE_BYTES,
    ALLOWED_MIME_TYPES,
    ALLOWED_EXTENSIONS,
    REQUEST_TIMEOUT_MS,
    CLASSES_METADATA,
    isDemoModeEnabled,
    setDemoModeEnabled,
    cleanUrl
  };
})();

// Exportar globalmente para disponibilidad en el navegador
window.SkinAIConfig = SkinAIConfig;
