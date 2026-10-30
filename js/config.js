/**
 * SkinAI — Archivo de Configuración del Cliente Web
 * 
 * Este archivo centraliza la configuración del frontend, la definición de las
 * siete clases dermatológicas del modelo y los parámetros de conexión con FastAPI.
 */

const SkinAIConfig = (() => {
  // Clave de almacenamiento en Render para recordar la URL configurada por el usuario
  const STORAGE_KEY_API_URL = 'skinai_api_base_url';
  const STORAGE_KEY_DEMO_MODE = 'skinai_demo_mode_enabled';

  // URLs de los entornos de ejecución
  const PRODUCTION_API_BASE_URL = 'https://skinai-backend-ena4.onrender.com';
  const LOCAL_API_BASE_URL = 'http://127.0.0.1:8000';

  /**
   * Determina la URL predeterminada según el entorno de ejecución:
   * - En producción (GitHub Pages o dominio público): Render (https://skinai-backend-ena4.onrender.com)
   * - En desarrollo local (localhost / 127.0.0.1 / file://): Backend local (http://127.0.0.1:8000)
   */
  function getDefaultApiBaseUrl() {
    try {
      if (typeof window !== 'undefined' && window.location) {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;

        // Entorno local: localhost, 127.0.0.1 o archivo local file://
        if (hostname === 'localhost' || hostname === '127.0.0.1' || protocol === 'file:') {
          return LOCAL_API_BASE_URL;
        }
      }
    } catch (_) {}
    return PRODUCTION_API_BASE_URL;
  }

  // URL por defecto para el entorno actual
  const DEFAULT_API_BASE_URL = getDefaultApiBaseUrl();

  // Límite de tamaño de archivo (10 MB exactos en bytes)
  const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10,485,760 bytes

  // Formatos MIME permitidos
  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

  // Extensiones de archivo válidas para verificación de nombre
  const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

  // Tiempo límite para peticiones HTTP (75 segundos para tolerar el arranque en frío de Render)
  const REQUEST_TIMEOUT_MS = 75000;

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
   * Obtiene la URL base configurada actualmente (persiste en localStorage o recurre al default)
   */
  function getApiBaseUrl() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_API_URL);
      if (stored && stored.trim() !== '') {
        return cleanUrl(stored.trim());
      }
    } catch (e) {
      console.warn('No se pudo acceder a localStorage para recuperar la URL de la API:', e);
    }
    return getDefaultApiBaseUrl();
  }

  /**
   * Guarda una nueva URL base para la API
   */
  function setApiBaseUrl(url) {
    const cleaned = cleanUrl(url);
    try {
      localStorage.setItem(STORAGE_KEY_API_URL, cleaned);
    } catch (e) {
      console.warn('No se pudo guardar la URL de la API en localStorage:', e);
    }
    return cleaned;
  }

  /**
   * Restablece la URL base al valor predeterminado del entorno actual
   */
  function resetApiBaseUrl() {
    try {
      localStorage.removeItem(STORAGE_KEY_API_URL);
    } catch (e) {
      console.warn('Error al limpiar localStorage:', e);
    }
    return getDefaultApiBaseUrl();
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
    if (!url) return getDefaultApiBaseUrl();
    return url.trim().replace(/\/+$/, '');
  }

  return {
    PRODUCTION_API_BASE_URL,
    LOCAL_API_BASE_URL,
    getDefaultApiBaseUrl,
    get DEFAULT_API_BASE_URL() {
      return getDefaultApiBaseUrl();
    },
    MAX_FILE_SIZE_BYTES,
    ALLOWED_MIME_TYPES,
    ALLOWED_EXTENSIONS,
    REQUEST_TIMEOUT_MS,
    CLASSES_METADATA,
    getApiBaseUrl,
    setApiBaseUrl,
    resetApiBaseUrl,
    isDemoModeEnabled,
    setDemoModeEnabled
  };
})();

// Exportar globalmente para disponibilidad en el navegador
window.SkinAIConfig = SkinAIConfig;
