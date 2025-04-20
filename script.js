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

// Debug: Sprawdzanie, czy elementy istnieją
Object.entries(elements).forEach(([key, value]) => {
    if (!value) {
        console.warn(`Element ${key} (#${key}) nie został znaleziony w DOM.`);
    }
});

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
    const { isDecimal = false, onChange } = options;

    if (!input || !range) {
        console.error(`Input or range not found for ${input?.id || "unknown"}`);
        return;
    }

    input.addEventListener("input", () => {
        const min = parseFloat(input.min) || 0;
        const max = parseFloat(input.max) || Infinity;
        const step = parseFloat(input.step) || 1;
        let value = isDecimal ? parseFloat(input.value) : parseInt(input.value);
        if (input.classList.contains("variable-cykl")) {
            value = Math.round(value); // Zaokrąglanie dla OD/W
        }
        if (isNaN(value)) value = min;
        if (value < min) value = min;
        if (value > max) value = max;
        input.value = isDecimal ? value.toFixed(step === 1 ? 0 : 1) : value;
        range.value = value;
        console.log(`Input changed: ${input.id} = ${value}`);
        if (onChange) onChange(value);
    });

    range.addEventListener("input", () => {
        const min = parseFloat(range.min) || 0;
        const max = parseFloat(range.max) || Infinity;
        const step = parseFloat(range.step) || 1;
        let value = isDecimal ? parseFloat(range.value) : parseFloat(range.value);
        if (input.classList.contains("variable-cykl")) {
            value = Math.round(value); // Zaokrąglanie dla OD/W
        }
        input.value = isDecimal ? value.toFixed(step === 1 ? 0 : 1) : value;
        range.value = value;
        console.log(`Range changed: ${input.id} = ${value}`);
        if (onChange) onChange(value);
    });

    const min = parseFloat(input.min) || 0;
    const max = parseFloat(input.max) || Infinity;
    const step = parseFloat(input.step) || 1;
    let initialValue = isDecimal ? parseFloat(range.value) : parseInt(range.value);
    if (input.classList.contains("variable-cykl")) {
        initialValue = Math.round(initialValue); // Zaokrąglanie dla OD/W
    }
    if (isNaN(initialValue)) initialValue = min;
    if (initialValue < min) initialValue = min;
    if (initialValue > max) initialValue = max;
    input.value = isDecimal ? initialValue.toFixed(step === 1 ? 0 : 1) : initialValue;
    range.value = initialValue;
    console.log(`Initial sync: ${input.id} = ${initialValue}`);
}

syncInputWithRange(elements.kwota, elements.kwotaRange, {
    isDecimal: false,
    onChange: (value) => {
        state.lastFormData.kwota = value;
        updateProwizjaInfo();
        updateKwotaInfo();
    },
});

syncInputWithRange(elements.iloscRat, elements.iloscRatRange, {
    isDecimal: false,
    onChange: (value) => {
        state.lastFormData.iloscRat = value;
        updateLata();
        updateVariableInputs();
    },
});

syncInputWithRange(elements.oprocentowanie, elements.oprocentowanieRange, {
    isDecimal: true,
    onChange: (value) => {
        state.lastFormData.oprocentowanie = value;
    },
});

syncInputWithRange(elements.prowizja, elements.prowizjaRange, {
    isDecimal: true,
    onChange: (value) => {
        state.lastFormData.prowizja = value;
        updateProwizjaInfo();
    },
});

function updateProwizjaInput() {
    const jednostka = elements.jednostkaProwizji.value;
    let min, max, step, defaultValue;

    if (jednostka === "procent") {
        min = 0;
        max = 25;
        step = 0.1;
        defaultValue = 2;
    } else {
        min = 0;
        max = 1250000;
        step = 1;
        defaultValue = 10000;
    }

    elements.prowizja.min = min;
    elements.prowizja.max = max;
    elements.prowizja.step = step;
    elements.prowizjaRange.min = min;
    elements.prowizjaRange.max = max;
    elements.prowizjaRange.step = step;

    const currentValue = parseFloat(elements.prowizja.value);
    if (state.lastFormData.jednostkaProwizji !== jednostka) {
        elements.prowizja.value = defaultValue;
        elements.prowizjaRange.value = defaultValue;
        state.lastFormData.prowizja = defaultValue;
    } else {
        let value = currentValue;
        if (isNaN(value) || value < min) value = min;
        if (value > max) value = max;
        elements.prowizja.value = step === 1 ? value.toFixed(0) : value.toFixed(1);
        elements.prowizjaRange.value = value;
        state.lastFormData.prowizja = value;
    }

    state.lastFormData.jednostkaProwizji = jednostka;
}

if (elements.jednostkaProwizji) {
    elements.jednostkaProwizji.addEventListener("change", () => {
        updateProwizjaInput();
        updateProwizjaInfo();
    });
}

