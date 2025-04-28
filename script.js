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
    harmonogramContainer: document.getElementById("harmonogramTabela"),
    chartContainer: document.getElementById("creditChart"),
    generatePdfBtn: document.getElementById("generatePdfBtn"),
    valueKapital: document.getElementById("valueKapital"),
    valueOdsetki: document.getElementById("valueOdsetki"),
    valueNadplata: document.getElementById("valueNadplata"),
    valueProwizja: document.getElementById("valueProwizja"),
    okresPoNadplacie: document.getElementById("okresPoNadplacie"),
    koszt: document.getElementById("koszt"),
    variableOprocentowanieInputs: document.getElementById("variableOprocentowanieInputs"),
    nadplataKredytuInputs: document.getElementById("nadplataKredytuInputs"),
    variableOprocentowanieWrapper: document.getElementById("variableOprocentowanieWrapper"),
    nadplataKredytuWrapper: document.getElementById("nadplataKredytuWrapper"),
    kwotaInfo: document.getElementById("kwotaInfo"),
    lata: document.getElementById("lata"),
    prowizjaInfo: document.getElementById("prowizjaInfo"),
    variableOprocentowanieTemplate: document.getElementById("variableOprocentowanieTemplate"),
    nadplataKredytuTemplate: document.getElementById("nadplataKredytuTemplate"),
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
    tempValues: {},
};

