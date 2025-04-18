// D E F I N I C J E   Z M I E N N Y C H
const elements = {
    formSection: document.getElementById("formSection"),
    kwota: document.getElementById("kwota"),
    kwotaRange: document.getElementById("kwotaRange"),
    typObligacji: document.getElementById("typObligacji"),
    dynamicRate: document.getElementById("dynamicRate"),
    dynamicRateRange: document.getElementById("dynamicRateRange"),
    okres: document.getElementById("okres"),
    oprocentowanie: document.getElementById("oprocentowanie"),
    ikeIkzeBtn: document.getElementById("ikeIkzeBtn"),
    inflacjaZmiennaBtn: document.getElementById("inflacjaZmiennaBtn"),
    stopaZmiennaBtn: document.getElementById("stopaZmiennaBtn"),
    addVariableBtn: document.getElementById("addVariableBtn")
};

const state = {
    isIkeIkzeMode: false,
    variableInflation: [],
    variableReferenceRates: [],
    lastFormData: {
        kwota: 10000,
        typObligacji: "OTS",
        dynamicRates: {
            "ROR": 5.75,
            "DOR": 5.75,
            "COI": 4.90,
            "EDO": 4.90,
            "ROS": 4.90,
            "ROD": 4.90
        },
        okres: 3,
        oprocentowanie: 3,
        ikeIkze: false,
        inflacjaZmienna: false,
        stopaZmienna: false
    },
    previousTypObligacji: "OTS"
};

const maxVariableChanges = {
    "ROR": 11,
    "DOR": 23,
    "COI": 3,
    "EDO": 9,
    "ROS": 5,
    "ROD": 11
};

const obligacjeConfig = {
    "OTS": { okres: 3, oprocentowanie: 3.00, zmienne: false, kapitalizacja: false, oplataWykup: 0.00 },
    "ROR": { okres: 12, oprocentowanie: 5.75, zmienne: true, marza: 0.00, kapitalizacja: false, oplataWykup: 0.005 },
    "DOR": { okres: 24, oprocentowanie: 5.90, zmienne: true, marza: 0.15, kapitalizacja: false, oplataWykup: 0.007 },
    "TOS": { okres: 36, oprocentowanie: 5.95, zmienne: false, kapitalizacja: true, oplataWykup: 0.01 },
    "COI": { okres: 48, oprocentowanie: 6.30, zmienne: true, marza: 1.50, indeksowaneInflacja: true, kapitalizacja: false, oplataWykup: 0.02 },
    "EDO": { okres: 120, oprocentowanie: 6.55, zmienne: true, marza: 2.00, indeksowaneInflacja: true, kapitalizacja: true, oplataWykup: 0.03 },
    "ROS": { okres: 72, oprocentowanie: 6.50, zmienne: true, marza: 2.00, indeksowaneInflacja: true, kapitalizacja: true, oplataWykup: 0.02 },
    "ROD": { okres: 144, oprocentowanie: 6.80, zmienne: true, marza: 2.50, indeksowaneInflacja: true, kapitalizacja: true, oplataWykup: 0.03 }
};

// O B S Ł U G A   Z D A R Z E Ń
elements.dynamicRateRange.addEventListener("input", () => {
    let value = parseFloat(elements.dynamicRateRange.value);
    if (value < 0.1) value = 0.1;
    elements.dynamicRate.value = value;
    elements.dynamicRateRange.value = value;
    const typ = elements.typObligacji.value;
    state.lastFormData.dynamicRates[typ] = value;
});

elements.dynamicRate.addEventListener("input", () => {
    let value = parseFloat(elements.dynamicRate.value) || 0;
    if (value < 0.1) value = 0.1;
    elements.dynamicRate.value = value;
    elements.dynamicRateRange.value = value;
    const typ = elements.typObligacji.value;
    state.lastFormData.dynamicRates[typ] = value;
});

elements.kwota.addEventListener("input", (e) => {
    restrictInputToNumbers(e);
});

elements.kwota.addEventListener("blur", validateAndRoundKwota);
elements.kwota.addEventListener("change", validateAndRoundKwota);

elements.kwotaRange.addEventListener("input", () => {
    let value = parseFloat(elements.kwotaRange.value);
    elements.kwota.value = value;
    updateIloscObligacji();
});

