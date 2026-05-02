const STORAGE_KEY = "savageworlds-supernatural-notebook-v1";
const PAGE_STORAGE_KEY = `${STORAGE_KEY}:active-page`;
const DICE = ["d4", "d6", "d8", "d10", "d12", "d12+1", "d12+2"];

const defaultState = {
  profile: {
    name: "",
    player: "",
    concept: "cacador urbano",
    ancestry: "Humano",
    rank: "Novato",
    home: "",
    caseName: "",
    drive: "",
    fear: "",
    anchor: "",
    secret: "",
  },
  attributes: {
    agility: "d6",
    smarts: "d6",
    spirit: "d6",
    strength: "d6",
    vigor: "d6",
  },
  skills: [
    { name: "Atletismo", die: "d4" },
    { name: "Conhecimento Geral", die: "d4" },
    { name: "Furtividade", die: "d4" },
    { name: "Notar", die: "d6" },
    { name: "Persuasao", die: "d4" },
    { name: "Lutar", die: "d4" },
    { name: "Atirar", die: "d4" },
    { name: "Pesquisa", die: "d4" },
    { name: "Sobrevivencia", die: "d4" },
    { name: "Ocultismo", die: "d4" },
  ],
  resources: {
    bennies: 3,
    wounds: 0,
    fatigue: 0,
    conviction: false,
    powerPoints: 0,
    maxPowerPoints: 0,
  },
  derived: {
    pace: 6,
    parryOverride: null,
    toughnessOverride: null,
    armor: 0,
    shield: 0,
    runningDie: "d6",
  },
  weapons: [
    { name: "Revolver", range: "12/24/48", damage: "2d6+1", ap: "", notes: "6 tiros" },
    { name: "Faca de prata", range: "corpo", damage: "For+d4", ap: "", notes: "" },
  ],
  edges: [{ name: "", detail: "" }],
  hindrances: [{ name: "", detail: "" }],
  gear: [
    { item: "Sal grosso", qty: "1", notes: "" },
    { item: "Diario de campo", qty: "1", notes: "" },
  ],
  powers: [],
  contacts: [{ name: "", detail: "" }],
  scars: [{ name: "", detail: "" }],
  advances: [],
  caseFile: {
    entity: "",
    pattern: "",
    weakness: "",
    location: "",
    clues: "",
    ritual: "",
    nextMove: "",
  },
  notes: {
    freeform: "",
  },
};

let state = loadState();
let saveTimer;

const attributeLabels = {
  agility: "Agilidade",
  smarts: "Astucia",
  spirit: "Espirito",
  strength: "Forca",
  vigor: "Vigor",
};

const actions = {
  save: () => saveNow("Salvo agora"),
  export: exportSheet,
  import: () => document.querySelector("#importFile").click(),
  print: () => window.print(),
  reset: resetSheet,
  "add-skill": () => addRow("skills", { name: "", die: "d4" }, renderSkills),
  "add-weapon": () => addRow("weapons", { name: "", range: "", damage: "", ap: "", notes: "" }, renderWeapons),
  "add-edge": () => addRow("edges", { name: "", detail: "" }, () => renderCardList("edges")),
  "add-hindrance": () => addRow("hindrances", { name: "", detail: "" }, () => renderCardList("hindrances")),
  "add-gear": () => addRow("gear", { item: "", qty: "1", notes: "" }, renderGear),
  "add-power": () => addRow("powers", { name: "", cost: "", range: "", notes: "" }, renderPowers),
  "add-contact": () => addRow("contacts", { name: "", detail: "" }, () => renderCardList("contacts")),
  "add-scar": () => addRow("scars", { name: "", detail: "" }, () => renderCardList("scars")),
  "add-advance": () => addRow("advances", { name: "", detail: "" }, () => renderCardList("advances")),
};

