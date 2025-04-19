// D E F I N I C J E   Z M I E N N Y C H
const elements = {
    formSection: document.getElementById("formSection"),
    kwota: document.getElementById("kwota"),
    kwotaRange: document.getElementById("kwotaRange"),
    okresInwestycji: document.getElementById("okresInwestycji"),
    okresInwestycjiRange: document.getElementById("okresInwestycjiRange"),
    inflacja: document.getElementById("inflacja"),
    inflacjaRange: document.getElementById("inflacjaRange"),
    rodzajRat: document.getElementById("rodzajRat"),
    prowizja: document.getElementById("prowizja"),
    prowizjaRange: document.getElementById("prowizjaRange"),
    jednostkaProwizji: document.getElementById("jednostkaProwizji"),
    zmienneOprocentowanieBtn: document.getElementById("zmienneOprocentowanieBtn"),
    nadplataKredytuBtn: document.getElementById("nadplataKredytuBtn"),
    addVariableOprocentowanieBtn: document.getElementById("addVariableOprocentowanieBtn"),
    addNadplataKredytuBtn: document.getElementById("addNadplataKredytuBtn")
};

const state = {
    variableRates: [],
    overpaymentRates: [],
    lastFormData: {
        kwota: 10000,
        okresInwestycji: 3,
        inflacja: 4.90,
        rodzajRat: "rowne",
        prowizja: 1000,
        jednostkaProwizji: "pln",
        zmienneOprocentowanie: false,
        nadplataKredytu: false
    }
};

// F U N K C J A   S Y N C H R O N I Z A C J I
function syncInputWithRange(input, range, options = {}) {
    const { isDecimal = false, min, max, step = 1, onChange } = options;

    input.addEventListener("input", () => {
        let value = isDecimal ? parseFloat(input.value) : parseInt(input.value);
        if (isNaN(value)) value = min;
        if (value < min) value = min;
        if (value > max) value = max;
        input.value = isDecimal ? value.toFixed(2) : value;
        range.value = value;
        console.log(`Input ${input.id} updated to ${input.value}`);
        if (onChange) onChange(value);
    });

    range.addEventListener("input", () => {
        let value = isDecimal ? parseFloat(range.value) : parseInt(range.value);
        input.value = isDecimal ? value.toFixed(2) : value;
        console.log(`Range ${range.id} updated input ${input.id} to ${input.value}`);
        if (onChange) onChange(value);
    });
}

// O B S Ł U G A   Z D A R Z E Ń
syncInputWithRange(elements.kwota, elements.kwotaRange, {
    isDecimal: false,
    min: 100,
    max: 10000000,
    step: 100,
    onChange: (value) => {
        state.lastFormData.kwota = value;
        updateProwizjaInfo();
    }
});

syncInputWithRange(elements.okresInwestycji, elements.okresInwestycjiRange, {
    isDecimal: false,
    min: 3,
    max: 144,
    step: 1,
    onChange: (value) => {
        state.lastFormData.okresInwestycji = value;
        updateLata();
        updateVariableInputs();
    }
});

syncInputWithRange(elements.inflacja, elements.inflacjaRange, {
    isDecimal: true,
    min: 0.1,
    max: 50,
    step: 0.1,
    onChange: (value) => {
        state.lastFormData.inflacja = value;
    }
});

syncInputWithRange(elements.prowizja, elements.prowizjaRange, {
    isDecimal: true,
    min: 0.1,
    max: 1000000,
    step: 0.1,
    onChange: (value) => {
        state.lastFormData.prowizja = value;
        updateProwizjaInfo();
    }
});

elements.jednostkaProwizji.addEventListener("change", () => {
    state.lastFormData.jednostkaProwizji = elements.jednostkaProwizji.value;
    updateProwizjaInfo();
});

elements.rodzajRat.addEventListener("change", () => {
    state.lastFormData.rodzajRat = elements.rodzajRat.value;
});

elements.zmienneOprocentowanieBtn.addEventListener("change", () => {
    state.lastFormData.zmienneOprocentowanie = elements.zmienneOprocentowanieBtn.checked;
    if (!elements.zmienneOprocentowanieBtn.checked) {
        state.variableRates = [];
    } else {
        state.variableRates = [{ value: state.lastFormData.inflacja, period: 2 }];
    }
    updateVariableInputs();
});

