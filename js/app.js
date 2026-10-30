/**
 * SkinAI — Controlador de la Interfaz de Usuario (UI/UX)
 * 
 * Gestiona la interacción del usuario: arrastrar y soltar, vista previa con
 * metadatos reales, validación de 10 MB, escáner visual, visualización de las
 * siete clases y modal de configuración de la API de FastAPI.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Referencias a elementos del DOM
  const elements = {
    // Dropzone & Archivos
    dropZone: document.getElementById('dropZone'),
    fileInput: document.getElementById('fileInput'),
    dropZonePrompt: document.getElementById('dropZonePrompt'),
    previewArea: document.getElementById('previewArea'),
    imagePreview: document.getElementById('imagePreview'),
    scannerOverlay: document.getElementById('scannerOverlay'),
    previewFileName: document.getElementById('previewFileName'),
    previewFileSize: document.getElementById('previewFileSize'),
    previewDimensions: document.getElementById('previewDimensions'),
    previewMimeType: document.getElementById('previewMimeType'),
    changeImageBtn: document.getElementById('changeImageBtn'),
    removeImageBtn: document.getElementById('removeImageBtn'),
    analyzeBtn: document.getElementById('analyzeBtn'),

    // Notificaciones y Carga
    statusNotification: document.getElementById('statusNotification'),
    notificationIcon: document.getElementById('notificationIcon'),
    notificationTitle: document.getElementById('notificationTitle'),
    notificationMessage: document.getElementById('notificationMessage'),
    notificationAction: document.getElementById('notificationAction'),
    closeNotificationBtn: document.getElementById('closeNotificationBtn'),
    loadingState: document.getElementById('loadingState'),
    loadingStepText: document.getElementById('loadingStepText'),
    loadingProgressBar: document.getElementById('loadingProgressBar'),

    // Resultados
    resultsArea: document.getElementById('resultsArea'),
    resultsStatusChip: document.getElementById('resultsStatusChip'),
    resultsChipText: document.getElementById('resultsChipText'),
    modelVersionTag: document.getElementById('modelVersionTag'),
    topPredictionCard: document.getElementById('topPredictionCard'),
    topClassCode: document.getElementById('topClassCode'),
    topClassName: document.getElementById('topClassName'),
    topClassDesc: document.getElementById('topClassDesc'),
    topClassScore: document.getElementById('topClassScore'),
    scoresList: document.getElementById('scoresList'),
    copyResultsBtn: document.getElementById('copyResultsBtn'),
    downloadJsonBtn: document.getElementById('downloadJsonBtn'),
    analyzeNewBtn: document.getElementById('analyzeNewBtn'),

    // Estado API y Modal
    apiStatusBtn: document.getElementById('apiStatusBtn'),
    apiStatusText: document.getElementById('apiStatusText'),
    apiModal: document.getElementById('apiModal'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    footerConfigBtn: document.getElementById('footerConfigBtn'),
    apiUrlInput: document.getElementById('apiUrlInput'),
    testConnectionBtn: document.getElementById('testConnectionBtn'),
    testSpinner: document.getElementById('testSpinner'),
    connectionFeedback: document.getElementById('connectionFeedback'),
    colabAccordionToggle: document.getElementById('colabAccordionToggle'),
    colabAccordionBody: document.getElementById('colabAccordionBody'),
    demoModeSwitch: document.getElementById('demoModeSwitch'),
    resetUrlBtn: document.getElementById('resetUrlBtn'),
    saveApiConfigBtn: document.getElementById('saveApiConfigBtn'),

    // Menú móvil y navegación
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    mainNav: document.getElementById('mainNav')
  };

  // Estado reactivo de la aplicación
  let state = {
    selectedFile: null,
    previewUrl: null,
    isAnalyzing: false,
    lastResults: null,
    apiStatus: 'checking', // 'checking' | 'connected' | 'disconnected' | 'demo'
    demoMode: SkinAIConfig.isDemoModeEnabled()
  };

  /* ==========================================================================
     INICIALIZACIÓN
     ========================================================================== */
  function init() {
    setupEventListeners();
    setupDropZoneEvents();
    setupModalEvents();
    setupNavigationHighlight();
    
    // Cargar valores iniciales en modal
    elements.apiUrlInput.value = SkinAIConfig.getApiBaseUrl();
    elements.demoModeSwitch.checked = state.demoMode;

    // Verificar salud de la API al arrancar
    checkApiConnectionStatus();
  }

  /* ==========================================================================
     GESTIÓN DE EVENTOS
     ========================================================================== */
  function setupEventListeners() {
    // Botón para cambiar imagen
    if (elements.changeImageBtn) {
      elements.changeImageBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        elements.fileInput.click();
      });
    }

    // Botón para quitar imagen
    elements.removeImageBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      resetImageSelection();
    });

    // Botón para iniciar análisis
    elements.analyzeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleStartAnalysis();
    });

    // Cerrar notificación
    elements.closeNotificationBtn.addEventListener('click', () => {
      hideNotification();
    });

    // Analizar otra imagen
    elements.analyzeNewBtn.addEventListener('click', () => {
      resetImageSelection();
      elements.dropZone.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    // Copiar resultados al portapapeles
    elements.copyResultsBtn.addEventListener('click', handleCopyResults);

    // Descargar JSON de resultados
    elements.downloadJsonBtn.addEventListener('click', handleDownloadJson);

    // Menú móvil
    elements.mobileMenuBtn.addEventListener('click', () => {
      const isOpen = elements.mainNav.classList.toggle('open');
      elements.mobileMenuBtn.setAttribute('aria-expanded', isOpen);
    });

    // Cerrar menú móvil al hacer clic en un enlace
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        elements.mainNav.classList.remove('open');
        elements.mobileMenuBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ==========================================================================
     ZONA DE ARRASTRAR Y SOLTAR (DROPZONE)
     ========================================================================== */
  function setupDropZoneEvents() {
    const dropZone = elements.dropZone;
    const fileInput = elements.fileInput;

    // Prevenir que clics dentro del área de vista previa activen el selector de archivos
    if (elements.previewArea) {
      elements.previewArea.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    // Abrir selector al hacer clic en la zona (únicamente si NO hay imagen cargada ni se está analizando)
    dropZone.addEventListener('click', (e) => {
      if (state.selectedFile || state.isAnalyzing || e.target.closest('#previewArea')) {
        return;
      }
      fileInput.click();
    });

    // Soporte para accesibilidad con teclado (Enter o Espacio)
    dropZone.addEventListener('keydown', (e) => {
      if (!state.selectedFile && !state.isAnalyzing && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        fileInput.click();
      }
    });

    // Cambio en input de archivo
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        processSelectedFile(e.target.files[0]);
      }
    });

    // Eventos de arrastre
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!state.isAnalyzing && !state.selectedFile) {
          dropZone.classList.add('drag-active');
        }
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-active');
      });
    });

    // Soltar archivo
    dropZone.addEventListener('drop', (e) => {
      if (state.isAnalyzing) return;
      const dt = e.dataTransfer;
      if (dt.files && dt.files.length > 0) {
        processSelectedFile(dt.files[0]);
      }
    });
  }

  /* ==========================================================================
     PROCESAMIENTO Y VALIDACIÓN DE ARCHIVOS
     ========================================================================== */
  function processSelectedFile(file) {
    hideNotification();
    hideResults();

    // 1. Validar presencia
    if (!file) return;

    // 2. Validar tamaño (10 MB máximo)
    if (file.size > SkinAIConfig.MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      showNotification(
        'error',
        'Archivo demasiado pesado',
        `La imagen seleccionada tiene un tamaño de ${sizeMB} MB. El límite máximo de subida es de 10.0 MB para prevenir sobrecargas en la API.`
      );
      resetFileInputOnly();
      return;
    }

    // 3. Validar tipo de formato (JPEG, JPG, PNG)
    const fileName = file.name.toLowerCase();
    const fileMime = file.type ? file.type.toLowerCase() : '';
    const hasValidExt = SkinAIConfig.ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
    const hasValidMime = SkinAIConfig.ALLOWED_MIME_TYPES.includes(fileMime);

    if (!hasValidExt && !hasValidMime) {
      showNotification(
        'error',
        'Formato no compatible',
        'Solo se admiten imágenes en formato JPEG, JPG o PNG. Por favor selecciona una fotografía dermatológica compatible.'
      );
      resetFileInputOnly();
      return;
    }

    // 4. Leer imagen y mostrar vista previa
    state.selectedFile = file;

    // Liberar URL previa si existía
    if (state.previewUrl) {
      URL.revokeObjectURL(state.previewUrl);
    }
    state.previewUrl = URL.createObjectURL(file);

    // Cargar en el elemento img y extraer dimensiones reales
    elements.imagePreview.src = state.previewUrl;
    elements.previewFileName.textContent = file.name;
    elements.previewFileSize.textContent = formatBytes(file.size);
    elements.previewMimeType.textContent = file.type || 'image/jpeg';
    elements.previewDimensions.textContent = 'Calculando...';

    const tempImg = new Image();
    tempImg.onload = () => {
      elements.previewDimensions.textContent = `${tempImg.naturalWidth} × ${tempImg.naturalHeight} px`;
    };
    tempImg.onerror = () => {
      elements.previewDimensions.textContent = 'No disponible';
    };
    tempImg.src = state.previewUrl;

    // Cambiar vista de dropzone a vista previa y aplicar clase de estado
    elements.dropZone.classList.add('has-file');
    elements.dropZonePrompt.classList.add('hidden');
    elements.previewArea.classList.remove('hidden');
    elements.analyzeBtn.disabled = false;

    // Limpiar el selector para permitir re-seleccionar la misma imagen si el usuario la vuelve a elegir
    resetFileInputOnly();
  }

  function resetImageSelection() {
    state.selectedFile = null;
    if (state.previewUrl) {
      URL.revokeObjectURL(state.previewUrl);
      state.previewUrl = null;
    }
    resetFileInputOnly();
    elements.dropZone.classList.remove('has-file');
    elements.imagePreview.src = '';
    elements.previewArea.classList.add('hidden');
    elements.dropZonePrompt.classList.remove('hidden');
    elements.scannerOverlay.classList.add('hidden');
    elements.analyzeBtn.disabled = true;
    hideNotification();
    hideResults();
  }

  function resetFileInputOnly() {
    elements.fileInput.value = '';
  }

  /* ==========================================================================
     FLUJO DE ANÁLISIS DE LA IMAGEN
     ========================================================================== */
  async function handleStartAnalysis() {
    if (!state.selectedFile) {
      showNotification(
        'warning',
        'Selecciona una imagen',
        'Por favor selecciona primero una imagen dermatológica antes de iniciar el análisis.'
      );
      return;
    }

    if (state.isAnalyzing) return;

    hideNotification();
    hideResults();
    setAnalyzingState(true);

    // Simulación de pasos de procesamiento visual para feedback claro
    updateLoadingStep(1, 'Validando imagen en memoria del cliente...');
    await delay(300);

    updateLoadingStep(2, 'Preparando payload multipart/form-data (campo "file")...');
    await delay(300);

    let coldStartNoticeTimer = null;

    try {
      let inferenceResult;

      // Si el modo demostración está activo, usar simulación claramente etiquetada
      if (state.demoMode) {
        updateLoadingStep(3, 'Generando puntuaciones (Modo Demostración activo)...');
        await delay(800);
        inferenceResult = SkinAIApi.generateDemoScores();
      } else {
        updateLoadingStep(3, 'Enviando imagen a FastAPI (POST /predict)...');

        // Aviso si el backend en Render tarda debido al arranque en frío (cold start)
        coldStartNoticeTimer = setTimeout(() => {
          if (state.isAnalyzing) {
            updateLoadingStep(3, 'Conectando con el servidor en la nube... Si el backend estaba en reposo (arranque en frío de Render), puede demorar 30-45 segundos.');
          }
        }, 4000);

        // Petición real al backend
        inferenceResult = await SkinAIApi.predictImage(state.selectedFile);
      }

      updateLoadingStep(4, 'Normalizando vector de 7 clases...');
      await delay(250);

      // Renderizar resultados exitosos
      renderInferenceResults(inferenceResult);

    } catch (err) {
      console.error('Error durante el análisis:', err);

      // Mostrar mensaje de error descriptivo con opciones prácticas
      const isConnectionIssue = err.message && (
        err.message.includes('No se pudo contactar') || 
        err.message.includes('No se pudo conectar') || 
        err.message.includes('Failed to fetch') ||
        err.message.includes('Timeout') ||
        err.message.includes('Tiempo de espera')
      );

      const actionHtml = isConnectionIssue ? `
        <button type="button" class="btn btn-subtle-sm" id="btnOpenApiModalFromError">
          Configurar URL de la API
        </button>
        <button type="button" class="btn btn-subtle-sm" id="btnEnableDemoFromError">
          Activar Modo Demostración
        </button>
      ` : '';

      showNotification('error', 'No se pudo completar el análisis', err.message, actionHtml);

      // Enganchar listeners para las acciones del error
      if (isConnectionIssue) {
        const configBtn = document.getElementById('btnOpenApiModalFromError');
        if (configBtn) configBtn.addEventListener('click', openApiModal);

        const demoBtn = document.getElementById('btnEnableDemoFromError');
        if (demoBtn) {
          demoBtn.addEventListener('click', () => {
            enableDemoMode(true);
            hideNotification();
            handleStartAnalysis(); // reintentar inmediatamente con demo
          });
        }
      }

    } finally {
      if (coldStartNoticeTimer) clearTimeout(coldStartNoticeTimer);
      setAnalyzingState(false);
    }
  }

  function setAnalyzingState(isAnalyzing) {
    state.isAnalyzing = isAnalyzing;
    elements.analyzeBtn.disabled = isAnalyzing;
    elements.removeImageBtn.disabled = isAnalyzing;
    if (elements.changeImageBtn) {
      elements.changeImageBtn.disabled = isAnalyzing;
    }

    if (isAnalyzing) {
      elements.scannerOverlay.classList.remove('hidden');
      elements.loadingState.classList.remove('hidden');
    } else {
      elements.scannerOverlay.classList.add('hidden');
      elements.loadingState.classList.add('hidden');
    }
  }

  function updateLoadingStep(stepNumber, text) {
    elements.loadingStepText.textContent = text;
    const percentages = [20, 45, 75, 95];
    const pct = percentages[stepNumber - 1] || 50;
    elements.loadingProgressBar.style.width = `${pct}%`;
  }

  /* ==========================================================================
     RENDERIZADO DE RESULTADOS
     ========================================================================== */
  function renderInferenceResults(result) {
    state.lastResults = result;

    const scores = result.scores;
    if (!scores || scores.length === 0) {
      showNotification('error', 'Error en resultados', 'La respuesta recibida no contiene puntuaciones válidas.');
      return;
    }

    // Configurar chip de estado (si es real o demo)
    if (result.source === 'demo') {
      elements.resultsStatusChip.className = 'results-status-chip demo';
      elements.resultsChipText.textContent = 'Modo Demostración (Simulado)';
    } else {
      elements.resultsStatusChip.className = 'results-status-chip';
      elements.resultsChipText.textContent = 'Inferencia Real Completada';
    }

    // Versión del modelo
    elements.modelVersionTag.textContent = `Modelo: ${result.modelVersion || 'SkinAI v2'}`;

    // 1. Tarjeta destacada: Clase con mayor puntuación
    const top = scores[0];
    const topMeta = SkinAIConfig.CLASSES_METADATA[top.code] || {
      shortName: top.code,
      description: 'Clase dermatológica experimental.'
    };

    elements.topClassCode.textContent = top.code;
    elements.topClassName.textContent = topMeta.shortName;
    elements.topClassDesc.textContent = topMeta.description;
    elements.topClassScore.textContent = formatPercentage(top.score);

    // 2. Lista completa de las 7 clases ordenadas
    elements.scoresList.innerHTML = '';

    scores.forEach((item, index) => {
      const meta = SkinAIConfig.CLASSES_METADATA[item.code] || {
        shortName: item.code,
        scientificName: item.code,
        description: 'Clase dermatológica'
      };

      const percentStr = formatPercentage(item.score);
      const rawDecimal = item.score.toFixed(4);
      const isTop = index === 0;

      const row = document.createElement('div');
      row.className = `score-row ${isTop ? 'top-rank' : ''}`;
      row.innerHTML = `
        <span class="score-rank" aria-label="Posición ${item.rank}">#${item.rank}</span>
        <div class="score-class-cell">
          <div class="class-title-line">
            <span class="class-friendly-name">${escapeHtml(meta.shortName)}</span>
            <span class="class-code-pill" title="Código técnico en HAM10000">${escapeHtml(item.code)}</span>
          </div>
          <span class="class-scientific-desc">${escapeHtml(meta.description)}</span>
        </div>
        <div class="score-bar-cell">
          <div class="score-track" role="progressbar" aria-valuenow="${(item.score * 100).toFixed(1)}" aria-valuemin="0" aria-valuemax="100" title="${percentStr}">
            <div class="score-fill" style="width: 0%"></div>
          </div>
        </div>
        <div class="score-number-cell">
          <span class="score-percent">${percentStr}</span>
          <span class="score-raw-val">p: ${rawDecimal}</span>
        </div>
      `;

      elements.scoresList.appendChild(row);

      // Animar llenado de la barra con retraso escalonado
      setTimeout(() => {
        const fill = row.querySelector('.score-fill');
        if (fill) {
          const widthPct = Math.max(item.score * 100, 1.5); // Mínimo 1.5% para visibilidad
          fill.style.width = `${widthPct}%`;
        }
      }, 50 + index * 40);
    });

    // Mostrar área de resultados y desplazarse suavemente
    elements.resultsArea.classList.remove('hidden');
    elements.resultsArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideResults() {
    elements.resultsArea.classList.add('hidden');
  }

  /* ==========================================================================
     NOTIFICACIONES DEL SISTEMA
     ========================================================================== */
  function showNotification(type, title, message, actionHtml = '') {
    elements.statusNotification.className = `status-notification ${type}`;
    elements.notificationTitle.textContent = title;
    elements.notificationMessage.textContent = message;
    
    // Icono según tipo
    if (type === 'error') {
      elements.notificationIcon.innerHTML = '⚠️';
    } else if (type === 'warning') {
      elements.notificationIcon.innerHTML = 'ℹ️';
    } else {
      elements.notificationIcon.innerHTML = '✓';
    }

    elements.notificationAction.innerHTML = actionHtml || '';
    elements.statusNotification.classList.remove('hidden');
    elements.statusNotification.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideNotification() {
    elements.statusNotification.classList.add('hidden');
  }

  /* ==========================================================================
     ACCIONES DE RESULTADOS: COPIAR Y EXPORTAR
     ========================================================================== */
  function handleCopyResults() {
    if (!state.lastResults || !state.lastResults.scores) return;

    let text = `SkinAI — Clasificación Experimental de Imagen\n`;
    text += `Modelo: ${state.lastResults.modelVersion || 'SkinAI v2'}\n`;
    text += `Fecha: ${new Date().toLocaleString()}\n`;
    text += `Fuente: ${state.lastResults.source === 'demo' ? 'Modo Demostración' : 'API FastAPI'}\n`;
    text += `--------------------------------------------------\n`;

    state.lastResults.scores.forEach(s => {
      const meta = SkinAIConfig.CLASSES_METADATA[s.code] || { shortName: s.code };
      text += `#${s.rank} [${s.code}] ${meta.shortName}: ${(s.score * 100).toFixed(2)}% (raw: ${s.score.toFixed(5)})\n`;
    });

    text += `--------------------------------------------------\n`;
    text += `Aviso: Prototipo académico experimental. No constituye un diagnóstico médico.`;

    navigator.clipboard.writeText(text).then(() => {
      const origText = elements.copyResultsBtn.innerHTML;
      elements.copyResultsBtn.innerHTML = `✓ ¡Copiado!`;
      setTimeout(() => {
        elements.copyResultsBtn.innerHTML = origText;
      }, 2000);
    }).catch(err => {
      alert('No se pudo copiar al portapapeles: ' + err);
    });
  }

  function handleDownloadJson() {
    if (!state.lastResults) return;

    const exportData = {
      project: 'SkinAI',
      timestamp: new Date().toISOString(),
      source: state.lastResults.source,
      modelVersion: state.lastResults.modelVersion,
      fileName: state.selectedFile ? state.selectedFile.name : 'imagen',
      scores: state.lastResults.scores.map(s => {
        const meta = SkinAIConfig.CLASSES_METADATA[s.code] || {};
        return {
          rank: s.rank,
          code: s.code,
          shortName: meta.shortName || s.code,
          scoreRaw: s.score,
          scorePercentage: `${(s.score * 100).toFixed(2)}%`
        };
      }),
      disclaimer: 'SkinAI es un prototipo académico experimental y no constituye un dispositivo médico.'
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skinai_prediccion_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* ==========================================================================
     MODAL DE CONFIGURACIÓN Y ESTADO DE LA API
     ========================================================================== */
  function setupModalEvents() {
    // Abrir modal desde header o footer
    elements.apiStatusBtn.addEventListener('click', openApiModal);
    elements.footerConfigBtn.addEventListener('click', openApiModal);

    // Cerrar modal
    elements.closeModalBtn.addEventListener('click', closeApiModal);
    elements.apiModal.addEventListener('click', (e) => {
      if (e.target === elements.apiModal) {
        closeApiModal();
      }
    });

    // Probar conexión dentro del modal
    elements.testConnectionBtn.addEventListener('click', handleTestConnection);

    // Acordeón de información sobre Google Colab
    elements.colabAccordionToggle.addEventListener('click', () => {
      const accordion = elements.colabAccordionToggle.parentElement;
      const body = elements.colabAccordionBody;
      const isOpen = accordion.classList.toggle('open');
      body.classList.toggle('hidden', !isOpen);
    });

    // Toggle de modo demostración
    elements.demoModeSwitch.addEventListener('change', (e) => {
      enableDemoMode(e.target.checked);
    });

    // Restaurar URL por defecto
    elements.resetUrlBtn.addEventListener('click', () => {
      const defUrl = SkinAIConfig.resetApiBaseUrl();
      elements.apiUrlInput.value = defUrl;
      showConnectionFeedback('info', `URL restaurada al valor predeterminado (${defUrl}). Haz clic en "Comprobar" para verificar.`);
    });

    // Guardar configuración
    elements.saveApiConfigBtn.addEventListener('click', () => {
      const newUrl = elements.apiUrlInput.value.trim();
      if (!newUrl) {
        showConnectionFeedback('error', 'Por favor ingresa una URL válida.');
        return;
      }
      SkinAIConfig.setApiBaseUrl(newUrl);
      closeApiModal();
      checkApiConnectionStatus();
    });
  }

  function openApiModal() {
    elements.apiUrlInput.value = SkinAIConfig.getApiBaseUrl();
    elements.demoModeSwitch.checked = state.demoMode;
    elements.connectionFeedback.classList.add('hidden');
    elements.apiModal.classList.remove('hidden');
    elements.apiUrlInput.focus();
  }

  function closeApiModal() {
    elements.apiModal.classList.add('hidden');
  }

  async function handleTestConnection() {
    const inputUrl = elements.apiUrlInput.value.trim();
    if (!inputUrl) {
      showConnectionFeedback('error', 'Por favor especifica una URL antes de probar.');
      return;
    }

    elements.testSpinner.classList.remove('hidden');
    elements.testConnectionBtn.disabled = true;

    try {
      const result = await SkinAIApi.checkHealth(inputUrl);

      if (result.ok) {
        const modelVer = result.data && (result.data.model_version || result.data.version) ? 
          ` (${result.data.model_version})` : '';
        showConnectionFeedback('success', `✓ ¡Conexión exitosa con FastAPI! Servidor saludable${modelVer}.`);
        updateApiStatusIndicator('connected', 'API: Conectada');
      } else {
        showConnectionFeedback('error', `✕ ${result.error}`);
        updateApiStatusIndicator('disconnected', 'API: Desconectada');
      }
    } catch (e) {
      showConnectionFeedback('error', `✕ Error inesperado: ${e.message}`);
      updateApiStatusIndicator('disconnected', 'API: Desconectada');
    } finally {
      elements.testSpinner.classList.add('hidden');
      elements.testConnectionBtn.disabled = false;
    }
  }

  function showConnectionFeedback(type, message) {
    elements.connectionFeedback.className = `connection-feedback ${type}`;
    elements.connectionFeedback.textContent = message;
    elements.connectionFeedback.classList.remove('hidden');
  }

  function enableDemoMode(enabled) {
    state.demoMode = enabled;
    SkinAIConfig.setDemoModeEnabled(enabled);
    elements.demoModeSwitch.checked = enabled;

    if (enabled) {
      updateApiStatusIndicator('demo', 'API: Modo Demo');
      showNotification(
        'warning',
        'Modo Demostración Activado',
        'La interfaz simulará resultados para pruebas visuales sin llamar al backend de FastAPI.'
      );
    } else {
      checkApiConnectionStatus();
    }
  }

  /**
   * Consulta periódica o puntual del estado de conexión con la API
   */
  async function checkApiConnectionStatus() {
    if (state.demoMode) {
      updateApiStatusIndicator('demo', 'API: Modo Demo');
      return;
    }

    updateApiStatusIndicator('checking', 'API: Verificando...');

    const result = await SkinAIApi.checkHealth();
    if (result.ok) {
      updateApiStatusIndicator('connected', 'API: Conectada');
    } else {
      updateApiStatusIndicator('disconnected', 'API: Desconectada');
    }
  }

  function updateApiStatusIndicator(status, text) {
    state.apiStatus = status;
    elements.apiStatusBtn.className = `api-status-btn ${status}`;
    elements.apiStatusText.textContent = text;
  }

  /* ==========================================================================
     RESALTADO DE NAVEGACIÓN ACTIVA EN SCROLL
     ========================================================================== */
  function setupNavigationHighlight() {
    const sections = document.querySelectorAll('main > section');
    const navLinks = document.querySelectorAll('.nav-link');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === `#${id}`) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
        }
      });
    }, {
      rootMargin: '-30% 0px -60% 0px'
    });

    sections.forEach(section => observer.observe(section));
  }

  /* ==========================================================================
     HELPERS Y UTILIDADES
     ========================================================================== */
  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function formatPercentage(score) {
    if (typeof score !== 'number' || isNaN(score)) return '0.0%';
    return (score * 100).toFixed(2) + '%';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Ejecutar arranque
  init();
});