// Funkcja formatująca liczby z separatorami
function formatNumberWithSpaces(number) {
    if (isNaN(number)) return "0,00";
    return number.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// Funkcja pomocnicza do debouncingu
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Funkcja syncInputWithRange
function syncInputWithRange(input, range, options = {}) {
    const { isDecimal = false, onChange, isVariableCykl = false, index, activeType, stepOverride, defaultValue } = options;

    if (!input || !range) {
        console.error("Brak input lub range w syncInputWithRange", { input, range });
        return;
    }

    input.type = "number";

    input._eventListeners = input._eventListeners || {};
    range._eventListeners = range._eventListeners || {};

    const removeListeners = () => {
        if (input._eventListeners.input) input.removeEventListener("input", input._eventListeners.input);
        if (input._eventListeners.change) input.removeEventListener("change", input._eventListeners.change);
        if (range._eventListeners.input) range.removeEventListener("input", range._eventListeners.input);
        if (range._eventListeners.change) range.removeEventListener("change", range._eventListeners.change);
    };

    removeListeners();

    if (stepOverride) range.step = stepOverride;
    else if (isVariableCykl) range.step = "1";
    else range.step = isDecimal ? "0.01" : "1";

    const updateValue = (value, source, skipOnChange = false) => {
        const min = parseFloat(input.min) || 0;
        const max = parseFloat(input.max) || Infinity;

        if (typeof value === "string") {
            value = value.replace(",", ".").replace(/\s/g, "");
        }
        let parsedValue = parseFloat(value) || min;

        if (!isDecimal) {
            parsedValue = Math.round(parsedValue);
        } else {
            parsedValue = Math.round(parsedValue * 100) / 100;
        }

        parsedValue = Math.max(min, Math.min(max, parsedValue));

        const displayValue = isDecimal ? parsedValue.toFixed(2) : parsedValue.toString();

        input.value = displayValue;
        range.value = parsedValue;

        if (activeType && !skipOnChange && onChange) {
            onChange(parsedValue);
        } else {
            state.tempValues[input.id || range.id] = parsedValue;
        }
    };

    const updateAdditionalInfo = () => {
        if (input.id === "kwota") updateKwotaInfo();
        if (input.id === "prowizja") updateProwizjaInfo();
        if (input.id === "iloscRat") updateLata();
    };

    const debouncedUpdateAdditionalInfo = debounce(() => {
        requestAnimationFrame(updateAdditionalInfo);
    }, 50);

    const inputInputHandler = () => {
        let rawValue = input.value.replace(/\s/g, "");
        updateValue(rawValue, "Input");
        debouncedUpdateAdditionalInfo();
    };

    const inputChangeHandler = () => {
        let rawValue = input.value.replace(/\s/g, "");
        const parsedValue = parseFloat(rawValue) || (parseFloat(input.min) || 0);
        updateValue(parsedValue, "Input");
        updateAdditionalInfo();
    };

    const rangeInputHandler = () => {
        const rawValue = range.value;
        updateValue(rawValue, "Range");
        debouncedUpdateAdditionalInfo();
    };

    const rangeChangeHandler = () => {
        const rawValue = range.value;
        updateValue(rawValue, "Range");
        updateAdditionalInfo();
    };

    input._eventListeners.input = inputInputHandler;
    input._eventListeners.change = inputChangeHandler;
    range._eventListeners.input = rangeInputHandler;
    range._eventListeners.change = rangeChangeHandler;

    input.addEventListener("input", inputInputHandler);
    input.addEventListener("change", inputChangeHandler);
    range.addEventListener("input", rangeInputHandler);
    range.addEventListener("change", rangeChangeHandler);

    const min = parseFloat(input.min) || 0;
    const max = parseFloat(input.max) || Infinity;
    let initialValue = defaultValue !== undefined ? defaultValue : parseFloat(input.value) || min;
    if (isNaN(initialValue)) initialValue = min;
    initialValue = Math.max(min, Math.min(max, initialValue));

    updateValue(initialValue, "Initial", true);
    updateAdditionalInfo();
}

function createVariableInputGroup(type, index, period, value, typeValue = "Jednorazowa", effectValue = "Skróć okres") {
    const maxCykl = parseInt(elements.iloscRat?.value) || 360;

    const template = type === "oprocentowanie" 
        ? elements.variableOprocentowanieTemplate 
        : elements.nadplataKredytuTemplate;
    
    const group = document.importNode(template?.content, true)?.querySelector(".variable-input-group");
    if (!group) {
        console.error(`Nie udało się załadować szablonu dla typu: ${type}`);
        return null;
    }

    group.setAttribute("data-index", index);
    group.setAttribute("data-type", type);

    const cyklInput = group.querySelector(".variable-cykl");
    const cyklRange = group.querySelector(".variable-cykl-range");
    const rateInput = group.querySelector(".variable-rate");
    const rateRange = group.querySelector(".variable-rate-range");
    const removeBtn = group.querySelector(".remove-btn");
    const removeFirstBtn = group.querySelector(".remove-first-btn");

    if (!cyklInput || !cyklRange || !rateInput || !rateRange || !removeBtn || !removeFirstBtn) {
        console.error(`Brak wymaganych elementów w grupie dla typu: ${type}, index: ${index}`);
        return null;
    }

    try {
        if (type === "oprocentowanie") {
            const minPeriod = index > 0 ? (state.variableRates[index - 1]?.period || 1) + 1 : 2;
            cyklInput.min = minPeriod;
            cyklRange.min = minPeriod;
            cyklInput.max = maxCykl;
            cyklRange.max = maxCykl;
            cyklInput.value = period;
            cyklRange.value = period;
            rateInput.value = value;
            rateRange.value = value;
            rateRange.step = "0.01";
        } else if (type === "nadplata") {
            const minPeriod = index > 0 ? (state.overpaymentRates[index - 1]?.period || 0) + 1 : 1;
            cyklInput.min = minPeriod;
            cyklRange.min = minPeriod;
            cyklInput.max = maxCykl - 1;
            cyklRange.max = maxCykl - 1;
            cyklInput.value = period;
            cyklRange.value = period;
            rateInput.value = value;
            rateRange.value = value;
            rateRange.step = "1";
        }

        syncInputWithRange(cyklInput, cyklRange, {
            isDecimal: false,
            isVariableCykl: true,
            activeType: type,
            defaultValue: period,
            onChange: (value) => {
                if (type === "oprocentowanie") {
                    state.variableRates[index].period = value;
                    state.variableRates.sort((a, b) => a.period - b.period);
                } else {
                    state.overpaymentRates[index].period = value;
                    state.overpaymentRates.sort((a, b) => a.period - b.period);
                }
            },
        });

        syncInputWithRange(rateInput, rateRange, {
            isDecimal: true,
            activeType: type,
            index,
            defaultValue: value,
            onChange: (value) => {
                if (type === "oprocentowanie") {
                    state.variableRates[index].value = value;
                } else {
                    state.overpaymentRates[index].value = value;
                }
            },
        });

        removeBtn.addEventListener("click", () => removeVariableChange(index, type));
        removeFirstBtn.addEventListener("click", () => removeFirstVariableChange(type));

        return group;
    } catch (error) {
        console.error(`Błąd podczas tworzenia grupy dla typu: ${type}, index: ${index}`, error);
        return null;
    }
}

function calculateLoan() {
    const kwotaInput = elements.kwota?.value?.replace(",", ".")?.replace(/\s/g, "") || "0";
    const kwota = parseFloat(kwotaInput) || 0;
    let iloscRat = parseInt(elements.iloscRat?.value) || 0;
    const oprocentowanieInput = elements.oprocentowanie?.value?.replace(",", ".")?.replace(/\s/g, "") || "0";
    let oprocentowanie = parseFloat(oprocentowanieInput) || 0;
    const rodzajRat = elements.rodzajRat?.value || "rowne";
    const prowizjaInput = elements.prowizja?.value?.replace(",", ".")?.replace(/\s/g, "") || "0"; // Poprawiono "the" na "const"
    const prowizja = parseFloat(prowizjaInput) || 0;
    const jednostkaProwizji = elements.jednostkaProwizji?.value || "procent";

    if (kwota <= 0 || iloscRat <= 0 || oprocentowanie < 0) {
        alert("Proszę wprowadzić poprawne dane: kwota i ilość rat muszą być większe od 0, oprocentowanie nie może być ujemne.");
        return;
    }

    state.lastFormData = { 
        kwota, 
        iloscRat, 
        oprocentowanie, 
        rodzajRat, 
        prowizja, 
        jednostkaProwizji,
        zmienneOprocentowanie: elements.zmienneOprocentowanieBtn?.checked ?? false,
        nadplataKredytu: elements.nadplataKredytuBtn?.checked ?? false
    };

    if (elements.zmienneOprocentowanieBtn?.checked) {
        state.variableRates = [];
        const groups = elements.variableOprocentowanieWrapper?.querySelectorAll(".variable-input-group[data-type='oprocentowanie']") || [];
        groups.forEach((group) => {
            const cyklInput = group.querySelector(".variable-cykl");
            const rateInput = group.querySelector(".variable-rate");
            const period = parseInt(cyklInput?.value) || 0;
            const valueInput = rateInput?.value?.replace(",", ".")?.replace(/\s/g, "") || "0";
            const value = parseFloat(valueInput) || 0;
            if (period > 0 && value >= 0) {
                state.variableRates.push({ period, value });
            }
        });
        state.variableRates.sort((a, b) => a.period - b.period);
    } else {
        state.variableRates = [];
    }

    if (elements.nadplataKredytuBtn?.checked) {
        state.overpaymentRates = [];
        const groups = elements.nadplataKredytuWrapper?.querySelectorAll(".variable-input-group[data-type='nadplata']") || [];
        groups.forEach((group) => {
            const cyklInput = group.querySelector(".variable-cykl");
            const rateInput = group.querySelector(".variable-rate");
            const typeSelect = group.querySelector(".nadplata-type-select");
            const effectSelect = group.querySelector(".nadplata-effect-select");
            const period = parseInt(cyklInput?.value) || 0;
            const valueInput = rateInput?.value?.replace(",", ".")?.replace(/\s/g, "") || "0";
            const value = parseFloat(valueInput) || 0;
            const type = typeSelect?.value || "Jednorazowa";
            const effect = effectSelect?.value || "Skróć okres";
            if (period > 0 && value >= 0) {
                state.overpaymentRates.push({ period, value, type, effect });
            }
        });
        state.overpaymentRates.sort((a, b) => a.period - b.period);
    } else {
        state.overpaymentRates = [];
    }

    const prowizjaKwota = jednostkaProwizji === "procent" ? (prowizja / 100) * kwota : prowizja;
    let pozostalyKapital = kwota;
    let harmonogram = [];
    let sumaOdsetek = 0;
    let sumaKapitalu = 0;
    let sumaNadplat = 0;

    let monthlyRate = oprocentowanie / 100 / 12;
    let rata = 0;
    let iloscRatPoNadplacie = iloscRat;

    if (rodzajRat === "rowne") {
        if (monthlyRate === 0) {
            rata = kwota / iloscRat;
        } else {
            rata = (kwota * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -iloscRat));
        }
        if (isNaN(rata) || rata <= 0) {
            alert("Błąd w obliczeniach raty. Sprawdź dane wejściowe.");
            return;
        }

        let remainingMonths = iloscRat;
        for (let i = 1; i <= iloscRat && pozostalyKapital > 0.01; i++) {
            let currentOprocentowanie = oprocentowanie;
            if (state.variableRates.length > 0) {
                for (const rate of state.variableRates) {
                    if (i >= rate.period) {
                        currentOprocentowanie = rate.value;
                        monthlyRate = currentOprocentowanie / 100 / 12;
                    }
                }
            }

            if (i > 1 && state.variableRates.some(rate => i === rate.period)) {
                if (monthlyRate === 0) {
                    rata = pozostalyKapital / remainingMonths;
                } else {
                    rata = (pozostalyKapital * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -remainingMonths));
                }
                if (isNaN(rata) || rata <= 0) rata = 0;
            }

            let odsetki = pozostalyKapital * monthlyRate;
            let kapital = rata - odsetki;
            let nadplata = 0;

            if (kapital < 0) {
                kapital = pozostalyKapital;
                odsetki = rata - kapital;
            }

            state.overpaymentRates.forEach((overpayment) => {
                let isActive = false;
                if (overpayment.type === "Jednorazowa") {
                    isActive = i === overpayment.period;
                } else if (overpayment.type === "Miesięczna") {
                    isActive = i >= overpayment.period;
                } else if (overpayment.type === "Kwartalna") {
                    isActive = i >= overpayment.period && (i - overpayment.period) % 3 === 0;
                } else if (overpayment.type === "Roczna") {
                    isActive = i >= overpayment.period && (i - overpayment.period) % 12 === 0;
                }

                if (isActive) {
                    nadplata += parseFloat(overpayment.value);
                    sumaNadplat += nadplata;
                    pozostalyKapital -= nadplata;
                    if (pozostalyKapital < 0) pozostalyKapital = 0;

                    if (overpayment.effect === "Skróć okres") {
                        remainingMonths = i < iloscRat ? calculateRemainingMonths(pozostalyKapital, rata, monthlyRate) : 0;
                        if (remainingMonths <= 0) {
                            iloscRatPoNadplacie = i;
                            remainingMonths = 0;
                        } else {
                            iloscRatPoNadplacie = i + remainingMonths;
                        }
                    }
                }
            });

            if (pozostalyKapital <= 0.01) {
                harmonogram.push({
                    rata: i,
                    kwotaRaty: (0).toFixed(2),
                    kapital: (0).toFixed(2),
                    odsetki: (0).toFixed(2),
                    nadplata: nadplata.toFixed(2),
                    pozostalyKapital: (0).toFixed(2),
                    oprocentowanie: (monthlyRate * 12 * 100).toFixed(2),
                });
                break;
            }

            pozostalyKapital -= kapital;
            if (pozostalyKapital < 0) pozostalyKapital = 0;

            sumaOdsetek += odsetki;
            sumaKapitalu += kapital;

            harmonogram.push({
                rata: i,
                kwotaRaty: rata.toFixed(2),
                kapital: kapital.toFixed(2),
                odsetki: odsetki.toFixed(2),
                nadplata: nadplata.toFixed(2),
                pozostalyKapital: pozostalyKapital.toFixed(2),
                oprocentowanie: (monthlyRate * 12 * 100).toFixed(2),
            });

            remainingMonths--;
            if (remainingMonths <= 0 && pozostalyKapital > 0) {
                remainingMonths = calculateRemainingMonths(pozostalyKapital, rata, monthlyRate);
                iloscRatPoNadplacie = i + remainingMonths - 1;
            }
        }
    }

    if (rodzajRat === "malejace") {
        let kapitalStaly = kwota / iloscRat;
        let i = 1;

        while (i <= iloscRat && pozostalyKapital > 0.01) {
            let currentOprocentowanie = oprocentowanie;
            if (state.variableRates.length > 0) {
                for (const rate of state.variableRates) {
                    if (i >= rate.period) {
                        currentOprocentowanie = rate.value;
                        monthlyRate = currentOprocentowanie / 100 / 12;
                    }
                }
            }

            let odsetki = pozostalyKapital * monthlyRate;
            let kapital = kapitalStaly;
            let nadplata = 0;

            state.overpaymentRates.forEach((overpayment) => {
                let isActive = false;
                if (overpayment.type === "Jednorazowa") {
                    isActive = i === overpayment.period;
                } else if (overpayment.type === "Miesięczna") {
                    isActive = i >= overpayment.period;
                } else if (overpayment.type === "Kwartalna") {
                    isActive = i >= overpayment.period && (i - overpayment.period) % 3 === 0;
                } else if (overpayment.type === "Roczna") {
                    isActive = i >= overpayment.period && (i - overpayment.period) % 12 === 0;
                }

                if (isActive) {
                    nadplata += parseFloat(overpayment.value);
                    sumaNadplat += nadplata;
                    if (overpayment.effect === "Skróć okres") {
                        kapital += nadplata;
                    } else {
                        pozostalyKapital -= nadplata;
                    }
                    if (pozostalyKapital < 0) pozostalyKapital = 0;
                }
            });

            if (kapital > pozostalyKapital) {
                kapital = pozostalyKapital;
            }

            rata = kapital + odsetki;
            if (isNaN(rata) || rata <= 0) {
                rata = 0;
            }

            pozostalyKapital -= kapital;
            if (pozostalyKapital < 0) pozostalyKapital = 0;

            sumaOdsetek += odsetki;
            sumaKapitalu += kapital;

            harmonogram.push({
                rata: i,
                kwotaRaty: rata.toFixed(2),
                kapital: kapital.toFixed(2),
                odsetki: odsetki.toFixed(2),
                nadplata: nadplata.toFixed(2),
                pozostalyKapital: pozostalyKapital.toFixed(2),
                oprocentowanie: (monthlyRate * 12 * 100).toFixed(2),
            });

            if (pozostalyKapital <= 0.01) {
                iloscRatPoNadplacie = i;
                break;
            }

            i++;
        }
    }

    displayResults(harmonogram, sumaOdsetek, sumaKapitalu, prowizjaKwota, sumaNadplat, iloscRatPoNadplacie);
}

