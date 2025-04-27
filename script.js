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

// Funkcja formatująca liczby
function formatNumberWithSpaces(number) {
    if (isNaN(number)) return "0,00";
    return number.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// Poprawiona funkcja synchronizacji inputów z suwakami
function syncInputWithRange(input, range, options = {}) {
    const { isDecimal = false, defaultValue, onChange } = options;

    if (!input || !range) return;

    // Ustawienie wartości domyślnej
    const initialValue = defaultValue !== undefined ? defaultValue : 0;
    let currentValue = parseFloat(initialValue) || 0;

    const min = parseFloat(range.min) || 0;
    const max = parseFloat(range.max) || Infinity;

    if (currentValue < min) currentValue = min;
    if (currentValue > max) currentValue = max;

    // Formatowanie i ustawienie wartości początkowej
    const formattedValue = isDecimal
        ? formatNumberWithSpaces(currentValue)
        : Math.floor(currentValue).toString();
    input.value = formattedValue;
    range.value = currentValue;

    // Funkcja aktualizująca wartości
    const updateValue = (value, source) => {
        let parsedValue = parseFloat(value.replace(",", ".")) || 0;

        // Ograniczenie wartości do zakresu min/max
        if (parsedValue < min) parsedValue = min;
        if (parsedValue > max) parsedValue = max;

        // Formatowanie wartości
        const formattedValue = isDecimal
            ? formatNumberWithSpaces(parsedValue)
            : Math.floor(parsedValue).toString();

        input.value = formattedValue;
        range.value = parsedValue;

        if (onChange) onChange(parsedValue);
    };

    // Obsługa inputu
    input.addEventListener("input", (e) => {
        let value = e.target.value.replace(",", ".").replace(/\s/g, "");
        if (isDecimal) {
            value = value.replace(/[^0-9.]/g, "");
            const parts = value.split(".");
            if (parts.length > 1) value = parts[0] + "." + parts[1].slice(0, 2);
        } else {
            value = value.replace(/[^0-9]/g, "");
        }
        updateValue(value, "input");
    });

    // Obsługa suwaka
    range.addEventListener("input", (e) => {
        updateValue(e.target.value, "range");
    });

    // Wywołanie onChange dla wartości początkowej
    if (onChange) onChange(currentValue);
}

// Inicjalizacja głównych inputów z wartościami domyślnymi
syncInputWithRange(elements.kwota, elements.kwotaRange, {
    isDecimal: true,
    defaultValue: state.lastFormData.kwota,
    onChange: (value) => {
        state.lastFormData.kwota = value;
        updateProwizjaInfo();
        updateKwotaInfo();
    },
});

syncInputWithRange(elements.iloscRat, elements.iloscRatRange, {
    isDecimal: false,
    defaultValue: state.lastFormData.iloscRat,
    onChange: (value) => {
        state.lastFormData.iloscRat = value;
        updateLata();
        updateVariableInputs();
    },
});

syncInputWithRange(elements.oprocentowanie, elements.oprocentowanieRange, {
    isDecimal: true,
    defaultValue: state.lastFormData.oprocentowanie,
    onChange: (value) => {
        state.lastFormData.oprocentowanie = value;
    },
});

syncInputWithRange(elements.prowizja, elements.prowizjaRange, {
    isDecimal: true,
    defaultValue: state.lastFormData.prowizja,
    onChange: (value) => {
        state.lastFormData.prowizja = value;
        updateProwizjaInfo();
    },
});

// Funkcja obliczania kredytu
function calculateLoan() {
    const kwotaInput = elements.kwota.value.replace(",", ".").replace(/\s/g, "");
    const kwota = parseFloat(kwotaInput) || 0;
    let iloscRat = parseInt(elements.iloscRat.value) || 0;
    const oprocentowanieInput = elements.oprocentowanie.value.replace(",", ".").replace(/\s/g, "");
    let oprocentowanie = parseFloat(oprocentowanieInput) || 0;
    const rodzajRat = elements.rodzajRat.value || "rowne";
    const prowizjaInput = elements.prowizja.value.replace(",", ".").replace(/\s/g, "");
    const prowizja = parseFloat(prowizjaInput) || 0;
    const jednostkaProwizji = elements.jednostkaProwizji.value || "procent";

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
        zmienneOprocentowanie: elements.zmienneOprocentowanieBtn.checked,
        nadplataKredytu: elements.nadplataKredytuBtn.checked
    };

    if (elements.zmienneOprocentowanieBtn.checked) {
        const inputs = document.querySelectorAll('.variable-input-group[data-type="oprocentowanie"]');
        state.variableRates = [];
        inputs.forEach((inputGroup) => {
            const cyklInput = inputGroup.querySelector(".variable-cykl");
            const rateInput = inputGroup.querySelector(".variable-rate");
            const period = parseInt(cyklInput.value) || 0;
            const valueInput = rateInput.value.replace(",", ".").replace(/\s/g, "");
            const value = parseFloat(valueInput) || 0;
            if (period > 0 && value >= 0) {
                state.variableRates.push({ period, value });
            }
        });
        state.variableRates.sort((a, b) => a.period - b.period);
    } else {
        state.variableRates = [];
    }

    if (elements.nadplataKredytuBtn.checked) {
        const inputs = document.querySelectorAll('.variable-input-group[data-type="nadplata"]');
        state.overpaymentRates = [];
        inputs.forEach((inputGroup) => {
            const cyklInput = inputGroup.querySelector(".variable-cykl");
            const rateInput = inputGroup.querySelector(".variable-rate");
            const typeSelect = inputGroup.querySelector(".nadplata-type-select");
            const effectSelect = inputGroup.querySelector(".nadplata-effect-select");
            const period = parseInt(cyklInput.value) || 0;
            const valueInput = rateInput.value.replace(",", ".").replace(/\s/g, "");
            const value = parseFloat(valueInput) || 0;
            const type = typeSelect.value || "Jednorazowa";
            const effect = effectSelect.value || "Skróć okres";
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

    let previousRata = 0;

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
    }

    if (rodzajRat === "malejace") {
        let kapitalStaly = kwota / iloscRat;
        let nadplataMiesieczna = 0;
        let efektNadplaty = "Skróć okres";
        state.overpaymentRates.forEach((overpayment) => {
            if (overpayment.type === "Miesięczna" && overpayment.period <= 1) {
                nadplataMiesieczna = parseFloat(overpayment.value);
                efektNadplaty = overpayment.effect;
            }
        });

        if (nadplataMiesieczna > 0 && efektNadplaty === "Zmniejsz ratę") {
            kapitalStaly = (kwota - nadplataMiesieczna * iloscRat) / iloscRat;
            if (kapitalStaly < 0) kapitalStaly = 0;
        }

        let i = 1;
        let lastRateChangeMonth = 0;
        while (i <= iloscRat && pozostalyKapital > 0.01) {
            let currentOprocentowanie = oprocentowanie;
            let rateChanged = false;
            state.variableRates.forEach((rate) => {
                if (i >= rate.period) {
                    currentOprocentowanie = parseFloat(rate.value);
                    monthlyRate = currentOprocentowanie / 100 / 12;
                    if (i >= rate.period && lastRateChangeMonth < rate.period) {
                        rateChanged = true;
                        lastRateChangeMonth = rate.period;
                    }
                }
            });

            let odsetki = pozostalyKapital * monthlyRate;
            let kapital = kapitalStaly;
            let nadplata = 0;
            let isOverpaymentMonth = false;

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
                    isOverpaymentMonth = true;
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

            if (isOverpaymentMonth && i > 1) {
                rata = previousRata;
            } else {
                rata = kapital + odsetki;
                if (isNaN(rata) || rata <= 0) {
                    rata = 0;
                }
            }

            if (isOverpaymentMonth && i > 1) {
                kapital = rata - odsetki;
                if (kapital < 0) {
                    kapital = 0;
                    odsetki = rata;
                }
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

            previousRata = rata;

            if (pozostalyKapital <= 0.01) {
                iloscRatPoNadplacie = i;
                break;
            }

            i++;
        }
    }

    if (rodzajRat === "rowne") {
        let remainingMonths = iloscRat;
        let i = 1;
        let lastRateChangeMonth = 0;
        while (i <= iloscRat && pozostalyKapital > 0.01) {
            let currentOprocentowanie = oprocentowanie;
            let rateChanged = false;
            state.variableRates.forEach((rate) => {
                if (i >= rate.period) {
                    currentOprocentowanie = parseFloat(rate.value);
                    monthlyRate = currentOprocentowanie / 100 / 12;
                    if (i >= rate.period && lastRateChangeMonth < rate.period) {
                        rateChanged = true;
                        lastRateChangeMonth = rate.period;
                    }
                }
            });

            if (rateChanged) {
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
            let isOverpaymentMonth = false;

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
                    isOverpaymentMonth = true;
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

            if (isOverpaymentMonth && i > 1) {
                rata = previousRata;
                kapital = rata - odsetki;
                if (kapital < 0) {
                    kapital = pozostalyKapital;
                    odsetki = rata - kapital;
                }
            }

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

            previousRata = rata;

            i++;
            remainingMonths--;
            if (remainingMonths <= 0 && pozostalyKapital > 0) {
                remainingMonths = calculateRemainingMonths(pozostalyKapital, rata, monthlyRate);
                iloscRatPoNadplacie = i + remainingMonths - 1;
            }
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
    if (!elements.formSection || !elements.resultSection) return;

    elements.formSection.style.display = "none";
    elements.resultSection.style.display = "block";

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
        if (!ctx) return;
        if (elements.chartContainer.chart) {
            elements.chartContainer.chart.destroy();
        }
        try {
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
                        legend: { display: false },
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
        } catch (error) {
            console.error("Error creating chart:", error);
        }
    }
}

function showForm() {
    if (elements.formSection && elements.resultSection) {
        elements.formSection.style.display = "block";
        elements.resultSection.style.display = "none";
    }
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
    const jednostka = elements.jednostkaProwizji.value;
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

    elements.prowizja.min = min;
    elements.prowizja.max = max;
    elements.prowizjaRange.min = min;
    elements.prowizjaRange.max = max;
    elements.prowizjaRange.step = step;

    const currentValueInput = elements.prowizja.value.replace(",", ".").replace(/\s/g, "");
    const currentValue = parseFloat(currentValueInput);
    if (state.lastFormData.jednostkaProwizji !== jednostka || isNaN(currentValue)) {
        const formattedDefaultValue = formatNumberWithSpaces(defaultValue);
        elements.prowizja.value = formattedDefaultValue;
        elements.prowizjaRange.value = defaultValue;
        state.lastFormData.prowizja = defaultValue;
    }

    state.lastFormData.jednostkaProwizji = jednostka;
    updateProwizjaInfo();
}

function updateKwotaInfo() {
    const kwotaInput = elements.kwota.value.replace(",", ".").replace(/\s/g, "");
    const kwota = parseFloat(kwotaInput) || 0;
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
    const prowizjaInput = elements.prowizja.value.replace(",", ".").replace(/\s/g, "");
    const prowizja = parseFloat(prowizjaInput) || 0;
    const jednostka = elements.jednostkaProwizji.value;
    const kwotaInput = elements.kwota.value.replace(",", ".").replace(/\s/g, "");
    const kwota = parseFloat(kwotaInput) || 0;
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
    const maxCykl = parseInt(elements.iloscRat.value) || 360;
    const maxChanges = Math.floor(maxCykl / 12) || 1;
    const isZmienneOprocentowanie = elements.zmienneOprocentowanieBtn?.checked;
    const isNadplataKredytu = elements.nadplataKredytuBtn?.checked;
    const variableOprocentowanieInputs = document.getElementById("variableOprocentowanieInputs");
    const nadplataKredytuInputs = document.getElementById("nadplataKredytuInputs");
    const addVariableOprocentowanieBtn = elements.addVariableOprocentowanieBtn;
    const addNadplataKredytuBtn = elements.addNadplataKredytuBtn;
    const variableOprocentowanieWrapper = document.getElementById("variableOprocentowanieInputsWrapper");
    const nadplataKredytuWrapper = document.getElementById("nadplataKredytuInputsWrapper");

    if (isZmienneOprocentowanie && variableOprocentowanieInputs && addVariableOprocentowanieBtn && variableOprocentowanieWrapper) {
        variableOprocentowanieInputs.classList.add("active");
        addVariableOprocentowanieBtn.style.display = "block";
        if (state.variableRates.length === 0) {
            state.variableRates.push({ value: state.lastFormData.oprocentowanie, period: 2 });
        }
        renderVariableInputs(variableOprocentowanieWrapper, state.variableRates, maxCykl, maxChanges, addVariableOprocentowanieBtn, "oprocentowanie");
    } else {
        if (variableOprocentowanieInputs) variableOprocentowanieInputs.classList.remove("active");
        if (addVariableOprocentowanieBtn) addVariableOprocentowanieBtn.style.display = "none";
        if (variableOprocentowanieWrapper) variableOprocentowanieWrapper.innerHTML = "";
        if (!isZmienneOprocentowanie) {
            state.variableRates = [];
        }
    }

    if (isNadplataKredytu && nadplataKredytuInputs && addNadplataKredytuBtn && nadplataKredytuWrapper) {
        nadplataKredytuInputs.classList.add("active");
        addNadplataKredytuBtn.style.display = "block";
        if (state.overpaymentRates.length === 0) {
            state.overpaymentRates = [{ value: 1000, period: 1, type: "Jednorazowa", effect: "Skróć okres" }];
        }
        renderVariableInputs(nadplataKredytuWrapper, state.overpaymentRates, maxCykl, maxChanges, addNadplataKredytuBtn, "nadplata");
    } else {
        if (nadplataKredytuInputs) nadplataKredytuInputs.classList.remove("active");
        if (addNadplataKredytuBtn) addNadplataKredytuBtn.style.display = "none";
        if (nadplataKredytuWrapper) nadplataKredytuWrapper.innerHTML = "";
        if (!isNadplataKredytu) {
            state.overpaymentRates = [];
        }
    }
}

function renderVariableInputs(wrapper, changes, maxCykl, maxChanges, addBtn, type) {
    if (!wrapper) return;

    wrapper.innerHTML = "";

    const minPeriods = [];
    changes.forEach((change, index) => {
        if (index === 0) {
            minPeriods[index] = type === "nadplata" ? 1 : 2;
        } else {
            minPeriods[index] = changes[index - 1].period + 1;
        }
    });

    changes.forEach((change, index) => {
        const inputGroup = document.createElement("div");
        inputGroup.className = "variable-input-group";
        inputGroup.setAttribute("data-type", type);

        const fieldsWrapper = document.createElement("div");
        fieldsWrapper.className = "fields-wrapper";

        const minPeriod = minPeriods[index];
        const maxPeriodValue = type === "nadplata" ? maxCykl - 1 : maxCykl;
        let periodValue = change.period;

        if (periodValue < minPeriod) {
            periodValue = minPeriod;
            changes[index].period = periodValue;
        }
        if (periodValue > maxPeriodValue) {
            periodValue = maxPeriodValue;
            changes[index].period = periodValue;
        }

        let inputHTML = "";
        if (type === "nadplata") {
            const nadplataTypeGroup = `
                <div class="form-group">
                    <label class="form-label">Nadpłata</label>
                    <select class="form-select nadplata-type-select">
                        <option value="Jednorazowa" ${change.type === "Jednorazowa" ? "selected" : ""}>Jednorazowa</option>
                        <option value="Miesięczna" ${change.type === "Miesięczna" ? "selected" : ""}>Miesięczna</option>
                        <option value="Kwartalna" ${change.type === "Kwartalna" ? "selected" : ""}>Kwartalna</option>
                        <option value="Roczna" ${change.type === "Roczna" ? "selected" : ""}>Roczna</option>
                    </select>
                </div>
            `;

            const nadplataEffectGroup = `
                <div class="form-group">
                    <label class="form-label">Po nadpłacie</label>
                    <select class="form-select nadplata-effect-select">
                        <option value="Skróć okres" ${change.effect === "Skróć okres" ? "selected" : ""}>Skróć okres</option>
                        <option value="Zmniejsz ratę" ${change.effect === "Zmniejsz ratę" ? "selected" : ""}>Zmniejsz ratę</option>
                    </select>
                </div>
            `;

            const isJednorazowa = change.type === "Jednorazowa";
            const cyklLabel = isJednorazowa ? "W" : "Od";
            const cyklUnit = isJednorazowa ? "miesiącu" : "miesiąca";
            const cyklGroup = `
                <div class="form-group">
                    <label class="form-label">${cyklLabel}</label>
                    <div class="input-group">
                        <input type="number" class="form-control variable-cykl" min="${minPeriod}" max="${maxPeriodValue}" step="1" value="${periodValue}">
                        <span class="input-group-text unit-miesiacu">${cyklUnit}</span>
                    </div>
                    <input type="range" class="form-range variable-cykl-range" min="${minPeriod}" max="${maxPeriodValue}" step="1" value="${periodValue}">
                </div>
            `;

            const inputValue = change.value || 1000;
            const formattedInputValue = formatNumberWithSpaces(inputValue);
            const rateGroup = `
                <div class="form-group">
                    <label class="form-label">Kwota</label>
                    <div class="input-group">
                        <input type="text" class="form-control variable-rate" min="0" max="1000000" step="100" value="${formattedInputValue}">
                        <span class="input-group-text unit-zl">zł</span>
                    </div>
                    <input type="range" class="form-range variable-rate-range" min="0" max="1000000" step="100" value="${inputValue}">
                </div>
            `;

            inputHTML = nadplataTypeGroup + nadplataEffectGroup + cyklGroup + rateGroup;
        } else {
            const cyklGroup = `
                <div class="form-group">
                    <label class="form-label">Od</label>
                    <div class="input-group">
                        <input type="number" class="form-control variable-cykl" min="${minPeriod}" max="${maxPeriodValue}" step="1" value="${periodValue}">
                        <span class="input-group-text">miesiąca</span>
                    </div>
                    <input type="range" class="form-range variable-cykl-range" min="${minPeriod}" max="${maxPeriodValue}" step="1" value="${periodValue}">
                </div>
            `;

            const inputValue = change.value || state.lastFormData.oprocentowanie;
            const formattedInputValue = formatNumberWithSpaces(inputValue);
            const rateGroup = `
                <div class="form-group">
                    <label class="form-label">Oprocentowanie</label>
                    <div class="input-group">
                        <input type="text" class="form-control variable-rate" min="0.1" max="25" step="0.01" value="${formattedInputValue}">
                        <span class="input-group-text">%</span>
                    </div>
                    <input type="range" class="form-range variable-rate-range" min="0.1" max="25" step="0.01" value="${inputValue}">
                </div>
            `;

            inputHTML = cyklGroup + rateGroup;
        }

        fieldsWrapper.innerHTML = inputHTML;
        inputGroup.appendChild(fieldsWrapper);

        if (index === 0 && changes.length === 1) {
            const removeFirstBtnWrapper = document.createElement("div");
            removeFirstBtnWrapper.className = "remove-first-btn-wrapper";
            const removeFirstBtn = document.createElement("button");
            removeFirstBtn.className = "btn btn-danger btn-sm remove-first-btn";
            removeFirstBtn.textContent = "Usuń";
            removeFirstBtn.onclick = () => {
                if (type === "oprocentowanie") {
                    state.variableRates = [];
                    elements.zmienneOprocentowanieBtn.checked = false;
                    state.lastFormData.zmienneOprocentowanie = false;
                } else {
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
                if (type === "oprocentowanie") {
                    removeVariableChange(index, state.variableRates);
                } else {
                    removeVariableChange(index, state.overpaymentRates);
                }
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
            defaultValue: periodValue,
            onChange: (value) => {
                const newValue = parseInt(value);
                changes[index].period = newValue;
                changes.sort((a, b) => a.period - b.period);
                const newIndex = changes.findIndex((change) => change.period === newValue);
                if (newValue >= maxPeriodValue) {
                    changes.splice(newIndex + 1);
                } else {
                    for (let i = newIndex + 1; i < changes.length; i++) {
                        if (changes[i].period <= changes[i - 1].period) {
                            changes[i].period = changes[i - 1].period + 1;
                            if (changes[i].period > maxPeriodValue) {
                                changes.splice(i);
                                break;
                            }
                        }
                    }
                }
                updateVariableInputs();
            },
        });

        syncInputWithRange(rateInput, rateRange, {
            isDecimal: true,
            defaultValue: type === "nadplata" ? (change.value || 1000) : (change.value || state.lastFormData.oprocentowanie),
            onChange: (value) => {
                changes[index].value = value;
            },
        });

        if (type === "nadplata") {
            const nadplataTypeSelect = inputGroup.querySelector(".nadplata-type-select");
            if (nadplataTypeSelect) {
                nadplataTypeSelect.addEventListener("change", (e) => {
                    changes[index].type = nadplataTypeSelect.value;
                    const isJednorazowa = nadplataTypeSelect.value === "Jednorazowa";
                    const currentInputGroup = e.target.closest(".variable-input-group");
                    const cyklGroup = currentInputGroup.querySelector(".form-group:has(.variable-cykl)");
                    const label = cyklGroup?.querySelector(".form-label");
                    const unit = cyklGroup?.querySelector(".unit-miesiacu");
                    if (label && unit) {
                        label.textContent = isJednorazowa ? "W" : "Od";
                        unit.textContent = isJednorazowa ? "miesiącu" : "miesiąca";
                    }
                });
            }

            const nadplataEffectSelect = inputGroup.querySelector(".nadplata-effect-select");
            if (nadplataEffectSelect) {
                nadplataEffectSelect.addEventListener("change", () => {
                    changes[index].effect = nadplataEffectSelect.value;
                });
            }
        }
    });

    addBtn.textContent = type === "nadplata" ? "Dodaj kolejną nadpłatę" : "Dodaj kolejną zmianę";
    const lastPeriod = changes.length > 0 ? changes[changes.length - 1].period : 0;
    const canAddMore = changes.length < maxChanges && lastPeriod < (type === "nadplata" ? maxCykl - 1 : maxCykl);
    addBtn.style.display = canAddMore ? "block" : "none";
}

function addVariableChange(type) {
    const maxCykl = parseInt(elements.iloscRat.value) || 360;
    const maxChanges = Math.floor(maxCykl / 12) || 1;
    const changes = type === "oprocentowanie" ? state.variableRates : state.overpaymentRates;
    const addBtn = type === "oprocentowanie" ? elements.addVariableOprocentowanieBtn : elements.addNadplataKredytuBtn;

    const lastPeriod = changes.length > 0 ? changes[changes.length - 1].period : (type === "nadplata" ? 0 : 1);
    const canAddMore = changes.length < maxChanges && lastPeriod < (type === "nadplata" ? maxCykl - 1 : maxCykl);

    if (!canAddMore) {
        if (changes.length >= maxChanges) {
            alert(`Osiągnięto maksymalną liczbę zmian (${maxChanges}).`);
        } else if (lastPeriod >= (type === "nadplata" ? maxCykl - 1 : maxCykl)) {
            alert(`Nie można dodać więcej zmian, ponieważ ostatnia zmiana osiągnęła maksymalny okres (${type === "nadplata" ? maxCykl - 1 : maxCykl} miesięcy).`);
        }
        addBtn.style.display = "none";
        return;
    }

    const newPeriod = lastPeriod + 1;
    if (newPeriod > (type === "nadplata" ? maxCykl - 1 : maxCykl)) {
        alert(`Nie można dodać więcej zmian, ponieważ ostatnia zmiana osiągnęła maksymalny okres (${type === "nadplata" ? maxCykl - 1 : maxCykl} miesięcy).`);
        addBtn.style.display = "none";
        return;
    }

    if (type === "oprocentowanie") {
        state.variableRates.push({ period: newPeriod, value: state.lastFormData.oprocentowanie });
    } else {
        state.overpaymentRates.push({ period: newPeriod, value: 1000, type: "Jednorazowa", effect: "Skróć okres" });
    }
    updateVariableInputs();
}

function removeVariableChange(index, changes) {
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
        if (elements.toggleDarkModeBtn) elements.toggleDarkModeBtn.textContent = "☀️";
    } else {
        document.body.classList.add("light-mode");
        if (elements.toggleDarkModeBtn) elements.toggleDarkModeBtn.textContent = "🌙";
    }
}

if (elements.jednostkaProwizji) {
    elements.jednostkaProwizji.addEventListener("change", () => {
        updateProwizjaInput();
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

function initializeApp() {
    updateProwizjaInput();
    updateKwotaInfo();
    updateLata();
    updateProwizjaInfo();
    updateRodzajRatInfo();
    updateVariableInputs();
    initializeTheme();
}

document.addEventListener("DOMContentLoaded", initializeApp);