elements.nadplataKredytuBtn.addEventListener("change", () => {
    state.lastFormData.nadplataKredytu = elements.nadplataKredytuBtn.checked;
    if (!elements.nadplataKredytuBtn.checked) {
        state.overpaymentRates = [];
    } else {
        state.overpaymentRates = [{ value: state.lastFormData.inflacja, period: 2 }];
    }
    updateVariableInputs();
});

elements.addVariableOprocentowanieBtn.addEventListener("click", () => addVariableChange("oprocentowanie"));
elements.addNadplataKredytuBtn.addEventListener("click", () => addVariableChange("nadplata"));

// F U N K C J E   P O M O C N I C Z E
function updateLata() {
    const miesiace = parseInt(elements.okresInwestycji.value) || 0;
    const lata = (miesiace / 12).toFixed(0);
    document.getElementById("lata").textContent = `Ilość lat: ${miesiace >= 12 ? lata : 0}`;
}

function updateProwizjaInfo() {
    const prowizja = parseFloat(elements.prowizja.value) || 0;
    const jednostka = elements.jednostkaProwizji.value === "pln" ? "zł" : "%";
    document.getElementById("prowizjaInfo").textContent = `Wartość: ${prowizja.toFixed(2)} ${jednostka}`;
}

function updateVariableData(activeType) {
    const maxCykl = parseInt(elements.okresInwestycji.value) || 3;
    const inputs = document.querySelectorAll(`.variable-input-group[data-type="${activeType}"]`);
    const newChanges = [];

    inputs.forEach((inputGroup, index) => {
        const cyklInput = inputGroup.querySelector(".variable-cykl");
        const rateInput = inputGroup.querySelector(".variable-rate");
        let period = Math.round(parseFloat(cyklInput.value));
        const value = parseFloat(rateInput.value);

        const minPeriod = index > 0 ? newChanges[index - 1].period + 1 : 2;
        if (period < minPeriod) {
            period = minPeriod;
            cyklInput.value = period;
            const cyklRange = inputGroup.querySelector(".variable-cykl-range");
            cyklRange.value = period;
        }
        if (period > maxCykl) {
            period = maxCykl;
            cyklInput.value = period;
            const cyklRange = inputGroup.querySelector(".variable-cykl-range");
            cyklRange.value = period;
        }

        newChanges.push({ period, value });
    });

    for (let i = 0; i < newChanges.length; i++) {
        const currentPeriod = newChanges[i].period;
        for (let j = newChanges.length - 1; j > i; j--) {
            if (newChanges[j].period <= currentPeriod) {
                newChanges.splice(j, 1);
            }
        }
    }

    if (activeType === "oprocentowanie") {
        state.variableRates = newChanges;
    } else if (activeType === "nadplata") {
        state.overpaymentRates = newChanges;
    }
}

function updateVariableInputs() {
    const maxCykl = parseInt(elements.okresInwestycji.value) || 3;
    const maxChanges = Math.floor(maxCykl / 12) || 1;

    // Zmienne Oprocentowanie
    const isZmienneOprocentowanie = elements.zmienneOprocentowanieBtn.checked;
    const variableOprocentowanieInputs = document.getElementById("variableOprocentowanieInputs");
    const addVariableOprocentowanieBtn = elements.addVariableOprocentowanieBtn;
    const variableOprocentowanieWrapper = document.getElementById("variableOprocentowanieInputsWrapper");

    if (isZmienneOprocentowanie) {
        console.log("Showing Zmienne Oprocentowanie inputs");
        variableOprocentowanieInputs.style.display = "block";
        addVariableOprocentowanieBtn.style.display = "block";

        const defaultValue = state.lastFormData.inflacja || 4.90;
        const defaultPeriod = 2;

        if (state.variableRates.length === 0 && state.variableRates.length < maxChanges) {
            state.variableRates.push({ value: defaultValue, period: defaultPeriod });
        }

        renderVariableInputs(variableOprocentowanieWrapper, state.variableRates, "oprocentowanie", maxCykl, maxChanges, addVariableOprocentowanieBtn);
    } else {
        console.log("Hiding Zmienne Oprocentowanie inputs");
        variableOprocentowanieInputs.style.display = "none";
        addVariableOprocentowanieBtn.style.display = "none";
        variableOprocentowanieWrapper.innerHTML = "";
    }

    // Nadpłata Kredytu
    const isNadplataKredytu = elements.nadplataKredytuBtn.checked;
    const nadplataKredytuInputs = document.getElementById("nadplataKredytuInputs");
    const addNadplataKredytuBtn = elements.addNadplataKredytuBtn;
    const nadplataKredytuWrapper = document.getElementById("nadplataKredytuInputsWrapper");

    if (isNadplataKredytu) {
        console.log("Showing Nadpłata Kredytu inputs");
        nadplataKredytuInputs.style.display = "block";
        addNadplataKredytuBtn.style.display = "block";

        const defaultValue = state.lastFormData.inflacja || 4.90;
        const defaultPeriod = 2;

        if (state.overpaymentRates.length === 0 && state.overpaymentRates.length < maxChanges) {
            state.overpaymentRates.push({ value: defaultValue, period: defaultPeriod });
        }

        renderVariableInputs(nadplataKredytuWrapper, state.overpaymentRates, "nadplata", maxCykl, maxChanges, addNadplataKredytuBtn);
    } else {
        console.log("Hiding Nadpłata Kredytu inputs");
        nadplataKredytuInputs.style.display = "none";
        addNadplataKredytuBtn.style.display = "none";
        nadplataKredytuWrapper.innerHTML = "";
    }
}

