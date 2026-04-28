const WIKTIONARY_API = "https://es.wiktionary.org/w/api.php";
const STORAGE_KEY = "reto-letras-v1";
const HISTORY_LIMIT = 20;
const WILDCARD_SYMBOL = "?";
const WILDCARD_PROBABILITY = 0.05;
const COOLDOWN_MIN_SECONDS = 1;
const COOLDOWN_MAX_SECONDS = 4;
const LETTERS = "abcdefghijklmn\u00f1opqrstuvwxyz";
const LETTER_WEIGHTS = {
    a: 12.53,
    b: 1.42,
    c: 4.68,
    d: 5.86,
    e: 13.68,
    f: 0.69,
    g: 1.01,
    h: 0.7,
    i: 6.25,
    j: 0.44,
    k: 0.02,
    l: 4.97,
    m: 3.15,
    n: 6.71,
    "\u00f1": 0.31, // ñ
    o: 8.68,
    p: 2.51,
    q: 0.88,
    r: 6.87,
    s: 7.98,
    t: 4.63,
    u: 3.93,
    v: 0.9,
    w: 0.02,
    x: 0.22,
    y: 0.9,
    z: 0.52,
};

const state = {
    points: 0,
    currentCombo: [],
    lastValidWord: "",
    bannedCombos: new Set(),
    history: [],
    useWeightedRandom: false,
    cooldownUntilMs: 0,
    cooldownTimerId: undefined,
};

const els = {
    comboActual: document.querySelector("#combo-actual"),
    puntos: document.querySelector("#puntos"),
    wiktionaryLink: document.querySelector("#wiktionary-link"),
    wiktionaryPlaceholder: document.querySelector("#wiktionary-placeholder"),
    wiktionaryPreview: document.querySelector("#wiktionary-preview"),
    wiktionaryWord: document.querySelector("#wiktionary-word"),
    historial: document.querySelector("#historial"),
    formIntento: document.querySelector("#form-intento"),
    inputPalabra: document.querySelector("#input-palabra"),
    btnEnviar: document.querySelector("#btn-enviar"),
    btnSaltar: document.querySelector("#btn-saltar"),
    btnSaltarSinBloquear: document.querySelector("#btn-saltar-sin-bloquear"),
    estadoIntento: document.querySelector("#estado-intento"),
    temporizador: document.querySelector("#temporizador"),
    switchFrecuencia: document.querySelector("#switch-frecuencia"),
    btnMenu: document.querySelector("#btn-menu"),
    dialogBloqueadas: document.querySelector("#dialog-bloqueadas"),
    formBloqueada: document.querySelector("#form-bloqueada"),
    inputBloqueada: document.querySelector("#input-bloqueada"),
    estadoBloqueada: document.querySelector("#estado-bloqueada"),
    listaBloqueadas: document.querySelector("#lista-bloqueadas"),
    btnVaciarBloqueadas: document.querySelector("#btn-vaciar-bloqueadas"),
};

function normalizeSpanishLetters(value) {
    const lowered = value.toLowerCase().trim().replaceAll("\u00f1", "\u0001");
    const withoutMarks = lowered.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const restoredEnye = withoutMarks.replaceAll("\u0001", "\u00f1");
    return restoredEnye;
}

function normalizeWordForValidation(value) {
    return normalizeSpanishLetters(value).replace(/[^a-z\u00f1]/g, "");
}

