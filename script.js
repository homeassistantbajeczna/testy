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

// Debug: Sprawdzanie, czy elementy istnieją
Object.entries(elements).forEach(([key, value]) => {
    if (!value) {
        console.warn(`Element ${key} (#${key}) nie został znaleziony w DOM.`);
    } else {
        console.log(`Element ${key} (#${key}) znaleziony.`);
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

// Funkcja formatująca liczby z separatorem tysięcy (spacja) i przecinkiem dziesiętnym tylko dla wartości niecałkowitych
function formatNumberWithSpaces(number) {
    if (isNaN(number)) return "0";
    const isInteger = Number.isInteger(number);
    const formattedNumber = isInteger ? number.toString() : number.toFixed(2);
    const parts = formattedNumber.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return isInteger ? parts[0] : parts.join(",");
}

// Synchronizacja inputów z suwakami
function syncInputWithRange(input, range, options = {}) {
    const { isDecimal = false, onChange, isVariableCykl = false, index, activeType } = options;

    if (!input || !range) {
        console.error(`Input or range not found: input=${input?.id}, range=${range?.id}`);
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
        let parsedValue = parseFloat(value);
        if (isNaN(parsedValue)) parsedValue = 0; // Zmieniamy domyślną wartość na 0 zamiast min

        // Usuwamy wymuszanie minimalnej wartości podczas wpisywania
        if (parsedValue < min && source === "Input" && !applyMinValidation) {
            // Pozwalamy na wpisywanie wartości mniejszych niż min, ale walidujemy dopiero przy zatwierdzeniu
        } else if (parsedValue < min) {
            parsedValue = min;
        }
        if (parsedValue > max) {
            parsedValue = max;
        }

        // Dla nadpłaty stosujemy dodatkową walidację minimalnej wartości 100, ale tylko jeśli wartość jest mniejsza
        if (applyMinValidation && input.classList.contains("variable-rate") && activeType === "nadplata" && parsedValue < 100) {
            parsedValue = 100;
        }

        // Formatowanie wartości: pokazujemy miejsca po przecinku tylko dla wartości niecałkowitych
        const isInteger = Number.isInteger(parsedValue);
        if (input.id === "oprocentowanie" || (activeType === "oprocentowanie" && input.classList.contains("variable-rate"))) {
            input.value = isInteger ? parsedValue.toString() : parsedValue.toFixed(2);
        } else if (input.id === "kwota" || input.id === "prowizja") {
            input.value = isInteger ? parsedValue.toString() : parsedValue.toFixed(2);
        } else {
            input.value = isDecimal ? (isInteger ? parsedValue.toString() : parsedValue.toFixed(step === 1 ? 0 : 2)) : parsedValue;
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
    let initialValue = parseFloat(range.value);
    if (isNaN(initialValue)) initialValue = min;

    if (initialValue < min) {
        initialValue = min;
    }
    if (initialValue > max) {
        initialValue = max;
    }

    if (activeType === "nadplata" && input.classList.contains("variable-rate") && initialValue < 100) {
        initialValue = 100;
    }

    const isInteger = Number.isInteger(initialValue);
    if (input.id === "oprocentowanie" || (activeType === "oprocentowanie" && input.classList.contains("variable-rate"))) {
        input.value = isInteger ? initialValue.toString() : initialValue.toFixed(2);
    } else if (input.id === "kwota" || input.id === "prowizja") {
        input.value = isInteger ? initialValue.toString() : initialValue.toFixed(2);
    } else {
        input.value = isDecimal ? (isInteger ? initialValue.toString() : initialValue.toFixed(step === 1 ? 0 : 2)) : initialValue;
    }
    range.value = initialValue;
    console.log(`Initial sync: ${input.id || range.className} = ${initialValue}`);
}

syncInputWithRange(elements.kwota, elements.kwotaRange, {
    isDecimal: true, // Zmieniamy na true, aby umożliwić wartości dziesiętne
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
    console.log("calculateLoan started");

    // Debug: Sprawdzenie wartości select przed pobraniem
    console.log("Before getting rodzajRat:", elements.rodzajRat);
    console.log("rodzajRat value before calculation:", elements.rodzajRat.value);

    // Pobieranie danych z formularza
    const kwota = parseFloat(elements.kwota.value) || 0;
    let iloscRat = parseInt(elements.iloscRat.value) || 0;
    let oprocentowanie = parseFloat(elements.oprocentowanie.value) || 0;
    const rodzajRat = elements.rodzajRat.value || "rowne";
    const prowizja = parseFloat(elements.prowizja.value) || 0;
    const jednostkaProwizji = elements.jednostkaProwizji.value || "procent";

    console.log("Input values:", { kwota, iloscRat, oprocentowanie, rodzajRat, prowizja, jednostkaProwizji });

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
    console.log("Form data saved:", state.lastFormData);

    // Pobieranie zmiennych stóp oprocentowania
    if (elements.zmienneOprocentowanieBtn.checked) {
        const inputs = document.querySelectorAll('.variable-input-group[data-type="oprocentowanie"]');
        state.variableRates = [];
        inputs.forEach((inputGroup) => {
            const cyklInput = inputGroup.querySelector(".variable-cykl");
            const rateInput = inputGroup.querySelector(".variable-rate");
            const period = parseInt(cyklInput.value) || 0;
            const value = parseFloat(rateInput.value) || 0;
            if (period > 0 && value >= 0) {
                state.variableRates.push({ period, value });
            }
        });
        state.variableRates.sort((a, b) => a.period - b.period);
        console.log("Variable rates:", state.variableRates);
    } else {
        state.variableRates = [];
        console.log("Variable rates disabled.");
    }

    // Pobieranie nadpłat
    if (elements.nadplataKredytuBtn.checked) {
        const inputs = document.querySelectorAll('.variable-input-group[data-type="nadplata"]');
        state.overpaymentRates = [];
        inputs.forEach((inputGroup) => {
            const cyklInput = inputGroup.querySelector(".variable-cykl");
            const rateInput = inputGroup.querySelector(".variable-rate");
            const typeSelect = inputGroup.querySelector(".nadplata-type-select");
            const effectSelect = inputGroup.querySelector(".nadplata-effect-select");
            const period = parseInt(cyklInput.value) || 0;
            const value = parseFloat(rateInput.value) || 0;
            const type = typeSelect.value || "Jednorazowa";
            const effect = effectSelect.value || "Skróć okres";
            if (period > 0 && value >= 0) {
                state.overpaymentRates.push({ period, value, type, effect });
            }
        });
        state.overpaymentRates.sort((a, b) => a.period - b.period);
        console.log("Overpayment rates:", state.overpaymentRates);
    } else {
        state.overpaymentRates = [];
        console.log("Overpayment rates disabled.");
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

    // Zmienna do przechowywania raty z poprzedniego miesiąca
    let previousRata = 0;

    // Początkowe obliczenie raty dla rat równych
    if (rodzajRat === "rowne") {
        if (monthlyRate === 0) {
            rata = kwota / iloscRat;
        } else {
            rata = (kwota * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -iloscRat));
        }
        if (isNaN(rata) || rata <= 0) {
            console.error("Invalid rata calculation (równe):", { kwota, monthlyRate, iloscRat, rata });
            alert("Błąd w obliczeniach raty. Sprawdź dane wejściowe.");
            return;
        }
        console.log("Initial rata (równe):", rata);
    }

    // Dla rat malejących
    if (rodzajRat === "malejace") {
        // Dla rat malejących obliczamy stałą część kapitałową
        let kapitalStaly = kwota / iloscRat;
        console.log("Initial kapitalStaly (malejące):", kapitalStaly);

        // Sprawdzenie, czy nadpłata typu "Zmniejsz ratę" jest aktywna
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
            console.log("Adjusted kapitalStaly after nadplata (malejące):", kapitalStaly);
        }

        // Pętla dla rat malejących
        let i = 1;
        let lastRateChangeMonth = 0;
        while (i <= iloscRat && pozostalyKapital > 0.01) {
            // Obsługa zmiennych stóp procentowych
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

            // Obliczenia dla rat malejących
            let odsetki = pozostalyKapital * monthlyRate;
            let kapital = kapitalStaly;
            let nadplata = 0;
            let isOverpaymentMonth = false;

            // Obsługa nadpłaty
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
                        // "Zmniejsz ratę" - zmniejszamy kapitał, ale rata pozostaje taka sama w tym miesiącu
                        pozostalyKapital -= nadplata;
                    }
                    if (pozostalyKapital < 0) pozostalyKapital = 0;
                    console.log(`After overpayment at month ${i}: nadplata=${nadplata}, pozostalyKapital=${pozostalyKapital}`);
                }
            });

            if (kapital > pozostalyKapital) {
                kapital = pozostalyKapital;
            }

            // Ustawiamy ratę
            if (isOverpaymentMonth && i > 1) {
                // W miesiącu nadpłaty używamy raty z poprzedniego miesiąca
                rata = previousRata;
            } else {
                // Obliczamy normalnie ratę
                rata = kapital + odsetki;
                if (isNaN(rata) || rata <= 0) {
                    console.error("Invalid rate calculation (malejące):", { kapital, odsetki, rata });
                    rata = 0;
                }
            }

            // Recalculate kapital based on the fixed rata and odsetki
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
                oprocentowanie: (monthlyRate * 12 * 100).toFixed(2), // Dodajemy oprocentowanie do harmonogramu
            });

            // Zapisujemy ratę jako poprzednią dla następnego miesiąca
            previousRata = rata;

            if (pozostalyKapital <= 0.01) {
                iloscRatPoNadplacie = i;
                break;
            }

            i++;
        }
    }

    // Dla rat równych
    if (rodzajRat === "rowne") {
        let remainingMonths = iloscRat;
        let i = 1;
        let lastRateChangeMonth = 0;
        while (i <= iloscRat && pozostalyKapital > 0.01) {
            // Obsługa zmiennych stóp procentowych
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
                console.log(`Rata recalculated after rate change at month ${i} (równe):`, rata);
            }

            let odsetki = pozostalyKapital * monthlyRate;
            let kapital = rata - odsetki;
            let nadplata = 0;
            let isOverpaymentMonth = false;

            if (kapital < 0) {
                kapital = pozostalyKapital;
                odsetki = rata - kapital;
            }

            // Obsługa nadpłaty
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
                    } else {
                        // "Zmniejsz ratę" - w miesiącu nadpłaty rata pozostaje taka sama
                        // Po prostu zmniejszamy kapitał
                    }
                    console.log(`After overpayment at month ${i}: nadplata=${nadplata}, pozostalyKapital=${pozostalyKapital}, remainingMonths=${remainingMonths}, rata=${rata}`);
                }
            });

            if (isOverpaymentMonth && i > 1) {
                // W miesiącu nadpłaty używamy raty z poprzedniego miesiąca
                rata = previousRata;
                // Recalculate kapital based on the fixed rata and odsetki
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
                    oprocentowanie: (monthlyRate * 12 * 100).toFixed(2), // Dodajemy oprocentowanie do harmonogramu
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
                oprocentowanie: (monthlyRate * 12 * 100).toFixed(2), // Dodajemy oprocentowanie do harmonogramu
            });

            // Zapisujemy ratę jako poprzednią dla następnego miesiąca
            previousRata = rata;

            i++;
            remainingMonths--;
            if (remainingMonths <= 0 && pozostalyKapital > 0) {
                remainingMonths = calculateRemainingMonths(pozostalyKapital, rata, monthlyRate);
                iloscRatPoNadplacie = i + remainingMonths - 1;
                console.log(`Recalculated remaining months at month ${i}: remainingMonths=${remainingMonths}, iloscRatPoNadplacie=${iloscRatPoNadplacie}`);
            }
        }
    }

    console.log("Final harmonogram:", harmonogram);
    displayResults(harmonogram, sumaOdsetek, sumaKapitalu, prowizjaKwota, sumaNadplat, iloscRatPoNadplacie);
}