function calculateRemainingMonths(pozostalyKapital, rata, monthlyRate) {
    if (monthlyRate === 0 || rata <= 0 || pozostalyKapital <= 0) return 0;
    const n = Math.log(rata / (rata - pozostalyKapital * monthlyRate)) / Math.log(1 + monthlyRate);
    return Math.ceil(n);
}

function displayResults(harmonogram, sumaOdsetek, sumaKapitalu, prowizjaKwota, sumaNadplat, iloscRat) {
    if (elements.formSection) elements.formSection.style.display = "none";
    if (elements.resultSection) elements.resultSection.style.display = "block";

    const calkowityKoszt = sumaKapitalu + sumaOdsetek + prowizjaKwota + sumaNadplat;
    if (elements.valueKapital) elements.valueKapital.textContent = formatNumberWithSpaces(sumaKapitalu) + " zł";
    if (elements.valueOdsetki) elements.valueOdsetki.textContent = formatNumberWithSpaces(sumaOdsetek) + " zł";
    if (elements.valueNadplata) elements.valueNadplata.textContent = formatNumberWithSpaces(sumaNadplat) + " zł";
    if (elements.valueProwizja) elements.valueProwizja.textContent = formatNumberWithSpaces(prowizjaKwota) + " zł";
    if (elements.okresPoNadplacie) elements.okresPoNadplacie.textContent = iloscRat;
    if (elements.koszt) elements.koszt.textContent = formatNumberWithSpaces(calkowityKoszt);

    const legendItems = [
        { index: 0, value: sumaKapitalu, label: "Kapitał" },
        { index: 1, value: sumaOdsetek, label: "Odsetki" },
        { index: 2, value: sumaNadplat, label: "Nadpłaty" },
        { index: 3, value: prowizjaKwota, label: "Prowizja" },
    ];

    legendItems.forEach(item => {
        const element = document.querySelector(`.legend-item[data-index="${item.index}"] .color-box`);
        if (element) {
            element.setAttribute('data-tooltip', `${item.label}: ${formatNumberWithSpaces(item.value)} zł`);
        }
    });

    let harmonogramHTML = "";
    harmonogram.forEach((row) => {
        harmonogramHTML += `
            <tr>
                <td>${row.rata}</td>
                <td>${formatNumberWithSpaces(parseFloat(row.kwotaRaty))} zł</td>
                <td>${formatNumberWithSpaces(parseFloat(row.oprocentowanie))}%</td>
                <td>${formatNumberWithSpaces(parseFloat(row.nadplata))} zł</td>
                <td>${formatNumberWithSpaces(parseFloat(row.kapital))} zł</td>
                <td>${formatNumberWithSpaces(parseFloat(row.odsetki))} zł</td>
                <td>${formatNumberWithSpaces(parseFloat(row.pozostalyKapital))} zł</td>
            </tr>
        `;
    });
    if (elements.harmonogramContainer) {
        elements.harmonogramContainer.innerHTML = harmonogramHTML;
    }

    if (elements.chartContainer) {
        const ctx = elements.chartContainer.getContext("2d");
        if (elements.chartContainer.chart) {
            elements.chartContainer.chart.destroy();
        }
        elements.chartContainer.chart = new Chart(ctx, {
            type: "pie",
            data: {
                labels: ["Kapitał", "Odsetki", "Nadpłaty", "Prowizja"],
            datasets: [{
                data: [sumaKapitalu, sumaOdsetek, sumaNadplat, prowizjaKwota],
                backgroundColor: ["#28a745", "#007bff", "#dc3545", "#6f42c1"],
            }],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                return `${label}: ${formatNumberWithSpaces(value)} zł`;
                            }
                        }
                    }
                },
            },
        });
    }
}

