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
    resetBtn: document.getElementById("resetBtn"),
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
    const { isDecimal = false, onChange, isVariableCykl = false, index, activeType } = options;

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

    const updateValue = (value, source, applyMinValidation = false) => {
        const min = parseFloat(input.min) || 0;
        const max = parseFloat(input.max) || Infinity;
        const step = parseFloat(input.step) || 1;
        let parsedValue = isDecimal ? parseFloat(value) : parseInt(value);
        if (isNaN(parsedValue)) parsedValue = min;

        // Walidacja minimalnej wartości dla boxu KWOTA w nadpłacie (tylko gdy applyMinValidation jest true)
        if (applyMinValidation && input.classList.contains("variable-rate") && activeType === "nadplata" && parsedValue < 100) {
            parsedValue = 100;
        }

        if (parsedValue < min) parsedValue = min;
        if (parsedValue > max) parsedValue = max;

        // Dla oprocentowania formatujemy z dokładnością do 2 miejsc po przecinku
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

    const inputHandler = () => updateValue(input.value, "Input", false); // Bez walidacji minimalnej podczas wpisywania
    const rangeHandler = () => updateValue(range.value, "Range", true); // Suwak zawsze stosuje walidację

    // Walidacja minimalnej wartości po zakończeniu edycji (zdarzenie change)
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

    // Walidacja minimalnej wartości dla boxu KWOTA w nadpłacie przy inicjalizacji
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

// Funkcja resetująca formularz
function resetForm() {
    // Przywrócenie wartości domyślnych w formularzu
    elements.kwota.value = 500000;
    elements.kwotaRange.value = 500000;
    elements.iloscRat.value = 360;
    elements.iloscRatRange.value = 360;
    elements.oprocentowanie.value = 7;
    elements.oprocentowanieRange.value = 7;
    elements.rodzajRat.value = "rowne";
    elements.prowizja.value = 2;
    elements.prowizjaRange.value = 2;
    elements.jednostkaProwizji.value = "procent";
    elements.zmienneOprocentowanieBtn.checked = false;
    elements.nadplataKredytuBtn.checked = false;

    // Wyczyszczenie zmiennych oprocentowań i nadpłat
    state.variableRates = [];
    state.overpaymentRates = [];

    // Aktualizacja stanu
    state.lastFormData = {
        kwota: 500000,
        iloscRat: 360,
        oprocentowanie: 7,
        rodzajRat: "rowne",
        prowizja: 2,
        jednostkaProwizji: "procent",
        zmienneOprocentowanie: false,
        nadplataKredytu: false,
    };

    // Aktualizacja UI
    updateProwizjaInput();
    updateKwotaInfo();
    updateLata();
    updateProwizjaInfo();
    updateRodzajRatInfo();
    updateVariableInputs();

    // Ukrycie sekcji wyników, jeśli jest widoczna
    if (elements.resultSection) {
        elements.resultSection.style.display = "none";
    }
    if (elements.formSection) {
        elements.formSection.style.display = "block";
    }

    console.log("Formularz zresetowany do wartości domyślnych.");
}

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
        syncInputWithRange(elements.prowizja, elements.prowizjaRange, {
            isDecimal: true,
            onChange: (value) => {
                state.lastFormData.prowizja = value;
                updateProwizjaInfo();
            },
        });
    }
    updateProwizjaInfo();
}

function updateKwotaInfo() {
    const kwotaInfo = document.getElementById("kwotaInfo");
    if (kwotaInfo) {
        const kwota = parseFloat(elements.kwota.value) || 0;
        kwotaInfo.textContent = `Kwota kredytu: ${formatNumberWithSpaces(kwota)} zł`;
    }
}

function updateLata() {
    const lata = document.getElementById("lata");
    if (lata) {
        const iloscRat = parseInt(elements.iloscRat.value) || 0;
        const years = Math.floor(iloscRat / 12);
        const months = iloscRat % 12;
        let lataText = "Ilość lat: ";
        if (years > 0) {
            lataText += `${years} `;
            lataText += years === 1 ? "rok" : years >= 2 && years <= 4 ? "lata" : "lat";
            if (months > 0) lataText += " i ";
        }
        if (months > 0) {
            lataText += `${months} `;
            lataText += months === 1 ? "miesiąc" : months >= 2 && months <= 4 ? "miesiące" : "miesięcy";
        }
        lata.textContent = lataText;
    }
}

