const elements = {
    formSection: document.getElementById("formSection"),
    kwota: document.getElementById("kwota"),
    kwotaRange: document.getElementById("kwotaRange"),
    iloscRat: document.getElementById("iloscRat"),
    iloscRatRange: document.getElementById("iloscRatRange"),
    oprocentowanie: document.getElementById("oprocentowanie"),
    oprocentowanieRange: document.getElementById("oprocentowanieRange"),
    rodzajRat: document.getElementById("rodzajRat"),
    prowizja: document.getElementById("prowizja"),
    prowizjaRange: document.getElementById("prowizjaRange"),
    jednostkaProwizji: document.getElementById("jednostkaProwizji"),
    zmienneOprocentowanieBtn: document.getElementById("zmienneOprocentowanieBtn"),
    nadplataKredytuBtn: document.getElementById("nadplataKredytuBtn"),
    addVariableOprocentowanieBtn: document.getElementById("addVariableOprocentowanieBtn"),
    addNadplataKredytuBtn: document.getElementById("addNadplataKredytuBtn"),
    obliczBtn: document.getElementById("obliczBtn"),
    zoomInBtn: document.getElementById("zoomInBtn"),
    zoomOutBtn: document.getElementById("zoomOutBtn"),
    toggleDarkModeBtn: document.getElementById("toggleDarkModeBtn"),
};

const state = {
    variableRates: [],
    overpaymentRates: [],
    lastFormData: {
        kwota: 500000,
        iloscRat: 360,
        oprocentowanie: 7,
        rodzajRat: "rowne",
        prowizja: 2,
        jednostkaProwizji: "procent",
        zmienneOprocentowanie: false,
        nadplataKredytu: false,
    },
};

function syncInputWithRange(input, range, options = {}) {
    const { isDecimal = false, min, max, step = 1, onChange } = options;

    if (!input || !range) {
        console.error(`Input or range not found for ${input?.id || "unknown"}`);
        return;
    }

    // Synchronizacja z pola tekstowego do suwaka
    input.addEventListener("input", () => {
        let value = isDecimal ? parseFloat(input.value) : parseInt(input.value);
        if (isNaN(value)) value = min;
        if (value < min) value = min;
        if (value > max) value = max;
        input.value = isDecimal ? value.toFixed(1) : value;
        range.value = value;
        console.log(`Input changed: ${input.id} = ${value}`);
        if (onChange) onChange(value);
    });

    // Synchronizacja z suwaka do pola tekstowego
    range.addEventListener("input", () => {
        let value = isDecimal ? parseFloat(range.value) : parseInt(range.value);
        input.value = isDecimal ? value.toFixed(1) : value;
        range.value = value; // Upewnij się, że suwak ma poprawną wartość
        console.log(`Range changed: ${input.id} = ${value}`);
        if (onChange) onChange(value);
    });

    // Inicjalna synchronizacja przy załadowaniu strony
    let initialValue = isDecimal ? parseFloat(range.value) : parseInt(range.value);
    if (isNaN(initialValue)) initialValue = min;
    if (initialValue < min) initialValue = min;
    if (initialValue > max) initialValue = max;
    input.value = isDecimal ? initialValue.toFixed(1) : initialValue;
    range.value = initialValue;
    console.log(`Initial sync: ${input.id} = ${initialValue}`);
}

syncInputWithRange(elements.kwota, elements.kwotaRange, {
    isDecimal: false,
    min: 50000,
    max: 5000000,
    step: 100,
    onChange: (value) => {
        state.lastFormData.kwota = value;
        // updateProwizjaInfo(); // Usunięto, aby nie aktualizować tekstu poniżej
    },
});

syncInputWithRange(elements.iloscRat, elements.iloscRatRange, {
    isDecimal: false,
    min: 12,
    max: 420,
    step: 1,
    onChange: (value) => {
        state.lastFormData.iloscRat = value;
        // updateLata(); // Usunięto, aby nie aktualizować tekstu "Ilość lat"
        updateVariableInputs(); // Zachowano, aby aktualizować zmienne oprocentowanie/nadpłaty
    },
});

syncInputWithRange(elements.oprocentowanie, elements.oprocentowanieRange, {
    isDecimal: true,
    min: 0.1,
    max: 25,
    step: 0.1,
    onChange: (value) => {
        state.lastFormData.oprocentowanie = value;
    },
});