function showForm() {
    if (elements.formSection) elements.formSection.style.display = "block";
    if (elements.resultSection) elements.resultSection.style.display = "none";
}

function toggleHarmonogram(elementId) {
    const content = document.getElementById(elementId);
    const toggleButton = document.querySelector(`.btn-toggle[onclick="toggleHarmonogram('${elementId}')"]`);
    
    if (content && toggleButton) {
        const isHidden = content.style.display === "none";
        content.style.display = isHidden ? "block" : "none";
        toggleButton.textContent = isHidden ? "Harmonogram spłat ▼" : "Harmonogram spłat ▲";
    }
}

function updateProwizjaInput() {
    const jednostka = elements.jednostkaProwizji?.value || "procent";
    let min, max, step, defaultValue;

    if (jednostka === "procent") {
        min = 0;
        max = 25;
        step = 0.01;
        defaultValue = 2;
    } else {
        min = 0;
        max = 1250000;
        step = 1;
        defaultValue = 10000;
    }

    if (elements.prowizja) elements.prowizja.min = min;
    if (elements.prowizja) elements.prowizja.max = max;
    if (elements.prowizjaRange) elements.prowizjaRange.min = min;
    if (elements.prowizjaRange) elements.prowizjaRange.max = max;
    if (elements.prowizjaRange) elements.prowizjaRange.step = step;

    const currentValueInput = elements.prowizja?.value?.replace(",", ".")?.replace(/\s/g, "") || "0";
    const currentValue = parseFloat(currentValueInput);
    if (state.lastFormData.jednostkaProwizji !== jednostka) {
        const formattedDefaultValue = defaultValue.toFixed(2);
        if (elements.prowizja) elements.prowizja.value = formattedDefaultValue;
        if (elements.prowizjaRange) elements.prowizjaRange.value = defaultValue;
        state.lastFormData.prowizja = defaultValue;
    } else {
        let value = currentValue;
        if (isNaN(value) || value < min) value = min;
        if (value > max) value = max;
        const formattedValue = value.toFixed(2);
        if (elements.prowizja) elements.prowizja.value = formattedValue;
        if (elements.prowizjaRange) elements.prowizjaRange.value = value;
        state.lastFormData.prowizja = value;
    }

    state.lastFormData.jednostkaProwizji = jednostka;
    updateProwizjaInfo();
}

