// SEKCJA: Elementy DOM
const elements = {
    formSection: document.getElementById("formSection"),
    resultSection: document.getElementById("resultSection"),
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
    harmonogramTabela: document.getElementById("harmonogramTabela"),
    creditChart: document.getElementById("creditChart"),
    valueKapital: document.getElementById("valueKapital"),
    valueOdsetki: document.getElementById("valueOdsetki"),
    valueNadplata: document.getElementById("valueNadplata"),
    valueProwizja: document.getElementById("valueProwizja"),
    okresPoNadplacie: document.getElementById("okresPoNadplacie"),
    koszt: document.getElementById("koszt"),
    generatePdfBtn: document.getElementById("generatePdfBtn"),
};

// Debug: Sprawdzanie, czy elementy istnieją
Object.entries(elements).forEach(([key, value]) => {
    if (!value) {
        console.warn(`Element ${key} (#${key}) nie został znaleziony w DOM.`);
    }
});

// SEKCJA: Stan aplikacji
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
    tempValues: {},
    harmonogram: [],
    chartInstance: null,
};

// SEKCJA: Funkcje pomocnicze
// Funkcja formatująca liczby z separatorem tysięcy (spacja) i przecinkiem dziesiętnym
function formatNumberWithSpaces(number) {
    const parts = number.toFixed(2).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return parts.join(",");
}

// Synchronizacja inputów z suwakami
function syncInputWithRange(input, range, options = {}) {
    const { isDecimal = false, onChange, isVariableCykl = false, index, activeType } = options;

    if (!input || !range) {
        console.error(`Input or range not found for ${input?.id || "unknown"}`);
        return;
    }

    input._eventListeners = input._eventListeners || {};
    range._eventListeners = range._eventListeners || {};

    const removeListeners = () => {
        if (input._eventListeners.input) {
            input.removeEventListener("input", input._eventListeners.input);
        }
        if (input._eventListeners.change) {
            input.removeEventListener("change", input._eventListeners.change);
        }
        if (range._eventListeners.input) {
            range.removeEventListener("input", range._eventListeners.input);
        }
        if (range._eventListeners.change) {
            range.removeEventListener("change", range._eventListeners.change);
        }
    };

    removeListeners();

    const updateValue = (value, source, applyMinValidation = false) => {
        const min = parseFloat(input.min) || 0;
        const max = parseFloat(input.max) || Infinity;
        const step = parseFloat(input.step) || 1;
        let parsedValue = isDecimal ? parseFloat(value) : parseInt(value);
        if (isNaN(parsedValue)) parsedValue = min;

        if (applyMinValidation && input.classList.contains("variable-rate") && activeType === "nadplata" && parsedValue < 100) {
            parsedValue = 100;
        }

        if (parsedValue < min) parsedValue = min;
        if (parsedValue > max) parsedValue = max;

        if (input.id === "oprocentowanie" || (activeType === "oprocentowanie" && input.classList.contains("variable-rate"))) {
            input.value = parsedValue.toFixed(2);
        } else {
            input.value = isDecimal ? parsedValue.toFixed(step === 1 ? 0 : 1) : parsedValue;
        }
        range.value = parsedValue;
        console.log(`${source} changed: ${input.id || range.className} = ${parsedValue}, activeType=${activeType}, index=${index}`);

        if (isVariableCykl) {
            state.tempValues[input.id || range.id] = parsedValue;
        } else if (onChange) {
            console.log(`onChange triggered for ${input.id || range.className}, value=${parsedValue}`);
            onChange(parsedValue);
        }
    };

    const inputHandler = () => updateValue(input.value, "Input", false);
    const rangeHandler = () => updateValue(range.value, "Range", true);
    const inputChangeHandler = () => updateValue(input.value, "Input", true);

    input._eventListeners.input = inputHandler;
    range._eventListeners.input = rangeHandler;
    input._eventListeners.change = inputChangeHandler;
    input.addEventListener("input", inputHandler);
    range.addEventListener("input", rangeHandler);
    input.addEventListener("change", inputChangeHandler);

    if (isVariableCykl) {
        const changeHandler = () => {
            const value = state.tempValues[input.id || range.id];
            if (value !== undefined && onChange) {
                console.log(`Change committed: ${input.id || range.className} = ${value}`);
                onChange(value);
                delete state.tempValues[input.id || range.id];
            }
        };
        range._eventListeners.change = changeHandler;
        range.addEventListener("change", changeHandler);
    }

    const min = parseFloat(input.min) || 0;
    const max = parseFloat(input.max) || Infinity;
    const step = parseFloat(input.step) || 1;
    let initialValue = isDecimal ? parseFloat(range.value) : parseInt(range.value);
    if (isNaN(initialValue)) initialValue = min;
    if (initialValue < min) initialValue = min;
    if (initialValue > max) initialValue = max;

    if (activeType === "nadplata" && input.classList.contains("variable-rate") && initialValue < 100) {
        initialValue = 100;
    }

    if (input.id === "oprocentowanie" || (activeType === "oprocentowanie" && input.classList.contains("variable-rate"))) {
        input.value = initialValue.toFixed(2);
    } else {
        input.value = isDecimal ? initialValue.toFixed(step === 1 ? 0 : 1) : initialValue;
    }
    range.value = initialValue;
    console.log(`Initial sync: ${input.id || range.className} = ${initialValue}`);
}