function updateProwizjaInfo() {
    const prowizjaInfo = document.getElementById("prowizjaInfo");
    if (prowizjaInfo) {
        const prowizja = parseFloat(elements.prowizja.value) || 0;
        const jednostka = elements.jednostkaProwizji.value;
        const kwota = parseFloat(elements.kwota.value) || 0;
        const prowizjaKwota = jednostka === "procent" ? (prowizja / 100) * kwota : prowizja;
        prowizjaInfo.textContent = `Prowizja: ${formatNumberWithSpaces(prowizjaKwota)} zł`;
    }
}

function updateRodzajRatInfo() {
    const rodzajRatInfo = document.getElementById("rodzajRatInfo");
    if (rodzajRatInfo) {
        const selectedOption = elements.rodzajRat.options[elements.rodzajRat.selectedIndex];
        rodzajRatInfo.textContent = selectedOption.text;
    }
}

function updateVariableInputs() {
    const zmienneOprocentowanieInputs = document.getElementById("variableOprocentowanieInputs");
    const nadplataKredytuInputs = document.getElementById("nadplataKredytuInputs");

    if (elements.zmienneOprocentowanieBtn.checked) {
        zmienneOprocentowanieInputs.classList.add("active");
        if (!zmienneOprocentowanieInputs.querySelector(".variable-input-group")) {
            addVariableRateInput(0);
        }
    } else {
        zmienneOprocentowanieInputs.classList.remove("active");
        zmienneOprocentowanieInputs.innerHTML = '<div class="variable-inputs-wrapper" id="variableOprocentowanieInputsWrapper"></div>';
        state.variableRates = [];
    }

    if (elements.nadplataKredytuBtn.checked) {
        nadplataKredytuInputs.classList.add("active");
        if (!nadplataKredytuInputs.querySelector(".variable-input-group")) {
            addOverpaymentInput(0);
        }
    } else {
        nadplataKredytuInputs.classList.remove("active");
        nadplataKredytuInputs.innerHTML = '<div class="variable-inputs-wrapper" id="nadplataKredytuInputsWrapper"></div>';
        state.overpaymentRates = [];
    }
}