// Funkcja pomocnicza do obliczania pozostałych miesięcy dla rat równych
function calculateRemainingMonths(pozostalyKapital, rata, monthlyRate) {
    if (monthlyRate === 0 || rata <= 0 || pozostalyKapital <= 0) return 0;
    const n = Math.log(rata / (rata - pozostalyKapital * monthlyRate)) / Math.log(1 + monthlyRate);
    return Math.ceil(n);
}

// Wyświetlanie wyników
function displayResults(harmonogram, sumaOdsetek, sumaKapitalu, prowizjaKwota, sumaNadplat, iloscRat) {
    console.log("displayResults started", { sumaOdsetek, sumaKapitalu, prowizjaKwota, sumaNadplat, iloscRat });

    if (!elements.formSection || !elements.resultSection) {
        console.error("Form or result section not found.");
        return;
    }

    elements.formSection.style.display = "none";
    elements.resultSection.style.display = "block";
    console.log("resultSection display set to block");

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
                <td>${row.oprocentowanie}%</td> <!-- Dodajemy kolumnę Oproc. -->
                <td>${formatNumberWithSpaces(parseFloat(row.nadplata))} zł</td>
                <td>${formatNumberWithSpaces(parseFloat(row.kapital))} zł</td>
                <td>${formatNumberWithSpaces(parseFloat(row.odsetki))} zł</td>
                <td>${formatNumberWithSpaces(parseFloat(row.pozostalyKapital))} zł</td>
            </tr>
        `;
    });
    if (elements.harmonogramContainer) {
        elements.harmonogramContainer.innerHTML = harmonogramHTML;
        console.log("Harmonogram HTML updated:", elements.harmonogramContainer.innerHTML);
    } else {
        console.error("Harmonogram container not found.");
    }

    if (elements.chartContainer) {
        const ctx = elements.chartContainer.getContext("2d");
        if (!ctx) {
            console.error("Chart context not available.");
            return;
        }
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
            console.log("Chart created successfully.");
        } catch (error) {
            console.error("Error creating chart:", error);
        }
    } else {
        console.error("Chart container not found.");
    }
}

function showForm() {
    console.log("showForm called");
    if (elements.formSection && elements.resultSection) {
        elements.formSection.style.display = "block";
        elements.resultSection.style.display = "none";
    }
}

function updateProwizjaInput() {
    console.log("updateProwizjaInput called");
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
    console.log("updateKwotaInfo called");
    const kwota = parseFloat(elements.kwota.value) || 500000;
    const kwotaInfo = document.getElementById("kwotaInfo");
    if (kwotaInfo) {
        kwotaInfo.textContent = `Kwota kredytu: ${formatNumberWithSpaces(kwota)} zł`;
    }
}

function updateLata() {
    console.log("updateLata called");
    const miesiace = parseInt(elements.iloscRat.value) || 0;
    const lata = Math.floor(miesiace / 12);
    const lataElement = document.getElementById("lata");
    if (lataElement) {
        lataElement.textContent = `Ilość lat: ${miesiace >= 12 ? lata : 0}`;
    }
}

function updateProwizjaInfo() {
    console.log("updateProwizjaInfo called");
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
    console.log("updateRodzajRatInfo called");
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
            state.overpaymentRates = [{ value: 1000, period: 2, type: "Jednorazowa", effect: "Skróć okres" }];
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

    if (!wrapper) {
        console.error("Wrapper not found for rendering variable inputs.");
        return;
    }

    const existingInputs = wrapper.querySelectorAll(".variable-input-group");
    const existingValues = [];
    const existingPeriods = [];
    existingInputs.forEach((inputGroup, index) => {
        const rateInput = inputGroup.querySelector(".variable-rate");
        const cyklInput = inputGroup.querySelector(".variable-cykl");
        const value = rateInput ? parseFloat(rateInput.value) : (changes[index]?.value || (activeType === "nadplata" ? 1000 : state.lastFormData.oprocentowanie));
        const period = cyklInput ? parseInt(cyklInput.value) : (changes[index]?.period || 2);
        existingValues[index] = value;
        existingPeriods[index] = period;
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

            const nadplataEffectGroup = document.createElement("div");
            nadplataEffectGroup.className = "form-group";
            nadplataEffectGroup.innerHTML = `
                <label class="form-label">Po nadpłacie</label>
                <select class="form-select nadplata-effect-select">
                    <option value="Skróć okres" ${change.effect === "Skróć okres" ? "selected" : ""}>Skróć okres</option>
                    <option value="Zmniejsz ratę" ${change.effect === "Zmniejsz ratę" ? "selected" : ""}>Zmniejsz ratę</option>
                </select>
            `;

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

            const inputValue = existingValues[index] !== undefined ? existingValues[index] : (change.value || 1000);
            const rateGroup = document.createElement("div");
            rateGroup.className = "form-group";
            rateGroup.innerHTML = `
                <label class="form-label">Kwota</label>
                <div class="input-group">
                    <input type="number" class="form-control variable-rate" min="0" max="1000000" step="1" value="${inputValue}">
                    <span class="input-group-text unit-zl">zł</span>
                </div>
                <input type="range" class="form-range variable-rate-range" min="0" max="1000000" step="1" value="${inputValue}">
            `;

            const rateInput = rateGroup.querySelector(".variable-rate");
            const rateRange = rateGroup.querySelector(".variable-rate-range");
            syncInputWithRange(rateInput, rateRange, { isDecimal: false, activeType: "nadplata" });

            fieldsWrapper.appendChild(nadplataTypeGroup);
            fieldsWrapper.appendChild(nadplataEffectGroup);
            fieldsWrapper.appendChild(cyklGroup);
            fieldsWrapper.appendChild(rateGroup);
        } else {
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

            const inputValue = existingValues[index] !== undefined ? existingValues[index] : (change.value || state.lastFormData.oprocentowanie);
            const rateGroup = document.createElement("div");
            rateGroup.className = "form-group";
            rateGroup.innerHTML = `
                <label class="form-label">Oprocentowanie</label>
                <div class="input-group">
                    <input type="number" class="form-control variable-rate" min="0.1" max="25" step="0.01" value="${inputValue.toFixed(2)}">
                    <span class="input-group-text">%</span>
                </div>
                <input type="range" class="form-range variable-rate-range" min="0.1" max="25" step="0.01" value="${inputValue}">
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

        syncInputWithRange(cyklInput, cyklRange, {
            isDecimal: false,
            isVariableCykl: true,
            activeType,
            onChange: (value) => {
                changes[index].period = value;
                updateVariableInputs();
            },
        });

        if (activeType === "oprocentowanie") {
            syncInputWithRange(rateInput, rateRange, {
                isDecimal: true,
                activeType,
                index,
                onChange: (value) => {
                    changes[index].value = value;
                },
            });
        }

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
    });

    addBtn.textContent = activeType === "nadplata" ? "Dodaj kolejną nadpłatę" : "Dodaj kolejną zmianę";
    const lastChange = changes.length > 0 ? changes[changes.length - 1] : null;
    const isMaxPeriodReached = lastChange && lastChange.period >= maxCykl;
    addBtn.style.display = changes.length < maxChanges && !isMaxPeriodReached ? "block" : "none";
}