// SEKCJA: Funkcje aktualizujące UI
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
    if (isNaN(currentValue) || currentValue < min || currentValue > max) {
        elements.prowizja.value = defaultValue;
        elements.prowizjaRange.value = defaultValue;
    } else {
        elements.prowizja.value = currentValue.toFixed(step === 1 ? 0 : 1);
        elements.prowizjaRange.value = currentValue;
    }

    syncInputWithRange(elements.prowizja, elements.prowizjaRange, {
        isDecimal: jednostka === "procent",
        onChange: (value) => {
            const kwota = parseFloat(elements.kwota.value) || 0;
            const prowizjaValue = jednostka === "procent" ? (kwota * value) / 100 : value;
            document.getElementById("prowizjaInfo").textContent = `Prowizja: ${formatNumberWithSpaces(prowizjaValue)} zł`;
        },
    });

    const kwota = parseFloat(elements.kwota.value) || 0;
    const prowizjaValue = jednostka === "procent" ? (kwota * parseFloat(elements.prowizja.value)) / 100 : parseFloat(elements.prowizja.value);
    document.getElementById("prowizjaInfo").textContent = `Prowizja: ${formatNumberWithSpaces(prowizjaValue)} zł`;
}

// Aktualizacja liczby lat na podstawie ilości rat
function updateLata() {
    const iloscRat = parseInt(elements.iloscRat.value) || 0;
    const lata = Math.floor(iloscRat / 12);
    document.getElementById("lata").textContent = `Ilość lat: ${lata}`;
}

// Aktualizacja informacji o kwocie kredytu
function updateKwotaInfo() {
    const kwota = parseFloat(elements.kwota.value) || 0;
    document.getElementById("kwotaInfo").textContent = `Kwota kredytu: ${formatNumberWithSpaces(kwota)} zł`;
    updateProwizjaInput();
}

