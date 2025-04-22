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
    resultSection: document.getElementById("resultSection"),
    harmonogramContainer: document.getElementById("harmonogramContainer"),
    chartContainer: document.getElementById("chartContainer"),
    chartLine: document.getElementById("chartLine"),
    generatePdfBtn: document.getElementById("generatePdfBtn"),
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
    tempValues: {},
};

// Funkcja formatująca liczby z separatorem tysięcy (spacja) i przecinkiem dziesiętnym
function formatNumberWithSpaces(number) {
    const parts = number.toFixed(2).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return parts.join(",");
}

// Synchronizacja inputów z suwakami
function syncInputWithRange(input, range, options = {}) {
    const { isDecimal = false, onChange, isVariableCykl = false } = options;

    if (!input || !range) {
        console.error(`Input or range not found for ${input?.id || "unknown"}`);
        return;
    }

    // Funkcja do usuwania listenerów
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

    const updateValue = (value, source) => {
        const min = parseFloat(input.min) || 0;
        const max = parseFloat(input.max) || Infinity;
        const step = parseFloat(input.step) || 1;
        let parsedValue = isDecimal ? parseFloat(value) : parseInt(value);
        if (isNaN(parsedValue)) parsedValue = min;
        if (parsedValue < min) parsedValue = min;
        if (parsedValue > max) parsedValue = max;
        input.value = isDecimal ? parsedValue.toFixed(step === 1 ? 0 : 1) : parsedValue;
        range.value = parsedValue;
        console.log(`${source} changed: ${input.id || range.className} = ${parsedValue}`);

        if (isVariableCykl) {
            state.tempValues[input.id || range.id] = parsedValue;
        } else if (onChange) {
            console.log(`onChange triggered for ${input.id || range.className}, value=${parsedValue}`);
            onChange(parsedValue);
        }
    };

    const inputHandler = () => updateValue(input.value, "Input");
    const rangeHandler = () => updateValue(range.value, "Range");

    input._eventListeners.input = inputHandler;
    range._eventListeners.input = rangeHandler;
    input.addEventListener("input", inputHandler);
    range.addEventListener("input", rangeHandler);

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
    input.value = isDecimal ? initialValue.toFixed(step === 1 ? 0 : 1) : initialValue;
    range.value = initialValue;
    console.log(`Initial sync: ${input.id || range.className} = ${initialValue}`);
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

// Funkcja obliczania kredytu
function calculateLoan() {
    const kwota = parseFloat(elements.kwota.value) || 0;
    const iloscRat = parseInt(elements.iloscRat.value) || 0;
    let oprocentowanie = parseFloat(elements.oprocentowanie.value) || 0;
    const rodzajRat = elements.rodzajRat.value;
    const prowizja = parseFloat(elements.prowizja.value) || 0;
    const jednostkaProwizji = elements.jednostkaProwizji.value;

    state.lastFormData = { 
        kwota, 
        iloscRat, 
        oprocentowanie, 
        rodzajRat, 
        prowizja, 
        jednostkaProwizji,
        zmienneOprocentowanie: elements.zmienneOprocentowanieBtn.checked,
        nadplataKredytu: elements.nadplataKredytuBtn.checked
    };

    // Aktualizacja state.overpaymentRates przed obliczeniami
    if (elements.nadplataKredytuBtn.checked) {
        const inputs = document.querySelectorAll('.variable-input-group[data-type="nadplata"]');
        state.overpaymentRates = [];
        inputs.forEach((inputGroup) => {
            const cyklInput = inputGroup.querySelector(".variable-cykl");
            const rateInput = inputGroup.querySelector(".variable-rate");
            const typeSelect = inputGroup.querySelector(".nadplata-type-select");
            const effectSelect = inputGroup.querySelector(".nadplata-effect-select");
            const period = parseInt(cyklInput.value);
            const value = parseFloat(rateInput.value);
            const type = typeSelect.value;
            const effect = effectSelect.value;
            state.overpaymentRates.push({ period, value, type, effect });
        });
        console.log("state.overpaymentRates updated before calculation:", state.overpaymentRates);
    }

    const prowizjaKwota = jednostkaProwizji === "procent" ? (prowizja / 100) * kwota : prowizja;
    let pozostalyKapital = kwota;
    let harmonogram = [];
    let sumaOdsetek = 0;
    let sumaKapitalu = 0;

    let monthlyRate = oprocentowanie / 100 / 12;
    let rata = 0;

    if (rodzajRat === "rowne") {
        rata = (kwota * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -iloscRat));
    }

    for (let i = 1; i <= iloscRat; i++) {
        let odsetki = pozostalyKapital * monthlyRate;
        let kapital;

        if (rodzajRat === "rowne") {
            kapital = rata - odsetki;
        } else {
            kapital = kwota / iloscRat;
            odsetki = pozostalyKapital * monthlyRate;
            rata = kapital + odsetki;
        }

        // Obsługa zmiennych stóp procentowych
        state.variableRates.forEach((rate) => {
            if (i >= rate.period) {
                oprocentowanie = parseFloat(rate.value);
                monthlyRate = oprocentowanie / 100 / 12;
                if (rodzajRat === "rowne") {
                    rata = (pozostalyKapital * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -(iloscRat - i + 1)));
                    odsetki = pozostalyKapital * monthlyRate;
                    kapital = rata - odsetki;
                } else {
                    odsetki = pozostalyKapital * monthlyRate;
                    rata = kapital + odsetki;
                }
            }
        });

        // Obsługa nadpłat
        let nadplata = 0;
        state.overpaymentRates.forEach((overpayment) => {
            const isActive = overpayment.type === "Jednorazowa" ? i === overpayment.period : i >= overpayment.period;
            if (isActive) {
                nadplata = parseFloat(overpayment.value);
                if (overpayment.effect === "Skróć okres") {
                    pozostalyKapital -= nadplata;
                } else {
                    rata -= nadplata / (iloscRat - i + 1);
                }
            }
        });

        pozostalyKapital -= kapital;
        sumaOdsetek += odsetki;
        sumaKapitalu += kapital;

        harmonogram.push({
            rata: i,
            kwotaRaty: rata.toFixed(2),
            kapital: kapital.toFixed(2),
            odsetki: odsetki.toFixed(2),
            nadplata: nadplata.toFixed(2),
            pozostalyKapital: pozostalyKapital.toFixed(2),
        });

        if (pozostalyKapital <= 0) break;
    }

    displayResults(harmonogram, sumaOdsetek, sumaKapitalu, prowizjaKwota);
}