function updateKwotaInfo() {
    const kwotaInput = elements.kwota?.value?.replace(",", ".")?.replace(/\s/g, "") || "0";
    const kwota = parseFloat(kwotaInput) || 500000;
    if (elements.kwotaInfo) {
        elements.kwotaInfo.textContent = `Kwota kredytu: ${formatNumberWithSpaces(kwota)} zł`;
    }
}

function updateLata() {
    const miesiace = parseInt(elements.iloscRat?.value) || 0;
    const lata = Math.floor(miesiace / 12);
    if (elements.lata) {
        elements.lata.textContent = `Ilość lat: ${miesiace >= 12 ? lata : 0}`;
    }
}

function updateProwizjaInfo() {
    const prowizjaInput = elements.prowizja?.value?.replace(",", ".")?.replace(/\s/g, "") || "0";
    const prowizja = parseFloat(prowizjaInput) || 0;
    const jednostka = elements.jednostkaProwizji?.value || "procent";
    const kwotaInput = elements.kwota?.value?.replace(",", ".")?.replace(/\s/g, "") || "0";
    const kwota = parseFloat(kwotaInput) || 500000;
    if (elements.prowizjaInfo) {
        const wartosc = jednostka === "procent" ? (prowizja / 100) * kwota : prowizja;
        elements.prowizjaInfo.textContent = `Prowizja: ${formatNumberWithSpaces(wartosc)} zł`;
    }
}