// SEKCJA: Funkcje dynamicznego dodawania pól
function addVariableOprocentowanieInput(index, initialData = {}) {
    const container = document.getElementById("variableOprocentowanieInputsWrapper");
    const inputGroup = document.createElement("div");
    inputGroup.classList.add("variable-input-group");
    inputGroup.setAttribute("data-type", "oprocentowanie");
    inputGroup.setAttribute("data-index", index);

    const fieldsWrapper = document.createElement("div");
    fieldsWrapper.classList.add("fields-wrapper");
    inputGroup.appendChild(fieldsWrapper);

    const cyklGroup = document.createElement("div");
    cyklGroup.classList.add("form-group");
    const cyklLabel = document.createElement("label");
    cyklLabel.classList.add("form-label");
    cyklLabel.textContent = "Od którego miesiąca?";
    const cyklInputGroup = document.createElement("div");
    cyklInputGroup.classList.add("input-group");
    const cyklInput = document.createElement("input");
    cyklInput.type = "number";
    cyklInput.classList.add("form-control", "variable-cykl");
    cyklInput.id = `variable-cykl-${index}`;
    cyklInput.min = 1;
    cyklInput.max = parseInt(elements.iloscRat.value) || 420;
    cyklInput.step = 1;
    cyklInput.value = initialData.cykl || 1;
    const cyklUnit = document.createElement("span");
    cyklUnit.classList.add("input-group-text");
    cyklUnit.classList.add("unit-miesiacu");
    cyklUnit.textContent = "miesiącu";
    const cyklRange = document.createElement("input");
    cyklRange.type = "range";
    cyklRange.classList.add("form-range");
    cyklRange.id = `variable-cykl-range-${index}`;
    cyklRange.min = 1;
    cyklRange.max = parseInt(elements.iloscRat.value) || 420;
    cyklRange.step = 1;
    cyklRange.value = initialData.cykl || 1;

    cyklInputGroup.appendChild(cyklInput);
    cyklInputGroup.appendChild(cyklUnit);
    cyklGroup.appendChild(cyklLabel);
    cyklGroup.appendChild(cyklInputGroup);
    cyklGroup.appendChild(cyklRange);
    fieldsWrapper.appendChild(cyklGroup);

    const oprocentowanieGroup = document.createElement("div");
    oprocentowanieGroup.classList.add("form-group");
    const oprocentowanieLabel = document.createElement("label");
    oprocentowanieLabel.classList.add("form-label");
    oprocentowanieLabel.textContent = "Nowe oprocentowanie";
    const oprocentowanieInputGroup = document.createElement("div");
    oprocentowanieInputGroup.classList.add("input-group");
    const oprocentowanieInput = document.createElement("input");
    oprocentowanieInput.type = "number";
    oprocentowanieInput.classList.add("form-control", "variable-rate");
    oprocentowanieInput.id = `variable-rate-${index}`;
    oprocentowanieInput.min = 0.1;
    oprocentowanieInput.max = 25;
    oprocentowanieInput.step = 0.1;
    oprocentowanieInput.value = initialData.rate || 7;
    const oprocentowanieUnit = document.createElement("span");
    oprocentowanieUnit.classList.add("input-group-text");
    oprocentowanieUnit.textContent = "%";
    const oprocentowanieRange = document.createElement("input");
    oprocentowanieRange.type = "range";
    oprocentowanieRange.classList.add("form-range");
    oprocentowanieRange.id = `variable-rate-range-${index}`;
    oprocentowanieRange.min = 0.1;
    oprocentowanieRange.max = 25;
    oprocentowanieRange.step = 0.1;
    oprocentowanieRange.value = initialData.rate || 7;

    oprocentowanieInputGroup.appendChild(oprocentowanieInput);
    oprocentowanieInputGroup.appendChild(oprocentowanieUnit);
    oprocentowanieGroup.appendChild(oprocentowanieLabel);
    oprocentowanieGroup.appendChild(oprocentowanieInputGroup);
    oprocentowanieGroup.appendChild(oprocentowanieRange);
    fieldsWrapper.appendChild(oprocentowanieGroup);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.classList.add("btn", "btn-danger", "remove-first-btn");
    removeBtn.textContent = "Usuń";
    removeBtn.addEventListener("click", () => {
        inputGroup.remove();
        state.variableRates = state.variableRates.filter((_, i) => i !== index);
        state.variableRates.forEach((rate, i) => {
            const group = container.querySelector(`.variable-input-group[data-index="${index}"]`);
            if (group) group.setAttribute("data-index", i);
        });
    });

    inputGroup.appendChild(removeBtn);
    container.appendChild(inputGroup);

    syncInputWithRange(cyklInput, cyklRange, {
        isVariableCykl: true,
        activeType: "oprocentowanie",
        index,
        onChange: (value) => {
            state.variableRates[index] = { ...state.variableRates[index], cykl: parseInt(value) };
        },
    });

    syncInputWithRange(oprocentowanieInput, oprocentowanieRange, {
        isDecimal: true,
        activeType: "oprocentowanie",
        index,
        onChange: (value) => {
            state.variableRates[index] = { ...state.variableRates[index], rate: parseFloat(value) };
        },
    });

    state.variableRates[index] = {
        cykl: parseInt(cyklInput.value),
        rate: parseFloat(oprocentowanieInput.value),
    };
}