function renderVariableInputs(wrapper, changes, activeType, maxCykl, maxChanges, addBtn) {
    wrapper.innerHTML = "";

    changes.forEach((change, index) => {
        const inputGroup = document.createElement("div");
        inputGroup.className = "variable-input-group";
        inputGroup.setAttribute("data-type", activeType);

        const fieldsWrapper = document.createElement("div");
        fieldsWrapper.className = "fields-wrapper";

        const minPeriod = index > 0 ? changes[index - 1].period + 1 : 2;

        const cyklGroup = document.createElement("div");
        cyklGroup.className = "form-group";
        cyklGroup.innerHTML = `
            <label class="form-label">Od</label>
            <div class="input-group">
                <input type="number" class="form-control variable-cykl" min="${minPeriod}" max="${maxCykl}" step="1" value="${change.period}">
                <span class="input-group-text">miesiąca</span>
            </div>
            <input type="range" class="form-range variable-cykl-range" min="${minPeriod}" max="${maxCykl}" step="0.01" value="${change.period}">
        `;

        const rateGroup = document.createElement("div");
        rateGroup.className = "form-group";
        rateGroup.innerHTML = `
            <label class="form-label">${activeType === "oprocentowanie" ? "Oprocentowanie" : "Nadpłata"}</label>
            <div class="input-group">
                <input type="number" class="form-control variable-rate" min="0.1" max="50" step="0.1" value="${change.value}">
                <span class="input-group-text">%</span>
            </div>
            <input type="range" class="form-range variable-rate-range" min="0.1" max="50" step="0.1" value="${change.value}">
        `;

        fieldsWrapper.appendChild(cyklGroup);
        fieldsWrapper.appendChild(rateGroup);
        inputGroup.appendChild(fieldsWrapper);

        if (index === 0 && changes.length === 1) {
            const removeFirstBtnWrapper = document.createElement("div");
            removeFirstBtnWrapper.className = "remove-first-btn-wrapper";
            const removeFirstBtn = document.createElement("button");
            removeFirstBtn.className = "btn btn-danger btn-sm remove-first-btn";
            removeFirstBtn.textContent = "Usuń";
            removeFirstBtn.onclick = () => {
                if (activeType === "oprocentowanie") {
                    state.variableRates = [];
                    elements.zmienneOprocentowanieBtn.checked = false;
                    state.lastFormData.zmienneOprocentowanie = false;
                } else if (activeType === "nadplata") {
                    state.overpaymentRates = [];
                    elements.nadplataKredytuBtn.checked = false;
                    state.lastFormData.nadplataKredytu = false;
                }
                updateVariableInputs();
            };
            removeFirstBtnWrapper.appendChild(removeFirstBtn);
            inputGroup.appendChild(removeFirstBtnWrapper);
        }

        if (index === changes.length - 1 && changes.length > 1) {
            const removeBtnWrapper = document.createElement("div");
            removeBtnWrapper.className = "remove-btn-wrapper";
            const removeBtn = document.createElement("button");
            removeBtn.className = "btn btn-danger btn-sm";
            removeBtn.textContent = "Usuń";
            removeBtn.onclick = () => removeVariableChange(index, activeType);
            removeBtnWrapper.appendChild(removeBtn);
            inputGroup.appendChild(removeBtnWrapper);
        }

        wrapper.appendChild(inputGroup);

        const cyklInput = inputGroup.querySelector(".variable-cykl");
        const cyklRange = inputGroup.querySelector(".variable-cykl-range");
        const rateInput = inputGroup.querySelector(".variable-rate");
        const rateRange = inputGroup.querySelector(".variable-rate-range");

        syncInputWithRange(cyklInput, cyklRange, {
            isDecimal: false,
            min: minPeriod,
            max: maxCykl,
            step: 1,
            onChange: (value) => {
                changes[index].period = value;
                updateVariableData(activeType);
                updateVariableInputs();
            }
        });

        syncInputWithRange(rateInput, rateRange, {
            isDecimal: true,
            min: 0.1,
            max: 50,
            step: 0.1,
            onChange: (value) => {
                changes[index].value = value;
                updateVariableData(activeType);
            }
        });
    });

    addBtn.textContent = "Dodaj kolejną zmianę";
    const lastChange = changes.length > 0 ? changes[changes.length - 1] : null;
    const isMaxPeriodReached = lastChange && lastChange.period >= maxCykl;
    addBtn.style.display = (changes.length < maxChanges && !isMaxPeriodReached) ? "block" : "none";
}

