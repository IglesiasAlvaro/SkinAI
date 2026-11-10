/**
 * SkinAI — Controlador de la Interfaz de Usuario (UI/UX)
 * 
 * Gestiona la interacción del usuario: arrastrar y soltar, vista previa con
 * metadatos reales, validación de 10 MB, escáner visual, visualización de las
 * siete clases, asistente virtual RAG (chatbot) y configuración dual de la API.
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
    askChatAboutResultBtn: document.getElementById('askChatAboutResultBtn'),

    // Estado API y Modal
    apiStatusBtn: document.getElementById('apiStatusBtn'),
    apiStatusText: document.getElementById('apiStatusText'),
    apiModal: document.getElementById('apiModal'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    footerConfigBtn: document.getElementById('footerConfigBtn'),
    predictUrlInput: document.getElementById('predictUrlInput'),
    chatUrlInput: document.getElementById('chatUrlInput'),
    predictStatusBadge: document.getElementById('predictStatusBadge'),
    chatStatusBadge: document.getElementById('chatStatusBadge'),
    envToggleGroup: document.getElementById('envToggleGroup'),
    envActiveHint: document.getElementById('envActiveHint'),
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
    mainNav: document.getElementById('mainNav'),
    navChatLink: document.getElementById('navChatLink'),

    // Asistente Chatbot RAG
    chatWidget: document.getElementById('skinaiChatWidget'),
    chatToggleBtn: document.getElementById('chatToggleBtn'),
    chatDrawer: document.getElementById('chatDrawer'),
    chatCloseBtn: document.getElementById('chatCloseBtn'),
    chatMessages: document.getElementById('chatMessages'),
    chatForm: document.getElementById('chatForm'),
    chatInput: document.getElementById('chatInput'),
    chatSendBtn: document.getElementById('chatSendBtn'),
    chatChipsContainer: document.getElementById('chatChipsContainer'),
    chatWakingNotice: document.getElementById('chatWakingNotice')
  };

  // Estado reactivo de la aplicación
  let state = {
    selectedFile: null,
    previewUrl: null,
    isAnalyzing: false,
    isChatWaiting: false,
    isChatOpen: false,
    lastResults: null,
    apiStatus: 'checking', // 'checking' | 'connected' | 'disconnected' | 'demo'
    predictStatus: 'checking',
    chatStatus: 'checking',
    demoMode: SkinAIConfig.isDemoModeEnabled()
  };

  /* ==========================================================================
     INICIALIZACIÓN
     ========================================================================== */
  function init() {
    // 1. Despertar silencioso de AMBOS servidores de Render al cargar la página
    // Ignora cualquier error sin mostrárselo al usuario
    SkinAIApi.wakeupServers();

    // 2. Configurar listeners de interfaz
    setupEventListeners();
    setupDropZoneEvents();
    setupModalEvents();
    setupChatEvents();
    setupNavigationHighlight();

    // 3. Cargar valores en modal
    if (elements.predictUrlInput) elements.predictUrlInput.value = SkinAIConfig.getPredictApiUrl();
    if (elements.chatUrlInput) elements.chatUrlInput.value = SkinAIConfig.getChatApiUrl();
    if (elements.demoModeSwitch) elements.demoModeSwitch.checked = state.demoMode;
    updateEnvButtonsState();

    // 4. Verificar estado de las conexiones en segundo plano
    checkApiConnectionStatus();
  }

  /* ==========================================================================
     GESTIÓN DE EVENTOS GENERALES
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
    if (elements.removeImageBtn) {
      elements.removeImageBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        resetImageSelection();
      });
    }

    // Botón para iniciar análisis
    if (elements.analyzeBtn) {
      elements.analyzeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleStartAnalysis();
      });
    }

    // Cerrar notificación
    if (elements.closeNotificationBtn) {
      elements.closeNotificationBtn.addEventListener('click', () => {
        hideNotification();
      });
    }

    // Analizar otra imagen
    if (elements.analyzeNewBtn) {
      elements.analyzeNewBtn.addEventListener('click', () => {
        resetImageSelection();
        elements.dropZone.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }

    // Consultar resultado en el chat
    if (elements.askChatAboutResultBtn) {
      elements.askChatAboutResultBtn.addEventListener('click', () => {
        if (!state.lastResults || !state.lastResults.scores || state.lastResults.scores.length === 0) return;
        const topCode = state.lastResults.scores[0].code;
        const meta = SkinAIConfig.CLASSES_METADATA[topCode] || { shortName: topCode };
        const question = `¿Qué características tiene la clase ${meta.shortName} (${topCode}) identificada por el modelo?`;
        openChatDrawer();
        sendUserQuestion(question);
      });
    }

    // Enlace de chat en la barra de navegación
    if (elements.navChatLink) {
      elements.navChatLink.addEventListener('click', (e) => {
        e.preventDefault();
        toggleChatDrawer();
      });
    }

    // Copiar resultados al portapapeles
    if (elements.copyResultsBtn) {
      elements.copyResultsBtn.addEventListener('click', handleCopyResults);
    }

    // Descargar JSON de resultados
    if (elements.downloadJsonBtn) {
      elements.downloadJsonBtn.addEventListener('click', handleDownloadJson);
    }

    // Menú móvil
    if (elements.mobileMenuBtn) {
      elements.mobileMenuBtn.addEventListener('click', () => {
        const isOpen = elements.mainNav.classList.toggle('open');
        elements.mobileMenuBtn.setAttribute('aria-expanded', isOpen);
      });
    }

    // Cerrar menú móvil al hacer clic en un enlace
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        if (elements.mainNav) elements.mainNav.classList.remove('open');
        if (elements.mobileMenuBtn) elements.mobileMenuBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ==========================================================================
     ZONA DE ARRASTRAR Y SOLTAR (DROPZONE)
     ========================================================================== */
  function setupDropZoneEvents() {
    const dropZone = elements.dropZone;
    const fileInput = elements.fileInput;
    if (!dropZone || !fileInput) return;

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

    if (!file) return;

    // Validar tamaño (10 MB máximo)
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

    // Validar tipo de formato (JPEG, JPG, PNG)
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

    // Guardar imagen en estado reactivo
    state.selectedFile = file;

    if (state.previewUrl) {
      URL.revokeObjectURL(state.previewUrl);
    }
    state.previewUrl = URL.createObjectURL(file);

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

    elements.dropZone.classList.add('has-file');
    elements.dropZonePrompt.classList.add('hidden');
    elements.previewArea.classList.remove('hidden');
    elements.analyzeBtn.disabled = false;

    resetFileInputOnly();
  }

  function resetImageSelection() {
    state.selectedFile = null;
    if (state.previewUrl) {
      URL.revokeObjectURL(state.previewUrl);
      state.previewUrl = null;
    }
    resetFileInputOnly();
    if (elements.dropZone) elements.dropZone.classList.remove('has-file');
    if (elements.imagePreview) elements.imagePreview.src = '';
    if (elements.previewArea) elements.previewArea.classList.add('hidden');
    if (elements.dropZonePrompt) elements.dropZonePrompt.classList.remove('hidden');
    if (elements.scannerOverlay) elements.scannerOverlay.classList.add('hidden');
    if (elements.analyzeBtn) elements.analyzeBtn.disabled = true;
    hideNotification();
    hideResults();
  }

  function resetFileInputOnly() {
    if (elements.fileInput) elements.fileInput.value = '';
  }

  /* ==========================================================================
     FLUJO DE ANÁLISIS DE LA IMAGEN (POST /predict)
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

    updateLoadingStep(1, 'Validando imagen en memoria del cliente...');
    await delay(250);

    updateLoadingStep(2, 'Preparando payload multipart/form-data (campo "file")...');
    await delay(250);

    let wakingTimer = null;

    try {
      let inferenceResult;

      if (state.demoMode) {
        updateLoadingStep(3, 'Generando puntuaciones (Modo Demostración activo)...');
        await delay(800);
        inferenceResult = SkinAIApi.generateDemoScores();
      } else {
        updateLoadingStep(3, 'Enviando imagen a FastAPI (POST /predict)...');

        // Muestra el mensaje si la respuesta tarda más de 8 segundos
        wakingTimer = setTimeout(() => {
          if (state.isAnalyzing) {
            updateLoadingStep(3, 'El servidor está despertando, esto puede tardar hasta un minuto...');
          }
        }, 8000);

        // Envía la imagen usando PREDICT_API_URL exclusivamente
        inferenceResult = await SkinAIApi.predictImage(state.selectedFile);
      }

      updateLoadingStep(4, 'Normalizando vector de 7 clases...');
      await delay(200);

      renderInferenceResults(inferenceResult);

    } catch (err) {
      console.error('Error durante el análisis:', err);
      // Mensaje de error claro en español dentro de la interfaz sin pantallas en blanco
      showNotification('error', 'No se pudo completar el análisis', err.message);
    } finally {
      if (wakingTimer) clearTimeout(wakingTimer);
      setAnalyzingState(false);
    }
  }

  function setAnalyzingState(isAnalyzing) {
    state.isAnalyzing = isAnalyzing;
    if (elements.analyzeBtn) elements.analyzeBtn.disabled = isAnalyzing;
    if (elements.removeImageBtn) elements.removeImageBtn.disabled = isAnalyzing;
    if (elements.changeImageBtn) elements.changeImageBtn.disabled = isAnalyzing;

    if (isAnalyzing) {
      if (elements.scannerOverlay) elements.scannerOverlay.classList.remove('hidden');
      if (elements.loadingState) elements.loadingState.classList.remove('hidden');
    } else {
      if (elements.scannerOverlay) elements.scannerOverlay.classList.add('hidden');
      if (elements.loadingState) elements.loadingState.classList.add('hidden');
    }
  }

  function updateLoadingStep(stepNumber, text) {
    if (elements.loadingStepText) elements.loadingStepText.textContent = text;
    const percentages = [20, 45, 75, 95];
    const pct = percentages[stepNumber - 1] || 50;
    if (elements.loadingProgressBar) elements.loadingProgressBar.style.width = `${pct}%`;
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

    if (result.source === 'demo') {
      elements.resultsStatusChip.className = 'results-status-chip demo';
      elements.resultsChipText.textContent = 'Modo Demostración (Simulado)';
    } else {
      elements.resultsStatusChip.className = 'results-status-chip';
      elements.resultsChipText.textContent = 'Inferencia Real Completada';
    }

    elements.modelVersionTag.textContent = `Modelo: ${result.modelVersion || 'SkinAI v2'}`;

    const top = scores[0];
    const topMeta = SkinAIConfig.CLASSES_METADATA[top.code] || {
      shortName: top.code,
      description: 'Clase dermatológica experimental.'
    };

    elements.topClassCode.textContent = top.code;
    elements.topClassName.textContent = topMeta.shortName;
    elements.topClassDesc.textContent = topMeta.description;
    elements.topClassScore.textContent = formatPercentage(top.score);

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

      setTimeout(() => {
        const fill = row.querySelector('.score-fill');
        if (fill) {
          const widthPct = Math.max(item.score * 100, 1.5);
          fill.style.width = `${widthPct}%`;
        }
      }, 50 + index * 35);
    });

    elements.resultsArea.classList.remove('hidden');
    elements.resultsArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideResults() {
    if (elements.resultsArea) elements.resultsArea.classList.add('hidden');
  }

  /* ==========================================================================
     NOTIFICACIONES DEL SISTEMA
     ========================================================================== */
  function showNotification(type, title, message, actionHtml = '') {
    if (!elements.statusNotification) return;
    elements.statusNotification.className = `status-notification ${type}`;
    elements.notificationTitle.textContent = title;
    elements.notificationMessage.textContent = message;
    
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
    if (elements.statusNotification) elements.statusNotification.classList.add('hidden');
  }

  /* ==========================================================================
     ASISTENTE DERMATOLÓGICO RAG (CHATBOT)
     ========================================================================== */
  function setupChatEvents() {
    if (!elements.chatToggleBtn || !elements.chatDrawer) return;

    // Abrir/cerrar chat flotante
    elements.chatToggleBtn.addEventListener('click', toggleChatDrawer);

    if (elements.chatCloseBtn) {
      elements.chatCloseBtn.addEventListener('click', closeChatDrawer);
    }

    // Envío del formulario de chat
    if (elements.chatForm) {
      elements.chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = elements.chatInput.value.trim();
        if (text) {
          sendUserQuestion(text);
        }
      });
    }

    // Chips de preguntas sugeridas
    if (elements.chatChipsContainer) {
      elements.chatChipsContainer.addEventListener('click', (e) => {
        const chip = e.target.closest('.chat-chip');
        if (chip && chip.dataset.question) {
          sendUserQuestion(chip.dataset.question);
        }
      });
    }
  }

  function toggleChatDrawer() {
    if (state.isChatOpen) {
      closeChatDrawer();
    } else {
      openChatDrawer();
    }
  }

  function openChatDrawer() {
    state.isChatOpen = true;
    elements.chatDrawer.classList.remove('hidden');
    elements.chatToggleBtn.setAttribute('aria-expanded', 'true');
    const openIcon = elements.chatToggleBtn.querySelector('.icon-chat-open');
    const closeIcon = elements.chatToggleBtn.querySelector('.icon-chat-close');
    if (openIcon) openIcon.classList.add('hidden');
    if (closeIcon) closeIcon.classList.remove('hidden');
    setTimeout(() => {
      if (elements.chatInput) elements.chatInput.focus();
    }, 150);
  }

  function closeChatDrawer() {
    state.isChatOpen = false;
    elements.chatDrawer.classList.add('hidden');
    elements.chatToggleBtn.setAttribute('aria-expanded', 'false');
    const openIcon = elements.chatToggleBtn.querySelector('.icon-chat-open');
    const closeIcon = elements.chatToggleBtn.querySelector('.icon-chat-close');
    if (openIcon) openIcon.classList.remove('hidden');
    if (closeIcon) closeIcon.classList.add('hidden');
  }

  /**
   * Envía una pregunta al servicio de Chatbot (POST /chat usando CHAT_API_URL exclusivamente)
   */
  async function sendUserQuestion(question) {
    if (state.isChatWaiting || !question || question.trim().length < 3) return;

    const cleanQ = question.trim();
    appendChatMessage('user', cleanQ);
    if (elements.chatInput) elements.chatInput.value = '';

    setChatLoading(true);

    // Muestra el mensaje si la respuesta tarda más de 8 segundos
    const wakingTimer = setTimeout(() => {
      if (state.isChatWaiting && elements.chatWakingNotice) {
        elements.chatWakingNotice.classList.remove('hidden');
      }
    }, 8000);

    try {
      // Usar CHAT_API_URL exclusivamente para /chat
      const response = await SkinAIApi.sendChatMessage(cleanQ);

      // Renderizar respuesta del bot y fuentes si existen
      appendChatMessage('bot', response.answer, response.sources);

    } catch (err) {
      console.error('Error en servicio de Chatbot:', err);
      // Mensaje estándar claro en español sin errores técnicos
      appendChatErrorMessage(err.message || 'No se pudo conectar con el servidor.');
    } finally {
      if (wakingTimer) clearTimeout(wakingTimer);
      if (elements.chatWakingNotice) elements.chatWakingNotice.classList.add('hidden');
      setChatLoading(false);
    }
  }

  function setChatLoading(isLoading) {
    state.isChatWaiting = isLoading;
    if (elements.chatSendBtn) elements.chatSendBtn.disabled = isLoading;
    if (elements.chatInput) elements.chatInput.disabled = isLoading;

    if (isLoading) {
      // Indicador de escritura
      const typingRow = document.createElement('div');
      typingRow.id = 'chatTypingRow';
      typingRow.className = 'chat-msg-row bot';
      typingRow.innerHTML = `
        <div class="chat-msg-bubble">
          <div class="waking-spinner" style="display:inline-block; vertical-align:middle; margin-right:6px;"></div>
          <em>Consultando base de conocimiento RAG...</em>
        </div>
      `;
      elements.chatMessages.appendChild(typingRow);
      scrollChatToBottom();
    } else {
      const typingRow = document.getElementById('chatTypingRow');
      if (typingRow) typingRow.remove();
      if (elements.chatInput) elements.chatInput.focus();
    }
  }

  function appendChatMessage(sender, text, sources = []) {
    const row = document.createElement('div');
    row.className = `chat-msg-row ${sender}`;

    let sourcesHtml = '';
    if (sources && sources.length > 0) {
      const items = sources.map(s => `<li>${escapeHtml(s)}</li>`).join('');
      sourcesHtml = `
        <div class="chat-sources-block">
          <div class="chat-sources-title">📚 Documentos consultados:</div>
          <ul class="chat-sources-list">${items}</ul>
        </div>
      `;
    }

    row.innerHTML = `
      <div class="chat-msg-bubble">
        <p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>
        ${sourcesHtml}
      </div>
    `;

    elements.chatMessages.appendChild(row);
    scrollChatToBottom();
  }

  function appendChatErrorMessage(errorMsg) {
    const row = document.createElement('div');
    row.className = 'chat-msg-row bot';
    row.innerHTML = `
      <div class="chat-msg-bubble chat-msg-error">
        <strong>⚠️ ${escapeHtml(errorMsg)}</strong>
      </div>
    `;
    elements.chatMessages.appendChild(row);
    scrollChatToBottom();
  }

  function scrollChatToBottom() {
    if (elements.chatMessages) {
      elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    }
  }

  /* ==========================================================================
     MODAL DE CONFIGURACIÓN Y ESTADO DE LAS APIS
     ========================================================================== */
  function setupModalEvents() {
    if (elements.apiStatusBtn) elements.apiStatusBtn.addEventListener('click', openApiModal);
    if (elements.footerConfigBtn) elements.footerConfigBtn.addEventListener('click', openApiModal);

    if (elements.closeModalBtn) elements.closeModalBtn.addEventListener('click', closeApiModal);
    if (elements.apiModal) {
      elements.apiModal.addEventListener('click', (e) => {
        if (e.target === elements.apiModal) closeApiModal();
      });
    }

    // Selector rápido de entorno (auto, production, local)
    if (elements.envToggleGroup) {
      elements.envToggleGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-env-opt');
        if (btn && btn.dataset.env) {
          handleEnvironmentChange(btn.dataset.env);
        }
      });
    }

    // Botón para probar ambas conexiones
    if (elements.testConnectionBtn) {
      elements.testConnectionBtn.addEventListener('click', handleTestBothConnections);
    }

    // Acordeón Colab / Entornos
    if (elements.colabAccordionToggle) {
      elements.colabAccordionToggle.addEventListener('click', () => {
        const accordion = elements.colabAccordionToggle.parentElement;
        const body = elements.colabAccordionBody;
        const isOpen = accordion.classList.toggle('open');
        body.classList.toggle('hidden', !isOpen);
      });
    }

    // Modo Demostración Switch
    if (elements.demoModeSwitch) {
      elements.demoModeSwitch.addEventListener('change', (e) => {
        enableDemoMode(e.target.checked);
      });
    }

    // Restaurar URLs por defecto
    if (elements.resetUrlBtn) {
      elements.resetUrlBtn.addEventListener('click', () => {
        const defPredict = SkinAIConfig.resetPredictApiUrl();
        const defChat    = SkinAIConfig.resetChatApiUrl();
        if (elements.predictUrlInput) elements.predictUrlInput.value = defPredict;
        if (elements.chatUrlInput) elements.chatUrlInput.value = defChat;
        showConnectionFeedback('info', `URLs restauradas a los valores del entorno activo. Pulsa "Comprobar" para verificar.`);
      });
    }

    // Guardar configuración
    if (elements.saveApiConfigBtn) {
      elements.saveApiConfigBtn.addEventListener('click', () => {
        const newPredict = elements.predictUrlInput.value.trim();
        const newChat    = elements.chatUrlInput.value.trim();

        if (!newPredict || !newChat) {
          showConnectionFeedback('error', 'Por favor ingresa una URL válida para ambos servicios.');
          return;
        }

        SkinAIConfig.setPredictApiUrl(newPredict);
        SkinAIConfig.setChatApiUrl(newChat);
        closeApiModal();
        checkApiConnectionStatus();
      });
    }
  }

  function handleEnvironmentChange(env) {
    SkinAIConfig.setEnvironment(env);
    updateEnvButtonsState();

    // Actualizar inputs con los valores correspondientes
    if (elements.predictUrlInput) {
      elements.predictUrlInput.value = SkinAIConfig.isLocalMode() ? SkinAIConfig.LOCAL_PREDICT_URL : SkinAIConfig.PRODUCTION_PREDICT_URL;
    }
    if (elements.chatUrlInput) {
      elements.chatUrlInput.value = SkinAIConfig.isLocalMode() ? SkinAIConfig.LOCAL_CHAT_URL : SkinAIConfig.PRODUCTION_CHAT_URL;
    }

    showConnectionFeedback('info', `Entorno cambiado a "${env}". Haz clic en "Comprobar ambas conexiones" o en "Guardar configuración".`);
  }

  function updateEnvButtonsState() {
    if (!elements.envToggleGroup) return;
    const current = SkinAIConfig.getEnvironment();
    elements.envToggleGroup.querySelectorAll('.btn-env-opt').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.env === current);
    });

    if (elements.envActiveHint) {
      const mode = SkinAIConfig.isLocalMode() ? 'Desarrollo Local (127.0.0.1)' : 'Producción en la Nube (Render)';
      elements.envActiveHint.textContent = `Entorno efectivo actual: ${mode}`;
    }
  }

  function openApiModal() {
    if (elements.predictUrlInput) elements.predictUrlInput.value = SkinAIConfig.getPredictApiUrl();
    if (elements.chatUrlInput) elements.chatUrlInput.value = SkinAIConfig.getChatApiUrl();
    if (elements.demoModeSwitch) elements.demoModeSwitch.checked = state.demoMode;
    if (elements.connectionFeedback) elements.connectionFeedback.classList.add('hidden');
    updateEnvButtonsState();
    elements.apiModal.classList.remove('hidden');
  }

  function closeApiModal() {
    if (elements.apiModal) elements.apiModal.classList.add('hidden');
  }

  /**
   * Comprueba ambas conexiones en paralelo y actualiza la retroalimentación
   */
  async function handleTestBothConnections() {
    const inputPredict = elements.predictUrlInput ? elements.predictUrlInput.value.trim() : '';
    const inputChat    = elements.chatUrlInput ? elements.chatUrlInput.value.trim() : '';

    if (!inputPredict || !inputChat) {
      showConnectionFeedback('error', 'Por favor especifica las URLs de ambos servicios antes de comprobar.');
      return;
    }

    elements.testSpinner.classList.remove('hidden');
    elements.testConnectionBtn.disabled = true;
    updateBadge(elements.predictStatusBadge, 'checking', 'Probando...');
    updateBadge(elements.chatStatusBadge, 'checking', 'Probando...');

    try {
      const [resPredict, resChat] = await Promise.all([
        SkinAIApi.checkPredictHealth(inputPredict),
        SkinAIApi.checkChatHealth(inputChat)
      ]);

      state.predictStatus = resPredict.ok ? 'connected' : 'disconnected';
      state.chatStatus    = resChat.ok ? 'connected' : 'disconnected';

      updateBadge(elements.predictStatusBadge, state.predictStatus, resPredict.ok ? 'Conectado' : 'Desconectado');
      updateBadge(elements.chatStatusBadge, state.chatStatus, resChat.ok ? 'Conectado' : 'Desconectado');

      if (resPredict.ok && resChat.ok) {
        showConnectionFeedback('success', '✓ ¡Ambos servicios (Predicción y Chatbot) están en línea y saludables!');
        updateApiStatusIndicator('connected', 'API: Conectada');
      } else if (resPredict.ok && !resChat.ok) {
        showConnectionFeedback('warning', '⚠️ Servicio de Predicción conectado, pero Chatbot no respondió. Si Render estaba en reposo, dale unos segundos.');
        updateApiStatusIndicator('connected', 'API: Predicción OK');
      } else if (!resPredict.ok && resChat.ok) {
        showConnectionFeedback('warning', '⚠️ Servicio de Chatbot conectado, pero Predicción no respondió.');
        updateApiStatusIndicator('connected', 'API: Chat OK');
      } else {
        showConnectionFeedback('error', '✕ Ninguno de los dos servicios respondió. Comprueba tu conexión o espera el arranque en frío.');
        updateApiStatusIndicator('disconnected', 'API: Desconectada');
      }

    } catch (e) {
      showConnectionFeedback('error', `✕ Error inesperado durante la comprobación: ${e.message}`);
    } finally {
      elements.testSpinner.classList.add('hidden');
      elements.testConnectionBtn.disabled = false;
    }
  }

  function updateBadge(badgeEl, status, text) {
    if (!badgeEl) return;
    badgeEl.className = `service-status-badge ${status}`;
    badgeEl.textContent = text;
  }

  function showConnectionFeedback(type, message) {
    if (!elements.connectionFeedback) return;
    elements.connectionFeedback.className = `connection-feedback ${type}`;
    elements.connectionFeedback.textContent = message;
    elements.connectionFeedback.classList.remove('hidden');
  }

  function enableDemoMode(enabled) {
    state.demoMode = enabled;
    SkinAIConfig.setDemoModeEnabled(enabled);
    if (elements.demoModeSwitch) elements.demoModeSwitch.checked = enabled;

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
   * Consulta periódica o puntual del estado de conexión de las APIs
   */
  async function checkApiConnectionStatus() {
    if (state.demoMode) {
      updateApiStatusIndicator('demo', 'API: Modo Demo');
      return;
    }

    updateApiStatusIndicator('checking', 'API: Verificando...');

    // Comprobar salud en segundo plano
    const resPredict = await SkinAIApi.checkPredictHealth();
    if (resPredict.ok) {
      updateApiStatusIndicator('connected', 'API: Conectada');
      updateBadge(elements.predictStatusBadge, 'connected', 'Conectado');
    } else {
      updateApiStatusIndicator('disconnected', 'API: Desconectada');
      updateBadge(elements.predictStatusBadge, 'disconnected', 'Desconectado');
    }
  }

  function updateApiStatusIndicator(status, text) {
    state.apiStatus = status;
    if (elements.apiStatusBtn) elements.apiStatusBtn.className = `api-status-btn ${status}`;
    if (elements.apiStatusText) elements.apiStatusText.textContent = text;
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

  // Iniciar ejecución
  init();
});