// Wyświetlanie wyników
function displayResults(harmonogram, sumaOdsetek, sumaKapitalu, prowizjaKwota) {
    elements.formSection.style.display = "none";
    elements.resultSection.style.display = "block";

    // Harmonogram
    let harmonogramHTML = `
        <table>
            <thead>
                <tr>
                    <th>Rata</th>
                    <th>Kwota raty</th>
                    <th>Kapitał</th>
                    <th>Odsetki</th>
                    <th>Nadpłata</th>
                    <th>Pozostały kapitał</th>
                </tr>
            </thead>
            <tbody>
    `;
    harmonogram.forEach((row) => {
        harmonogramHTML += `
            <tr>
                <td>${row.rata}</td>
                <td>${row.kwotaRaty} zł</td>
                <td>${row.kapital} zł</td>
                <td>${row.odsetki} zł</td>
                <td>${row.nadplata} zł</td>
                <td>${row.pozostalyKapital} zł</td>
            </tr>
        `;
    });
    harmonogramHTML += "</tbody></table>";
    elements.harmonogramContainer.innerHTML = harmonogramHTML;

    // Wykresy
    const ctx = elements.chartContainer.getContext("2d");
    new Chart(ctx, {
        type: "pie",
        data: {
            labels: ["Kapitał", "Odsetki", "Prowizja"],
            datasets: [{
                data: [sumaKapitalu, sumaOdsetek, prowizjaKwota],
                backgroundColor: ["#91ADD9", "#BBBBD2", "#C2B280"],
            }],
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: "right",
                },
            },
        },
    });

    const ctxLine = elements.chartLine.getContext("2d");
    new Chart(ctxLine, {
        type: "line",
        data: {
            labels: harmonogram.map((row) => row.rata),
            datasets: [
                {
                    label: "Kapitał",
                    data: harmonogram.map((row) => row.kapital),
                    borderColor: "#91ADD9",
                    fill: false,
                },
                {
                    label: "Odsetki",
                    data: harmonogram.map((row) => row.odsetki),
                    borderColor: "#BBBBD2",
                    fill: false,
                },
            ],
        },
        options: {
            responsive: true,
            scales: {
                x: { title: { display: true, text: "Rata" } },
                y: { title: { display: true, text: "Kwota (zł)" } },
            },
        },
    });
}

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