function getRandomIntInclusive(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getWeightedLetter() {
    const threshold = Math.random() * 100;
    let acc = 0;

    for (const letter of LETTERS) {
        acc += LETTER_WEIGHTS[letter] ?? 0;
        if (acc >= threshold) {
            return letter;
        }
    }

    return LETTERS[LETTERS.length - 1];
}

function getRandomLetter() {
    if (state.useWeightedRandom) {
        return getWeightedLetter();
    }

    const idx = getRandomIntInclusive(0, LETTERS.length - 1);
    return LETTERS[idx];
}

function getComboKey(combo) {
    return combo.join("").toLowerCase();
}

function generateCombo() {
    for (let i = 0; i < 1000; i += 1) {
        const combo = [getRandomLetter(), getRandomLetter(), getRandomLetter()];

        if (Math.random() < WILDCARD_PROBABILITY) {
            const wildcardIndex = getRandomIntInclusive(0, 2);
            combo[wildcardIndex] = WILDCARD_SYMBOL;
        }

        const key = getComboKey(combo);
        if (!state.bannedCombos.has(key)) {
            return combo;
        }
    }

    return [getRandomLetter(), getRandomLetter(), getRandomLetter()];
}

function isValidPlayerWord(rawWord) {
    return /^[A-Za-z\u00c1\u00c9\u00cd\u00d3\u00da\u00e1\u00e9\u00ed\u00f3\u00fa\u00dc\u00fc\u00d1\u00f1]+$/u.test(rawWord.trim());
}

function comboMatchesWord(combo, rawWord) {
    const normalizedWord = normalizeWordForValidation(rawWord);
    if (!normalizedWord) {
        return false;
    }

    let pointer = 0;
    for (let i = 0; i < normalizedWord.length && pointer < combo.length; i += 1) {
        const char = normalizedWord[i];
        const target = combo[pointer];

        if (target === WILDCARD_SYMBOL || target === char) {
            pointer += 1;
        }
    }

    return pointer === combo.length;
}

function setAttemptStatus(message, kind = "neutral") {
    els.estadoIntento.textContent = message;
    els.estadoIntento.classList.remove("text-red-700", "text-green-700", "text-slate-700", "text-cyan-800");

    if (kind === "ok") {
        els.estadoIntento.classList.add("text-green-700");
        return;
    }

    if (kind === "error") {
        els.estadoIntento.classList.add("text-red-700");
        return;
    }

    if (kind === "info") {
        els.estadoIntento.classList.add("text-cyan-800");
        return;
    }

    els.estadoIntento.classList.add("text-slate-700");
}

function setBlockedStatus(message, kind = "neutral") {
    els.estadoBloqueada.textContent = message;
    els.estadoBloqueada.classList.remove("text-red-700", "text-green-700", "text-slate-700");
    els.estadoBloqueada.classList.add(kind === "error" ? "text-red-700" : kind === "ok" ? "text-green-700" : "text-slate-700");
}

function persistState() {
    const payload = {
        points: state.points,
        currentCombo: state.currentCombo,
        lastValidWord: state.lastValidWord,
        bannedCombos: Array.from(state.bannedCombos),
        history: state.history,
        useWeightedRandom: state.useWeightedRandom,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadPersistedState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        return;
    }

    try {
        const data = JSON.parse(raw);
        state.points = Number.isFinite(data.points) ? data.points : 0;
        state.currentCombo = Array.isArray(data.currentCombo) ? data.currentCombo.slice(0, 3) : [];
        state.lastValidWord = typeof data.lastValidWord === "string" ? data.lastValidWord : "";
        state.bannedCombos = new Set(Array.isArray(data.bannedCombos) ? data.bannedCombos : []);
        state.history = Array.isArray(data.history) ? data.history.slice(0, HISTORY_LIMIT) : [];
        state.useWeightedRandom = Boolean(data.useWeightedRandom);
    } catch {
        localStorage.removeItem(STORAGE_KEY);
    }
}

function renderCombo() {
    els.comboActual.innerHTML = "";

    for (const char of state.currentCombo) {
        const chip = document.createElement("span");
        chip.className = `combo-chip ${char === WILDCARD_SYMBOL ? "wildcard" : ""}`.trim();
        chip.textContent = char;
        els.comboActual.appendChild(chip);
    }
}

function renderScore() {
    els.puntos.textContent = String(state.points);
}

function normalizeWiktionaryLookupWord(value) {
    return value.trim().normalize("NFC").toLocaleLowerCase("es-ES");
}

function buildWiktionaryWordUrl(rawWord) {
    return `https://es.wiktionary.org/wiki/${encodeURIComponent(normalizeWiktionaryLookupWord(rawWord))}`;
}

function renderWiktionaryPreview() {
    const hasValidWord = state.lastValidWord !== "";

    if (els.wiktionaryPlaceholder) {
        els.wiktionaryPlaceholder.hidden = hasValidWord;
    }

    if (els.wiktionaryPreview) {
        els.wiktionaryPreview.hidden = !hasValidWord;
    }

    if (els.wiktionaryLink) {
        els.wiktionaryLink.hidden = !hasValidWord;
    }

    if (!hasValidWord) {
        if (els.wiktionaryLink) {
            els.wiktionaryLink.removeAttribute("href");
        }
        if (els.wiktionaryWord) {
            els.wiktionaryWord.textContent = "";
        }
        return;
    }

    const url = buildWiktionaryWordUrl(state.lastValidWord);
    if (els.wiktionaryLink) {
        els.wiktionaryLink.href = url;
    }
    if (els.wiktionaryWord) {
        els.wiktionaryWord.textContent = state.lastValidWord;
    }
}

function formatIsoToHuman(isoString) {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        day: "2-digit",
        month: "2-digit",
    }).format(date);
}

