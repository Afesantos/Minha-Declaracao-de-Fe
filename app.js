// =========================================================
// MINHA DECLARAÇÃO DE FÉ — CLIENT-SIDE JAVASCRIPT
// =========================================================

const HABAKKUK_DOC_ID = 'habacuque-fixo';
const HABAKKUK_DECLARATION = {
  id: HABAKKUK_DOC_ID,
  name: 'Profeta Habacuque',
  declaration: 'Ainda que a figueira não floresça, nem haja fruto na vide; ainda que decepcione o produto da oliveira, e os campos não produzam mantimento; ainda que as ovelhas da malhada sejam arrebatadas, e nos currais não haja gado; todavia eu me alegrarei no SENHOR e exultarei no Deus da minha salvação.',
  color_theme: 'amarelo-suave',
  rotation: 0,
  amen_count: 0,
  is_pinned: 1,
  created_at: '2026-09-24T18:20:59.000Z'
};

const AUTHOR_TOKENS_KEY = 'minha_declaracao_de_fe_author_tokens';

// =========================================================
// VARIÁVEL DE CONTROLE ADMINISTRATIVO (RESET DO MURAL)
// =========================================================
// Valor padrão: 0 (não deleta).
// Quando o logotipo no rodapé é clicado 2 vezes, Deletar_TODAS_Declaracoes torna-se 1.
// Em seguida, o card que for clicado 2 vezes será excluído e a variável retorna para 0.
let Deletar_TODAS_Declaracoes = 0;

function updateAdminIndicator() {
  const icon = document.getElementById('admin-indicator-icon') || document.querySelector('.admin-indicator-icon');
  if (icon) {
    icon.style.display = (Deletar_TODAS_Declaracoes === 1) ? 'inline-block' : 'none';
  }
}

async function adminDeleteCard(id, isHabakkuk) {
  if (isHabakkuk || id === HABAKKUK_DOC_ID) {
    if (typeof showToast === 'function') {
      showToast('A declaração de Habacuque permanece fixa e não pode ser excluída.', '⚠️');
    }
    Deletar_TODAS_Declaracoes = 0;
    updateAdminIndicator();
    return;
  }
  try {
    const { db, doc, deleteDoc } = window.FirebaseDB;
    if (!deleteDoc) return;
    await deleteDoc(doc(db, "declarations", id));
    removeAuthorToken(id);
    console.warn(`⚠️ [ADMIN RESET] Card ${id} foi excluído com sucesso.`);
    if (typeof showToast === 'function') {
      showToast('Declaração excluída com sucesso.', '🗑️');
    }
  } catch (err) {
    console.error('Erro ao excluir card em modo admin:', err);
    if (typeof showToast === 'function') {
      showToast('Erro ao excluir declaração.', '⚠️');
    }
  } finally {
    Deletar_TODAS_Declaracoes = 0;
    updateAdminIndicator();
  }
}