elements.kwotaRange.addEventListener("change", validateAndRoundKwota);

elements.typObligacji.addEventListener("change", updateDynamicRateField);
elements.ikeIkzeBtn.addEventListener("change", updateDynamicRateField);

elements.inflacjaZmiennaBtn.addEventListener("change", () => {
    state.lastFormData.inflacjaZmienna = elements.inflacjaZmiennaBtn.checked;
    const typ = elements.typObligacji.value;
    if (!elements.inflacjaZmiennaBtn.checked) {
        state.variableInflation = [];
    } else {
        const defaultValue = state.lastFormData.dynamicRates[typ] || 4.90;
        state.variableInflation = [{ value: defaultValue, period: 2 }];
    }
    updateVariableInputs();
});

elements.stopaZmiennaBtn.addEventListener("change", () => {
    state.lastFormData.stopaZmienna = elements.stopaZmiennaBtn.checked;
    const typ = elements.typObligacji.value;
    if (!elements.stopaZmiennaBtn.checked) {
        state.variableReferenceRates = [];
    } else {
        const defaultValue = state.lastFormData.dynamicRates[typ] || 5.75;
        state.variableReferenceRates = [{ value: defaultValue, period: 2 }];
    }
    updateVariableInputs();
});

elements.addVariableBtn.addEventListener("click", addVariableChange);

// F U N K C J E   P O M O C N I C Z E
function setDynamicRateField(label, value, step, max) {
    const dynamicRateLabel = document.getElementById("dynamicRateLabel");
    const dynamicRateInfo = document.getElementById("dynamicRateInfo");
    dynamicRateLabel.textContent = label;
    elements.dynamicRate.value = value;
    elements.dynamicRateRange.value = value;
    elements.dynamicRate.step = step;
    elements.dynamicRateRange.step = step;
    elements.dynamicRate.max = max;
    elements.dynamicRateRange.max = max;
}