function renderHistory() {
    els.historial.innerHTML = "";

    if (state.history.length === 0) {
        const empty = document.createElement("li");
        empty.className = "text-sm text-slate-600";
        empty.textContent = "Aun no hay movimientos.";
        els.historial.appendChild(empty);
        return;
    }

    state.history.forEach((entry, index) => {
        const li = document.createElement("li");
        li.className = "hist-item";

        const tagClass = entry.result === "valido" ? "ok" : entry.result === "omitido" ? "skip" : "fail";
        const word = entry.word || "-";

        const historyCombo = entry.skippedSet || entry.combo;

        const validationText = {
            valido: "Válido",
            invalido: "Inválido",
            omitido: "Omitido",
        }

        li.innerHTML = `
            <div class="history-top">
                <span class="tag history-tag ${tagClass}">${validationText[entry.result]}</span>
                <time class="history-time">${formatIsoToHuman(entry.timestamp)}</time>
            </div>
            <div class="history-meta">
                <p class="history-kv"><span class="history-key">Combinación</span><span class="history-value">${historyCombo.toUpperCase()}</span></p>
                <p class="history-kv"><span class="history-key">Palabra</span><span class="history-value">${word.toUpperCase()}</span></p>
            </div>
        `;

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "btn-ghost history-delete-btn";
        removeBtn.textContent = "Eliminar";
        removeBtn.addEventListener("click", () => {
            removeHistoryEntry(index);
        });

        li.appendChild(removeBtn);

        els.historial.appendChild(li);
    });
}

function renderBannedCombos() {
    els.listaBloqueadas.innerHTML = "";

    if (state.bannedCombos.size === 0) {
        const li = document.createElement("li");
        li.className = "w-full text-center rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700";
        li.textContent = "No hay combinaciones bloqueadas.";
        els.listaBloqueadas.appendChild(li);
        return;
    }

    const sorted = Array.from(state.bannedCombos).sort((a, b) => a.localeCompare(b, "es"));
    for (const combo of sorted) {
        const li = document.createElement("li");
        li.className = "flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white ps-3 py-1 max-h-[46px]";
        li.style.minWidth = "130px";

        const text = document.createElement("span");
        text.className = "font-semibold uppercase";
        text.textContent = combo;

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "btn-ghost";
        removeBtn.textContent = "Quitar";
        removeBtn.addEventListener("click", () => {
            state.bannedCombos.delete(combo);
            persistState();
            renderBannedCombos();
            setBlockedStatus("Combinación eliminada.", "ok");
        });

        li.append(text, removeBtn);
        els.listaBloqueadas.appendChild(li);
    }
}

function addHistoryEntry(entry) {
    state.history.unshift(entry);
    if (state.history.length > HISTORY_LIMIT) {
        state.history.length = HISTORY_LIMIT;
    }
}

function removeHistoryEntry(index) {
    if (!Number.isInteger(index) || index < 0 || index >= state.history.length) {
        return;
    }

    state.history.splice(index, 1);
    persistState();
    renderHistory();
}

function createCooldownSeconds() {
    return getRandomIntInclusive(COOLDOWN_MIN_SECONDS, COOLDOWN_MAX_SECONDS);
}

function isCooldownActive() {
    return Date.now() < state.cooldownUntilMs;
}

function updateCooldownUi() {
    const active = isCooldownActive();
    const remainingSeconds = active ? Math.max(0, Math.ceil((state.cooldownUntilMs - Date.now()) / 1000)) : 0;

    els.inputPalabra.disabled = false;
    els.btnEnviar.disabled = active;
    els.temporizador.textContent = active
        ? `Espera ${remainingSeconds} segundo${remainingSeconds === 1 ? "" : "s"} para volver a enviar.`
        : "";

    if (!active && state.cooldownTimerId !== undefined) {
        window.clearInterval(state.cooldownTimerId);
        state.cooldownTimerId = undefined;
    }
}