function updateVariableInputs() {
    const maxCykl = parseInt(elements.iloscRat?.value) || 360;
    const maxChanges = Math.floor(maxCykl / 12) || 1;

    try {
        if (elements.zmienneOprocentowanieBtn?.checked && elements.variableOprocentowanieInputs && elements.addVariableOprocentowanieBtn && elements.variableOprocentowanieWrapper) {
            if (state.variableRates.length === 0) {
                state.variableRates.push({ value: state.lastFormData.oprocentowanie || 7, period: 2 });
            }
            elements.variableOprocentowanieInputs.classList.add("active");

            const existingGroups = Array.from(elements.variableOprocentowanieWrapper.querySelectorAll(".variable-input-group[data-type='oprocentowanie']"));
            const newGroups = state.variableRates.map((rate, index) => {
                const minPeriod = index > 0 ? state.variableRates[index - 1].period + 1 : 2;
                let group = existingGroups.find(g => parseInt(g.getAttribute("data-index")) === index);

                if (!group) {
                    group = createVariableInputGroup("oprocentowanie", index, Math.max(minPeriod, rate.period), rate.value);
                    if (!group) return null;
                } else {
                    const cyklInput = group.querySelector(".variable-cykl");
                    const cyklRange = group.querySelector(".variable-cykl-range");
                    const rateInput = group.querySelector(".variable-rate");
                    const rateRange = group.querySelector(".variable-rate-range");
                    if (cyklInput) cyklInput.value = rate.period;
                    if (cyklRange) cyklRange.value = rate.period;
                    if (rateInput) rateInput.value = rate.value;
                    if (rateRange) rateRange.value = rate.value;
                }

                const cyklInput = group.querySelector(".variable-cykl");
                const cyklRange = group.querySelector(".variable-cykl-range");
                if (cyklInput) cyklInput.min = minPeriod;
                if (cyklRange) cyklRange.min = minPeriod;
                if (cyklInput) cyklInput.max = maxCykl;
                if (cyklRange) cyklRange.max = maxCykl;

                const removeBtn = group.querySelector(".remove-btn");
                const removeFirstBtn = group.querySelector(".remove-first-btn");
                if (index === 0 && state.variableRates.length === 1) {
                    if (removeFirstBtn) removeFirstBtn.style.display = "block";
                    if (removeBtn) removeBtn.style.display = "none";
                } else if (index === state.variableRates.length - 1 && state.variableRates.length > 1) {
                    if (removeFirstBtn) removeFirstBtn.style.display = "none";
                    if (removeBtn) removeBtn.style.display = "block";
                } else {
                    if (removeFirstBtn) removeFirstBtn.style.display = "none";
                    if (removeBtn) removeBtn.style.display = "none";
                }

                return group;
            }).filter(group => group !== null);

            elements.variableOprocentowanieWrapper.innerHTML = "";
            newGroups.forEach(group => elements.variableOprocentowanieWrapper.appendChild(group));

            const lastPeriod = state.variableRates.length > 0 ? state.variableRates[state.variableRates.length - 1].period : 0;
            const canAddMore = state.variableRates.length < maxChanges && lastPeriod < maxCykl;
            elements.addVariableOprocentowanieBtn.style.display = canAddMore ? "block" : "none";
        } else {
            if (elements.variableOprocentowanieInputs) elements.variableOprocentowanieInputs.classList.remove("active");
            if (elements.addVariableOprocentowanieBtn) elements.addVariableOprocentowanieBtn.style.display = "none";
            if (elements.variableOprocentowanieWrapper) elements.variableOprocentowanieWrapper.innerHTML = "";
            if (!elements.zmienneOprocentowanieBtn?.checked) state.variableRates = [];
        }

        if (elements.nadplataKredytuBtn?.checked && elements.nadplataKredytuInputs && elements.addNadplataKredytuBtn && elements.nadplataKredytuWrapper) {
            if (state.overpaymentRates.length === 0) {
                state.overpaymentRates.push({ value: 1000, period: 1, type: "Jednorazowa", effect: "Skróć okres" });
            }
            elements.nadplataKredytuInputs.classList.add("active");

            const existingGroups = Array.from(elements.nadplataKredytuWrapper.querySelectorAll(".variable-input-group[data-type='nadplata']"));
            const newGroups = state.overpaymentRates.map((overpayment, index) => {
                const minPeriod = index > 0 ? state.overpaymentRates[index - 1].period + 1 : 1;
                let group = existingGroups.find(g => parseInt(g.getAttribute("data-index")) === index);

                if (!group) {
                    group = createVariableInputGroup("nadplata", index, Math.max(minPeriod, overpayment.period), overpayment.value, overpayment.type, overpayment.effect);
                    if (!group) return null;
                } else {
                    const cyklInput = group.querySelector(".variable-cykl");
                    const cyklRange = group.querySelector(".variable-cykl-range");
                    const rateInput = group.querySelector(".variable-rate");
                    const rateRange = group.querySelector(".variable-rate-range");
                    const typeSelect = group.querySelector(".nadplata-type-select");
                    const effectSelect = group.querySelector(".nadplata-effect-select");
                    if (cyklInput) cyklInput.value = overpayment.period;
                    if (cyklRange) cyklRange.value = overpayment.period;
                    if (rateInput) rateInput.value = overpayment.value;
                    if (rateRange) rateRange.value = overpayment.value;
                    if (typeSelect) typeSelect.value = overpayment.type;
                    if (effectSelect) effectSelect.value = overpayment.effect;
                }

                const cyklInput = group.querySelector(".variable-cykl");
                const cyklRange = group.querySelector(".variable-cykl-range");
                if (cyklInput) cyklInput.min = minPeriod;
                if (cyklRange) cyklRange.min = minPeriod;
                if (cyklInput) cyklInput.max = maxCykl - 1;
                if (cyklRange) cyklRange.max = maxCykl - 1;

                const removeBtn = group.querySelector(".remove-btn");
                const removeFirstBtn = group.querySelector(".remove-first-btn");
                if (index === 0 && state.overpaymentRates.length === 1) {
                    if (removeFirstBtn) removeFirstBtn.style.display = "block";
                    if (removeBtn) removeBtn.style.display = "none";
                } else if (index === state.overpaymentRates.length - 1 && state.overpaymentRates.length > 1) {
                    if (removeFirstBtn) removeFirstBtn.style.display = "none";
                    if (removeBtn) removeBtn.style.display = "block";
                } else {
                    if (removeFirstBtn) removeFirstBtn.style.display = "none";
                    if (removeBtn) removeBtn.style.display = "none";
                }

                return group;
            }).filter(group => group !== null);

            elements.nadplataKredytuWrapper.innerHTML = "";
            newGroups.forEach(group => elements.nadplataKredytuWrapper.appendChild(group));

            const lastPeriod = state.overpaymentRates.length > 0 ? state.overpaymentRates[state.overpaymentRates.length - 1].period : 0;
            const canAddMore = state.overpaymentRates.length < maxChanges && lastPeriod < (maxCykl - 1);
            elements.addNadplataKredytuBtn.style.display = canAddMore ? "block" : "none";
        } else {
            if (elements.nadplataKredytuInputs) elements.nadplataKredytuInputs.classList.remove("active");
            if (elements.addNadplataKredytuBtn) elements.addNadplataKredytuBtn.style.display = "none";
            if (elements.nadplataKredytuWrapper) elements.nadplataKredytuWrapper.innerHTML = "";
            if (!elements.nadplataKredytuBtn?.checked) state.overpaymentRates = [];
        }
    } catch (error) {
        console.error("Błąd podczas aktualizacji zmiennych wejść:", error);
    }
}