document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  bindStaticFields();
  bindEvents();
  updateDerived();
  activatePage(pageFromHash() || localStorage.getItem(PAGE_STORAGE_KEY) || "personagem", false);
  updateStatus("Pronto");

  if (window.lucide) {
    window.lucide.createIcons();
  }
});

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    return mergeDeep(structuredClone(defaultState), JSON.parse(raw));
  } catch {
    return structuredClone(defaultState);
  }
}

function mergeDeep(base, incoming) {
  if (Array.isArray(base)) return Array.isArray(incoming) ? incoming : base;
  if (!incoming || typeof incoming !== "object") return base;

  Object.keys(incoming).forEach((key) => {
    if (base[key] && typeof base[key] === "object" && !Array.isArray(base[key])) {
      base[key] = mergeDeep(base[key], incoming[key]);
    } else {
      base[key] = incoming[key];
    }
  });
  return base;
}

function renderAll() {
  renderAttributes();
  renderSkills();
  renderDots("benniesDots", "bennies", 5);
  renderDots("woundsDots", "wounds", 3);
  renderDots("fatigueDots", "fatigue", 3);
  renderWeapons();
  renderGear();
  renderPowers();
  renderCardList("edges");
  renderCardList("hindrances");
  renderCardList("contacts");
  renderCardList("scars");
  renderCardList("advances");
}

function renderAttributes() {
  document.querySelector("#attributes").innerHTML = Object.entries(attributeLabels)
    .map(([key, label]) => {
      return `
        <label class="attribute-card">
          <span>${label}</span>
          <select data-list="attributes" data-field="${key}">
            ${diceOptions(state.attributes[key])}
          </select>
        </label>
      `;
    })
    .join("");
}

function renderSkills() {
  document.querySelector("#skillsList").innerHTML = state.skills
    .map((skill, index) => {
      return `
        <div class="skill-row">
          <input data-list="skills" data-index="${index}" data-field="name" value="${escapeHtml(skill.name)}" aria-label="Nome da pericia" />
          <select data-list="skills" data-index="${index}" data-field="die" aria-label="Dado da pericia">
            ${diceOptions(skill.die)}
          </select>
          ${removeButton("skills", index)}
        </div>
      `;
    })
    .join("");
  refreshIcons();
}

function renderWeapons() {
  document.querySelector("#weaponsList").innerHTML = state.weapons
    .map((weapon, index) => {
      return `
        <div class="table-row weapon-row">
          ${stackedInput("Arma", "weapons", index, "name", weapon.name)}
          ${stackedInput("Alcance", "weapons", index, "range", weapon.range)}
          ${stackedInput("Dano", "weapons", index, "damage", weapon.damage)}
          ${stackedInput("PA", "weapons", index, "ap", weapon.ap)}
          ${stackedInput("Notas", "weapons", index, "notes", weapon.notes)}
          ${removeButton("weapons", index)}
        </div>
      `;
    })
    .join("");
  refreshIcons();
}

function renderGear() {
  document.querySelector("#gearList").innerHTML = state.gear
    .map((item, index) => {
      return `
        <div class="table-row gear-row">
          ${stackedInput("Item", "gear", index, "item", item.item)}
          ${stackedInput("Qtd.", "gear", index, "qty", item.qty)}
          ${stackedInput("Detalhe", "gear", index, "notes", item.notes)}
          ${removeButton("gear", index)}
        </div>
      `;
    })
    .join("");
  refreshIcons();
}

function renderPowers() {
  document.querySelector("#powersList").innerHTML = state.powers
    .map((power, index) => {
      return `
        <div class="table-row power-row">
          ${stackedInput("Nome", "powers", index, "name", power.name)}
          ${stackedInput("Custo", "powers", index, "cost", power.cost)}
          ${stackedInput("Alcance", "powers", index, "range", power.range)}
          ${stackedInput("Efeito", "powers", index, "notes", power.notes)}
          ${removeButton("powers", index)}
        </div>
      `;
    })
    .join("");
  refreshIcons();
}