function addVariableRateInput(index) {
    const wrapper = document.getElementById("variableOprocentowanieInputsWrapper");
    const maxIloscRat = parseInt(elements.iloscRat.value) || 360;
    const inputGroup = document.createElement("div");
    inputGroup.className = "variable-input-group";
    inputGroup.dataset.type = "oprocentowanie";
    inputGroup.innerHTML = `
        <div class="fields-wrapper">
            <div class="form-group">
                <label class="form-label">Od której raty</label>
                <div class="input-group">
                    <input type="number" class="form-control variable-cykl" min="1" max="${maxIloscRat}" step="1" value="${index === 0 ? 1 : 2}">
                    <span class="input-group-text">miesiącu</span>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Nowe oprocentowanie</label>
                <div class="input-group">
                    <input type="number" class="form-control variable-rate" min="0.1" max="25" step="0.1" value="7">
                    <span class="input-group-text">%</span>
                </div>
            </div>
            <button type="button" class="btn btn-danger btn-sm ${index === 0 ? 'remove-first-btn' : ''}">Usuń</button>
        </div>
    `;
    wrapper.appendChild(inputGroup);

    const cyklInput = inputGroup.querySelector(".variable-cykl");
    const rateInput = inputGroup.querySelector(".variable-rate");
    const removeBtn = inputGroup.querySelector(".btn-danger");

    syncInputWithRange(cyklInput, null, {
        isDecimal: false,
        isVariableCykl: true,
        index,
        activeType: "oprocentowanie",
        onChange: (value) => {
            state.variableRates[index] = state.variableRates[index] || {};
            state.variableRates[index].period = value;
            console.log(`Variable rate period updated at index ${index}:`, state.variableRates[index]);
        },
    });

    syncInputWithRange(rateInput, null, {
        isDecimal: true,
        index,
        activeType: "oprocentowanie",
        onChange: (value) => {
            state.variableRates[index] = state.variableRates[index] || {};
            state.variableRates[index].value = value;
            console.log(`Variable rate value updated at index ${index}:`, state.variableRates[index]);
        },
    });

    removeBtn.addEventListener("click", () => {
        inputGroup.remove();
        state.variableRates.splice(index, 1);
        console.log(`Variable rate removed at index ${index}, current variableRates:`, state.variableRates);
        const remainingInputs = wrapper.querySelectorAll(".variable-input-group");
        remainingInputs.forEach((group, newIndex) => {
            const newCyklInput = group.querySelector(".variable-cykl");
            const newRateInput = group.querySelector(".variable-rate");
            syncInputWithRange(newCyklInput, null, {
                isDecimal: false,
                isVariableCykl: true,
                index: newIndex,
                activeType: "oprocentowanie",
                onChange: (value) => {
                    state.variableRates[newIndex] = state.variableRates[newIndex] || {};
                    state.variableRates[newIndex].period = value;
                },
            });
            syncInputWithRange(newRateInput, null, {
                isDecimal: true,
                index: newIndex,
                activeType: "oprocentowanie",
                onChange: (value) => {
                    state.variableRates[newIndex] = state.variableRates[newIndex] || {};
                    state.variableRates[newIndex].value = value;
                },
            });
        });
    });

    state.variableRates[index] = {  { period: parseInt(cyklInput.value), value: parseFloat(rateInput.value) };
}

function addOverpaymentInput(index) {
    const wrapper = document.getElementById("nadplataKredytuInputsWrapper");
    const maxIloscRat = parseInt(elements.iloscRat.value) || 360;
    const inputGroup = document.createElement("div");
    inputGroup.className = "variable-input-group";
    inputGroup.dataset.type = "nadplata";
    inputGroup.innerHTML = `
        <div class="fields-wrapper">
            <div class="form-group">
                <label class="form-label">Rodzaj nadpłaty</label>
                <select class="form-select nadplata-type-select">
                    <option value="Jednorazowa">Jednorazowa</option>
                    <option value="Cykliczna">Cykliczna</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Efekt nadpłaty</label>
                <select class="form-select nadplata-effect-select">
                    <option value="Skróć okres">Skróć okres</option>
                    <option value="Zmniejsz ratę">Zmniejsz ratę</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Od której raty</label>
                <div class="input-group">
                    <input type="number" class="form-control variable-cykl" min="1" max="${maxIloscRat}" step="1" value="${index === 0 ? 1 : 2}">
                    <span class="input-group-text">miesiącu</span>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Kwota</label>
                <div class="input-group">
                    <input type="number" class="form-control variable-rate" min="100" max="5000000" step="100" value="1000">
                    <span class="input-group-text">zł</span>
                </div>
            </div>
            <button type="button" class="btn btn-danger btn-sm ${index === 0 ? 'remove-first-btn' : ''}">Usuń</button>
        </div>
    `;
    wrapper.appendChild(inputGroup);

    const typeSelect = inputGroup.querySelector(".nadplata-type-select");
    const effectSelect = inputGroup.querySelector(".nadplata-effect-select");
    const cyklInput = inputGroup.querySelector(".variable-cykl");
    const rateInput = inputGroup.querySelector(".variable-rate");
    const removeBtn = inputGroup.querySelector(".btn-danger");

    const updateOverpayment = () => {
        state.overpaymentRates[index] = {
            type: typeSelect.value,
            effect: effectSelect.value,
            period: parseInt(cyklInput.value),
            value: parseFloat(rateInput.value),
        };
        console.log(`Overpayment updated at index ${index}:`, state.overpaymentRates[index]);
    };

    syncInputWithRange(cyklInput, null, {
        isDecimal: false,
        isVariableCykl: true,
        index,
        activeType: "nadplata",
        onChange: (value) => {
            state.overpaymentRates[index] = state.overpaymentRates[index] || {};
            state.overpaymentRates[index].period = value;
            updateOverpayment();
        },
    });

    syncInputWithRange(rateInput, null, {
        isDecimal: false,
        index,
        activeType: "nadplata",
        onChange: (value) => {
            state.overpaymentRates[index] = state.overpaymentRates[index] || {};
            state.overpaymentRates[index].value = value;
            updateOverpayment();
        },
    });

    typeSelect.addEventListener("change", updateOverpayment);
    effectSelect.addEventListener("change", updateOverpayment);

    removeBtn.addEventListener("click", () => {
        inputGroup.remove();
        state.overpaymentRates.splice(index, 1);
        console.log(`Overpayment removed at index ${index}, current overpaymentRates:`, state.overpaymentRates);
        const remainingInputs = wrapper.querySelectorAll(".variable-input-group");
        remainingInputs.forEach((group, newIndex) => {
            const newTypeSelect = group.querySelector(".nadplata-type-select");
            const newEffectSelect = group.querySelector(".nadplata-effect-select");
            const newCyklInput = group.querySelector(".variable-cykl");
            const newRateInput = group.querySelector(".variable-rate");

            const updateNewOverpayment = () => {
                state.overpaymentRates[newIndex] = {
                    type: newTypeSelect.value,
                    effect: newEffectSelect.value,
                    period: parseInt(newCyklInput.value),
                    value: parseFloat(newRateInput.value),
                };
            };

            syncInputWithRange(newCyklInput, null, {
                isDecimal: false,
                isVariableCykl: true,
                index: newIndex,
                activeType: "nadplata",
                onChange: (value) => {
                    state.overpaymentRates[newIndex] = state.overpaymentRates[newIndex] || {};
                    state.overpaymentRates[newIndex].period = value;
                    updateNewOverpayment();
                },
            });
            syncInputWithRange(newRateInput, null, {
                isDecimal: false,
                index: newIndex,
                activeType: "nadplata",
                onChange: (value) => {
                    state.overpaymentRates[newIndex] = state.overpaymentRates[newIndex] || {};
                    state.overpaymentRates[newIndex].value = value;
                    updateNewOverpayment();
                },
            });

            newTypeSelect.removeEventListener("change", updateOverpayment);
            newEffectSelect.removeEventListener("change", updateOverpayment);
            newTypeSelect.addEventListener("change", updateNewOverpayment);
            newEffectSelect.addEventListener("change", updateNewOverpayment);
        });
    });

    state.overpaymentRates[index] = {
        type: typeSelect.value,
        effect: effectSelect.value,
        period: parseInt(cyklInput.value),
        value: parseFloat(rateInput.value),
    };
}

// Obsługa zdarzeń
elements.rodzajRat.addEventListener("change", () => {
    state.lastFormData.rodzajRat = elements.rodzajRat.value;
    updateRodzajRatInfo();
});

elements.jednostkaProwizji.addEventListener("change", () => {
    state.lastFormData.jednostkaProwizji = elements.jednostkaProwizji.value;
    updateProwizjaInput();
});

elements.zmienneOprocentowanieBtn.addEventListener("change", updateVariableInputs);
elements.nadplataKredytuBtn.addEventListener("change", updateVariableInputs);

elements.addVariableOprocentowanieBtn.addEventListener("click", () => {
    const index = state.variableRates.length;
    addVariableRateInput(index);
});

elements.addNadplataKredytuBtn.addEventListener("click", () => {
    const index = state.overpaymentRates.length;
    addOverpaymentInput(index);
});

elements.obliczBtn.addEventListener("click", calculateLoan);
elements.resetBtn.addEventListener("click", resetForm);

let zoomLevel = 1;
elements.zoomInBtn.addEventListener("click", () => {
    zoomLevel += 0.1;
    document.body.style.transform = `scale(${zoomLevel})`;
});

elements.zoomOutBtn.addEventListener("click", () => {
    zoomLevel = Math.max(0.5, zoomLevel - 0.1);
    document.body.style.transform = `scale(${zoomLevel})`;
});

elements.toggleDarkModeBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
});

// Inicjalizacja
updateProwizjaInput();
updateKwotaInfo();
updateLata();
updateProwizjaInfo();
updateRodzajRatInfo();
updateVariableInputs();