function addVariableChange(activeType) {
    console.log(`addVariableChange called for ${activeType}`);
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
    updateVariableInputs();
}

function removeVariableChange(index, activeType) {
    console.log(`removeVariableChange called for ${activeType}, index=${index}`);
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
    console.log("updateZoom called");
    const container = document.querySelector(".container");
    if (!container) return;
    container.style.transform = `scale(${currentZoom})`;
    container.style.transformOrigin = "top center";
}

function toggleDarkMode() {
    console.log("toggleDarkMode called");
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
    console.log("initializeTheme called");
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
        if (elements.toggleDarkModeBtn) elements.toggleDarkModeBtn.textContent = "☀️";
    } else {
        document.body.classList.add("light-mode");
        if (elements.toggleDarkModeBtn) elements.toggleDarkModeBtn.textContent = "🌙";
    }
}

// Inicjalizacja listenerów
if (elements.jednostkaProwizji) {
    elements.jednostkaProwizji.addEventListener("change", () => {
        updateProwizjaInput();
        updateProwizjaInfo();
    });
}

if (elements.rodzajRat) {
    elements.rodzajRat.addEventListener("change", () => {
        state.lastFormData.rodzajRat = elements.rodzajRat.value;
        console.log("Rodzaj rat changed to:", elements.rodzajRat.value);
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
            state.overpaymentRates = [{ value: 1000, period: 2, type: "Jednorazowa", effect: "Skróć okres" }];
        }
        updateVariableInputs();
    });
}