if (elements.rodzajRat) {
    elements.rodzajRat.addEventListener("change", () => {
        state.lastFormData.rodzajRat = elements.rodzajRat.value;
    });
}

if (elements.zmienneOprocentowanieBtn) {
    elements.zmienneOprocentowanieBtn.addEventListener("change", () => {
        state.lastFormData.zmienneOprocentowanie = elements.zmienneOprocentowanieBtn.checked;
        if (!elements.zmienneOprocentowanieBtn.checked) {
            state.variableRates = [];
        } else {
            state.variableRates = [{ value: state.lastFormData.oprocentowanie, period: 2 }];
        }
        updateVariableInputs();
    });
}

if (elements.nadplataKredytuBtn) {
    elements.nadplataKredytuBtn.addEventListener("change", () => {
        state.lastFormData.nadplataKredytu = elements.nadplataKredytuBtn.checked;
        if (!elements.nadplataKredytuBtn.checked) {
            state.overpaymentRates = [];
        } else {
            state.overpaymentRates = [{ value: 1000, period: 2, type: "Jednorazowa", effect: "Skróć okres kredytu" }];
        }
        updateVariableInputs();
    });
}

if (elements.addVariableOprocentowanieBtn) {
    elements.addVariableOprocentowanieBtn.addEventListener("click", () => {
        console.log("Dodaj zmienną stopę clicked");
        addVariableChange("oprocentowanie");
    });
}

if (elements.addNadplataKredytuBtn) {
    elements.addNadplataKredytuBtn.addEventListener("click", () => {
        console.log("Dodaj nadpłatę clicked");
        addVariableChange("nadplata");
    });
}

if (elements.obliczBtn) {
    elements.obliczBtn.addEventListener("click", () => {
        console.log("Oblicz clicked", state.lastFormData);
        updateLata();
        updateProwizjaInfo();
        updateKwotaInfo();
        updateRodzajRatInfo();
    });
}