function addVariableChange(activeType) {
    const maxCykl = parseInt(elements.iloscRat?.value) || 360;
    const maxChanges = Math.floor(maxCykl / 12) || 1;

    const changes = activeType === "oprocentowanie" ? state.variableRates : state.overpaymentRates;
    const maxPeriod = activeType === "nadplata" ? maxCykl - 1 : maxCykl;

    const lastChange = changes.length > 0 ? changes[changes.length - 1].period : 0;
    if (changes.length >= maxChanges || lastChange >= maxPeriod) {
        if (changes.length >= maxChanges) {
            alert(`Osiągnięto maksymalną liczbę zmian (${maxChanges}).`);
        }
        if (activeType === "oprocentowanie") {
            if (elements.addVariableOprocentowanieBtn) elements.addVariableOprocentowanieBtn.style.display = "none";
        } else {
            if (elements.addNadplataKredytuBtn) elements.addNadplataKredytuBtn.style.display = "none";
        }
        return;
    }

    const newPeriod = lastChange + 1;
    const newChange = activeType === "oprocentowanie" 
        ? { period: newPeriod, value: state.lastFormData.oprocentowanie || 7 }
        : { period: newPeriod, value: 1000, type: "Jednorazowa", effect: "Skróć okres" };

    changes.push(newChange);
    updateVariableInputs();
}