if (elements.addVariableOprocentowanieBtn) {
    elements.addVariableOprocentowanieBtn.addEventListener("click", () => {
        addVariableChange("oprocentowanie");
    });
}

if (elements.addNadplataKredytuBtn) {
    elements.addNadplataKredytuBtn.addEventListener("click", () => {
        addVariableChange("nadplata");
    });
}

if (elements.obliczBtn) {
    elements.obliczBtn.addEventListener("click", () => {
        // Debug: Sprawdzenie wartości select przed obliczeniami
        console.log("Oblicz button clicked, rodzajRat value:", elements.rodzajRat.value);
        calculateLoan();
    });
}

if (elements.zoomInBtn) {
    elements.zoomInBtn.addEventListener("click", () => {
        if (currentZoom < maxZoom) {
            currentZoom = Math.min(maxZoom, currentZoom + zoomStep);
            updateZoom();
        }
    });
}

if (elements.zoomOutBtn) {
    elements.zoomOutBtn.addEventListener("click", () => {
        if (currentZoom > minZoom) {
            currentZoom = Math.max(minZoom, currentZoom - zoomStep);
            updateZoom();
        }
    });
}

if (elements.toggleDarkModeBtn) {
    elements.toggleDarkModeBtn.addEventListener("click", () => {
        toggleDarkMode();
    });
}

if (elements.generatePdfBtn) {
    elements.generatePdfBtn.addEventListener("click", () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.text("Harmonogram spłaty kredytu", 10, 10);
        doc.autoTable({
            html: "#harmonogramContent table",
            startY: 20,
            styles: { fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 20 }, // Miesiąc
                1: { cellWidth: 30 }, // Rata
                2: { cellWidth: 20 }, // Oproc.
                3: { cellWidth: 30 }, // Nadpłata
                4: { cellWidth: 30 }, // Kapitał
                5: { cellWidth: 30 }, // Odsetki
                6: { cellWidth: 30 }, // Kapitał do spłaty
            },
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
elements.oprocentowanie.step = "0.01";
elements.oprocentowanieRange.step = "0.01";
updateProwizjaInput();
updateKwotaInfo();
updateLata();
updateProwizjaInfo();
updateRodzajRatInfo();
updateVariableInputs();
initializeTheme();