function updateKwotaInfo() {
    const kwota = parseFloat(elements.kwota.value) || 500000;
    const kwotaInfo = document.getElementById("kwotaInfo");
    if (kwotaInfo) {
        kwotaInfo.textContent = `Kwota kredytu: ${kwota.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;
    }
}

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
        prowizjaInfo.textContent = `Prowizja: ${wartosc.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;
    }
}

function updateRodzajRatInfo() {
    const rodzajRatInfo = document.getElementById("rodzajRatInfo");
    if (rodzajRatInfo) {
        rodzajRatInfo.textContent = "Wybierz równe lub malejące";
    }
}

function updateVariableData(activeType) {
    const maxCykl = parseInt(elements.iloscRat.value) || 360;
    const inputs = document.querySelectorAll(`.variable-input-group[data-type="${activeType}"]`);
    const newChanges = [];

    inputs.forEach((inputGroup, index) => {
        const cyklInput = inputGroup.querySelector(".variable-cykl");
        const rateInput = inputGroup.querySelector(".variable-rate");
        const typeSelect = inputGroup.querySelector(".nadplata-type-select");
        const effectSelect = inputGroup.querySelector(".nadplata-effect-select");
        let period = Math.round(parseFloat(cyklInput.value));
        const value = parseFloat(rateInput.value);
        const type = typeSelect ? typeSelect.value : null;
        const effect = effectSelect ? effectSelect.value : null;

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

        const change = { period, value };
        if (type) change.type = type;
        if (effect) change.effect = effect;
        newChanges.push(change);
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

    const isZmienneOprocentowanie = elements.zmienneOprocentowanieBtn?.checked;
    const variableOprocentowanieInputs = document.getElementById("variableOprocentowanieInputs");
    const addVariableOprocentowanieBtn = elements.addVariableOprocentowanieBtn;
    const variableOprocentowanieWrapper = document.getElementById("variableOprocentowanieInputsWrapper");

    if (isZmienneOprocentowanie && variableOprocentowanieInputs && addVariableOprocentowanieBtn && variableOprocentowanieWrapper) {
        variableOprocentowanieInputs.classList.add("active");
        addVariableOprocentowanieBtn.style.display = "block";
        if (state.variableRates.length === 0 && state.variableRates.length < maxChanges) {
            state.variableRates.push({ value: state.lastFormData.oprocentowanie, period: 2 });
        }
        renderVariableInputs(variableOprocentowanieWrapper, state.variableRates, "oprocentowanie", maxCykl, maxChanges, addVariableOprocentowanieBtn);
    } else {
        if (variableOprocentowanieInputs) variableOprocentowanieInputs.classList.remove("active");
        if (addVariableOprocentowanieBtn) addVariableOprocentowanieBtn.style.display = "none";
        if (variableOprocentowanieWrapper) variableOprocentowanieWrapper.innerHTML = "";
    }

    const isNadplataKredytu = elements.nadplataKredytuBtn?.checked;
    const nadplataKredytuInputs = document.getElementById("nadplataKredytuInputs");
    const addNadplataKredytuBtn = elements.addNadplataKredytuBtn;
    const nadplataKredytuWrapper = document.getElementById("nadplataKredytuInputsWrapper");

    if (isNadplataKredytu && nadplataKredytuInputs && addNadplataKredytuBtn && nadplataKredytuWrapper) {
        nadplataKredytuInputs.classList.add("active");
        addNadplataKredytuBtn.style.display = "block";
        if (state.overpaymentRates.length === 0 && state.overpaymentRates.length < maxChanges) {
            state.overpaymentRates.push({ value: 1000, period: 2, type: "Jednorazowa", effect: "Skróć okres kredytu" });
        }
        renderVariableInputs(nadplataKredytuWrapper, state.overpaymentRates, "nadplata", maxCykl, maxChanges, addNadplataKredytuBtn);
    } else {
        if (nadplataKredytuInputs) nadplataKredytuInputs.classList.remove("active");
        if (addNadplataKredytuBtn) addNadplataKredytuBtn.style.display = "none";
        if (nadplataKredytuWrapper) nadplataKredytuWrapper.innerHTML = "";
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

        if (activeType === "nadplata") {
            // Select NADPŁATA
            const nadplataTypeGroup = document.createElement("div");
            nadplataTypeGroup.className = "form-group";
            const nadplataTypeLabel = document.createElement("label");
            nadplataTypeLabel.className = "form-label";
            nadplataTypeLabel.textContent = "NADPŁATA";
            const nadplataTypeSelect = document.createElement("select");
            nadplataTypeSelect.className = "form-select nadplata-type-select";
            ["Jednorazowa", "Miesięczna", "Kwartalna", "Roczna"].forEach((type) => {
                const option = document.createElement("option");
                option.value = type;
                option.textContent = type;
                if (change.type === type) option.selected = true;
                nadplataTypeSelect.appendChild(option);
            });
            nadplataTypeGroup.appendChild(nadplataTypeLabel);
            nadplataTypeGroup.appendChild(nadplataTypeSelect);
            fieldsWrapper.appendChild(nadplataTypeGroup);

            // Select PO NADPŁACIE
            const nadplataEffectGroup = document.createElement("div");
            nadplataEffectGroup.className = "form-group";
            const nadplataEffectLabel = document.createElement("label");
            nadplataEffectLabel.className = "form-label";
            nadplataEffectLabel.textContent = "PO NADPŁACIE";
            const nadplataEffectSelect = document.createElement("select");
            nadplataEffectSelect.className = "form-select nadplata-effect-select";
            ["Skróć okres kredytu", "Zmniejsz ratę"].forEach((effect) => {
                const option = document.createElement("option");
                option.value = effect;
                option.textContent = effect;
                if (change.effect === effect) option.selected = true;
                nadplataEffectSelect.appendChild(option);
            });
            nadplataEffectGroup.appendChild(nadplataEffectLabel);
            nadplataEffectGroup.appendChild(nadplataEffectSelect);
            fieldsWrapper.appendChild(nadplataEffectGroup);

            nadplataTypeSelect.addEventListener("change", () => {
                updateVariableData(activeType);
                updateVariableInputs();
            });
            nadplataEffectSelect.addEventListener("change", () => {
                updateVariableData(activeType);
            });
        }

        // Pole OD/W
        const cyklGroup = document.createElement("div");
        cyklGroup.className = "form-group";
        const cyklLabel = document.createElement("label");
        cyklLabel.className = "form-label";
        cyklLabel.textContent = activeType === "nadplata" && change.type === "Jednorazowa" ? "W" : "OD";
        const cyklInputGroup = document.createElement("div");
        cyklInputGroup.className = "input-group";
        const cyklInput = document.createElement("input");
        cyklInput.type = "number";
        cyklInput.className = "form-control variable-cykl";
        cyklInput.min = minPeriod;
        cyklInput.max = maxCykl;
        cyklInput.step = 1;
        cyklInput.value = change.period;
        const cyklUnit = document.createElement("span");
        cyklUnit.className = "input-group-text";
        cyklUnit.textContent = activeType === "nadplata" && change.type === "Jednorazowa" ? "miesiącu" : "miesiąca";
        cyklInputGroup.appendChild(cyklInput);
        cyklInputGroup.appendChild(cyklUnit);
        const cyklRange = document.createElement("input");
        cyklRange.type = "range";
        cyklRange.className = "form-range variable-cykl-range";
        cyklRange.min = minPeriod;
        cyklRange.max = maxCykl;
        cyklRange.step = 0.1; // Płynne przesuwanie
        cyklRange.value = change.period;
        cyklGroup.appendChild(cyklLabel);
        cyklGroup.appendChild(cyklInputGroup);
        cyklGroup.appendChild(cyklRange);
        fieldsWrapper.appendChild(cyklGroup);

        // Pole Wartość
        const rateGroup = document.createElement("div");
        rateGroup.className = "form-group";
        const rateLabel = document.createElement("label");
        rateLabel.className = "form-label";
        rateLabel.textContent = activeType === "nadplata" ? "KWOTA" : "STOPA";
        const rateInputGroup = document.createElement("div");
        rateInputGroup.className = "input-group";
        const rateInput = document.createElement("input");
        rateInput.type = "number";
        rateInput.className = "form-control variable-rate";
        rateInput.min = activeType === "nadplata" ? 100 : 0;
        rateInput.max = activeType === "nadplata" ? 1000000 : 25;
        rateInput.step = activeType === "nadplata" ? 1 : 0.1;
        rateInput.value = activeType === "nadplata" ? change.value || 1000 : change.value;
        const rateUnit = document.createElement("span");
        rateUnit.className = "input-group-text";
        rateUnit.textContent = activeType === "nadplata" ? "zł" : "%";
        rateInputGroup.appendChild(rateInput);
        rateInputGroup.appendChild(rateUnit);
        const rateRange = document.createElement("input");
        rateRange.type = "range";
        rateRange.className = "form-range variable-rate-range";
        rateRange.min = activeType === "nadplata" ? 100 : 0;
        rateRange.max = activeType === "nadplata" ? 1000000 : 25;
        rateRange.step = activeType === "nadplata" ? 1 : 0.1;
        rateRange.value = activeType === "nadplata" ? change.value || 1000 : change.value;
        rateGroup.appendChild(rateLabel);
        rateGroup.appendChild(rateInputGroup);
        rateGroup.appendChild(rateRange);
        fieldsWrapper.appendChild(rateGroup);

        inputGroup.appendChild(fieldsWrapper);

        // Przycisk usuwania
        if (index > 0 || changes.length > 1) {
            const removeBtnWrapper = document.createElement("div");
            removeBtnWrapper.className = index === 0 ? "remove-first-btn-wrapper" : "remove-btn-wrapper";
            const removeBtn = document.createElement("button");
            removeBtn.className = "btn btn-danger btn-sm" + (index === 0 ? " remove-first-btn" : "");
            removeBtn.textContent = "Usuń";
            removeBtn.addEventListener("click", () => {
                if (activeType === "oprocentowanie") {
                    state.variableRates.splice(index, 1);
                } else if (activeType === "nadplata") {
                    state.overpaymentRates.splice(index, 1);
                }
                updateVariableInputs();
            });
            removeBtnWrapper.appendChild(removeBtn);
            inputGroup.appendChild(removeBtnWrapper);
        }

        wrapper.appendChild(inputGroup);

        syncInputWithRange(cyklInput, cyklRange, {
            isDecimal: false,
            onChange: () => updateVariableData(activeType),
        });

        syncInputWithRange(rateInput, rateRange, {
            isDecimal: activeType !== "nadplata",
            onChange: () => updateVariableData(activeType),
        });
    });

    addBtn.textContent = activeType === "nadplata" ? "Dodaj kolejną nadpłatę" : "Dodaj kolejną zmianę";
    addBtn.disabled = changes.length >= maxChanges;
}

function addVariableChange(activeType) {
    const maxCykl = parseInt(elements.iloscRat.value) || 360;
    const maxChanges = Math.floor(maxCykl / 12) || 1;
    let newPeriod;

    if (activeType === "oprocentowanie") {
        if (state.variableRates.length >= maxChanges) return;
        newPeriod = state.variableRates.length > 0 ? state.variableRates[state.variableRates.length - 1].period + 1 : 2;
        if (newPeriod > maxCykl) newPeriod = maxCykl;
        state.variableRates.push({ value: state.lastFormData.oprocentowanie, period: newPeriod });
    } else if (activeType === "nadplata") {
        if (state.overpaymentRates.length >= maxChanges) return;
        newPeriod = state.overpaymentRates.length > 0 ? state.overpaymentRates[state.overpaymentRates.length - 1].period + 1 : 2;
        if (newPeriod > maxCykl) newPeriod = maxCykl;
        state.overpaymentRates.push({ value: 1000, period: newPeriod, type: "Jednorazowa", effect: "Skróć okres kredytu" });
    }

    updateVariableInputs();
}

// Inicjalizacja
updateProwizjaInput();
updateVariableInputs();
updateKwotaInfo();
updateLata();
updateProwizjaInfo();
updateRodzajRatInfo();