syncInputWithRange(elements.prowizja, elements.prowizjaRange, {
    isDecimal: true,
    min: 0,
    max: 25,
    step: 0.1,
    onChange: (value) => {
        state.lastFormData.prowizja = value;
        // updateProwizjaInfo(); // Usunięto, aby nie aktualizować tekstu "Wartość: X zł"
    },
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
        state.variableRates = [{ value: state.lastFormData.oprocentowanie, period: 2 }];
    }
    updateVariableInputs();
});

elements.nadplataKredytuBtn.addEventListener("change", () => {
    state.lastFormData.nadplataKredytu = elements.nadplataKredytuBtn.checked;
    if (!elements.nadplataKredytuBtn.checked) {
        state.overpaymentRates = [];
    } else {
        state.overpaymentRates = [{ value: 0, period: 2 }];
    }
    updateVariableInputs();
});

elements.addVariableOprocentowanieBtn.addEventListener("click", () => {
    addVariableChange("oprocentowanie");
});

elements.addNadplataKredytuBtn.addEventListener("click", () => {
    addVariableChange("nadplata");
});

elements.obliczBtn.addEventListener("click", () => {
    console.log("Oblicz clicked", state.lastFormData);
    updateLata(); // Wywołanie przy kliknięciu "Oblicz", aby zaktualizować tekst poniżej
    updateProwizjaInfo(); // Wywołanie przy kliknięciu "Oblicz", aby zaktualizować tekst poniżej
});

function updateLata() {
    const miesiace = parseInt(elements.iloscRat.value) || 0;
    const lata = Math.floor(miesiace / 12);
    const lataElement = document.getElementById("lata");
    if (lataElement) {
        lataElement.textContent = `Ilość lat: ${miesiace >= 12 ? lata : 0}`;
    }
}

function updateProwizjaInfo() {
    const prowizja = parseFloat(elements.prowizja.value) || 0;
    const jednostka = elements.jednostkaProwizji.value;
    const kwota = parseFloat(elements.kwota.value) || 500000;
    const prowizjaInfo = document.getElementById("prowizjaInfo");
    if (prowizjaInfo) {
        const wartosc = jednostka === "procent" ? (prowizja / 100) * kwota : prowizja;
        prowizjaInfo.textContent = `Wartość: ${wartosc.toFixed(2)} zł`;
    }
}