function startCooldown(seconds) {
    state.cooldownUntilMs = Date.now() + seconds * 1000;
    updateCooldownUi();

    if (state.cooldownTimerId !== undefined) {
        window.clearInterval(state.cooldownTimerId);
    }

    state.cooldownTimerId = window.setInterval(updateCooldownUi, 250);
}

function isMissingWiktionaryPage(page) {
    return page?.missing !== undefined || page?.invalid !== undefined || page?.pageid === -1;
}

async function checkWordInWiktionary(rawWord) {
    const lookupWord = normalizeWiktionaryLookupWord(rawWord);

    const params = new URLSearchParams({
        action: "query",
        titles: lookupWord,
        redirects: "1",
        format: "json",
        origin: "*",
    });

    let response;
    try {
        response = await fetch(`${WIKTIONARY_API}?${params.toString()}`, {
            method: "GET",
            headers: {
                Accept: "application/json",
            },
        });
    } catch (error) {
        return {
            ok: false,
            kind: "network",
            message: "Error de red al consultar Wiktionary.",
            details: error instanceof Error ? error.message : "Fallo de red desconocido.",
        };
    }

    if (!response.ok) {
        return {
            ok: false,
            kind: "api",
            message: `Wiktionary devolvio estado ${response.status}.`,
        };
    }

    let data;
    try {
        data = await response.json();
    } catch {
        return {
            ok: false,
            kind: "api",
            message: "Wiktionary devolvio una respuesta no válida.",
        };
    }

    const pages = data?.query?.pages;
    if (!pages || typeof pages !== "object") {
        return {
            ok: false,
            kind: "api",
            message: "Wiktionary no devolvio páginas en el formato esperado.",
        };
    }

    const values = Object.values(pages);
    const exists = values.some((page) => !isMissingWiktionaryPage(page));
    return { ok: true, exists };
}

function moveToNextCombo() {
    state.currentCombo = generateCombo();
    persistState();
    renderCombo();
}

function parseComboInput(rawValue) {
    const cleaned = normalizeWordForValidation(rawValue).replace(/\s+/g, "");
    const withWildcard = rawValue.toLowerCase().replace(/\s+/g, "");

    if (withWildcard.includes(WILDCARD_SYMBOL)) {
        if (!/^[a-z\u00f1?]{3}$/u.test(withWildcard)) {
            return { ok: false, error: "La combinación debe tener exactamente 3 caracteres válidos." };
        }
        const wildcardCount = (withWildcard.match(/\?/g) || []).length;
        if (wildcardCount > 1) {
            return { ok: false, error: "Solo se permite un comodín por combinación." };
        }
        const normalized = withWildcard
            .split("")
            .map((char) => (char === WILDCARD_SYMBOL ? WILDCARD_SYMBOL : normalizeWordForValidation(char)))
            .join("");
        return { ok: true, value: normalized };
    }

    if (cleaned.length !== 3 || !/^[a-z\u00f1]{3}$/u.test(cleaned)) {
        return { ok: false, error: "La combinación debe tener 3 letras (a-z o ?)." };
    }

    return { ok: true, value: cleaned };
}

async function handleSubmitAttempt(event) {
    event.preventDefault();

    if (isCooldownActive()) {
        return;
    }

    const rawWord = els.inputPalabra.value.trim();
    if (!rawWord) {
        setAttemptStatus("Escribe una palabra antes de validar.", "error");
        return;
    }

    if (!isValidPlayerWord(rawWord)) {
        setAttemptStatus("Solo se permiten letras (incluye acentos, ñ y ü).", "error");
        return;
    }

    const comboOk = comboMatchesWord(state.currentCombo, rawWord);
    if (!comboOk) {
        startCooldown(createCooldownSeconds());
        setAttemptStatus("La palabra no cumple el orden de la combinación actual.", "error");
        addHistoryEntry({
            timestamp: new Date().toISOString(),
            word: rawWord,
            combo: getComboKey(state.currentCombo),
            result: "invalido",
        });
        persistState();
        renderHistory();
        return;
    }

    setAttemptStatus("Consultando Wiktionary...", "info");
    const apiValidation = await checkWordInWiktionary(rawWord);

    if (!apiValidation.ok) {
        setAttemptStatus(`${apiValidation.message}${apiValidation.details ? ` ${apiValidation.details}` : ""}`, "error");
        return;
    }

    if (!apiValidation.exists) {
        startCooldown(createCooldownSeconds());
        setAttemptStatus("La palabra no existe en Wiktionary.", "error");
        addHistoryEntry({
            timestamp: new Date().toISOString(),
            word: rawWord,
            combo: getComboKey(state.currentCombo),
            result: "invalido",
        });
        persistState();
        renderHistory();
        return;
    }

    state.points += 1;
    state.lastValidWord = rawWord.trim();
    startCooldown(2);
    addHistoryEntry({
        timestamp: new Date().toISOString(),
        word: rawWord,
        combo: getComboKey(state.currentCombo),
        result: "valido",
    });
    persistState();
    renderScore();
    renderWiktionaryPreview();
    renderHistory();
    setAttemptStatus("¡Correcto! Palabra válida.", "ok");
    els.inputPalabra.value = "";
    moveToNextCombo();
}