function updateKwotaInfo() {
    const kwota = parseFloat(elements.kwota.value) || 500000;
    const kwotaInfo = document.getElementById("kwotaInfo");
    if (kwotaInfo) {
        kwotaInfo.textContent = `Kwota kredytu: ${formatNumberWithSpaces(kwota)} zł`;
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
        prowizjaInfo.textContent = `Prowizja: ${formatNumberWithSpaces(wartosc)} zł`;
    }
}

function updateRodzajRatInfo() {
    const rodzajRatInfo = document.getElementById("rodzajRatInfo");
    if (rodzajRatInfo) {
        rodzajRatInfo.textContent = "Wybierz równe lub malejące";
    }
}

function updateVariableInputs() {
    console.log("updateVariableInputs called");
    const maxCykl = parseInt(elements.iloscRat.value) || 360;
    const maxChanges = Math.floor(maxCykl / 12) || 1;

    const isZmienneOprocentowanie = elements.zmienneOprocentowanieBtn?.checked;
    const variableOprocentowanieInputs = document.getElementById("variableOprocentowanieInputs");
    const addVariableOprocentowanieBtn = elements.addVariableOprocentowanieBtn;
    const variableOprocentowanieWrapper = document.getElementById("variableOprocentowanieInputsWrapper");

    console.log("Zmienne oprocentowanie:", {
        isZmienneOprocentowanie,
        variableOprocentowanieInputs: !!variableOprocentowanieInputs,
        addVariableOprocentowanieBtn: !!addVariableOprocentowanieBtn,
        variableOprocentowanieWrapper: !!variableOprocentowanieWrapper,
        variableRates: state.variableRates,
    });

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

    console.log("Nadpłata kredytu:", {
        isNadplataKredytu,
        nadplataKredytuInputs: !!nadplataKredytuInputs,
        addNadplataKredytuBtn: !!addNadplataKredytuBtn,
        nadplataKredytuWrapper: !!nadplataKredytuWrapper,
        overpaymentRates: state.overpaymentRates,
    });

    if (isNadplataKredytu && nadplataKredytuInputs && addNadplataKredytuBtn && nadplataKredytuWrapper) {
        nadplataKredytuInputs.classList.add("active");
        addNadplataKredytuBtn.style.display = "block";
        if (state.overpaymentRates.length === 0 && state.overpaymentRates.length < maxChanges) {
            state.overpaymentRates = [{ value: 1000, period: 2, type: "Jednorazowa", effect: "Skróć okres" }];
            console.log("Reset state.overpaymentRates:", state.overpaymentRates);
        }
        renderVariableInputs(nadplataKredytuWrapper, state.overpaymentRates, "nadplata", maxCykl, maxChanges, addNadplataKredytuBtn);
    } else {
        if (nadplataKredytuInputs) nadplataKredytuInputs.classList.remove("active");
        if (addNadplataKredytuBtn) addNadplataKredytuBtn.style.display = "none";
        if (nadplataKredytuWrapper) nadplataKredytuWrapper.innerHTML = "";
    }
}