function updateDynamicRateField() {
    state.isIkeIkzeMode = elements.ikeIkzeBtn.checked;
    const select = elements.typObligacji;
    const previousTyp = state.previousTypObligacji;
    const currentTyp = select.value;

    select.innerHTML = state.isIkeIkzeMode ? `
        <option value="ROR">12-miesięczne (ROR)</option>
        <option value="DOR">24-miesięczne (DOR)</option>
        <option value="TOS" selected>3-letnie (TOS)</option>
        <option value="COI">4-letnie (COI)</option>
        <option value="EDO">10-letnie (EDO)</option>
    ` : `
        <option value="OTS" selected>3-miesięczne (OTS)</option>
        <option value="ROR">12-miesięczne (ROR)</option>
        <option value="DOR">24-miesięczne (DOR)</option>
        <option value="TOS">3-letnie (TOS)</option>
        <option value="COI">4-letnie (COI)</option>
        <option value="EDO">10-letnie (EDO)</option>
        <option value="ROS">6-letnie (ROS)</option>
        <option value="ROD">12-letnich (ROD)</option>
    `;

    const availableOptions = Array.from(select.options).map(opt => opt.value);
    select.value = availableOptions.includes(currentTyp) ? currentTyp : (state.isIkeIkzeMode ? "TOS" : "OTS");

    const typ = select.value;
    const config = obligacjeConfig[typ];

    if (typ !== previousTyp) {
        if (elements.stopaZmiennaBtn.checked || elements.inflacjaZmiennaBtn.checked) {
            elements.stopaZmiennaBtn.checked = false;
            elements.inflacjaZmiennaBtn.checked = false;
            state.lastFormData.stopaZmienna = false;
            state.lastFormData.inflacjaZmienna = false;
            state.variableReferenceRates = [];
            state.variableInflation = [];
        }
    }

    state.previousTypObligacji = typ;

    elements.okres.value = config.okres;
    const jednostkaOkresu = ["OTS", "DOR", "ROS", "ROD"].includes(typ) ? "miesiące" : "miesięcy";
    const inputGroup = elements.okres.closest('.input-group');
    const okresUnitElement = inputGroup ? inputGroup.querySelector('.input-group-text') : null;
    if (okresUnitElement) {
        okresUnitElement.textContent = jednostkaOkresu;
    } else {
        console.warn("Nie znaleziono elementu '.input-group-text' w obrębie '#okres'.");
    }
    elements.oprocentowanie.value = config.oprocentowanie;
    updateLata();

    const dynamicRateGroup = document.getElementById("dynamicRateGroup");
    if (["ROR", "DOR"].includes(typ)) {
        const stopaRefValue = state.lastFormData.dynamicRates[typ] || 5.75;
        setDynamicRateField("Stopa Ref. NBP", stopaRefValue, "0.05", "20");
        dynamicRateGroup.style.display = "flex";
    } else if (["COI", "EDO", "ROS", "ROD"].includes(typ)) {
        const inflacjaValue = state.lastFormData.dynamicRates[typ] || 4.90;
        setDynamicRateField("Inflacja", inflacjaValue, "0.1", "50");
        dynamicRateGroup.style.display = "flex";
    } else {
        dynamicRateGroup.style.display = "none";
    }

    document.getElementById("inflacjaZmiennaLabel").style.display = ["COI", "EDO", "ROS", "ROD"].includes(typ) ? "flex" : "none";
    document.getElementById("stopaZmiennaLabel").style.display = ["ROR", "DOR"].includes(typ) ? "flex" : "none";

    if (!["COI", "EDO", "ROS", "ROD"].includes(typ)) {
        state.variableInflation = [];
    } else if (elements.inflacjaZmiennaBtn.checked && state.variableInflation.length === 0) {
        const defaultValue = state.lastFormData.dynamicRates[typ] || 4.90;
        state.variableInflation = [{ value: defaultValue, period: 2 }];
    }

    if (!["ROR", "DOR"].includes(typ)) {
        state.variableReferenceRates = [];
    } else if (elements.stopaZmiennaBtn.checked && state.variableReferenceRates.length === 0) {
        const defaultValue = state.lastFormData.dynamicRates[typ] || 5.75;
        state.variableReferenceRates = [{ value: defaultValue, period: 2 }];
    }

    const ikeIkzeContainer = document.getElementById("ikeIkzeContainer");
    const allowedTypes = ["ROR", "DOR", "TOS", "COI", "EDO"];
    if (allowedTypes.includes(typ)) {
        ikeIkzeContainer.style.display = "block";
    } else {
        ikeIkzeContainer.style.display = "none";
        elements.ikeIkzeBtn.checked = false;
        state.isIkeIkzeMode = false;
        state.lastFormData.ikeIkze = false;
    }

    updateVariableInputs();
}

function restrictInputToNumbers(e) {
    e.target.value = e.target.value.replace(/[^0-9]/g, "");
}

function validateAndRoundKwota() {
    let value = parseFloat(elements.kwota.value) || 0;
    if (value < 100) value = 100;
    if (value > 10000000) value = 10000000;
    value = Math.round(value / 100) * 100;
    elements.kwota.value = value;
    elements.kwotaRange.value = value;
    state.lastFormData.kwota = value;
    updateIloscObligacji();
}

function updateIloscObligacji() {
    const kwota = parseFloat(elements.kwota.value) || 0;
    const ilosc = Math.floor(kwota / 100);
    const iloscElement = document.getElementById("iloscObligacji");
    if (iloscElement) iloscElement.textContent = `Ilość obligacji: ${ilosc}`;
    else console.warn("Element #iloscObligacji nie znaleziony.");
}

function updateVariableData() {
    const typ = elements.typObligacji.value;
    const isInflacjaZmienna = elements.inflacjaZmiennaBtn.checked && ["COI", "EDO", "ROS", "ROD"].includes(typ);
    const isStopaZmienna = elements.stopaZmiennaBtn.checked && ["ROR", "DOR"].includes(typ);
    const changes = isInflacjaZmienna ? state.variableInflation : state.variableReferenceRates;
    const maxCykl = ["ROR", "DOR"].includes(typ) ? obligacjeConfig[typ].okres : obligacjeConfig[typ].okres / 12;

    const inputs = document.querySelectorAll(".variable-input-group");
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

    if (isInflacjaZmienna) {
        state.variableInflation = newChanges;
    } else {
        state.variableReferenceRates = newChanges;
    }
}

