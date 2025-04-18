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
    wartoscRaty: document.getElementById("wartoscRaty"),
    wartoscRatyRange: document.getElementById("wartoscRatyRange"),
    jednostkaRaty: document.getElementById("jednostkaRaty"),
    inflacjaZmiennaBtn: document.getElementById("inflacjaZmiennaBtn"),
    addVariableBtn: document.getElementById("addVariableBtn")
};

const state = {
    variableInflation: [],
    lastFormData: {
        kwota: 10000,
        okresInwestycji: 3,
        inflacja: 4.90,
        rodzajRat: "rowne",
        wartoscRaty: 1000,
        jednostkaRaty: "pln",
        inflacjaZmienna: false
    }
};

// O B S Ł U G A   Z D A R Z E Ń
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

elements.okresInwestycji.addEventListener("input", (e) => {
    restrictInputToNumbers(e);
});

elements.okresInwestycji.addEventListener("blur", validateOkresInwestycji);
elements.okresInwestycji.addEventListener("change", validateOkresInwestycji);

elements.okresInwestycjiRange.addEventListener("input", () => {
    let value = parseFloat(elements.okresInwestycjiRange.value);
    elements.okresInwestycji.value = value;
    updateLata();
});

elements.okresInwestycjiRange.addEventListener("change", validateOkresInwestycji);

elements.inflacja.addEventListener("input", () => {
    let value = parseFloat(elements.inflacja.value) || 0;
    if (value < 0.1) value = 0.1;
    if (value > 50) value = 50;
    elements.inflacja.value = value.toFixed(2);
    elements.inflacjaRange.value = value;
    state.lastFormData.inflacja = value;
    updateInflacjaInfo();
});

elements.inflacjaRange.addEventListener("input", () => {
    let value = parseFloat(elements.inflacjaRange.value);
    elements.inflacja.value = value.toFixed(2);
    state.lastFormData.inflacja = value;
    updateInflacjaInfo();
});

elements.rodzajRat.addEventListener("change", () => {
    state.lastFormData.rodzajRat = elements.rodzajRat.value;
    updateRodzajRatInfo();
});

elements.wartoscRaty.addEventListener("input", () => {
    let value = parseFloat(elements.wartoscRaty.value) || 0;
    if (value < 0.1) value = 0.1;
    if (value > 1000000) value = 1000000;
    elements.wartoscRaty.value = value.toFixed(2);
    elements.wartoscRatyRange.value = value;
    state.lastFormData.wartoscRaty = value;
    updateWartoscRatyInfo();
});

elements.wartoscRatyRange.addEventListener("input", () => {
    let value = parseFloat(elements.wartoscRatyRange.value);
    elements.wartoscRaty.value = value.toFixed(2);
    state.lastFormData.wartoscRaty = value;
    updateWartoscRatyInfo();
});

elements.jednostkaRaty.addEventListener("change", () => {
    state.lastFormData.jednostkaRaty = elements.jednostkaRaty.value;
    updateWartoscRatyInfo();
});

elements.inflacjaZmiennaBtn.addEventListener("change", () => {
    state.lastFormData.inflacjaZmienna = elements.inflacjaZmiennaBtn.checked;
    if (!elements.inflacjaZmiennaBtn.checked) {
        state.variableInflation = [];
    } else {
        state.variableInflation = [{ value: state.lastFormData.inflacja, period: 2 }];
    }
    updateVariableInputs();
});

elements.addVariableBtn.addEventListener("click", addVariableChange);

// F U N K C J E   P O M O C N I C Z E
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

function validateOkresInwestycji() {
    let value = parseInt(elements.okresInwestycji.value) || 0;
    if (value < 3) value = 3;
    if (value > 144) value = 144;
    elements.okresInwestycji.value = value;
    elements.okresInwestycjiRange.value = value;
    state.lastFormData.okresInwestycji = value;
    updateLata();
}

function updateIloscObligacji() {
    const kwota = parseFloat(elements.kwota.value) || 0;
    const ilosc = Math.floor(kwota / 100);
    const iloscElement = document.getElementById("iloscObligacji");
    if (iloscElement) iloscElement.textContent = `Ilość obligacji: ${ilosc}`;
    else console.warn("Element #iloscObligacji nie znaleziony.");
}

function updateLata() {
    const miesiace = parseInt(elements.okresInwestycji.value) || 0;
    const lata = (miesiace / 12).toFixed(0);
    document.getElementById("lata").textContent = `Ilość lat: ${miesiace >= 12 ? lata : 0}`;
}