function renderCardList(listName) {
  const target = document.querySelector(`#${listName}List`);
  target.innerHTML = state[listName]
    .map((item, index) => {
      return `
        <div class="mini-card">
          <label class="field">
            <span>${cardTitle(listName)}</span>
            <input data-list="${listName}" data-index="${index}" data-field="name" value="${escapeHtml(item.name)}" />
          </label>
          <label class="field">
            <span>Detalhe</span>
            <textarea data-list="${listName}" data-index="${index}" data-field="detail">${escapeHtml(item.detail)}</textarea>
          </label>
          ${removeButton(listName, index)}
        </div>
      `;
    })
    .join("");
  refreshIcons();
}

function cardTitle(listName) {
  return {
    edges: "Vantagem",
    hindrances: "Complicacao",
    contacts: "Contato",
    scars: "Cicatriz",
    advances: "Avanco",
  }[listName];
}

function stackedInput(label, list, index, field, value) {
  return `
    <label class="stacked-field">
      <span class="row-label">${label}</span>
      <input data-list="${list}" data-index="${index}" data-field="${field}" value="${escapeHtml(value)}" />
    </label>
  `;
}

function removeButton(list, index) {
  return `
    <button class="row-remove" type="button" data-action="remove-row" data-list-name="${list}" data-index="${index}" title="Remover" aria-label="Remover">
      <i data-lucide="x"></i>
    </button>
  `;
}

function diceOptions(selected) {
  return DICE.map((die) => `<option ${die === selected ? "selected" : ""}>${die}</option>`).join("");
}

function renderDots(elementId, key, max) {
  const value = Number(state.resources[key]) || 0;
  document.querySelector(`#${elementId}`).innerHTML = Array.from({ length: max }, (_, index) => {
    const active = index < value ? "is-active" : "";
    return `<button class="pip ${active}" type="button" data-action="set-resource" data-resource="${key}" data-value="${index + 1}" aria-label="${key} ${index + 1}"></button>`;
  }).join("");
}

function bindStaticFields() {
  document.querySelectorAll("[data-bind]").forEach((field) => {
    const value = getPath(state, field.dataset.bind);
    if (field.type === "checkbox") {
      field.checked = Boolean(value);
    } else {
      field.value = value ?? "";
    }
  });
}

function bindEvents() {
  document.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.matches("[data-bind]")) {
      setPath(state, target.dataset.bind, readFieldValue(target));
      scheduleSave();
      updateDerived();
      return;
    }

    if (target.matches("[data-derived-override]")) {
      updateDerivedOverride(target);
      scheduleSave();
      if (target.value !== "") updateDerived();
      return;
    }

    if (target.matches("[data-list]")) {
      updateListValue(target);
      scheduleSave();
      updateDerived();
    }
  });

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.matches("[data-bind]")) {
      setPath(state, target.dataset.bind, readFieldValue(target));
      scheduleSave();
      updateDerived();
      return;
    }

    if (target.matches("[data-derived-override]")) {
      updateDerivedOverride(target);
      scheduleSave();
      updateDerived();
      return;
    }

    if (target.matches("[data-list]")) {
      updateListValue(target);
      scheduleSave();
      updateDerived();
    }
  });

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    if (action === "switch-page") {
      activatePage(button.dataset.pageTarget);
      return;
    }

    if (action === "remove-row") {
      removeRow(button.dataset.listName, Number(button.dataset.index));
      return;
    }

    if (action === "set-resource") {
      const key = button.dataset.resource;
      const value = Number(button.dataset.value);
      state.resources[key] = state.resources[key] === value ? value - 1 : value;
      renderDots(`${key}Dots`, key, key === "bennies" ? 5 : 3);
      scheduleSave();
      return;
    }

    actions[action]?.();
  });

  document.querySelector("#importFile").addEventListener("change", importSheet);
  window.addEventListener("hashchange", () => activatePage(pageFromHash() || "personagem", false));
}