function addVariableChange(activeType) {
    const maxCykl = parseInt(elements.okresInwestycji.value) || 3;
    const maxChanges = Math.floor(maxCykl / 12) || 1;

    let changes = activeType === "oprocentowanie" ? state.variableRates : state.overpaymentRates;

    const lastChange = changes.length > 0 ? changes[changes.length - 1] : null;
    const isMaxPeriodReached = lastChange && lastChange.period >= maxCykl;

    if (changes.length >= maxChanges || isMaxPeriodReached) {
        if (changes.length >= maxChanges) {
            alert(`Osiągnięto maksymalną liczbę zmian (${maxChanges}).`);
        }
        if (activeType === "oprocentowanie") {
            elements.addVariableOprocentowanieBtn.style.display = "none";
        } else {
            elements.addNadplataKredytuBtn.style.display = "none";
        }
        return;
    }

    const lastCykl = lastChange ? lastChange.period : 1;
    const newCykl = Math.min(lastCykl + 1, maxCykl);
    const newValue = state.lastFormData.inflacja || 4.90;

    changes.push({ period: newCykl, value: newValue });
    updateVariableInputs();
}

function removeVariableChange(index, activeType) {
    let changes = activeType === "oprocentowanie" ? state.variableRates : state.overpaymentRates;
    if (changes.length > 1) {
        changes.splice(index, 1);
        updateVariableInputs();
    }
}

updateLata();
updateProwizjaInfo();
updateVariableInputs();

// F U N K C J A   Z O O M
document.getElementById('siteLogo').addEventListener('click', () => {
    window.open('https://finance-brothers.pl', '_blank');
});

let currentZoom = 1;
const zoomStep = 0.1;
const minZoom = 0.5;
const maxZoom = 2;

function updateZoom() {
    const container = document.querySelector('.container');
    container.style.transform = `scale(${currentZoom})`;
    container.style.transformOrigin = 'top center';
}

document.getElementById("zoomInBtn").addEventListener("click", () => {
    if (currentZoom < maxZoom) {
        currentZoom = Math.min(maxZoom, currentZoom + zoomStep);
        updateZoom();
    }
});

document.getElementById("zoomOutBtn").addEventListener("click", () => {
    if (currentZoom > minZoom) {
        currentZoom = Math.max(minZoom, currentZoom - zoomStep);
        updateZoom();
    }
});

// D A R K   M O D E
function toggleDarkMode() {
    const body = document.body;
    const isDarkMode = body.classList.contains('dark-mode');

    if (isDarkMode) {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
        localStorage.setItem('theme', 'light');
        document.getElementById('toggleDarkModeBtn').textContent = '🌙';
    } else {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
        document.getElementById('toggleDarkModeBtn').textContent = '☀️';
    }
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('toggleDarkModeBtn').textContent = '☀️';
    } else {
        document.body.classList.add('light-mode');
        document.getElementById('toggleDarkModeBtn').textContent = '🌙';
    }
}

document.getElementById('toggleDarkModeBtn').addEventListener('click', toggleDarkMode);
initializeTheme();