function handleSkip() {
    const key = getComboKey(state.currentCombo);
    state.bannedCombos.add(key);
    addHistoryEntry({
        timestamp: new Date().toISOString(),
        word: "",
        combo: key,
        skippedSet: key,
        result: "omitido",
    });

    setAttemptStatus("Combinación omitida y bloqueada para futuras rondas.", "info");
    persistState();
    renderBannedCombos();
    renderHistory();
    moveToNextCombo();
}

function handleSkipWithoutBlocking() {
    const key = getComboKey(state.currentCombo);
    addHistoryEntry({
        timestamp: new Date().toISOString(),
        word: "",
        combo: key,
        skippedSet: key,
        result: "omitido",
    });

    setAttemptStatus("Combinación omitida sin bloquear. Se genero una nueva ronda.", "info");
    persistState();
    renderHistory();
    moveToNextCombo();
}

function handleWeightedSwitch() {
    state.useWeightedRandom = Boolean(els.switchFrecuencia.checked);
    persistState();
    setAttemptStatus(
        state.useWeightedRandom
            ? "Modo frecuencia activado. Las letras comunes apareceran más seguido."
            : "Modo uniforme activado. Todas las letras tienen la misma probabilidad.",
        "info",
    );
}

function openBlockedDialog() {
    renderBannedCombos();
    setBlockedStatus("");
    if (typeof els.dialogBloqueadas.showModal === "function") {
        els.dialogBloqueadas.showModal();
        return;
    }
    els.dialogBloqueadas.setAttribute("open", "");
}

function handleAddBlockedCombo(event) {
    event.preventDefault();
    const raw = els.inputBloqueada.value.trim();
    const parsed = parseComboInput(raw);
    if (!parsed.ok) {
        setBlockedStatus(parsed.error, "error");
        return;
    }

    state.bannedCombos.add(parsed.value);
    els.inputBloqueada.value = "";
    persistState();
    renderBannedCombos();
    setBlockedStatus("Combinación agregada.", "ok");

    if (parsed.value === getComboKey(state.currentCombo)) {
        moveToNextCombo();
    }
}

function handleClearBlocked() {
    state.bannedCombos.clear();
    persistState();
    renderBannedCombos();
    setBlockedStatus("Lista vaciada.", "ok");
}

function bindEvents() {
    els.formIntento.addEventListener("submit", handleSubmitAttempt);
    els.btnSaltar.addEventListener("click", handleSkip);
    els.btnSaltarSinBloquear.addEventListener("click", handleSkipWithoutBlocking);
    els.switchFrecuencia.addEventListener("change", handleWeightedSwitch);
    els.btnMenu.addEventListener("click", openBlockedDialog);
    els.formBloqueada.addEventListener("submit", handleAddBlockedCombo);
    els.btnVaciarBloqueadas.addEventListener("click", handleClearBlocked);
}

function initializeGame() {
    loadPersistedState();
    if (!Array.isArray(state.currentCombo) || state.currentCombo.length !== 3) {
        state.currentCombo = generateCombo();
    }

    els.switchFrecuencia.checked = state.useWeightedRandom;

    renderCombo();
    renderScore();
    renderWiktionaryPreview();
    renderHistory();
    renderBannedCombos();
    updateCooldownUi();
    bindEvents();
}

initializeGame();