function addNadplataKredytuInput(index, initialData = {}) {
    const container = document.getElementById("nadplataKredytuInputsWrapper");
    const inputGroup = document.createElement("div");
    inputGroup.classList.add("variable-input-group");
    inputGroup.setAttribute("data-type", "nadplata");
    inputGroup.setAttribute("data-index", index);

    const fieldsWrapper = document.createElement("div");
    fieldsWrapper.classList.add("fields-wrapper");
    inputGroup.appendChild(fieldsWrapper);

    const typeGroup = document.createElement("div");
    typeGroup.classList.add("form-group");
    const typeLabel = document.createElement("label");
    typeLabel.classList.add("form-label");
    typeLabel.textContent = "Typ nadpłaty";
    const typeSelect = document.createElement("select");
    typeSelect.classList.add("form-select", "nadplata-type-select");
    typeSelect.id = `nadplata-type-${index}`;
    typeSelect.innerHTML = `
        <option value="jednorazowa">Jednorazowa</option>
        <option value="cykliczna">Cykliczna</option>
    `;
    typeSelect.value = initialData.type || "jednorazowa";
    typeGroup.appendChild(typeLabel);
    typeGroup.appendChild(typeSelect);
    fieldsWrapper.appendChild(typeGroup);

    const effectGroup = document.createElement("div");
    effectGroup.classList.add("form-group");
    const effectLabel = document.createElement("label");
    effectLabel.classList.add("form-label");
    effectLabel.textContent = "Efekt nadpłaty";
    const effectSelect = document.createElement("select");
    effectSelect.classList.add("form-select", "nadplata-effect-select");
    effectSelect.id = `nadplata-effect-${index}`;
    effectSelect.innerHTML = `
        <option value="zmniejszenie-raty">Zmniejszenie raty</option>
        <option value="skrocenie-okresu">Skrócenie okresu</option>
    `;
    effectSelect.value = initialData.effect || "zmniejszenie-raty";
    effectGroup.appendChild(effectLabel);
    effectGroup.appendChild(effectSelect);
    fieldsWrapper.appendChild(effectGroup);

    const cyklGroup = document.createElement("div");
    cyklGroup.classList.add("form-group");
    const cyklLabel = document.createElement("label");
    cyklLabel.classList.add("form-label");
    cyklLabel.textContent = "Od którego miesiąca?";
    const cyklInputGroup = document.createElement("div");
    cyklInputGroup.classList.add("input-group");
    const cyklInput = document.createElement("input");
    cyklInput.type = "number";
    cyklInput.classList.add("form-control", "variable-cykl");
    cyklInput.id = `nadplata-cykl-${index}`;
    cyklInput.min = 1;
    cyklInput.max = parseInt(elements.iloscRat.value) || 420;
    cyklInput.step = 1;
    cyklInput.value = initialData.cykl || 1;
    const cyklUnit = document.createElement("span");
    cyklUnit.classList.add("input-group-text", "unit-miesiacu");
    cyklUnit.textContent = "miesiącu";
    const cyklRange = document.createElement("input");
    cyklRange.type = "range";
    cyklRange.classList.add("form-range");
    cyklRange.id = `nadplata-cykl-range-${index}`;
    cyklRange.min = 1;
    cyklRange.max = parseInt(elements.iloscRat.value) || 420;
    cyklRange.step = 1;
    cyklRange.value = initialData.cykl || 1;

    cyklInputGroup.appendChild(cyklInput);
    cyklInputGroup.appendChild(cyklUnit);
    cyklGroup.appendChild(cyklLabel);
    cyklGroup.appendChild(cyklInputGroup);
    cyklGroup.appendChild(cyklRange);
    fieldsWrapper.appendChild(cyklGroup);

    const kwotaGroup = document.createElement("div");
    kwotaGroup.classList.add("form-group");
    const kwotaLabel = document.createElement("label");
    kwotaLabel.classList.add("form-label");
    kwotaLabel.textContent = "Kwota nadpłaty";
    const kwotaInputGroup = document.createElement("div");
    kwotaInputGroup.classList.add("input-group");
    const kwotaInput = document.createElement("input");
    kwotaInput.type = "number";
    kwotaInput.classList.add("form-control", "variable-rate");
    kwotaInput.id = `nadplata-kwota-${index}`;
    kwotaInput.min = 100;
    kwotaInput.max = parseFloat(elements.kwota.value) || 5000000;
    kwotaInput.step = 100;
    kwotaInput.value = initialData.kwota || 1000;
    const kwotaUnit = document.createElement("span");
    kwotaUnit.classList.add("input-group-text", "unit-zl");
    kwotaUnit.textContent = "zł";
    const kwotaRange = document.createElement("input");
    kwotaRange.type = "range";
    kwotaRange.classList.add("form-range");
    kwotaRange.id = `nadplata-kwota-range-${index}`;
    kwotaRange.min = 100;
    kwotaRange.max = parseFloat(elements.kwota.value) || 5000000;
    kwotaRange.step = 100;
    kwotaRange.value = initialData.kwota || 1000;

    kwotaInputGroup.appendChild(kwotaInput);
    kwotaInputGroup.appendChild(kwotaUnit);
    kwotaGroup.appendChild(kwotaLabel);
    kwotaGroup.appendChild(kwotaInputGroup);
    kwotaGroup.appendChild(kwotaRange);
    fieldsWrapper.appendChild(kwotaGroup);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.classList.add("btn", "btn-danger", "remove-first-btn");
    removeBtn.textContent = "Usuń";
    removeBtn.addEventListener("click", () => {
        inputGroup.remove();
        state.overpaymentRates = state.overpaymentRates.filter((_, i) => i !== index);
        state.overpaymentRates.forEach((rate, i) => {
            const group = container.querySelector(`.variable-input-group[data-index="${index}"]`);
            if (group) group.setAttribute("data-index", i);
        });
    });

    inputGroup.appendChild(removeBtn);
    container.appendChild(inputGroup);

    syncInputWithRange(cyklInput, cyklRange, {
        isVariableCykl: true,
        activeType: "nadplata",
        index,
        onChange: (value) => {
            state.overpaymentRates[index] = { ...state.overpaymentRates[index], cykl: parseInt(value) };
        },
    });

    syncInputWithRange(kwotaInput, kwotaRange, {
        activeType: "nadplata",
        index,
        onChange: (value) => {
            state.overpaymentRates[index] = { ...state.overpaymentRates[index], kwota: parseFloat(value) };
        },
    });

    typeSelect.addEventListener("change", () => {
        state.overpaymentRates[index] = { ...state.overpaymentRates[index], type: typeSelect.value };
    });

    effectSelect.addEventListener("change", () => {
        state.overpaymentRates[index] = { ...state.overpaymentRates[index], effect: effectSelect.value };
    });

    state.overpaymentRates[index] = {
        type: typeSelect.value,
        effect: effectSelect.value,
        cykl: parseInt(cyklInput.value),
        kwota: parseFloat(kwotaInput.value),
    };
}