function sanitizeText(value) {
  if (typeof value !== 'string') return '';
  return value.trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

let authorTokensCache = null;
const sessionAuthorIds = new Set();
const AUTHOR_PREFIX = 'faith_author_token_';

function getAuthorTokens() {
  if (!authorTokensCache) {
    try {
      authorTokensCache = JSON.parse(localStorage.getItem(AUTHOR_TOKENS_KEY) || '{}');
    } catch {
      authorTokensCache = {};
    }
  }
  return authorTokensCache;
}

function isAuthorId(id) {
  if (!id || id === HABAKKUK_DOC_ID) return false;
  return Boolean(localStorage.getItem(AUTHOR_PREFIX + id) || getAuthorTokens()[id]);
}

function saveAuthorToken(id) {
  if (!id) return;
  sessionAuthorIds.add(id);
  try {
    localStorage.setItem(AUTHOR_PREFIX + id, 'true');
  } catch (e) {
    console.warn('Erro ao salvar token de autor individual:', e);
  }
  const tokens = getAuthorTokens();
  tokens[id] = true;
  authorTokensCache = tokens;
  try {
    localStorage.setItem(AUTHOR_TOKENS_KEY, JSON.stringify(tokens));
  } catch (e) {
    console.warn('Erro ao salvar token de autor no localStorage:', e);
  }
}

function removeAuthorToken(id) {
  if (!id) return;
  sessionAuthorIds.delete(id);
  try {
    localStorage.removeItem(AUTHOR_PREFIX + id);
  } catch (e) {}
  const tokens = getAuthorTokens();
  delete tokens[id];
  authorTokensCache = tokens;
  try {
    localStorage.setItem(AUTHOR_TOKENS_KEY, JSON.stringify(tokens));
  } catch (e) {
    console.warn('Erro ao remover token de autor do localStorage:', e);
  }
}

const FaithStorage = {
  listenToDeclarations(callback) {
    const { db, collection, query, orderBy, onSnapshot } = window.FirebaseDB;
    const q = query(collection(db, "declarations"), orderBy("created_at", "desc"));

    // Tenta sincronizar a declaração de fé de Habacuque no Firestore se não existir
    this.ensureHabakkuk();

    return onSnapshot(q, (snapshot) => {
      let items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Garante que a declaração de fé de Habacuque esteja sempre presente
      const hasHabakkuk = items.some(item =>
        item.id === HABAKKUK_DOC_ID ||
        item.is_pinned === 1 ||
        (item.name && item.name.toLowerCase().includes('habacuque'))
      );

      if (!hasHabakkuk) {
        items.unshift({ ...HABAKKUK_DECLARATION });
      }

      // Ordena garantindo que itens fixados (como Habacuque) fiquem sempre no topo
      items.sort((a, b) => {
        const pinA = (a.is_pinned || a.id === HABAKKUK_DOC_ID || (a.name && a.name.toLowerCase().includes('habacuque'))) ? 1 : 0;
        const pinB = (b.is_pinned || b.id === HABAKKUK_DOC_ID || (b.name && b.name.toLowerCase().includes('habacuque'))) ? 1 : 0;
        return pinB - pinA;
      });

      callback(items);
    }, (error) => console.error("Erro ao escutar declarações:", error));
  },

  async ensureHabakkuk() {
    try {
      const { db, doc, getDoc, setDoc } = window.FirebaseDB;
      if (!getDoc || !setDoc) return;
      const docRef = doc(db, "declarations", HABAKKUK_DOC_ID);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        const { id, ...data } = HABAKKUK_DECLARATION;
        await setDoc(docRef, data);
      }
    } catch (e) {
      // Ignora silenciosamente caso o Firestore esteja inacessível no momento
    }
  },

  async add({ name, declaration, color_theme }) {
    const { db, collection, doc, setDoc } = window.FirebaseDB;
    const themes = ['amarelo-suave', 'azul-claro', 'verde-suave', 'coral', 'gelo', 'creme'];
    const selectedTheme = themes.includes(color_theme) ? color_theme : themes[Math.floor(Math.random() * themes.length)];

    const newItem = {
      name: sanitizeText(name),
      declaration: sanitizeText(declaration),
      color_theme: selectedTheme,
      rotation: Number((Math.random() * 2 - 1).toFixed(2)),
      amen_count: 0,
      is_pinned: 0,
      created_at: new Date().toISOString()
    };

    // Pre-gera a referência com ID síncrono no cliente
    const newDocRef = doc(collection(db, "declarations"));
    const id = newDocRef.id;

    // Registra a autoria na memória e no localStorage IMEDIATAMENTE antes de gravar no Firestore
    saveAuthorToken(id);

    // Grava no Firestore
    await setDoc(newDocRef, newItem);

    return { id, ...newItem };
  },

  async addAmen(id) {
    const { db, doc, updateDoc, increment, setDoc } = window.FirebaseDB;
    const docRef = doc(db, "declarations", id);
    try {
      await updateDoc(docRef, {
        amen_count: increment(1)
      });
    } catch (err) {
      if (id === HABAKKUK_DOC_ID && setDoc) {
        const { id: _, ...data } = HABAKKUK_DECLARATION;
        await setDoc(docRef, {
          ...data,
          amen_count: increment(1)
        }, { merge: true });
      } else {
        throw err;
      }
    }
  },

  async update(id, { name, declaration }) {
    if (id === HABAKKUK_DOC_ID) {
      throw new Error('A declaração de fé de Habacuque permanece sempre fixa no mural e não pode ser editada.');
    }
    if (!isAuthorId(id)) {
      throw new Error('Este navegador não possui autorização para editar esta declaração.');
    }
    const { db, doc, updateDoc } = window.FirebaseDB;
    await updateDoc(doc(db, "declarations", id), {
      name: sanitizeText(name),
      declaration: sanitizeText(declaration),
      updated_at: new Date().toISOString()
    });
  },

  async delete(id) {
    if (id === HABAKKUK_DOC_ID) {
      throw new Error('A declaração de fé de Habacuque permanece sempre fixa no mural e não pode ser excluída.');
    }
    if (!isAuthorId(id)) {
      throw new Error('Este navegador não possui autorização para excluir esta declaração.');
    }
    const { db, doc, deleteDoc } = window.FirebaseDB;
    await deleteDoc(doc(db, "declarations", id));
    removeAuthorToken(id);
  },

  async getStats(items = []) {
    return {
      total_declarations: items.length,
      total_amens: items.reduce((total, item) => total + (item.amen_count || 0), 0)
    };
  }
};