function renderVariableInputs(wrapper, changes, activeType, maxCykl, maxChanges, addBtn) {
    console.log(`renderVariableInputs called for ${activeType}`, { changes, maxCykl, maxChanges });
    
    // Zachowaj wartości z istniejących inputów przed ponownym renderowaniem
    const existingInputs = wrapper.querySelectorAll(".variable-input-group");
    const existingValues = [];
    const existingPeriods = [];
    existingInputs.forEach((inputGroup, index) => {
        const rateInput = inputGroup.querySelector(".variable-rate");
        const cyklInput = inputGroup.querySelector(".variable-cykl");
        const value = rateInput ? parseFloat(rateInput.value) : changes[index]?.value;
        const period = cyklInput ? parseInt(cyklInput.value) : changes[index]?.period;
        existingValues[index] = value;
        existingPeriods[index] = period;
        console.log(`Preserving value for index ${index}: value=${value}, period=${period}`);
    });

    wrapper.innerHTML = "";

    changes.forEach((change, index) => {
        const inputGroup = document.createElement("div");
        inputGroup.className = "variable-input-group";
        inputGroup.setAttribute("data-type", activeType);

        const fieldsWrapper = document.createElement("div");
        fieldsWrapper.className = "fields-wrapper";

        const minPeriod = index > 0 ? (existingPeriods[index - 1] || changes[index - 1].period) + 1 : 2;
        const periodValue = existingPeriods[index] !== undefined ? existingPeriods[index] : change.period;

        if (activeType === "nadplata") {
            // Select NADPŁATA
            const nadplataTypeGroup = document.createElement("div");
            nadplataTypeGroup.className = "form-group";
            nadplataTypeGroup.innerHTML = `
                <label class="form-label">Nadpłata</label>
                <select class="form-select nadplata-type-select">
                    <option value="Jednorazowa" ${change.type === "Jednorazowa" ? "selected" : ""}>Jednorazowa</option>
                    <option value="Miesięczna" ${change.type === "Miesięczna" ? "selected" : ""}>Miesięczna</option>
                    <option value="Kwartalna" ${change.type === "Kwartalna" ? "selected" : ""}>Kwartalna</option>
                    <option value="Roczna" ${change.type === "Roczna" ? "selected" : ""}>Roczna</option>
                </select>
            `;

            // Select PO NADPŁACIE
            const nadplataEffectGroup = document.createElement("div");
            nadplataEffectGroup.className = "form-group";
            nadplataEffectGroup.innerHTML = `
                <label class="form-label">Po nadpłacie</label>
                <select class="form-select nadplata-effect-select">
                    <option value="Skróć okres" ${change.effect === "Skróć okres" ? "selected" : ""}>Skróć okres</option>
                    <option value="Zmniejsz ratę" ${change.effect === "Zmniejsz ratę" ? "selected" : ""}>Zmniejsz ratę</option>
                </select>
            `;

            // Input OD/W
            const isJednorazowa = change.type === "Jednorazowa";
            const cyklLabel = isJednorazowa ? "W" : "Od";
            const cyklUnit = isJednorazowa ? "miesiącu" : "miesiąca";
            const cyklGroup = document.createElement("div");
            cyklGroup.className = "form-group";
            cyklGroup.innerHTML = `
                <label class="form-label">${cyklLabel}</label>
                <div class="input-group">
                    <input type="number" class="form-control variable-cykl" min="${minPeriod}" max="${maxCykl}" step="1" value="${periodValue}">
                    <span class="input-group-text unit-miesiacu">${cyklUnit}</span>
                </div>
                <input type="range" class="form-range variable-cykl-range" min="${minPeriod}" max="${maxCykl}" step="1" value="${periodValue}">
            `;

            // Input Nadpłata (KWOTA)
            const inputValue = existingValues[index] !== undefined ? existingValues[index] : change.value;
            const rateGroup = document.createElement("div");
            rateGroup.className = "form-group";
            rateGroup.innerHTML = `
                <label class="form-label">Kwota</label>
                <div class="input-group">
                    <input type="number" class="form-control variable-rate" min="100" max="1000000" step="1" value="${inputValue}">
                    <span class="input-group-text unit-zl">zł</span>
                </div>
                <input type="range" class="form-range variable-rate-range" min="100" max="1000000" step="1" value="${inputValue}">
                <div class="sub-info">Kwota nadpłaty: ${formatNumberWithSpaces(inputValue)} zł</div>
            `;

            // Nasłuchiwanie wartości w boxie KWOTA i aktualizacja tekstu w .sub-info
            const rateInput = rateGroup.querySelector(".variable-rate");
            const rateRange = rateGroup.querySelector(".variable-rate-range");
            const subInfo = rateGroup.querySelector(".sub-info");

            const updateSubInfo = () => {
                const value = parseFloat(rateInput.value) || 0;
                subInfo.textContent = `Kwota nadpłaty: ${formatNumberWithSpaces(value)} zł`;
            };

            // Dodajemy nasłuchiwanie na zmiany w input i range
            rateInput.addEventListener("input", updateSubInfo);
            rateRange.addEventListener("input", updateSubInfo);

            fieldsWrapper.appendChild(nadplataTypeGroup);
            fieldsWrapper.appendChild(nadplataEffectGroup);
            fieldsWrapper.appendChild(cyklGroup);
            fieldsWrapper.appendChild(rateGroup);
        } else {
            // Dla oprocentowania
            const cyklGroup = document.createElement("div");
            cyklGroup.className = "form-group";
            cyklGroup.innerHTML = `
                <label class="form-label">Od</label>
                <div class="input-group">
                    <input type="number" class="form-control variable-cykl" min="${minPeriod}" max="${maxCykl}" step="1" value="${periodValue}">
                    <span class="input-group-text">miesiąca</span>
                </div>
                <input type="range" class="form-range variable-cykl-range" min="${minPeriod}" max="${maxCykl}" step="1" value="${periodValue}">
            `;

            const inputValue = existingValues[index] !== undefined ? existingValues[index] : change.value;
            const rateGroup = document.createElement("div");
            rateGroup.className = "form-group";
            rateGroup.innerHTML = `
                <label class="form-label">Oprocentowanie</label>
                <div class="input-group">
                    <input type="number" class="form-control variable-rate" min="0.1" max="50" step="0.1" value="${inputValue}">
                    <span class="input-group-text">%</span>
                </div>
                <input type="range" class="form-range variable-rate-range" min="0.1" max="50" step="0.1" value="${inputValue}">
            `;

            fieldsWrapper.appendChild(cyklGroup);
            fieldsWrapper.appendChild(rateGroup);
        }

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
        const nadplataTypeSelect = inputGroup.querySelector(".nadplata-type-select");

        // Synchronizacja dla .variable-cykl
        syncInputWithRange(cyklInput, cyklRange, {
            isDecimal: false,
            isVariableCykl: true,
            onChange: (value) => {
                console.log(`Cykl changed: index=${index}, value=${value}`);
                changes[index].period = value;
                updateVariableInputs();
            },
        });

        // Synchronizacja dla .variable-rate (bez aktualizacji stanu)
        syncInputWithRange(rateInput, rateRange, {
            isDecimal: activeType === "oprocentowanie",
        });

        if (nadplataTypeSelect) {
            nadplataTypeSelect.addEventListener("change", () => {
                console.log(`Nadplata type changed: index=${index}, value=${nadplataTypeSelect.value}`);
                changes[index].type = nadplataTypeSelect.value;
                const isJednorazowa = nadplataTypeSelect.value === "Jednorazowa";
                const label = cyklGroup.querySelector(".form-label");
                const unit = cyklGroup.querySelector(".unit-miesiacu");
                label.textContent = isJednorazowa ? "W" : "Od";
                unit.textContent = isJednorazowa ? "miesiącu" : "miesiąca";
            });
        }

        const nadplataEffectSelect = inputGroup.querySelector(".nadplata-effect-select");
        if (nadplataEffectSelect) {
            nadplataEffectSelect.addEventListener("change", () => {
                console.log(`Nadplata effect changed: index=${index}, value=${nadplataEffectSelect.value}`);
                changes[index].effect = nadplataEffectSelect.value;
            });
        }
    });

    addBtn.textContent = activeType === "nadplata" ? "Dodaj kolejną nadpłatę" : "Dodaj kolejną zmianę";
    const lastChange = changes.length > 0 ? changes[changes.length - 1] : null;
    const isMaxPeriodReached = lastChange && lastChange.period >= maxCykl;
    addBtn.style.display = changes.length < maxChanges && !isMaxPeriodReached ? "block" : "none";
    console.log(`renderVariableInputs completed for ${activeType}, inputs rendered: ${changes.length}`);
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
    const newChange = activeType === "oprocentowanie" 
        ? { period: newCykl, value: state.lastFormData.oprocentowanie }
        : { period: newCykl, value: 1000, type: "Jednorazowa", effect: "Skróć okres" };

    changes.push(newChange);
    console.log(`addVariableChange: new change added for ${activeType}`, newChange);
    updateVariableInputs();
}