function activatePage(pageName = "personagem", updateHash = true) {
  const availablePages = [...document.querySelectorAll("[data-page]")].map((page) => page.dataset.page);
  const nextPage = availablePages.includes(pageName) ? pageName : "personagem";

  document.querySelectorAll("[data-page]").forEach((page) => {
    const isActive = page.dataset.page === nextPage;
    page.classList.toggle("is-active", isActive);
    page.toggleAttribute("hidden", !isActive);
  });

  document.querySelectorAll("[data-page-target]").forEach((button) => {
    const isActive = button.dataset.pageTarget === nextPage;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  localStorage.setItem(PAGE_STORAGE_KEY, nextPage);
  if (updateHash && location.hash !== `#${nextPage}`) {
    history.replaceState(null, "", `#${nextPage}`);
  }
}

function pageFromHash() {
  const pageName = location.hash.replace("#", "");
  return pageName || null;
}

function updateListValue(target) {
  const list = target.dataset.list;
  const field = target.dataset.field;

  if (list === "attributes") {
    state.attributes[field] = target.value;
    return;
  }

  const index = Number(target.dataset.index);
  if (!Array.isArray(state[list]) || !state[list][index]) return;
  state[list][index][field] = target.value;
}

function updateDerivedOverride(target) {
  const field = target.dataset.derivedOverride;
  state.derived[field] = target.value === "" ? null : Number(target.value);
}

function readFieldValue(field) {
  if (field.type === "checkbox") return field.checked;
  if (field.type === "number") return Number(field.value || 0);
  return field.value;
}

function addRow(list, row, renderer) {
  state[list].push(row);
  renderer();
  scheduleSave();
}

function removeRow(list, index) {
  if (!Array.isArray(state[list])) return;
  state[list].splice(index, 1);
  renderAll();
  bindStaticFields();
  updateDerived();
  scheduleSave();
}

function updateDerived() {
  const fighting = state.skills.find((skill) => normalize(skill.name) === "lutar")?.die || "d4";
  const automaticParry = 2 + halfDie(fighting) + Number(state.derived.shield || 0);
  const automaticToughness = 2 + halfDie(state.attributes.vigor) + Number(state.derived.armor || 0);
  const parry = state.derived.parryOverride ?? automaticParry;
  const toughness = state.derived.toughnessOverride ?? automaticToughness;

  document.querySelector("#parryValue").value = parry;
  document.querySelector("#toughnessValue").value = toughness;
}

function halfDie(die) {
  const match = String(die).match(/d(\d+)(?:\+(\d+))?/);
  if (!match) return 2;
  const base = Number(match[1]);
  const bonus = Number(match[2] || 0);
  return Math.floor(base / 2 + bonus / 2);
}

function normalize(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function scheduleSave() {
  clearTimeout(saveTimer);
  updateStatus("Salvando...");
  saveTimer = setTimeout(() => saveNow("Auto salvo"), 260);
}

function saveNow(message = "Salvo") {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
  updateStatus(`${message} ${time}`);
}

function updateStatus(text) {
  document.querySelector("#saveStatus").textContent = text;
}

function exportSheet() {
  saveNow("Exportado");
  const name = slug(state.profile.name || "cacador");
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}-savage-worlds.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importSheet(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      state = mergeDeep(structuredClone(defaultState), JSON.parse(reader.result));
      renderAll();
      bindStaticFields();
      updateDerived();
      saveNow("Importado");
    } catch {
      updateStatus("JSON invalido");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function resetSheet() {
  const confirmed = window.confirm("Limpar a ficha salva neste navegador?");
  if (!confirmed) return;

  state = structuredClone(defaultState);
  localStorage.removeItem(STORAGE_KEY);
  renderAll();
  bindStaticFields();
  updateDerived();
  saveNow("Ficha limpa");
}

function getPath(object, path) {
  return path.split(".").reduce((value, key) => value?.[key], object);
}

function setPath(object, path, value) {
  const keys = path.split(".");
  const last = keys.pop();
  const target = keys.reduce((current, key) => {
    current[key] ??= {};
    return current[key];
  }, object);
  target[last] = value;
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slug(value) {
  return normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "cacador";
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}