function updateInflacjaInfo() {
    const inflacja = parseFloat(elements.inflacja.value) || 0;
    document.getElementById("inflacjaInfo").textContent = `Stopa inflacji: ${inflacja.toFixed(1)}%`;
}

function updateRodzajRatInfo() {
    const rodzaj = elements.rodzajRat.value === "rowne" ? "Raty równe" : "Raty malejące";
    document.getElementById("rodzajRatInfo").textContent = `Wybrano: ${rodzaj}`;
}

function updateWartoscRatyInfo() {
    const wartosc = parseFloat(elements.wartoscRaty.value) || 0;
    const jednostka = elements.jednostkaRaty.value === "pln" ? "zł" : "%";
    document.getElementById("wartoscRatyInfo").textContent = `Wartość: ${wartosc.toFixed(2)} ${jednostka}`;
}

function updateVariableData() {
    const isInflacjaZmienna = elements.inflacjaZmiennaBtn.checked;
    const changes = state.variableInflation;
    const maxCykl = parseInt(elements.okresInwestycji.value) || 3;

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

    state.variableInflation = newChanges;
}

function updateVariableInputs() {
    const isInflacjaZmienna = elements.inflacjaZmiennaBtn.checked;
    const variableInputs = document.getElementById("variableInputs");
    const addVariableBtn = elements.addVariableBtn;
    const wrapper = document.getElementById("variableInputsWrapper");
    const maxCykl = parseInt(elements.okresInwestycji.value) || 3;
    const maxChanges = Math.floor(maxCykl / 12) || 1;

    if (isInflacjaZmienna) {
        variableInputs.style.display = "block";
        addVariableBtn.style.display = "block";

        const data = state.variableInflation;
        const defaultValue = state.lastFormData.inflacja || 4.90;
        const defaultPeriod = 2;

        if (data.length === 0 && data.length < maxChanges) {
            data.push({ value: defaultValue, period: defaultPeriod });
        }

        wrapper.innerHTML = "";
        const changes = state.variableInflation;

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
                    <span class="input-group-text">miesiąca</span>
                </div>
                <input type="range" class="form-range variable-cykl-range" min="${minPeriod}" max="${maxCykl}" step="0.01" value="${change.period}">
            `;

            const rateGroup = document.createElement("div");
            rateGroup.className = "form-group";
            rateGroup.innerHTML = `
                <label class="form-label">Inflacja</label>
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
                    state.variableInflation = [];
                    elements.inflacjaZmiennaBtn.checked = false;
                    state.lastFormData.inflacjaZmienna = false;
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
                if (value > 50) value = 50;
                rateInput.value = value.toFixed(1);
                rateRange.value = value;
                changes[index].value = value;
                updateVariableData();
            });

            rateRange.addEventListener("input", () => {
                let value = parseFloat(rateRange.value);
                if (value < 0.1) value = 0.1;
                rateInput.value = value.toFixed(1);
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
    const isInflacjaZmienna = elements.inflacjaZmiennaBtn.checked;
    const changes = state.variableInflation;
    const maxCykl = parseInt(elements.okresInwestycji.value) || 3;
    const maxChanges = Math.floor(maxCykl / 12) || 1;

    if (!isInflacjaZmienna) return;

    const lastChange = changes.length > 0 ? changes[changes.length - 1] : null;
    const isMaxPeriodReached = lastChange && lastChange.period >= maxCykl;

    if (changes.length >= maxChanges || isMaxPeriodReached) {
        if (changes.length >= maxChanges) {
            alert(`Osiągnięto maksymalną liczbę zmian (${maxChanges}).`);
        }
        elements.addVariableBtn.style.display = "none";
        return;
    }

    const lastCykl = lastChange ? lastChange.period : 1;
    const newCykl = Math.min(lastCykl + 1, maxCykl);
    const newValue = state.lastFormData.inflacja || 4.90;

    changes.push({ period: newCykl, value: newValue });
    updateVariableInputs();
}

function removeVariableChange(index) {
    const changes = state.variableInflation;
    if (changes.length > 1) {
        changes.splice(index, 1);
        updateVariableInputs();
    }
}

updateIloscObligacji();
updateLata();
updateInflacjaInfo();
updateRodzajRatInfo();
updateWartoscRatyInfo();
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