function removeVariableChange(index, activeType) {
    const changes = activeType === "oprocentowanie" ? state.variableRates : state.overpaymentRates;
    if (changes.length > 1) {
        changes.splice(index, 1);
        updateVariableInputs();
    }
}

function removeFirstVariableChange(activeType) {
    if (activeType === "oprocentowanie") {
        state.variableRates = [];
        if (elements.zmienneOprocentowanieBtn) elements.zmienneOprocentowanieBtn.checked = false;
        state.lastFormData.zmienneOprocentowanie = false;
    } else if (activeType === "nadplata") {
        state.overpaymentRates = [];
        if (elements.nadplataKredytuBtn) elements.nadplataKredytuBtn.checked = false;
        state.lastFormData.nadplataKredytu = false;
    }
    updateVariableInputs();
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

function toggleDarkMode() {
    const body = document.body;
    const isDarkMode = body.classList.contains("dark-mode");

    if (isDarkMode) {
        body.classList.remove("dark-mode");
        body.classList.add("light-mode");
        localStorage.setItem("theme", "light");
        if (elements.toggleDarkModeBtn) elements.toggleDarkModeBtn.textContent = "🌙";
    } else {
        body.classList.remove("light-mode");
        body.classList.add("dark-mode");
        localStorage.setItem("theme", "dark");
        if (elements.toggleDarkModeBtn) elements.toggleDarkModeBtn.textContent = "☀️";
    }
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
}

function initializeApp() {
    try {
        // Inicjalizacja suwaków z zabezpieczeniem
        if (elements.kwota && elements.kwotaRange) {
            syncInputWithRange(elements.kwota, elements.kwotaRange, {
                isDecimal: true,
                stepOverride: 100,
                defaultValue: state.lastFormData.kwota,
                onChange: (value) => {
                    state.lastFormData.kwota = value;
                },
            });
        }

        if (elements.iloscRat && elements.iloscRatRange) {
            syncInputWithRange(elements.iloscRat, elements.iloscRatRange, {
                isDecimal: false,
                defaultValue: state.lastFormData.iloscRat,
                onChange: (value) => {
                    state.lastFormData.iloscRat = value;
                },
            });
        }

        if (elements.oprocentowanie && elements.oprocentowanieRange) {
            syncInputWithRange(elements.oprocentowanie, elements.oprocentowanieRange, {
                isDecimal: true,
                stepOverride: 0.01,
                defaultValue: state.lastFormData.oprocentowanie,
                onChange: (value) => {
                    state.lastFormData.oprocentowanie = value;
                },
            });
        }

        if (elements.prowizja && elements.prowizjaRange) {
            syncInputWithRange(elements.prowizja, elements.prowizjaRange, {
                isDecimal: true,
                defaultValue: state.lastFormData.prowizja,
                onChange: (value) => {
                    state.lastFormData.prowizja = value;
                },
            });
        }

        // Inicjalizacja pozostałych funkcji
        updateProwizjaInput();
        updateKwotaInfo();
        updateLata();
        updateProwizjaInfo();
        updateVariableInputs();
        initializeTheme();

        // Dodanie listenerów
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
                updateVariableInputs();
            });
        }

        if (elements.nadplataKredytuBtn) {
            elements.nadplataKredytuBtn.addEventListener("change", () => {
                state.lastFormData.nadplataKredytu = elements.nadplataKredytuBtn.checked;
                updateVariableInputs();
            });
        }

        if (elements.addVariableOprocentowanieBtn) {
            elements.addVariableOprocentowanieBtn.addEventListener("click", () => addVariableChange("oprocentowanie"));
        }

        if (elements.addNadplataKredytuBtn) {
            elements.addNadplataKredytuBtn.addEventListener("click", () => addVariableChange("nadplata"));
        }

        if (elements.obliczBtn) {
            elements.obliczBtn.addEventListener("click", calculateLoan);
        }

        if (elements.zoomInBtn) {
            elements.zoomInBtn.addEventListener("click", () => {
                currentZoom = Math.min(currentZoom + zoomStep, maxZoom);
                updateZoom();
            });
        }

        if (elements.zoomOutBtn) {
            elements.zoomOutBtn.addEventListener("click", () => {
                currentZoom = Math.max(currentZoom - zoomStep, minZoom);
                updateZoom();
            });
        }

        if (elements.toggleDarkModeBtn) {
            elements.toggleDarkModeBtn.addEventListener("click", toggleDarkMode);
        }

        if (elements.generatePdfBtn) {
            elements.generatePdfBtn.addEventListener("click", () => {
                const { jsPDF } = window.jspdf;
                if (!jsPDF) return;
                const doc = new jsPDF();
                const harmonogramTable = document.getElementById("harmonogramTabela");
                if (harmonogramTable) {
                    doc.autoTable({ html: harmonogramTable });
                    doc.save("harmonogram_kredytu.pdf");
                }
            });
        }
    } catch (error) {
        console.error("Błąd podczas inicjalizacji aplikacji:", error);
    }
}

document.addEventListener("DOMContentLoaded", initializeApp);