// SEKCJA: Funkcje przełączania widoczności
function toggleZmienneOprocentowanieInputs() {
    const inputsDiv = document.getElementById("variableOprocentowanieInputs");
    inputsDiv.classList.toggle("active", elements.zmienneOprocentowanieBtn.checked);
}

function toggleNadplataKredytuInputs() {
    const inputsDiv = document.getElementById("nadplataKredytuInputs");
    inputsDiv.classList.toggle("active", elements.nadplataKredytuBtn.checked);
}

function showForm() {
    elements.formSection.style.display = "block";
    elements.resultSection.style.display = "none";
}

function showResults() {
    elements.formSection.style.display = "none";
    elements.resultSection.style.display = "block";
}

function toggleHarmonogram(elementId) {
    const content = document.getElementById(elementId);
    const button = content.previousElementSibling;
    if (content.style.display === "none" || !content.style.display) {
        content.style.display = "block";
        button.textContent = button.textContent.replace("▼", "▲");
    } else {
        content.style.display = "none";
        button.textContent = button.textContent.replace("▲", "▼");
    }
}

// SEKCJA: Obliczenia kredytu
function calculateCredit() {
    const kwota = parseFloat(elements.kwota.value) || 0;
    let iloscRat = parseInt(elements.iloscRat.value) || 0;
    const oprocentowaniePoczatkowe = parseFloat(elements.oprocentowanie.value) || 0;
    const rodzajRat = elements.rodzajRat.value;
    const prowizjaJednostka = elements.jednostkaProwizji.value;
    const prowizjaValue = parseFloat(elements.prowizja.value) || 0;
    const prowizja = prowizjaJednostka === "procent" ? (kwota * prowizjaValue) / 100 : prowizjaValue;

    state.variableRates.sort((a, b) => a.cykl - b.cykl);
    state.overpaymentRates.sort((a, b) => a.cykl - b.cykl);

    let pozostalyKapital = kwota;
    let sumaOdsetek = 0;
    let sumaNadplat = 0;
    let harmonogram = [];
    let currentRate = oprocentowaniePoczatkowe / 100 / 12;
    let raty = [];
    let nadplaty = [];
    let aktualnyMiesiac = 0;

    const variableRatesMap = [...state.variableRates];
    const overpaymentRatesMap = [...state.overpaymentRates];

    let i = 0;
    while (i < iloscRat && pozostalyKapital > 0) {
        aktualnyMiesiac = i + 1;

        while (variableRatesMap.length > 0 && variableRatesMap[0].cykl === aktualnyMiesiac) {
            const rateChange = variableRatesMap.shift();
            currentRate = rateChange.rate / 100 / 12;
        }

        let nadplata = 0;
        let overpaymentData = null;
        while (overpaymentRatesMap.length > 0 && overpaymentRatesMap[0].cykl === aktualnyMiesiac) {
            overpaymentData = overpaymentRatesMap.shift();
            nadplata += overpaymentData.kwota;
            sumaNadplat += nadplata;
            if (overpaymentData.type === "jednorazowa") {
                pozostalyKapital -= nadplata;
            }
        }

        if (pozostalyKapital <= 0) {
            pozostalyKapital = 0;
            raty[i] = 0;
            nadplaty[i] = nadplata;
            harmonogram.push({
                miesiac: aktualnyMiesiac,
                rata: 0,
                nadplata: nadplata,
                kapital: 0,
                odsetki: 0,
                pozostalyKapital: 0,
            });
            break;
        }

        let odsetki = pozostalyKapital * currentRate;
        let rataKapitalowa, rataCalkowita;

        if (rodzajRat === "rowne") {
            rataCalkowita = (pozostalyKapital * currentRate * Math.pow(1 + currentRate, iloscRat - i)) / (Math.pow(1 + currentRate, iloscRat - i) - 1);
            if (isNaN(rataCalkowita) || rataCalkowita < 0) rataCalkowita = 0;
            rataKapitalowa = rataCalkowita - odsetki;
        } else {
            rataKapitalowa = kwota / iloscRat;
            rataCalkowita = rataKapitalowa + odsetki;
        }

        if (overpaymentData && overpaymentData.type === "cykliczna") {
            pozostalyKapital -= nadplata;
            if (overpaymentData.effect === "zmniejszenie-raty") {
                if (rodzajRat === "rowne") {
                    rataCalkowita = (pozostalyKapital * currentRate * Math.pow(1 + currentRate, iloscRat - i)) / (Math.pow(1 + currentRate, iloscRat - i) - 1);
                    if (isNaN(rataCalkowita) || rataCalkowita < 0) rataCalkowita = 0;
                    rataKapitalowa = rataCalkowita - odsetki;
                } else {
                    rataKapitalowa = pozostalyKapital / (iloscRat - i);
                    rataCalkowita = rataKapitalowa + odsetki;
                }
            } else {
                const remainingMonths = Math.ceil(pozostalyKapital / (rataKapitalowa + nadplata));
                iloscRat = i + remainingMonths;
            }
        }

        if (pozostalyKapital < rataKapitalowa) {
            rataKapitalowa = pozost HEARTalyKapital;
            rataCalkowita = rataKapitalowa + odsetki;
        }

        pozostalyKapital -= rataKapitalowa;
        sumaOdsetek += odsetki;

        if (pozostalyKapital < 0) pozostalyKapital = 0;

        raty[i] = rataCalkowita;
        nadplaty[i] = nadplata;

        harmonogram.push({
            miesiac: aktualnyMiesiac,
            rata: rataCalkowita,
            nadplata: nadplata,
            kapital: rataKapitalowa,
            odsetki: odsetki,
            pozostalyKapital: pozostalyKapital,
        });

        i++;
    }

    iloscRat = harmonogram.length;
    const calkowityKoszt = kwota + sumaOdsetek + prowizja + sumaNadplat;

    state.harmonogram = harmonogram;

    updateChart(kwota, sumaOdsetek, sumaNadplat, prowizja);
    updateHarmonogram(harmonogram);
    updateSummary(iloscRat, calkowityKoszt);
    showResults();
}