// =========================================================
// APPLICATION LOGIC & UI
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Registro do Service Worker para suporte completo PWA no Android/iOS
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js?v=2').catch((err) => {
      console.warn('Registro do Service Worker:', err);
    });
  }

  // Atualiza o estado do ícone indicador administrativo se Deletar_TODAS_Declaracoes === 1
  updateAdminIndicator();

  // DOM Elements
  const form = document.getElementById('faith-form');
  const declarationInput = document.getElementById('declaration-input');
  const nameInput = document.getElementById('name-input');
  const charCounter = document.getElementById('char-counter');
  const btnSubmit = document.getElementById('btn-submit');
  const muralGrid = document.getElementById('mural-grid');
  const emptyState = document.getElementById('mural-empty-state');

  const statDeclarations = document.getElementById('stat-declarations');
  const statAmens = document.getElementById('stat-amens');
  const successModal = document.getElementById('success-modal');
  const btnModalClose = document.getElementById('btn-modal-close');
  const btnModalShare = document.getElementById('btn-modal-share');
  const modalCardPreview = document.getElementById('modal-card-preview');
  const btnReadVerse = document.getElementById('btn-read-verse');
  const btnAmbientSound = document.getElementById('btn-ambient-sound');
  const toastContainer = document.getElementById('toast-container');
  let currentNewDeclaration = null;
  let isSpeaking = false;
  let isAmbientPlaying = false;
  const ambientAudio = new Audio(encodeURI('OraçãoHabacuque-Grupo-Águas.mp3'));
  ambientAudio.loop = true;
  ambientAudio.volume = 0.55;

  // Quando o logotipo no rodapé for clicado 2 vezes, alterna Deletar_TODAS_Declaracoes entre 0 e 1
  const footerLogo = document.querySelector('.footer-logo') || document.querySelector('.footer-cross') || document.querySelector('.site-footer img');
  if (footerLogo) {
    let lastToggleTime = 0;
    let logoClickTimer = null;
    let logoClickCount = 0;

    const toggleAdminMode = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      const now = Date.now();
      // Previne execução dupla consecutiva rápida do evento click + dblclick
      if (now - lastToggleTime < 400) return;
      lastToggleTime = now;

      Deletar_TODAS_Declaracoes = (Deletar_TODAS_Declaracoes === 1) ? 0 : 1;
      updateAdminIndicator();
      if (Deletar_TODAS_Declaracoes === 1) {
        console.warn('⚠️ [MODO ADMIN ATIVADO] Deletar_TODAS_Declaracoes = 1. Clique 2 vezes sobre o card que deseja excluir.');
      } else {
        console.warn('ℹ️ [MODO ADMIN DESATIVADO] Deletar_TODAS_Declaracoes = 0.');
      }
    };

    footerLogo.addEventListener('click', (e) => {
      logoClickCount++;
      if (logoClickCount === 1) {
        logoClickTimer = setTimeout(() => {
          logoClickCount = 0;
        }, 400);
      } else if (logoClickCount >= 2) {
        clearTimeout(logoClickTimer);
        logoClickCount = 0;
        toggleAdminMode(e);
      }
    });

    footerLogo.addEventListener('dblclick', toggleAdminMode);
  }

  // PWA Install Handler
  let deferredInstallPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    if (typeof showToast === 'function') {
      showToast('Aplicativo instalado com sucesso! 🎉', '📲');
    }
  });

  const btnInstallApp = document.getElementById('btn-install-app');
  if (btnInstallApp) {
    btnInstallApp.addEventListener('click', async (e) => {
      e.preventDefault();

      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
      if (isStandalone) {
        showToast('O aplicativo já está instalado no seu dispositivo! 📲', 'ℹ️');
        return;
      }

      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        if (outcome === 'accepted') {
          showToast('Instalação iniciada! 📲', '✅');
        }
        deferredInstallPrompt = null;
      } else {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS) {
          showToast('No iOS: toque no botão Compartilhar e escolha "Adicionar à Tela de Início" 📲', 'ℹ️');
        } else {
          showToast('Para instalar: toque no menu do seu navegador (⋮) e escolha "Instalar aplicativo" ou "Adicionar à tela inicial" 📲', 'ℹ️');
        }
      }
    });
  }

  // Set Year
  const yearEl = document.getElementById('current-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const DECOR_ICONS = ['🕊️', '✨', '🌿', '🌾', '📖', '🕯️', '🌸', '⚓'];

  const THEME_LABELS = {
    'amarelo-suave': 'Dourado',
    'azul-claro': 'Celeste',
    'verde-suave': 'Esperança',
    'coral': 'Coral',
    'gelo': 'Gelo',
    'lilas': 'Lilás',
    'azul-petroleo': 'Petróleo',
    'creme': 'Creme',
    'rosa-suave': 'Rosa'
  };

  // 1. CHARACTER COUNTERS
  declarationInput.addEventListener('input', () => {
    const len = declarationInput.value.length;
    charCounter.textContent = `${len.toLocaleString('pt-BR')} / 1.000`;
    if (len >= 950) {
      charCounter.style.color = '#dc2626';
    } else if (len >= 800) {
      charCounter.style.color = '#d97706';
    } else {
      charCounter.style.color = 'var(--color-text-subtle)';
    }
    clearError('declaration');
  });

  nameInput.addEventListener('input', () => {
    if (nameInput.value.length > 30) {
      nameInput.value = nameInput.value.substring(0, 30);
    }
    clearError('name');
  });

  // 2. ERROR FEEDBACK
  function showError(field, message) {
    const errorEl = document.getElementById(`${field}-error`);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('active');
    }
    const inputEl = document.getElementById(`${field}-input`);
    if (inputEl) {
      inputEl.style.borderColor = '#dc2626';
    }
  }

  function clearError(field) {
    const errorEl = document.getElementById(`${field}-error`);
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.remove('active');
    }
    const inputEl = document.getElementById(`${field}-input`);
    if (inputEl) {
      inputEl.style.borderColor = '';
    }
  }

  function showToast(message, icon = '✨') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(15px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }


  function getInitials(name) {
    if (!name) return 'FÉ';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'Recentemente';
    try {
      const date = new Date(dateStr);
      const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();

      const now = new Date();
      const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return `Hoje às ${timeStr}`;
      } else if (diffDays === 1) {
        return `Ontem às ${timeStr}`;
      } else {
        return `${day}/${month}/${year} às ${timeStr}`;
      }
    } catch (e) {
      return 'Recentemente';
    }
  }

  function truncateName(name, maxLength = 20) {
    if (!name) return '';
    const trimmed = name.trim();
    if (trimmed.length <= maxLength) return trimmed;
    return trimmed.substring(0, maxLength).trim() + '…';
  }

  function createCardElement(item, isNew = false) {
    const card = document.createElement('article');
    const theme = item.color_theme || 'amarelo-suave';
    const isHabakkuk = item.is_pinned === 1 || item.id === HABAKKUK_DOC_ID || (item.name && item.name.toLowerCase().includes('habacuque'));

    card.className = `faith-card theme-${theme} ${isHabakkuk ? 'card-pinned-habacuque' : ''} ${isNew ? 'card-new-entrance' : ''}`;
    card.dataset.id = item.id;

    const rotation = isHabakkuk ? 0 : (typeof item.rotation === 'number' ? item.rotation : 0);
    card.style.transform = `rotate(${rotation}deg)`;

    const iconIndex = typeof item.id === 'number'
      ? item.id
      : Math.abs(String(item.id || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
    const randomDecor = isHabakkuk ? '📜' : DECOR_ICONS[iconIndex % DECOR_ICONS.length];
    const themeLabel = isHabakkuk ? '🌟 Declaração de fé de HABACUQUE' : 'Ministério 50+ 2026';
    const initials = isHabakkuk ? 'HB' : getInitials(item.name);
    const dateFormatted = isHabakkuk ? 'Cerca de 620 a.C.' : formatDate(item.created_at);
    const canManage = !isHabakkuk && isAuthorId(item.id);
    const displayName = isHabakkuk ? item.name : truncateName(item.name, 20);

        card.innerHTML = `
      <div class="card-header-row ${isHabakkuk ? 'card-header-habacuque' : ''}" ${isHabakkuk ? 'style="display: flex; justify-content: center; align-items: center; width: 100%; text-align: center;"' : ''}>
        <span class="card-tag ${isHabakkuk ? 'tag-inaugural' : ''}" ${isHabakkuk ? 'style="margin: 0 auto; text-align: center; justify-content: center; display: inline-flex;"' : ''}>
          <i data-lucide="${isHabakkuk ? 'crown' : 'sparkle'}"></i> ${themeLabel}
        </span>
        ${isHabakkuk ? '' : `<span class="card-decor-icon">${randomDecor}</span>`}
      </div>

      <div class="card-quote-icon">“</div>

      <p class="card-body-text ${isHabakkuk ? 'text-habacuque' : ''}">${item.declaration}</p>

      <div class="card-footer-container">
        <div class="card-footer-row">
          <div class="card-author-info">
            <div class="card-avatar-initials ${isHabakkuk ? 'avatar-habacuque' : ''}">${initials}</div>
            <div class="card-author-meta">
              <span class="card-author-name" title="${item.name}">${displayName}</span>
              <span class="card-date">${dateFormatted}</span>
            </div>
          </div>

          <button class="btn-amen ${isHabakkuk ? 'btn-amen-habacuque' : ''}" data-id="${item.id}" title="Dizer Amém a esta declaração">
            <span class="amen-heart">🙏</span>
            <span class="amen-count">${item.amen_count || 0}</span>
          </button>
        </div>

        <div class="card-actions-group">
          <button class="btn-card-share" data-id="${item.id}" title="Compartilhar no WhatsApp">
            <i data-lucide="share-2"></i>
          </button>
          ${canManage ? `<button class="btn-card-edit" data-id="${item.id}" title="Editar minha declaração de fé" aria-label="Editar minha declaração de fé"><i data-lucide="edit-3"></i></button>` : ''}
          ${canManage ? `<button class="btn-card-delete" data-id="${item.id}" title="Excluir minha declaração de fé" aria-label="Excluir minha declaração de fé"><i data-lucide="trash-2"></i></button>` : ''}
        </div>
      </div>
    `;

    // Amen button action
    const btnAmen = card.querySelector('.btn-amen');
    btnAmen.addEventListener('click', () => handleAmen(item.id, btnAmen));

    // Share button action
    const btnShare = card.querySelector('.btn-card-share');
    btnShare.addEventListener('click', () => handleShare(item));

    const btnEdit = card.querySelector('.btn-card-edit');
    if (btnEdit) {
      btnEdit.addEventListener('click', () => openEditModal(item));
    }

    const btnDelete = card.querySelector('.btn-card-delete');
    if (btnDelete) {
      btnDelete.addEventListener('click', () => handleDelete(item.id, btnDelete));
    }

    // Evento de duplo clique no card para exclusão em modo administrativo
    let cardClickCount = 0;
    let cardClickTimer = null;
    let lastCardDeleteTime = 0;

    const handleCardAdminDoubleTap = (e) => {
      if (Deletar_TODAS_Declaracoes !== 1) return;
      if (e.target.closest('button') || e.target.closest('a')) return;

      const now = Date.now();
      if (now - lastCardDeleteTime < 400) return;

      cardClickCount++;
      if (cardClickCount === 1) {
        cardClickTimer = setTimeout(() => {
          cardClickCount = 0;
        }, 400);
      } else if (cardClickCount >= 2) {
        clearTimeout(cardClickTimer);
        cardClickCount = 0;
        lastCardDeleteTime = now;
        if (e) e.preventDefault();
        adminDeleteCard(item.id, isHabakkuk);
      }
    };

    card.addEventListener('click', (e) => {
      if (Deletar_TODAS_Declaracoes === 1) {
        handleCardAdminDoubleTap(e);
        return;
      }
      if (e.target.closest('button') || e.target.closest('a')) return;
      openLightboxModal(item);
    });

    card.addEventListener('dblclick', (e) => {
      if (Deletar_TODAS_Declaracoes === 1 && !e.target.closest('button') && !e.target.closest('a')) {
        const now = Date.now();
        if (now - lastCardDeleteTime < 400) return;
        lastCardDeleteTime = now;
        e.preventDefault();
        adminDeleteCard(item.id, isHabakkuk);
      }
    });

    return card;
  }

  function renderCards(declarations) {
    muralGrid.innerHTML = '';

    if (!declarations || declarations.length === 0) {
      emptyState.style.display = 'block';
      muralGrid.style.display = 'none';
      return;
    }

    emptyState.style.display = 'none';
    muralGrid.style.display = 'grid';

    declarations.forEach((item, index) => {
      const cardEl = createCardElement(item);
      cardEl.style.animationDelay = `${Math.min(index * 0.05, 0.45)}s`;
      cardEl.classList.add('card-stagger-fade');
      muralGrid.appendChild(cardEl);
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // 4. AMEN & SHARE
  async function handleDelete(id, buttonEl) {
    if (!window.confirm('Deseja excluir permanentemente sua declaração de fé?')) return;
    buttonEl.disabled = true;
    try {
      await FaithStorage.delete(id);
      showToast('Sua declaração de fé foi excluída.', '✅');
    } catch (error) {
      buttonEl.disabled = false;
      showToast(error.message || 'Não foi possível excluir a declaração.', '⚠️');
    }
  }

  async function handleAmen(id, buttonEl) {
    buttonEl.classList.add('clicked');
    let newCount;
    try {
      newCount = await FaithStorage.addAmen(id);
    } catch (error) {
      buttonEl.classList.remove('clicked');
      showToast(error.message || 'Não foi possível registrar o amém.', '⚠️');
      return;
    }

    const countEl = buttonEl.querySelector('.amen-count');
    if (countEl) countEl.textContent = newCount;

    // Small confetti burst
    const rect = buttonEl.getBoundingClientRect();
    if (window.confetti) {
      window.confetti({
        particleCount: 15,
        spread: 40,
        origin: {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height / 2) / window.innerHeight
        },
        colors: ['#f59e0b', '#10b981', '#3b82f6', '#ec4899']
      });
    }

    showToast('Amém! Sua votação foi registrada. 🙏', '❤️');
  }

  async function handleShare(item) {
    // Tenta encontrar o card no mural ou no modal
    const cardEl = document.querySelector(
      `.faith-card[data-id="${item.id}"]`
    );

    const shareUrl = `${window.location.origin}${window.location.pathname}#card-${item.id}`;
    const shareText = `🕊️ *Declaração de Fé de ${item.name}*\n\n“${item.declaration}”\n\n📖 Mural Coletivo • Ministério 50+\n👉 Veja o card no mural: ${shareUrl}`;

    // Se html2canvas disponível e card encontrado, tenta capturar imagem sem botões
    if (window.html2canvas && cardEl) {
      showToast('Preparando imagem do card… 🖼️', '⏳');
      try {
        cardEl.classList.add('capturing-image');
        const canvas = await window.html2canvas(cardEl, {
          scale: 2,
          useCORS: true,
          backgroundColor: null,
          logging: false
        });
        cardEl.classList.remove('capturing-image');

        canvas.toBlob(async (blob) => {
          if (!blob) throw new Error('Falha ao gerar imagem');

          const file = new File([blob], 'declaracao-de-fe.png', { type: 'image/png' });

          // Web Share API com arquivo e texto/link
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: 'Declaração de Fé',
                text: shareText
              });
              return;
            } catch (err) {
              if (err.name === 'AbortError') return; // Usuário cancelou
            }
          }

          // Fallback: baixa imagem e abre WhatsApp
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'declaracao-de-fe.png';
          a.click();
          URL.revokeObjectURL(url);

          const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
          window.open(whatsappUrl, '_blank');

          showToast('Imagem salva e WhatsApp aberto com o link! 📲', '✅');
        }, 'image/png');

        return;
      } catch (e) {
        if (cardEl) cardEl.classList.remove('capturing-image');
        console.warn('html2canvas falhou, usando compartilhamento por texto:', e);
      }
    }

    // Fallback sem imagem: WhatsApp com texto e link
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
    showToast('WhatsApp aberto para compartilhamento! 📲', '✅');
  }


  // 5. FORM SUBMISSION
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const declaration = declarationInput.value.trim();
    let name = nameInput.value.trim();
    if (name.length > 30) {
      name = name.substring(0, 30);
      nameInput.value = name;
    }

    let valid = true;

    if (!declaration) {
      showError('declaration', 'Por favor, escreva a sua declaração de fé antes de publicar.');
      declarationInput.focus();
      valid = false;
    } else if (declaration.length < 5) {
      showError('declaration', 'Sua declaração precisa ter pelo menos 5 caracteres.');
      declarationInput.focus();
      valid = false;
    } else if (declaration.length > 1000) {
      showError('declaration', 'A declaração não pode ultrapassar 1.000 caracteres.');
      declarationInput.focus();
      valid = false;
    }

    if (!name) {
      showError('name', 'Por favor, informe seu nome para assinar sua declaração.');
      if (valid) nameInput.focus();
      valid = false;
    } else if (name.length < 2) {
      showError('name', 'O nome deve ter pelo menos 2 caracteres.');
      if (valid) nameInput.focus();
      valid = false;
    }

    if (!valid) return;

    const selectedColorInput = document.querySelector('input[name="card-color"]:checked');
    const colorTheme = selectedColorInput ? selectedColorInput.value : 'random';

    // Estado visual do botão durante o envio
    const btnContent = btnSubmit.querySelector('.btn-content');
    const btnLoader = btnSubmit.querySelector('.btn-loader');
    if (btnContent) btnContent.style.display = 'none';
    if (btnLoader) btnLoader.style.display = 'inline-flex';
    btnSubmit.disabled = true;

    let newItem;
    try {
      newItem = await Promise.race([
        FaithStorage.add({ name, declaration, color_theme: colorTheme }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Tempo limite esgotado. Verifique sua conexão com a internet ou as permissões do Firestore.')), 10000))
      ]);

      currentNewDeclaration = newItem;

      // Reset Form
      form.reset();
      charCounter.textContent = '0 / 1.000';
      const randomRadio = document.querySelector('input[name="card-color"][value="random"]');
      if (randomRadio) randomRadio.checked = true;

      // Trigger celebration
      triggerCelebration();

      // Show Success Modal
      showSuccessModal(newItem);
    } catch (error) {
      showToast(error.message || 'Não foi possível salvar sua declaração. Tente novamente.', '⚠️');
    } finally {
      // Garante que o botão e o spinner nunca fiquem travados
      if (btnContent) btnContent.style.display = 'inline-flex';
      if (btnLoader) btnLoader.style.display = 'none';
      btnSubmit.disabled = false;
    }
  });

  function triggerCelebration() {
    if (!window.confetti) return;
    const count = 180;
    const defaults = { origin: { y: 0.7 } };

    function fire(particleRatio, opts) {
      window.confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55, colors: ['#f59e0b', '#3b82f6', '#10b981'] });
    fire(0.2, { spread: 60, colors: ['#fbbf24', '#60a5fa', '#f472b6'] });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  }

  function showSuccessModal(declaration) {
    modalCardPreview.innerHTML = '';
    const previewEl = createCardElement(declaration, false);
    previewEl.style.transform = 'none';
    modalCardPreview.appendChild(previewEl);

    if (window.lucide) {
      window.lucide.createIcons();
    }

    successModal.classList.add('active');
    successModal.setAttribute('aria-hidden', 'false');
  }

  function highlightAndScrollToCard(id) {
    const muralSec = document.getElementById('mural');
    if (muralSec) {
      muralSec.scrollIntoView({ behavior: 'smooth' });
    }
    setTimeout(() => {
      const cardEl = document.querySelector(`.faith-card[data-id="${id}"]`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        cardEl.classList.add('card-highlight-pulse');
        setTimeout(() => cardEl.classList.remove('card-highlight-pulse'), 3000);
      }
    }, 400);
  }

  btnModalClose.addEventListener('click', () => {
    successModal.classList.remove('active');
    successModal.setAttribute('aria-hidden', 'true');
    if (currentNewDeclaration && currentNewDeclaration.id) {
      highlightAndScrollToCard(currentNewDeclaration.id);
    } else {
      const muralSec = document.getElementById('mural');
      if (muralSec) {
        muralSec.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });

  const btnModalX = document.getElementById('btn-modal-x');
  if (btnModalX) {
    btnModalX.addEventListener('click', () => {
      successModal.classList.remove('active');
      successModal.setAttribute('aria-hidden', 'true');
      if (currentNewDeclaration && currentNewDeclaration.id) {
        highlightAndScrollToCard(currentNewDeclaration.id);
      }
    });
  }

  btnModalShare.addEventListener('click', () => {
    if (currentNewDeclaration) {
      handleShare(currentNewDeclaration);
    }
  });

  successModal.addEventListener('click', (e) => {
    if (e.target === successModal) {
      btnModalClose.click();
    }
  });

  // Edit Modal logic
  const editModal = document.getElementById('edit-modal');
  const editForm = document.getElementById('edit-faith-form');
  const editItemId = document.getElementById('edit-item-id');
  const editDeclarationInput = document.getElementById('edit-declaration-input');
  const editNameInput = document.getElementById('edit-name-input');
  const editCharCounter = document.getElementById('edit-char-counter');
  const btnEditCancel = document.getElementById('btn-edit-cancel');
  const btnEditModalX = document.getElementById('btn-edit-modal-x');
  const btnEditSubmit = document.getElementById('btn-edit-submit');

  function openEditModal(item) {
    if (!editModal) return;
    editItemId.value = item.id;
    editDeclarationInput.value = item.declaration || '';
    editNameInput.value = item.name || '';

    const len = editDeclarationInput.value.length;
    if (editCharCounter) {
      editCharCounter.textContent = `${len.toLocaleString('pt-BR')} / 1.000`;
    }
    clearError('edit-declaration');
    clearError('edit-name');

    editModal.classList.add('active');
    editModal.setAttribute('aria-hidden', 'false');

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function closeEditModal() {
    if (!editModal) return;
    editModal.classList.remove('active');
    editModal.setAttribute('aria-hidden', 'true');
  }

  if (btnEditCancel) btnEditCancel.addEventListener('click', closeEditModal);
  if (btnEditModalX) btnEditModalX.addEventListener('click', closeEditModal);
  if (editModal) {
    editModal.addEventListener('click', (e) => {
      if (e.target === editModal) closeEditModal();
    });
  }

  if (editDeclarationInput) {
    editDeclarationInput.addEventListener('input', () => {
      const len = editDeclarationInput.value.length;
      if (editCharCounter) {
        editCharCounter.textContent = `${len.toLocaleString('pt-BR')} / 1.000`;
        if (len >= 950) {
          editCharCounter.style.color = '#dc2626';
        } else if (len >= 800) {
          editCharCounter.style.color = '#d97706';
        } else {
          editCharCounter.style.color = 'var(--color-text-subtle)';
        }
      }
      clearError('edit-declaration');
    });
  }

  if (editNameInput) {
    editNameInput.addEventListener('input', () => {
      if (editNameInput.value.length > 30) {
        editNameInput.value = editNameInput.value.substring(0, 30);
      }
      clearError('edit-name');
    });
  }

  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = editItemId.value;
      const declaration = editDeclarationInput.value.trim();
      let name = editNameInput.value.trim();
      if (name.length > 30) {
        name = name.substring(0, 30);
        editNameInput.value = name;
      }

      let valid = true;

      if (!declaration) {
        showError('edit-declaration', 'Por favor, escreva a sua declaração de fé.');
        editDeclarationInput.focus();
        valid = false;
      } else if (declaration.length < 5) {
        showError('edit-declaration', 'Sua declaração precisa ter pelo menos 5 caracteres.');
        editDeclarationInput.focus();
        valid = false;
      } else if (declaration.length > 1000) {
        showError('edit-declaration', 'A declaração não pode ultrapassar 1.000 caracteres.');
        editDeclarationInput.focus();
        valid = false;
      }

      if (!name) {
        showError('edit-name', 'Por favor, informe seu nome.');
        if (valid) editNameInput.focus();
        valid = false;
      } else if (name.length < 2) {
        showError('edit-name', 'O nome deve ter pelo menos 2 caracteres.');
        if (valid) editNameInput.focus();
        valid = false;
      }

      if (!valid) return;

      btnEditSubmit.disabled = true;
      try {
        await FaithStorage.update(id, { name, declaration });
        closeEditModal();
        showToast('Sua declaração foi atualizada com sucesso! ✏️', '✅');
        highlightAndScrollToCard(id);
      } catch (error) {
        showToast(error.message || 'Não foi possível atualizar a declaração.', '⚠️');
      } finally {
        btnEditSubmit.disabled = false;
      }
    });
  }

  // 7. SCRIPTURE SPEECH SYNTHESIS & AMBIENT PEACE CHORDS
  btnReadVerse.addEventListener('click', () => {
    if (!('speechSynthesis' in window)) {
      showToast('Seu navegador não suporta leitura de voz.', '⚠️');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      isSpeaking = false;
      btnReadVerse.innerHTML = `<i data-lucide="volume-2"></i> <span>Ouvir passagem</span>`;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    const scriptureText = `Habacuque capítulo três, versículos dezessete e dezoito. Ainda que a figueira não floresça, nem haja fruto na vide; ainda que decepcione o produto da oliveira, e os campos não produzam mantimento; ainda que as ovelhas da malhada sejam arrebatadas, e nos currais não haja gado; todavia eu me alegrarei no Senhor e exultarei no Deus da minha salvação.`;

    const utterance = new SpeechSynthesisUtterance(scriptureText);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.92;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      isSpeaking = true;
      if (isAmbientPlaying) {
        ambientAudio.volume = 0.2;
      }
      btnReadVerse.innerHTML = `<i data-lucide="square"></i> <span>Parar leitura</span>`;
      if (window.lucide) window.lucide.createIcons();
    };

    utterance.onend = utterance.onerror = () => {
      isSpeaking = false;
      if (isAmbientPlaying) {
        ambientAudio.volume = 0.55;
      }
      btnReadVerse.innerHTML = `<i data-lucide="volume-2"></i> <span>Ouvir passagem</span>`;
      if (window.lucide) window.lucide.createIcons();
    };

    window.speechSynthesis.speak(utterance);
  });

  const spotifyEqualizer = document.getElementById('spotify-equalizer');
  function updateSpotifyEqualizer(playing) {
    if (spotifyEqualizer) {
      spotifyEqualizer.style.display = playing ? 'flex' : 'none';
    }
  }

  // Eventos do áudio da Oração de Habacuque
  ambientAudio.addEventListener('ended', () => {
    isAmbientPlaying = false;
    updateSpotifyEqualizer(false);
    btnAmbientSound.classList.remove('active');
    btnAmbientSound.innerHTML = `<i data-lucide="volume-2"></i> <span class="sound-label">Oração de Habacuque</span>`;
    btnAmbientSound.setAttribute('title', 'Tocar Oração de Habacuque');
    if (window.lucide) window.lucide.createIcons();
  });

  ambientAudio.addEventListener('error', (e) => {
    console.warn('Erro ao carregar o áudio:', e);
    showToast('Não foi possível carregar o arquivo de áudio.', '⚠️');
    isAmbientPlaying = false;
    updateSpotifyEqualizer(false);
    btnAmbientSound.classList.remove('active');
    btnAmbientSound.innerHTML = `<i data-lucide="volume-2"></i> <span class="sound-label">Oração de Habacuque</span>`;
    btnAmbientSound.setAttribute('title', 'Tocar Oração de Habacuque');
    if (window.lucide) window.lucide.createIcons();
  });

  btnAmbientSound.addEventListener('click', () => {
    if (!isAmbientPlaying) {
      ambientAudio.play().then(() => {
        isAmbientPlaying = true;
        updateSpotifyEqualizer(true);
        btnAmbientSound.classList.add('active');
        btnAmbientSound.innerHTML = `<i data-lucide="volume-x"></i> <span class="sound-label">Pausar Música</span>`;
        btnAmbientSound.setAttribute('title', 'Pausar Oração de Habacuque');
        showToast('Tocando: Oração de Habacuque - Grupo Águas 🕊️', '🎶');
        if (window.lucide) window.lucide.createIcons();
      }).catch((err) => {
        console.warn('Reprodução bloqueada pelo navegador:', err);
        showToast('Clique novamente para autorizar a reprodução de áudio.', '⚠️');
      });
    } else {
      ambientAudio.pause();
      isAmbientPlaying = false;
      updateSpotifyEqualizer(false);
      btnAmbientSound.classList.remove('active');
      btnAmbientSound.innerHTML = `<i data-lucide="volume-2"></i> <span class="sound-label">Oração de Habacuque</span>`;
      btnAmbientSound.setAttribute('title', 'Tocar Oração de Habacuque');
      if (window.lucide) window.lucide.createIcons();
    }
  });

  // Initial render & real-time updates
  let hasScrolledToHash = false;
  FaithStorage.listenToDeclarations(async (declarations) => {
    renderCards(declarations);
    const stats = await FaithStorage.getStats(declarations);
    if (statDeclarations) statDeclarations.textContent = stats.total_declarations;
    if (statAmens) statAmens.textContent = stats.total_amens;

    if (!hasScrolledToHash && window.location.hash && window.location.hash.startsWith('#card-')) {
      hasScrolledToHash = true;
      const targetId = window.location.hash.replace('#card-', '');
      setTimeout(() => highlightAndScrollToCard(targetId), 400);
    }
  });

  // LIGHTBOX MODAL FOR CARDS
  const cardLightboxModal = document.getElementById('card-lightbox-modal');
  const btnLightboxX = document.getElementById('btn-lightbox-x');
  const lightboxCardContainer = document.getElementById('lightbox-card-container');
  const btnLightboxShare = document.getElementById('btn-lightbox-share');

  let currentLightboxItem = null;

  function openLightboxModal(item) {
    if (!cardLightboxModal || !lightboxCardContainer) return;
    currentLightboxItem = item;
    lightboxCardContainer.innerHTML = '';
    const previewEl = createCardElement(item, false);
    previewEl.style.transform = 'none';
    lightboxCardContainer.appendChild(previewEl);

    cardLightboxModal.style.display = 'flex';
    cardLightboxModal.setAttribute('aria-hidden', 'false');
    if (window.lucide) window.lucide.createIcons();
  }

  function closeLightboxModal() {
    if (!cardLightboxModal) return;
    cardLightboxModal.style.display = 'none';
    cardLightboxModal.setAttribute('aria-hidden', 'true');
    currentLightboxItem = null;
  }

  if (btnLightboxX) btnLightboxX.addEventListener('click', closeLightboxModal);
  if (cardLightboxModal) {
    cardLightboxModal.addEventListener('click', (e) => {
      if (e.target === cardLightboxModal) closeLightboxModal();
    });
  }
  if (btnLightboxShare) {
    btnLightboxShare.addEventListener('click', () => {
      if (currentLightboxItem) {
        handleShare(currentLightboxItem);
      }
    });
  }
});