function updateVariableData(activeType) {
    const maxCykl = parseInt(elements.iloscRat.value) || 360;
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
    const maxCykl = parseInt(elements.iloscRat.value) || 360;
    const maxChanges = Math.floor(maxCykl / 12) || 1;

    const isZmienneOprocentowanie = elements.zmienneOprocentowanieBtn.checked;
    const variableOprocentowanieInputs = document.getElementById("variableOprocentowanieInputs");
    const addVariableOprocentowanieBtn = elements.addVariableOprocentowanieBtn;
    const variableOprocentowanieWrapper = document.getElementById("variableOprocentowanieInputsWrapper");

    if (isZmienneOprocentowanie) {
        variableOprocentowanieInputs.classList.add("active");
        addVariableOprocentowanieBtn.style.display = "block";
        if (state.variableRates.length === 0 && state.variableRates.length < maxChanges) {
            state.variableRates.push({ value: state.lastFormData.oprocentowanie, period: 2 });
        }
        renderVariableInputs(variableOprocentowanieWrapper, state.variableRates, "oprocentowanie", maxCykl, maxChanges, addVariableOprocentowanieBtn);
    } else {
        variableOprocentowanieInputs.classList.remove("active");
        addVariableOprocentowanieBtn.style.display = "none";
        variableOprocentowanieWrapper.innerHTML = "";
    }

    const isNadplataKredytu = elements.nadplataKredytuBtn.checked;
    const nadplataKredytuInputs = document.getElementById("nadplataKredytuInputs");
    const addNadplataKredytuBtn = elements.addNadplataKredytuBtn;
    const nadplataKredytuWrapper = document.getElementById("nadplataKredytuInputsWrapper");

    if (isNadplataKredytu) {
        nadplataKredytuInputs.classList.add("active");
        addNadplataKredytuBtn.style.display = "block";
        if (state.overpaymentRates.length === 0 && state.overpaymentRates.length < maxChanges) {
            state.overpaymentRates.push({ value: 0, period: 2 });
        }
        renderVariableInputs(nadplataKredytuWrapper, state.overpaymentRates, "nadplata", maxCykl, maxChanges, addNadplataKredytuBtn);
    } else {
        nadplataKredytuInputs.classList.remove("active");
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
            <input type="range" class="form-range variable-cykl-range" min="${minPeriod}" max="${maxCykl}" step="1" value="${change.period}">
        `;

        const rateGroup = document.createElement("div");
        rateGroup.className = "form-group";
        rateGroup.innerHTML = `
            <label class="form-label">${activeType === "oprocentowanie" ? "Oprocentowanie" : "Nadpłata"}</label>
            <div class="input-group">
                <input type="number" class="form-control variable-rate" min="${activeType === "oprocentowanie" ? 0.1 : 0}" max="${activeType === "oprocentowanie" ? 50 : 1000000}" step="0.1" value="${change.value}">
                <span class="input-group-text">${activeType === "oprocentowanie" ? "%" : "zł"}</span>
            </div>
            <input type="range" class="form-range variable-rate-range" min="${activeType === "oprocentowanie" ? 0.1 : 0}" max="${activeType === "oprocentowanie" ? 50 : 1000000}" step="0.1" value="${change.value}">
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
            removeBtn.onclick = () => {
                removeVariableChange(index, activeType);
            };
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
            },
        });

        syncInputWithRange(rateInput, rateRange, {
            isDecimal: true,
            min: activeType === "oprocentowanie" ? 0.1 : 0,
            max: activeType === "oprocentowanie" ? 50 : 1000000,
            step: 0.1,
            onChange: (value) => {
                changes[index].value = value;
                updateVariableData(activeType);
            },
        });
    });

    addBtn.textContent = "Dodaj kolejną zmianę";
    const lastChange = changes.length > 0 ? changes[changes.length - 1] : null;
    const isMaxPeriodReached = lastChange && lastChange.period >= maxCykl;
    addBtn.style.display = changes.length < maxChanges && !isMaxPeriodReached ? "block" : "none";
}

function addVariableChange(activeType) {
    const maxCykl = parseInt(elements.iloscRat.value) || 360;
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
    const newValue = activeType === "oprocentowanie" ? state.lastFormData.oprocentowanie : 0;

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

let currentZoom = 1;
const zoomStep = 0.1;
const minZoom = 0.5;
const maxZoom = 2;

function updateZoom() {
    const container = document.querySelector(".container");
    if (!container) return;
    container.style.transform = `scale(${currentZoom})`;
    container.style.transformOrigin = "top center";
}

elements.zoomInBtn.addEventListener("click", () => {
    if (currentZoom < maxZoom) {
        currentZoom = Math.min(maxZoom, currentZoom + zoomStep);
        updateZoom();
    }
});

elements.zoomOutBtn.addEventListener("click", () => {
    if (currentZoom > minZoom) {
        currentZoom = Math.max(minZoom, currentZoom - zoomStep);
        updateZoom();
    }
});

function toggleDarkMode() {
    const body = document.body;
    const isDarkMode = body.classList.contains("dark-mode");

    if (isDarkMode) {
        body.classList.remove("dark-mode");
        body.classList.add("light-mode");
        localStorage.setItem("theme", "light");
        elements.toggleDarkModeBtn.textContent = "🌙";
    } else {
        body.classList.remove("light-mode");
        body.classList.add("dark-mode");
        localStorage.setItem("theme", "dark");
        elements.toggleDarkModeBtn.textContent = "☀️";
    }
}

function initializeTheme() {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
        elements.toggleDarkModeBtn.textContent = "☀️";
    } else {
        document.body.classList.add("light-mode");
        elements.toggleDarkModeBtn.textContent = "🌙";
    }
}

elements.toggleDarkModeBtn.addEventListener("click", toggleDarkMode);

document.getElementById("siteLogo").addEventListener("click", () => {
    window.open("https://finance-brothers.pl", "_blank");
});

updateLata();
updateProwizjaInfo();
updateVariableInputs();
initializeTheme();