// SEKCJA: Aktualizacja wykresu
function updateChart(kapital, odsetki, nadplata, prowizja) {
    if (state.chartInstance) {
        state.chartInstance.destroy();
    }

    const ctx = elements.creditChart.getContext("2d");
    state.chartInstance = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["Kapitał", "Odsetki", "Nadpłaty", "Prowizja"],
            datasets: [{
                data: [kapital, odsetki, nadplata, prowizja],
                backgroundColor: ["#28a745", "#007bff", "#dc3545", "#6f42c1"],
                borderWidth: 1,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function (context) {
                            const label = context.label || "";
                            const value = context.raw || 0;
                            return `${label}: ${formatNumberWithSpaces(value)} zł`;
                        },
                    },
                },
            },
        },
    });

    elements.valueKapital.textContent = formatNumberWithSpaces(kapital);
    elements.valueOdsetki.textContent = formatNumberWithSpaces(odsetki);
    elements.valueNadplata.textContent = formatNumberWithSpaces(nadplata);
    elements.valueProwizja.textContent = formatNumberWithSpaces(prowizja);
}

// SEKCJA: Aktualizacja harmonogramu
function updateHarmonogram(harmonogram) {
    elements.harmonogramTabela.innerHTML = "";
    harmonogram.forEach((row) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${row.miesiac}</td>
            <td>${formatNumberWithSpaces(row.rata)}</td>
            <td>${formatNumberWithSpaces(row.nadplata)}</td>
            <td>${formatNumberWithSpaces(row.kapital)}</td>
            <td>${formatNumberWithSpaces(row.odsetki)}</td>
            <td>${formatNumberWithSpaces(row.pozostalyKapital)}</td>
        `;
        elements.harmonogramTabela.appendChild(tr);
    });
}

// SEKCJA: Aktualizacja podsumowania
function updateSummary(iloscRat, calkowityKoszt) {
    elements.okresPoNadplacie.textContent = iloscRat;
    elements.koszt.textContent = formatNumberWithSpaces(calkowityKoszt);
}

// SEKCJA: Generowanie PDF
function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFont("helvetica");
    doc.setFontSize(12);
    doc.text("Harmonogram spłat kredytu", 10, 10);

    const tableData = state.harmonogram.map(row => [
        row.miesiac.toString(),
        formatNumberWithSpaces(row.rata),
        formatNumberWithSpaces(row.nadplata),
        formatNumberWithSpaces(row.kapital),
        formatNumberWithSpaces(row.odsetki),
        formatNumberWithSpaces(row.pozostalyKapital),
    ]);

    doc.autoTable({
        head: [["Miesiąc", "Rata", "Nadpłata", "Kapitał", "Odsetki", "Pozostały kapitał"]],
        body: tableData,
        startY: 20,
        styles: { fontSize: 8 },
    });

    doc.save("harmonogram_splat.pdf");
}

// SEKCJA: Zoom i tryb ciemny
let zoomLevel = 1;
function zoomIn() {
    zoomLevel += 0.1;
    document.body.style.transform = `scale(${zoomLevel})`;
    document.body.style.transformOrigin = "top center";
}

function zoomOut() {
    zoomLevel = Math.max(0.5, zoomLevel - 0.1);
    document.body.style.transform = `scale(${zoomLevel})`;
    document.body.style.transformOrigin = "top center";
}

function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("darkMode", document.body.classList.contains("dark-mode"));
}

// SEKCJA: Inicjalizacja
document.addEventListener("DOMContentLoaded", () => {
    // Synchronizacja inputów
    syncInputWithRange(elements.kwota, elements.kwotaRange, { onChange: updateKwotaInfo });
    syncInputWithRange(elements.iloscRat, elements.iloscRatRange, { onChange: updateLata });
    syncInputWithRange(elements.oprocentowanie, elements.oprocentowanieRange, { isDecimal: true });
    syncInputWithRange(elements.prowizja, elements.prowizjaRange, {
        isDecimal: elements.jednostkaProwizji.value === "procent",
        onChange: (value) => {
            const kwota = parseFloat(elements.kwota.value) || 0;
            const prowizjaValue = elements.jednostkaProwizji.value === "procent" ? (kwota * value) / 100 : value;
            document.getElementById("prowizjaInfo").textContent = `Prowizja: ${formatNumberWithSpaces(prowizjaValue)} zł`;
        },
    });

    // Inicjalizacja UI
    updateKwotaInfo();
    updateLata();
    updateProwizjaInput();

    // Obsługa zdarzeń
    elements.jednostkaProwizji.addEventListener("change", updateProwizjaInput);
    elements.zmienneOprocentowanieBtn.addEventListener("change", toggleZmienneOprocentowanieInputs);
    elements.nadplataKredytuBtn.addEventListener("change", toggleNadplataKredytuInputs);
    elements.addVariableOprocentowanieBtn.addEventListener("click", () => addVariableOprocentowanieInput(state.variableRates.length));
    elements.addNadplataKredytuBtn.addEventListener("click", () => addNadplataKredytuInput(state.overpaymentRates.length));
    elements.obliczBtn.addEventListener("click", calculateCredit);
    elements.zoomInBtn.addEventListener("click", zoomIn);
    elements.zoomOutBtn.addEventListener("click", zoomOut);
    elements.toggleDarkModeBtn.addEventListener("click", toggleDarkMode);
    elements.generatePdfBtn.addEventListener("click", generatePDF);

    // Wczytywanie trybu ciemnego z localStorage
    if (localStorage.getItem("darkMode") === "true") {
        document.body.classList.add("dark-mode");
    }
});