function removeVariableChange(index, activeType) {
    let changes = activeType === "oprocentowanie" ? state.variableRates : state.overpaymentRates;
    if (changes.length > 1) {
        changes.splice(index, 1);
        console.log(`removeVariableChange: index=${index}, activeType=${activeType}, remaining changes=`, changes);
        updateVariableInputs();
    }
}

let currentZoom = 1;
const zoomStep = 0.1;
const minZoom = 0.5;
const maxZoom = 2;

function updateZoom() {
    const container = document.querySelector(".container");
    if (!container) {
        console.warn("Container (.container) nie został znaleziony w DOM.");
        return;
    }
    container.style.transform = `scale(${currentZoom})`;
    container.style.transformOrigin = "top center";
    console.log(`Zoom updated: ${currentZoom}`);
}

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
    console.log(`Dark mode toggled: ${!isDarkMode}`);
}

function initializeTheme() {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
        if (elements.toggleDarkModeBtn) elements.toggleDarkModeBtn.textContent = "☀️";
    } else {
        document.body.classList.add("light-mode");
        if (elements.toggleDarkModeBtn) elements.toggleDarkModeBtn.textContent = "🌙";
    }
    console.log(`Theme initialized: ${savedTheme || "light"}`);
}

// Obsługa zdarzeń
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
        console.log("Zmienne oprocentowanie changed:", elements.zmienneOprocentowanieBtn.checked);
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
        console.log("Nadpłata kredytu changed:", elements.nadplataKredytuBtn.checked);
        state.lastFormData.nadplataKredytu = elements.nadplataKredytuBtn.checked;
        if (!elements.nadplataKredytuBtn.checked) {
            state.overpaymentRates = [];
        } else {
            state.overpaymentRates = [{ value: 1000, period: 2, type: "Jednorazowa", effect: "Skróć okres" }];
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
        calculateLoan();
    });
}