function updateLata() {
    const miesiace = parseInt(elements.okres.value) || 0;
    const lata = (miesiace / 12).toFixed(0);
    document.getElementById("lata").textContent = `Ilość lat: ${miesiace >= 12 ? lata : 0}`;
}

function updateVariableInputs() {
    const typ = elements.typObligacji.value;
    const isInflacjaZmienna = elements.inflacjaZmiennaBtn.checked && ["COI", "EDO", "ROS", "ROD"].includes(typ);
    const isStopaZmienna = elements.stopaZmiennaBtn.checked && ["ROR", "DOR"].includes(typ);
    const variableInputs = document.getElementById("variableInputs");
    const addVariableBtn = elements.addVariableBtn;
    const wrapper = document.getElementById("variableInputsWrapper");
    const config = obligacjeConfig[typ];
    const maxCykl = ["ROR", "DOR"].includes(typ) ? config.okres : config.okres / 12;

    if (isInflacjaZmienna || isStopaZmienna) {
        variableInputs.style.display = "block";
        addVariableBtn.style.display = "block";

        const data = isInflacjaZmienna ? state.variableInflation : state.variableReferenceRates;
        const maxChanges = maxVariableChanges[typ] || 0;

        const defaultValue = state.lastFormData.dynamicRates[typ] || (isInflacjaZmienna ? 4.90 : 5.75);
        const defaultPeriod = 2;

        if (data.length === 0 && data.length < maxChanges) {
            data.push({ value: defaultValue, period: defaultPeriod });
        }

        wrapper.innerHTML = "";
        const changes = isInflacjaZmienna ? state.variableInflation : state.variableReferenceRates;

        changes.forEach((change, index) => {
            const inputGroup = document.createElement("div");
            inputGroup.className = "variable-input-group";

            const fieldsWrapper = document.createElement("div");
            fieldsWrapper.className = "fields-wrapper";

            const minPeriod = index > 0 ? changes[index - 1].period + 1 : 2;

            const cyklGroup = document.createElement("div");
            cyklGroup.className = "form-group";
            cyklGroup.innerHTML = `
                <label class="form-label">Od</label>
                <div class="input-group">
                    <input type="number" class="form-control variable-cykl" min="${minPeriod}" max="${maxCykl}" step="1" value="${change.period}">
                    <span class="input-group-text">${["ROR", "DOR"].includes(typ) ? "miesiąca" : "roku"}</span>
                </div>
                <input type="range" class="form-range variable-cykl-range" min="${minPeriod}" max="${maxCykl}" step="0.01" value="${change.period}">
            `;

            const rateGroup = document.createElement("div");
            rateGroup.className = "form-group";
            rateGroup.innerHTML = `
                <label class="form-label">${isInflacjaZmienna ? "Inflacja" : "Stopa Ref. NBP"}</label>
                <div class="input-group">
                    <input type="number" class="form-control variable-rate" min="0.1" max="${isInflacjaZmienna ? 50 : 20}" step="${isInflacjaZmienna ? 0.1 : 0.05}" value="${change.value}">
                    <span class="input-group-text">%</span>
                </div>
                <input type="range" class="form-range variable-rate-range" min="0.1" max="${isInflacjaZmienna ? 50 : 20}" step="${isInflacjaZmienna ? 0.1 : 0.05}" value="${change.value}">
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
                    if (isInflacjaZmienna) {
                        state.variableInflation = [];
                        elements.inflacjaZmiennaBtn.checked = false;
                        state.lastFormData.inflacjaZmienna = false;
                    } else {
                        state.variableReferenceRates = [];
                        elements.stopaZmiennaBtn.checked = false;
                        state.lastFormData.stopaZmienna = false;
                    }
                    variableInputs.style.display = "none";
                    addVariableBtn.style.display = "none";
                    wrapper.innerHTML = "";
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
                removeBtn.onclick = () => removeVariableChange(index);
                removeBtnWrapper.appendChild(removeBtn);
                inputGroup.appendChild(removeBtnWrapper);
            }

            wrapper.appendChild(inputGroup);

            const cyklInput = inputGroup.querySelector(".variable-cykl");
            const cyklRange = inputGroup.querySelector(".variable-cykl-range");
            const rateInput = inputGroup.querySelector(".variable-rate");
            const rateRange = inputGroup.querySelector(".variable-rate-range");

            cyklInput.addEventListener("input", () => {
                let value = parseInt(cyklInput.value);
                if (value < minPeriod) {
                    value = minPeriod;
                    cyklInput.value = value;
                }
                if (value > maxCykl) {
                    value = maxCykl;
                    cyklInput.value = value;
                }
                cyklRange.value = value;
                changes[index].period = value;
                updateVariableData();
                updateVariableInputs();
            });

            cyklRange.addEventListener("input", () => {
                let value = parseFloat(cyklRange.value);
                cyklInput.value = Math.round(value);
            });

            cyklRange.addEventListener("change", () => {
                let value = parseFloat(cyklRange.value);
                value = Math.round(value);
                if (value < minPeriod) value = minPeriod;
                if (value > maxCykl) value = maxCykl;
                cyklRange.value = value;
                cyklInput.value = value;
                changes[index].period = value;
                updateVariableData();
                updateVariableInputs();
            });

            rateInput.addEventListener("input", () => {
                let value = parseFloat(rateInput.value) || 0;
                if (value < 0.1) value = 0.1;
                if (value > (isInflacjaZmienna ? 50 : 20)) value = isInflacjaZmienna ? 50 : 20;
                rateInput.value = value.toFixed(isInflacjaZmienna ? 1 : 2);
                rateRange.value = value;
                changes[index].value = value;
                updateVariableData();
            });

            rateRange.addEventListener("input", () => {
                let value = parseFloat(rateRange.value);
                if (value < 0.1) value = 0.1;
                rateInput.value = value.toFixed(isInflacjaZmienna ? 1 : 2);
                changes[index].value = value;
                updateVariableData();
            });
        });

        addVariableBtn.textContent = "Dodaj kolejną zmianę";
        const lastChange = changes.length > 0 ? changes[changes.length - 1] : null;
        const isMaxPeriodReached = lastChange && lastChange.period >= maxCykl;
        addVariableBtn.style.display = (changes.length < maxChanges && !isMaxPeriodReached) ? "block" : "none";
    } else {
        variableInputs.style.display = "none";
        addVariableBtn.style.display = "none";
        wrapper.innerHTML = "";
    }
}

function addVariableChange() {
    const typ = elements.typObligacji.value;
    const isInflacjaZmienna = elements.inflacjaZmiennaBtn.checked && ["COI", "EDO", "ROS", "ROD"].includes(typ);
    const isStopaZmienna = elements.stopaZmiennaBtn.checked && ["ROR", "DOR"].includes(typ);
    const changes = isInflacjaZmienna ? state.variableInflation : state.variableReferenceRates;
    const maxCykl = ["ROR", "DOR"].includes(typ) ? obligacjeConfig[typ].okres : obligacjeConfig[typ].okres / 12;
    const maxChanges = maxVariableChanges[typ] || 0;

    if (!isInflacjaZmienna && !isStopaZmienna) return;

    const lastChange = changes.length > 0 ? changes[changes.length - 1] : null;
    const isMaxPeriodReached = lastChange && lastChange.period >= maxCykl;

    if (changes.length >= maxChanges || isMaxPeriodReached) {
        if (changes.length >= maxChanges) {
            alert(`Osiągnięto maksymalną liczbę zmian dla obligacji ${typ} (${maxChanges}).`);
        }
        elements.addVariableBtn.style.display = "none";
        return;
    }

    const lastCykl = lastChange ? lastChange.period : 1;
    const newCykl = Math.min(lastCykl + 1, maxCykl);
    const newValue = state.lastFormData.dynamicRates[typ] || (isInflacjaZmienna ? 4.90 : 5.75);

    changes.push({ period: newCykl, value: newValue });
    updateVariableInputs();
}

function removeVariableChange(index) {
    const typ = elements.typObligacji.value;
    const isInflacjaZmienna = elements.inflacjaZmiennaBtn.checked && ["COI", "EDO", "ROS", "ROD"].includes(typ);
    const changes = isInflacjaZmienna ? state.variableInflation : state.variableReferenceRates;
    if (changes.length > 1) {
        changes.splice(index, 1);
        updateVariableInputs();
    }
}

updateDynamicRateField();
updateIloscObligacji();

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