if (elements.zoomInBtn) {
    elements.zoomInBtn.addEventListener("click", () => {
        console.log("Zoom In clicked");
        if (currentZoom < maxZoom) {
            currentZoom = Math.min(maxZoom, currentZoom + zoomStep);
            updateZoom();
        }
    });
}

if (elements.zoomOutBtn) {
    elements.zoomOutBtn.addEventListener("click", () => {
        console.log("Zoom Out clicked");
        if (currentZoom > minZoom) {
            currentZoom = Math.max(minZoom, currentZoom - zoomStep);
            updateZoom();
        }
    });
}

if (elements.toggleDarkModeBtn) {
    elements.toggleDarkModeBtn.addEventListener("click", () => {
        console.log("Toggle Dark Mode clicked");
        toggleDarkMode();
    });
}

if (elements.generatePdfBtn) {
    elements.generatePdfBtn.addEventListener("click", () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.text("Harmonogram spłaty kredytu", 10, 10);
        doc.autoTable({
            html: "#harmonogramContainer table",
            startY: 20,
        });
        doc.save("harmonogram.pdf");
    });
}

const siteLogo = document.getElementById("siteLogo");
if (siteLogo) {
    siteLogo.addEventListener("click", () => {
        window.open("https://finance-brothers.pl", "_blank");
    });
}

// Inicjalizacja
updateProwizjaInput();
updateKwotaInfo();
updateLata();
updateProwizjaInfo();
updateRodzajRatInfo();
updateVariableInputs();
initializeTheme();
