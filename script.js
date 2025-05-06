const APP_TITLE = "Kalkulator Kredytu Hipotecznego";

const elements = {
    formSection: document.getElementById("formSection"),
    resultSection: document.getElementById("resultSection"),
    kwota: document.getElementById("kwota"),
    kwotaRange: document.getElementById("kwotaRange"),
    kwotaInfo: document.getElementById("kwotaInfo"),
    iloscRat: document.getElementById("iloscRat"),
    iloscRatRange: document.getElementById("iloscRatRange"),
    lata: document.getElementById("lata"),
    oprocentowanie: document.getElementById("oprocentowanie"),
    oprocentowanieRange: document.getElementById("oprocentowanieRange"),
    rodzajRat: document.getElementById("rodzajRat"),
    prowizja: document.getElementById("prowizja"),
    prowizjaRange: document.getElementById("prowizjaRange"),
    prowizjaInfo: document.getElementById("prowizjaInfo"),
    jednostkaProwizji: document.getElementById("jednostkaProwizji"),
    nadplataKredytuBtn: document.getElementById("nadplataKredytuBtn"),
    nadplataKredytuInputs: document.getElementById("nadplataKredytuInputs"),
    nadplataKredytuWrapper: document.getElementById("nadplataKredytuWrapper"),
    zmienneOprocentowanieBtn: document.getElementById("zmienneOprocentowanieBtn"),
    variableOprocentowanieInputs: document.getElementById("variableOprocentowanieInputs"),
    variableOprocentowanieWrapper: document.getElementById("variableOprocentowanieWrapper"),
    obliczBtn: document.getElementById("obliczBtn"),
    generatePdfBtn: document.getElementById("generatePdfBtn"),
    harmonogramTabela: document.getElementById("harmonogramTabela"),
    valueKapital: document.getElementById("valueKapital"),
    valueOdsetki: document.getElementById("valueOdsetki"),
    valueNadplata: document.getElementById("valueNadplata"),
    valueProwizja: document.getElementById("valueProwizja"),
    okresPoNadplacie: document.getElementById("okresPoNadplacie"),
    koszt: document.getElementById("koszt"),
    zoomInBtn: document.getElementById("zoomInBtn"),
    zoomOutBtn: document.getElementById("zoomOutBtn"),
    toggleDarkModeBtn: document.getElementById("toggleDarkModeBtn"),
};

const state = {
    lastFormData: {
        kwota: 500000,
        iloscRat: 360,
        oprocentowanie: 7,
        rodzajRat: "rowne",
        prowizja: 2,
        jednostkaProwizji: "procent",
    },
    variableRates: [],
    overpaymentRates: [],
    zoomLevel: 1,
    isDarkMode: false,
    isUpdating: false,
};

let creditChart = null;













// F U N K C J E    O G Ó L N E

function syncInputWithRange(input, range, onChange = null) {
    let value;
    if (input.id === "iloscRat" || input.classList.contains("variable-cykl")) {
        value = parseInt(input.value) || parseInt(range.value);
        value = Math.max(parseInt(input.min) || 0, Math.min(parseInt(input.max) || Infinity, value));
        input.value = value;
    } else {
        value = parseFloat(input.value) || parseFloat(range.value);
        value = Math.max(parseFloat(input.min) || 0, Math.min(parseFloat(input.max) || Infinity, value));
        input.value = value.toFixed(2);
    }
    range.value = value;
    if (onChange) onChange(value);
}

function updateKwotaInfo() {
    const kwota = parseFloat(elements.kwota.value) || 0;
    elements.kwotaInfo.textContent = `Kwota kredytu: ${kwota.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł`;
    updateProwizjaInfo();
}

function updateLata() {
    const iloscRat = parseInt(elements.iloscRat.value) || 0;
    elements.lata.textContent = `Okres spłaty: ${iloscRat / 12} lat`;
}

function updateProwizjaInfo() {
    const prowizja = parseFloat(elements.prowizja.value) || 0;
    const jednostka = elements.jednostkaProwizji.value;
    const kwota = parseFloat(elements.kwota.value) || 0;
    const prowizjaKwota = jednostka === "procent" ? (prowizja / 100) * kwota : prowizja;
    elements.prowizjaInfo.textContent = `Prowizja: ${prowizjaKwota.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł`;
}









// F U N K C J E    U Ż Y T E C Z N I E

function toggleInputFields(disabled) {
    const inputFields = [
        elements.kwota,
        elements.kwotaRange,
        elements.iloscRat,
        elements.iloscRatRange,
        elements.oprocentowanie,
        elements.oprocentowanieRange,
        elements.rodzajRat,
        elements.prowizja,
        elements.prowizjaRange,
        elements.jednostkaProwizji
    ];

    inputFields.forEach(field => {
        if (field) {
            field.disabled = disabled;
        }
    });

    // Aktualizuj klasy disabled dla pól
    const parentElements = [
        elements.kwota.parentElement,
        elements.iloscRat.parentElement,
        elements.oprocentowanie.parentElement,
        elements.rodzajRat.parentElement,
        elements.prowizja.parentElement,
        elements.jednostkaProwizji.parentElement
    ];

    parentElements.forEach(parent => {
        if (parent) {
            if (disabled) {
                parent.classList.add("disabled");
            } else {
                parent.classList.remove("disabled");
            }
        }
    });
}

// Funkcja sprawdzająca, czy którekolwiek z pól "Zmienne Oprocentowanie" lub "Nadpłata Kredytu" jest aktywne
function updateInputFieldsState() {
    const isZmienneOprocentowanieActive = elements.zmienneOprocentowanieBtn?.checked || false;
    const isNadplataKredytuActive = elements.nadplataKredytuBtn?.checked || false;
    const shouldDisable = isZmienneOprocentowanieActive || isNadplataKredytuActive;

    toggleInputFields(shouldDisable);

    // Jeśli Zmienne Oprocentowanie jest wyłączone, upewnij się, że pole oprocentowanie jest odpowiednio odblokowane
    if (!isZmienneOprocentowanieActive) {
        elements.oprocentowanie.disabled = isNadplataKredytuActive;
        elements.oprocentowanieRange.disabled = isNadplataKredytuActive;
        elements.oprocentowanie.parentElement?.classList.toggle("disabled", isNadplataKredytuActive);
    }
}













// F U N K C J E    P O M O C N I C Z E

function calculateRemainingCapital(kwota, oprocentowanie, iloscRat, rodzajRat, variableRates, overpaymentRates, targetMonth) {
    let remainingCapital = kwota;
    const monthlyInterestRate = oprocentowanie / 100 / 12;
    let activeVariableRates = [...variableRates].sort((a, b) => a.period - b.period);
    let activeOverpaymentRates = [...overpaymentRates].sort((a, b) => a.start - b.start);

    for (let i = 1; i <= targetMonth; i++) {
        let currentInterestRate = monthlyInterestRate;
        let activeRate = activeVariableRates.find(rate => rate.period === i);
        if (activeRate) {
            currentInterestRate = activeRate.value / 100 / 12;
        }

        let nadplata = 0;
        let activeOverpayment = activeOverpaymentRates.find(over => i >= over.start && (over.type === "Jednorazowa" ? i === over.start : i <= over.end));
        if (activeOverpayment) {
            if (activeOverpayment.type === "Jednorazowa" && i === activeOverpayment.start) {
                nadplata = activeOverpayment.amount;
            } else if (activeOverpayment.type === "Miesięczna") {
                nadplata = activeOverpayment.amount;
            }

            if (activeOverpayment.effect === "Skróć okres" && nadplata > 0) {
                remainingCapital -= nadplata;
                if (remainingCapital <= 0) {
                    remainingCapital = 0;
                    break;
                }
            }
        }

        let odsetki = remainingCapital * currentInterestRate;
        let rataKapitalowa = 0;
        let rataCalkowita = 0;

        if (rodzajRat === "rowne") {
            let q = 1 + currentInterestRate;
            rataCalkowita = kwota * (q ** iloscRat) * (q - 1) / ((q ** iloscRat) - 1);
            rataKapitalowa = rataCalkowita - odsetki;

            if (activeOverpayment && activeOverpayment.effect === "Zmniejsz ratę") {
                rataKapitalowa += nadplata;
            }

            if (rataKapitalowa > remainingCapital) {
                rataKapitalowa = remainingCapital;
            }
        } else {
            rataKapitalowa = kwota / iloscRat;
            rataCalkowita = rataKapitalowa + odsetki;

            if (activeOverpayment && activeOverpayment.effect === "Zmniejsz ratę") {
                rataKapitalowa += nadplata;
            }

            if (rataKapitalowa > remainingCapital) {
                rataKapitalowa = remainingCapital;
            }
        }

        remainingCapital -= rataKapitalowa;

        if (remainingCapital <= 0) {
            remainingCapital = 0;
            break;
        }
    }

    return parseFloat(remainingCapital.toFixed(2));
}

function updateRatesArray(type) {
    if (type === "nadplata") {
        state.overpaymentRates = [];
        const groups = elements.nadplataKredytuWrapper.querySelectorAll(".variable-input-group");
        groups.forEach(group => {
            const typeSelect = group.querySelector(".nadplata-type-select");
            const effectSelect = group.querySelector(".nadplata-effect-select");
            const rateInput = group.querySelector(".variable-rate");
            const periodStartInput = group.querySelector(".variable-cykl-start");
            const periodEndInput = group.querySelector(".variable-cykl-end");

            const overpayment = {
                type: typeSelect.value,
                effect: effectSelect.value,
                amount: parseFloat(rateInput.value) || 0,
                start: parseInt(periodStartInput.value) || 2,
                end: periodEndInput ? parseInt(periodEndInput.value) || 2 : null
            };
            state.overpaymentRates.push(overpayment);
        });
    } else if (type === "oprocentowanie") {
        state.variableRates = [];
        const groups = elements.variableOprocentowanieWrapper.querySelectorAll(".variable-input-group");
        groups.forEach(group => {
            const periodInput = group.querySelector(".variable-cykl");
            const rateInput = group.querySelector(".variable-rate");

            const variableRate = {
                period: parseInt(periodInput.value) || 2,
                value: parseFloat(rateInput.value) || 0
            };
            state.variableRates.push(variableRate);
        });
    }
}









// F U N K C J E    W P R O W A D Z A N I E    D A N Y C H

function initializeInputHandling() {
    // Kwota Kredytu
    elements.kwota.addEventListener("input", (e) => {
        let value = e.target.value;

        // Zamień przecinek na kropkę
        if (value.includes(",")) {
            value = value.replace(",", ".");
            e.target.value = value;
        }

        // Zapobiegnij wpisywaniu więcej niż jednej kropki
        const dotCount = value.split(".").length - 1;
        if (dotCount > 1) {
            e.target.value = value.substring(0, value.lastIndexOf("."));
            return;
        }

        // Ogranicz do dwóch miejsc po przecinku
        const parts = value.split(".");
        if (parts.length > 1 && parts[1].length > 2) {
            parts[1] = parts[1].substring(0, 2);
            e.target.value = parts.join(".");
        }
    });

    elements.kwota.addEventListener("blur", () => {
        let value = elements.kwota.value;
        let parsedValue = parseFloat(value) || 0;
        let minValue = parseFloat(elements.kwota.min) || 0;
        let maxValue = parseFloat(elements.kwota.max) || Infinity;

        if (isNaN(parsedValue) || value === "") {
            parsedValue = minValue;
        } else {
            if (parsedValue < minValue) parsedValue = minValue;
            if (parsedValue > maxValue) parsedValue = maxValue;
        }

        elements.kwota.value = parsedValue.toFixed(2);
        elements.kwotaRange.value = parsedValue;
        updateKwotaInfo();
        // Aktualizuj prowizję tylko jeśli jednostka to "zl" i wartość prowizji jest domyślna
        if (elements.jednostkaProwizji.value === "zl" && !elements.prowizja.dataset.manual) {
            syncProwizjaWithKwota();
        }
    });

    elements.kwotaRange.addEventListener("input", () => {
        let value = parseFloat(elements.kwotaRange.value);
        elements.kwota.value = value.toFixed(2);
        updateKwotaInfo();
        // Aktualizuj prowizję tylko jeśli jednostka to "zl" i wartość prowizji jest domyślna
        if (elements.jednostkaProwizji.value === "zl" && !elements.prowizja.dataset.manual) {
            syncProwizjaWithKwota();
        }
    });

    // Ilość Rat
    elements.iloscRat.addEventListener("input", (e) => {
        let value = e.target.value;

        // Usuń wszystko poza cyframi
        value = value.replace(/[^0-9]/g, "");

        // Aktualizuj pole tekstowe
        e.target.value = value;
    });

    elements.iloscRat.addEventListener("blur", () => {
        let value = elements.iloscRat.value;
        let parsedValue = parseInt(value) || 0;
        let minValue = parseInt(elements.iloscRat.min) || 0;
        let maxValue = parseInt(elements.iloscRat.max) || Infinity;

        if (isNaN(parsedValue) || value === "") {
            parsedValue = minValue;
        } else {
            // Zaokrąglij do najbliższej wielokrotności 12
            parsedValue = Math.round(parsedValue / 12) * 12;

            if (parsedValue < minValue) parsedValue = minValue;
            if (parsedValue > maxValue) parsedValue = maxValue;
        }

        elements.iloscRat.value = parsedValue.toString();
        elements.iloscRatRange.value = parsedValue;
        updateLata();
    });

    elements.iloscRatRange.addEventListener("input", () => {
        let value = parseInt(elements.iloscRatRange.value);
        elements.iloscRat.value = value.toString();
        updateLata();
    });

    // Oprocentowanie
    elements.oprocentowanie.addEventListener("input", (e) => {
        let value = e.target.value;

        // Zamień przecinek na kropkę
        if (value.includes(",")) {
            value = value.replace(",", ".");
            e.target.value = value;
        }

        // Zapobiegnij wpisywaniu więcej niż jednej kropki
        const dotCount = value.split(".").length - 1;
        if (dotCount > 1) {
            e.target.value = value.substring(0, value.lastIndexOf("."));
            return;
        }

        // Ogranicz do dwóch miejsc po przecinku
        const parts = value.split(".");
        if (parts.length > 1 && parts[1].length > 2) {
            parts[1] = parts[1].substring(0, 2);
            e.target.value = parts.join(".");
        }
    });

    elements.oprocentowanie.addEventListener("blur", () => {
        let value = elements.oprocentowanie.value;
        let parsedValue = parseFloat(value) || 0;
        let minValue = parseFloat(elements.oprocentowanie.min) || 0;
        let maxValue = parseFloat(elements.oprocentowanie.max) || Infinity;

        if (isNaN(parsedValue) || value === "") {
            parsedValue = minValue;
        } else {
            if (parsedValue < minValue) parsedValue = minValue;
            if (parsedValue > maxValue) parsedValue = maxValue;
        }

        elements.oprocentowanie.value = parsedValue.toFixed(2);
        elements.oprocentowanieRange.value = parsedValue;
    });

    elements.oprocentowanieRange.addEventListener("input", () => {
        let value = parseFloat(elements.oprocentowanieRange.value);
        elements.oprocentowanie.value = value.toFixed(2);
        updateKwotaInfo();
    });

    // Prowizja
    elements.prowizja.addEventListener("input", (e) => {
        let value = e.target.value;

        // Zamień przecinek na kropkę
        if (value.includes(",")) {
            value = value.replace(",", ".");
            e.target.value = value;
        }

        // Zapobiegnij wpisywaniu więcej niż jednej kropki
        const dotCount = value.split(".").length - 1;
        if (dotCount > 1) {
            e.target.value = value.substring(0, value.lastIndexOf("."));
            return;
        }

        // Ogranicz do dwóch miejsc po przecinku
        const parts = value.split(".");
        if (parts.length > 1 && parts[1].length > 2) {
            parts[1] = parts[1].substring(0, 2);
            e.target.value = parts.join(".");
        }

        // Oznacz, że wartość została wprowadzona ręcznie
        elements.prowizja.dataset.manual = "true";
    });

    elements.prowizja.addEventListener("blur", () => {
        let value = elements.prowizja.value;
        let parsedValue = parseFloat(value) || 0;
        let minValue = parseFloat(elements.prowizja.min) || 0;
        let maxValue = parseFloat(elements.prowizja.max) || Infinity;
        const jednostka = elements.jednostkaProwizji.value;

        if (isNaN(parsedValue) || value === "") {
            parsedValue = minValue;
            delete elements.prowizja.dataset.manual; // Resetuj flagę, jeśli wartość jest niepoprawna
        } else {
            if (parsedValue < minValue) parsedValue = minValue;
            if (parsedValue > maxValue) parsedValue = maxValue;
        }

        elements.prowizja.value = parsedValue.toFixed(2);
        elements.prowizjaRange.value = parsedValue;
        updateProwizjaInfo();
    });

    elements.prowizjaRange.addEventListener("input", () => {
        let value = parseFloat(elements.prowizjaRange.value);
        elements.prowizja.value = value.toFixed(2);
        elements.prowizja.dataset.manual = "true"; // Oznacz, że zmiana pochodzi z suwaka
        updateProwizjaInfo();
    });

    // Jednostka Prowizji
    elements.jednostkaProwizji.addEventListener("change", () => {
        syncProwizjaWithKwota(true); // Wymuś reset wartości przy zmianie jednostki
        updateProwizjaInfo();
    });

    // Funkcja do synchronizacji prowizji z kwotą
    function syncProwizjaWithKwota(reset = false) {
        const jednostka = elements.jednostkaProwizji.value;
        const kwota = parseFloat(elements.kwota.value) || 0;
        let prowizjaValue = parseFloat(elements.prowizja.value) || 0;
        const minValue = parseFloat(elements.prowizja.min) || 0;
        const maxValue = parseFloat(elements.prowizja.max) || Infinity;

        if (reset) {
            delete elements.prowizja.dataset.manual; // Wymuś reset flagi przy zmianie jednostki
        }

        if (jednostka === "zl" && (reset || !elements.prowizja.dataset.manual)) {
            // Ustaw prowizję na 2% kwoty przy zmianie jednostki lub jeśli wartość jest domyślna
            const defaultProwizja = (kwota * 0.02).toFixed(2);
            prowizjaValue = Math.max(parseFloat(defaultProwizja), minValue);
            if (prowizjaValue > maxValue) prowizjaValue = maxValue;
            elements.prowizja.value = prowizjaValue.toFixed(2);
            elements.prowizjaRange.value = prowizjaValue;
            delete elements.prowizja.dataset.manual; // Resetuj flagę po automatycznej zmianie
        } else if (jednostka === "procent" && reset) {
            // Ustaw domyślną wartość 2 dla procentów przy zmianie jednostki
            prowizjaValue = 2;
            if (prowizjaValue < minValue) prowizjaValue = minValue;
            if (prowizjaValue > maxValue) prowizjaValue = maxValue;
            elements.prowizja.value = prowizjaValue.toFixed(2);
            elements.prowizjaRange.value = prowizjaValue;
            delete elements.prowizja.dataset.manual; // Resetuj flagę po automatycznej zmianie
        }
    }
}








// F U N K C J A     N A D P Ł A T A     K R E D Y T U

function createNadplataKredytuGroup() {
    const group = document.createElement("div");
    group.classList.add("variable-input-group");
    group.setAttribute("data-type", "nadplata");
    group.style.marginBottom = "10px";

    let typeOptions = `
        <option value="Jednorazowa">Jednorazowa</option>
        <option value="Miesięczna">Miesięczna</option>
    `;

    group.innerHTML = `
        <div class="fields-wrapper">
            <div class="form-row">
                <div class="form-group box-select">
                    <label class="form-label">Typ nadpłaty</label>
                    <select class="form-select nadplata-type-select">
                        ${typeOptions}
                    </select>
                </div>
                <div class="form-group box-select">
                    <label class="form-label">Po nadpłacie</label>
                    <select class="form-select nadplata-effect-select">
                        <option value="Skróć okres">Skróć okres</option>
                        <option value="Zmniejsz ratę">Zmniejsz ratę</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group box-amount">
                    <label class="form-label">Kwota nadpłaty</label>
                    <div class="input-group">
                        <input type="number" class="form-control variable-rate" min="100" max="5000000" step="0.01" value="100">
                        <span class="input-group-text unit-zl">zł</span>
                    </div>
                    <input type="range" class="form-range range-slider variable-rate-range" min="100" max="5000000" step="0.01" value="100">
                </div>
                <div class="form-group box-period box-period-start">
                    <label class="form-label">W</label>
                    <div class="input-group">
                        <input type="number" class="form-control variable-cykl variable-cykl-start" min="1" max="360" step="1" value="1">
                        <span class="input-group-text unit-period">miesiącu</span>
                    </div>
                    <input type="range" class="form-range range-slider variable-cykl-range variable-cykl-start-range" min="1" max="360" step="1" value="1">
                </div>
            </div>
        </div>
    `;
    return group;
}

function createNadplataKredytuEndPeriodBox(minValue, maxValue, defaultValue, stepValue, type) {
    const unitText = type === "Miesięczna" ? "miesiąca" : "miesiąca";
    const box = document.createElement("div");
    box.classList.add("form-group", "box-period", "box-period-end");
    box.innerHTML = `
        <label class="form-label">DO</label>
        <div class="input-group">
            <input type="number" class="form-control variable-cykl variable-cykl-end" min="${minValue}" max="${maxValue}" step="${stepValue}" value="${defaultValue}">
            <span class="input-group-text unit-period">${unitText}</span>
        </div>
        <input type="range" class="form-range range-slider variable-cykl-range variable-cykl-end-range" min="${minValue}" max="${maxValue}" step="${stepValue}" value="${defaultValue}">
    `;
    return box;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function syncInputWithRange(input, range) {
    if (!input || !range) return;

    let value = input.classList.contains("variable-cykl")
        ? parseInt(input.value) || parseInt(range.value)
        : parseFloat(input.value) || parseFloat(range.value);

    const min = parseFloat(range.min);
    const max = parseFloat(range.max);

    if (isNaN(value)) value = min;
    if (value < min) value = min;
    if (value > max) value = max;

    input.value = input.classList.contains("variable-cykl") ? value : value.toFixed(2);
    range.value = value;
}

function calculateRemainingCapital(loanAmount, interestRate, totalMonths, paymentType, overpayments, targetMonth) {
    let remainingCapital = loanAmount;
    const monthlyRate = interestRate / 100 / 12;
    let rata = paymentType === "rowne"
        ? (remainingCapital * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -totalMonths))
        : (remainingCapital / totalMonths) + (remainingCapital * monthlyRate);

    for (let month = 1; month <= targetMonth; month++) {
        const odsetki = remainingCapital * monthlyRate;
        let kapital = rata - odsetki;
        if (kapital > remainingCapital) kapital = remainingCapital;
        remainingCapital -= kapital;

        overpayments.forEach((overpayment) => {
            let applyOverpayment = false;
            if (overpayment.type === "Jednorazowa" && overpayment.start === month) {
                applyOverpayment = true;
            } else if (overpayment.type === "Miesięczna" && month >= overpayment.start && month <= overpayment.end) {
                applyOverpayment = true;
            }
            if (applyOverpayment && remainingCapital > 0) {
                let overpaymentAmount = overpayment.amount;
                if (overpaymentAmount > remainingCapital) overpaymentAmount = remainingCapital;
                remainingCapital -= overpaymentAmount;
                if (overpayment.effect === "Zmniejsz ratę" && remainingCapital > 0) {
                    const remainingMonths = totalMonths - month;
                    if (remainingMonths > 0) {
                        rata = paymentType === "rowne"
                            ? (remainingCapital * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -remainingMonths))
                            : (remainingCapital / remainingMonths) + (remainingCapital * monthlyRate);
                    }
                }
            }
        });
        if (remainingCapital <= 0) break;
    }
    return remainingCapital;
}

function updateOverpaymentLimit(input, range, group) {
    if (!group || !group.parentElement || group.classList.contains("locked")) {
        console.log("Group jest zablokowany lub nie istnieje w DOM, pomijam updateOverpaymentLimit");
        return 0;
    }

    const typeSelect = group.querySelector(".nadplata-type-select");
    const type = typeSelect?.value || "Jednorazowa";
    const effectSelect = group.querySelector(".nadplata-effect-select");
    const effect = effectSelect?.value || "Skróć okres";
    const periodStartInput = group.querySelector(".variable-cykl-start");
    const periodEndInput = group.querySelector(".variable-cykl-end");
    const periodStartRange = group.querySelector(".variable-cykl-start-range");
    const periodEndRange = group.querySelector(".variable-cykl-end-range");
    const rateInput = input.classList.contains("variable-rate") ? input : group.querySelector(".variable-rate");
    const rateRange = range.classList.contains("variable-rate-range") ? range : group.querySelector(".variable-rate-range");

    const loanAmount = parseFloat(elements.kwota?.value) || 500000;
    const interestRate = parseFloat(elements.oprocentowanie?.value) || 7;
    const totalMonths = parseInt(elements.iloscRat?.value) || 360;
    const paymentType = elements.rodzajRat?.value || "rowne";

    const allGroups = elements.nadplataKredytuWrapper.querySelectorAll(".variable-input-group");
    const currentIndex = Array.from(allGroups).indexOf(group);
    const previousOverpayments = [];
    for (let i = 0; i < currentIndex; i++) {
        const prevGroup = allGroups[i];
        if (!prevGroup || !prevGroup.parentElement) continue;
        const prevType = prevGroup.querySelector(".nadplata-type-select")?.value || "Jednorazowa";
        const prevPeriodStart = parseInt(prevGroup.querySelector(".variable-cykl-start")?.value) || 1;
        const prevPeriodEnd = prevGroup.querySelector(".variable-cykl-end") ? parseInt(prevGroup.querySelector(".variable-cykl-end")?.value) || prevPeriodStart : prevPeriodStart;
        const prevAmount = parseFloat(prevGroup.querySelector(".variable-rate")?.value) || 0;
        const prevEffect = prevGroup.querySelector(".nadplata-effect-select")?.value || "Skróć okres";
        previousOverpayments.push({ type: prevType, start: prevPeriodStart, end: prevPeriodEnd, amount: prevAmount, effect: prevEffect });
    }

    let periodStart = parseInt(periodStartInput?.value) || 1;
    let periodEnd = type === "Miesięczna" && periodEndInput ? parseInt(periodEndInput?.value) || periodStart : periodStart;

    // Oblicz pozostały kapitał przed okresem nadpłaty
    let remainingCapital = calculateRemainingCapital(loanAmount, interestRate, totalMonths, paymentType, previousOverpayments, periodStart - 1);
    let maxAllowed = Math.max(100, remainingCapital);

    if (type === "Miesięczna" && periodEndInput) {
        const numberOfOverpayments = periodEnd - periodStart + 1;
        if (numberOfOverpayments > 0) {
            maxAllowed = remainingCapital / numberOfOverpayments;
        }
        maxAllowed = Math.max(100, maxAllowed);
        rateInput.max = maxAllowed.toFixed(2);
        rateRange.max = maxAllowed.toFixed(2);

        let rateValue = parseFloat(rateInput.value) || 100;
        if (rateValue > maxAllowed) {
            rateValue = maxAllowed;
            rateInput.value = rateValue.toFixed(2);
            rateRange.value = rateValue;
        }

        // Dynamiczna aktualizacja OD i DO
        let maxPeriod = totalMonths;
        remainingCapital = calculateRemainingCapital(loanAmount, interestRate, totalMonths, paymentType, [...previousOverpayments, { type, start: periodStart, end: periodEnd, amount: rateValue, effect }], totalMonths);
        if (remainingCapital <= 0) {
            maxPeriod = periodEnd;
        } else {
            maxPeriod = Math.min(maxPeriod, periodStart + Math.floor((loanAmount - calculateRemainingCapital(loanAmount, interestRate, totalMonths, paymentType, previousOverpayments, periodStart - 1)) / rateValue));
        }

        let minPeriodStart = 1;
        if (currentIndex > 0) {
            const prevGroup = allGroups[currentIndex - 1];
            const prevType = prevGroup.querySelector(".nadplata-type-select")?.value || "Jednorazowa";
            const prevPeriodStart = parseInt(prevGroup.querySelector(".variable-cykl-start")?.value) || 1;
            const prevPeriodEnd = prevType === "Miesięczna" ? parseInt(prevGroup.querySelector(".variable-cykl-end")?.value) || prevPeriodStart : prevPeriodStart;
            minPeriodStart = prevPeriodEnd + 1;
        }

        periodStartInput.min = minPeriodStart;
        periodStartRange.min = minPeriodStart;
        periodStartInput.max = maxPeriod;
        periodStartRange.max = maxPeriod;
        if (periodStart > maxPeriod) {
            periodStart = maxPeriod;
            periodStartInput.value = periodStart;
            periodStartRange.value = periodStart;
        }

        periodEndInput.min = periodStart;
        periodEndRange.min = periodStart;
        periodEndInput.max = maxPeriod;
        periodEndRange.max = maxPeriod;
        if (periodEnd < periodStart) {
            periodEnd = periodStart;
            periodEndInput.value = periodEnd;
            periodEndRange.value = periodEnd;
        }
    } else {
        // Dla nadpłaty jednorazowej
        rateInput.max = maxAllowed.toFixed(2);
        rateRange.max = maxAllowed.toFixed(2);

        let rateValue = parseFloat(rateInput.value) || 100;
        if (rateValue > maxAllowed) {
            rateValue = maxAllowed;
            rateInput.value = rateValue.toFixed(2);
            range.value = rateValue;
        }

        let maxPeriod = totalMonths;
        remainingCapital = calculateRemainingCapital(loanAmount, interestRate, totalMonths, paymentType, [...previousOverpayments, { type, start: periodStart, end: periodStart, amount: rateValue, effect }], totalMonths);
        if (remainingCapital <= 0) {
            maxPeriod = periodStart;
        } else {
            maxPeriod = Math.min(maxPeriod, periodStart + Math.floor((loanAmount - calculateRemainingCapital(loanAmount, interestRate, totalMonths, paymentType, previousOverpayments, periodStart - 1)) / rateValue));
        }

        let minPeriodStart = 1;
        if (currentIndex > 0) {
            const prevGroup = allGroups[currentIndex - 1];
            const prevType = prevGroup.querySelector(".nadplata-type-select")?.value || "Jednorazowa";
            const prevPeriodStart = parseInt(prevGroup.querySelector(".variable-cykl-start")?.value) || 1;
            const prevPeriodEnd = prevType === "Miesięczna" ? parseInt(prevGroup.querySelector(".variable-cykl-end")?.value) || prevPeriodStart : prevPeriodStart;
            minPeriodStart = prevPeriodEnd + 1;
        }

        periodStartInput.min = minPeriodStart;
        periodStartRange.min = minPeriodStart;
        periodStartInput.max = maxPeriod;
        periodStartRange.max = maxPeriod;
        if (periodStart > maxPeriod) {
            periodStart = maxPeriod;
            periodStartInput.value = periodStart;
            periodStartRange.value = periodStart;
        }
    }

    updateRatesArray("nadplata");
    return remainingCapital;
}

function updateAllOverpaymentLimits() {
    if (state.isUpdating) {
        console.log("Aktualizacja już w toku, pomijam updateAllOverpaymentLimits");
        return { remainingCapital: 0, lastMonthWithCapital: null };
    }

    state.isUpdating = true;

    const allGroups = elements.nadplataKredytuWrapper.querySelectorAll(".variable-input-group");
    const groups = elements.nadplataKredytuWrapper.querySelectorAll(".variable-input-group:not(.locked)");
    let lastRemainingCapital = null;
    let lastMonthWithCapital = null;

    let lastOverpaymentMonth = 1;
    const overpayments = [];
    allGroups.forEach((g) => {
        if (!g || !g.parentElement) return;

        const type = g.querySelector(".nadplata-type-select")?.value || "Jednorazowa";
        const periodStart = parseInt(g.querySelector(".variable-cykl-start")?.value) || 1;
        const periodEnd = g.querySelector(".variable-cykl-end") ? parseInt(g.querySelector(".variable-cykl-end")?.value) || periodStart : periodStart;
        const amount = parseFloat(g.querySelector(".variable-rate")?.value) || 0;
        const effect = g.querySelector(".nadplata-effect-select")?.value || "Skróć okres";

        overpayments.push({
            type: type,
            start: periodStart,
            end: periodEnd,
            amount: amount,
            effect: effect,
        });

        if (periodStart > lastOverpaymentMonth) lastOverpaymentMonth = periodStart;
        if (periodEnd > lastOverpaymentMonth) lastOverpaymentMonth = periodEnd;
    });

    let remainingCapital = parseFloat(elements.kwota?.value) || 500000;
    const interestRate = parseFloat(elements.oprocentowanie?.value) || 7;
    const totalMonths = parseInt(elements.iloscRat?.value) || 360;
    const paymentType = elements.rodzajRat?.value || "rowne";

    remainingCapital = calculateRemainingCapital(remainingCapital, interestRate, totalMonths, paymentType, overpayments, lastOverpaymentMonth);

    lastRemainingCapital = remainingCapital;
    let maxPeriodLimit = lastMonthWithCapital !== null ? Math.min(lastMonthWithCapital, totalMonths) : totalMonths;
    if (lastRemainingCapital > 0) {
        let monthsToPayOff = Math.ceil(lastRemainingCapital / 100);
        maxPeriodLimit = Math.min(maxPeriodLimit, lastOverpaymentMonth + monthsToPayOff);
    }

    groups.forEach((g, index) => {
        if (!g || !g.parentElement) return;

        const periodStartInput = g.querySelector(".variable-cykl-start");
        const periodStartRange = g.querySelector(".variable-cykl-start-range");
        const periodEndInput = g.querySelector(".variable-cykl-end");
        const periodEndRange = g.querySelector(".variable-cykl-end-range");
        const type = g.querySelector(".nadplata-type-select")?.value || "Jednorazowa";

        let minPeriodStart = 1;
        if (index > 0) {
            const previousGroup = allGroups[allGroups.length - groups.length + index - 1];
            if (previousGroup && previousGroup.parentElement) {
                const previousType = previousGroup.querySelector(".nadplata-type-select")?.value || "Jednorazowa";
                const previousPeriodStartValue = parseInt(previousGroup.querySelector(".variable-cykl-start")?.value) || 1;
                let previousPeriodEndValue = previousPeriodStartValue;
                if (previousType === "Miesięczna") {
                    previousPeriodEndValue = parseInt(previousGroup.querySelector(".variable-cykl-end")?.value) || previousPeriodStartValue;
                }
                minPeriodStart = previousPeriodEndValue + 1;
            }
        }

        if (periodStartInput && periodStartRange) {
            periodStartInput.min = minPeriodStart;
            periodStartRange.min = minPeriodStart;
            periodStartInput.max = maxPeriodLimit;
            periodStartRange.max = maxPeriodLimit;

            let periodStartValue = parseInt(periodStartInput.value) || minPeriodStart;
            if (periodStartValue < minPeriodStart) periodStartValue = minPeriodStart;
            if (periodStartValue > maxPeriodLimit) periodStartValue = maxPeriodLimit;
            periodStartInput.value = periodStartValue;
            periodStartRange.value = periodStartValue;
            syncInputWithRange(periodStartInput, periodStartRange);
        }

        if (periodEndInput && periodEndRange && type === "Miesięczna") {
            const periodStartValue = parseInt(periodStartInput?.value) || minPeriodStart;
            periodEndInput.min = periodStartValue;
            periodEndRange.min = periodStartValue;
            periodEndInput.max = maxPeriodLimit;
            periodEndRange.max = maxPeriodLimit;

            let periodEndValue = parseInt(periodEndInput.value) || periodStartValue;
            if (periodEndValue < periodStartValue) periodEndValue = periodStartValue;
            if (periodEndValue > maxPeriodLimit) periodEndValue = maxPeriodLimit;
            periodEndInput.value = periodEndValue;
            periodEndRange.value = periodEndValue;
            syncInputWithRange(periodEndInput, periodEndRange);
        }
    });

    updateRatesArray("nadplata");
    state.isUpdating = false;
    return { remainingCapital: lastRemainingCapital, lastMonthWithCapital: maxPeriodLimit };
}

function initializeNadplataKredytuGroup(group) {
    const iloscRat = parseInt(elements.iloscRat?.value) || 360;
    const kwota = parseFloat(elements.kwota?.value) || 500000;

    const inputs = group.querySelectorAll(".form-control");
    const ranges = group.querySelectorAll(".form-range");
    const typeSelect = group.querySelector(".nadplata-type-select");
    const effectSelect = group.querySelector(".nadplata-effect-select");
    const periodStartBox = group.querySelector(".box-period-start");
    const periodLabel = periodStartBox?.querySelector(".form-label");
    const periodUnit = periodStartBox?.querySelector(".unit-period");
    const formRow = periodStartBox?.parentElement;

    const groups = elements.nadplataKredytuWrapper.querySelectorAll(".variable-input-group");
    const currentIndex = Array.from(groups).indexOf(group);

    const updatePeriodBox = () => {
        if (state.isUpdating) return;

        state.isUpdating = true;

        const { lastMonthWithCapital } = updateAllOverpaymentLimits();
        let maxPeriodLimit = lastMonthWithCapital !== null ? Math.min(lastMonthWithCapital, iloscRat) : iloscRat;

        const type = typeSelect?.value || "Jednorazowa";
        const periodStartInput = group.querySelector(".variable-cykl-start");
        const periodStartRange = group.querySelector(".variable-cykl-start-range");
        const existingEndBox = group.querySelector(".box-period-end");

        let maxValue = maxPeriodLimit;
        let stepValue = 1;
        let minValue;
        let defaultValue;

        if (type === "Jednorazowa") {
            if (periodLabel) periodLabel.textContent = "W";
            if (periodUnit) periodUnit.textContent = "miesiącu";
            if (existingEndBox) {
                existingEndBox.remove();
            }
            maxValue = maxPeriodLimit;
            if (periodStartInput && periodStartRange) {
                minValue = currentIndex > 0 ? parseInt(groups[currentIndex - 1].querySelector(".variable-cykl-start")?.value) + 1 || 1 : 1;
                defaultValue = minValue;
                periodStartInput.min = minValue;
                periodStartRange.min = minValue;
                periodStartInput.max = maxValue;
                periodStartRange.max = maxValue;
                periodStartInput.step = stepValue;
                periodStartRange.step = stepValue;

                let periodStartValue = parseInt(periodStartInput.value) || defaultValue;
                if (periodStartValue < minValue) periodStartValue = minValue;
                if (periodStartValue > maxValue) periodStartValue = maxValue;
                periodStartInput.value = periodStartValue;
                periodStartRange.value = periodStartValue;
                syncInputWithRange(periodStartInput, periodStartRange);
            }
        } else {
            if (periodLabel) periodLabel.textContent = "OD";
            if (periodUnit) periodUnit.textContent = "miesiąca";
            maxValue = maxPeriodLimit;
            stepValue = 1;

            let minPeriodStart = 1;
            if (currentIndex > 0) {
                const previousGroup = groups[currentIndex - 1];
                if (previousGroup && previousGroup.parentElement) {
                    const previousType = previousGroup.querySelector(".nadplata-type-select")?.value || "Jednorazowa";
                    const previousPeriodStartValue = parseInt(previousGroup.querySelector(".variable-cykl-start")?.value) || 1;
                    let previousPeriodEndValue = previousPeriodStartValue;
                    if (previousType === "Miesięczna") {
                        previousPeriodEndValue = parseInt(previousGroup.querySelector(".variable-cykl-end")?.value) || previousPeriodStartValue;
                    }
                    minPeriodStart = previousPeriodEndValue + 1;
                }
            }

            if (periodStartInput && periodStartRange) {
                periodStartInput.min = minPeriodStart;
                periodStartRange.min = minPeriodStart;
                periodStartInput.max = maxValue;
                periodStartRange.max = maxValue;
                periodStartInput.step = stepValue;
                periodStartRange.step = stepValue;

                let periodStartValue = parseInt(periodStartInput?.value) || minPeriodStart;
                if (periodStartValue < minPeriodStart) periodStartValue = minPeriodStart;
                if (periodStartValue > maxValue) periodStartValue = maxValue;
                periodStartInput.value = periodStartValue;
                periodStartRange.value = periodStartValue;
                syncInputWithRange(periodStartInput, periodStartRange);
            }

            if (existingEndBox) {
                const endUnit = existingEndBox.querySelector(".unit-period");
                if (endUnit) endUnit.textContent = "miesiąca";

                const endInput = existingEndBox.querySelector(".variable-cykl-end");
                const endRange = existingEndBox.querySelector(".variable-cykl-end-range");
                if (endInput && endRange) {
                    minValue = parseInt(periodStartInput?.value) || minPeriodStart;
                    maxValue = maxPeriodLimit;
                    stepValue = 1;

                    endInput.min = minValue;
                    endRange.min = minValue;
                    endInput.max = maxValue;
                    endRange.max = maxValue;
                    endInput.step = stepValue;
                    endRange.step = stepValue;

                    let endValue = parseInt(endInput.value) || minValue;
                    if (endValue < minValue) endValue = minValue;
                    if (endValue > maxValue) endValue = maxValue;
                    endInput.value = endValue;
                    endRange.value = endValue;
                    syncInputWithRange(endInput, endRange);
                }
            } else {
                minValue = parseInt(periodStartInput?.value) || minPeriodStart;
                defaultValue = minValue + 4; // Domyślnie 5 miesięcy nadpłaty
                if (defaultValue > maxValue) defaultValue = maxValue;
                if (minValue > maxValue) minValue = maxValue;
                const endBox = createNadplataKredytuEndPeriodBox(minValue, maxValue, defaultValue, stepValue, type);
                formRow?.appendChild(endBox);
            }
        }

        state.isUpdating = false;
    };

    inputs.forEach((input, index) => {
        const range = ranges[index];
        if (input.classList.contains("variable-cykl-start")) {
            let minPeriodStart = 1;
            let defaultPeriodStart = 1;
            if (currentIndex > 0) {
                const previousGroup = groups[currentIndex - 1];
                if (previousGroup && previousGroup.parentElement) {
                    const previousType = previousGroup.querySelector(".nadplata-type-select")?.value || "Jednorazowa";
                    const previousPeriodStartValue = parseInt(previousGroup.querySelector(".variable-cykl-start")?.value) || 1;
                    let previousPeriodEndValue = previousPeriodStartValue;
                    if (previousType === "Miesięczna") {
                        previousPeriodEndValue = parseInt(previousGroup.querySelector(".variable-cykl-end")?.value) || previousPeriodStartValue;
                    }
                    minPeriodStart = previousPeriodEndValue + 1;
                    defaultPeriodStart = minPeriodStart;
                }
            }

            const { lastMonthWithCapital } = updateAllOverpaymentLimits();
            let maxPeriodLimit = lastMonthWithCapital !== null ? Math.min(lastMonthWithCapital, iloscRat) : iloscRat;

            input.min = minPeriodStart;
            input.max = maxPeriodLimit;
            range.min = minPeriodStart;
            range.max = maxPeriodLimit;

            let value = Math.max(minPeriodStart, Math.min(defaultPeriodStart, maxPeriodLimit));
            input.value = value;
            range.value = value;

            const debouncedUpdate = debounce(() => {
                const rateInput = group.querySelector(".variable-rate");
                const rateRange = group.querySelector(".variable-rate-range");
                if (rateInput && rateRange) {
                    updateOverpaymentLimit(rateInput, rateRange, group);
                    updateRatesArray("nadplata");
                    updateNadplataKredytuRemoveButtons();
                }
            }, 50);

            input.addEventListener("input", () => {
                let value = parseInt(input.value.replace(/[^0-9]/g, "")) || minPeriodStart;
                if (value < minPeriodStart) value = minPeriodStart;
                if (value > maxPeriodLimit) value = maxPeriodLimit;
                input.value = value;
                range.value = value;

                if (typeSelect?.value === "Miesięczna") {
                    const periodEndInput = group.querySelector(".variable-cykl-end");
                    const periodEndRange = group.querySelector(".variable-cykl-end-range");
                    if (periodEndInput && periodEndRange) {
                        const initialEndValue = parseInt(periodEndInput.dataset.initialValue) || (parseInt(input.value) + 4); // Domyślnie 5 miesięcy nadpłaty
                        const numberOfOverpayments = initialEndValue - (parseInt(periodStartInput.dataset.initialValue) || minPeriodStart) + 1;
                        let newEndValue = value + (numberOfOverpayments - 1);
                        if (newEndValue > maxPeriodLimit) {
                            newEndValue = maxPeriodLimit;
                        }
                        if (newEndValue < value) {
                            newEndValue = value; // DO nie może być mniejsze niż OD
                        }
                        periodEndInput.min = value;
                        periodEndRange.min = value;
                        periodEndInput.max = maxPeriodLimit;
                        periodEndRange.max = maxPeriodLimit;
                        periodEndInput.value = newEndValue;
                        periodEndRange.value = newEndValue;
                        syncInputWithRange(periodEndInput, periodEndRange);
                    }
                }
                debouncedUpdate();
            });

            range.addEventListener("input", () => {
                let value = parseInt(range.value);
                input.value = value;
                if (typeSelect?.value === "Miesięczna") {
                    const periodEndInput = group.querySelector(".variable-cykl-end");
                    const periodEndRange = group.querySelector(".variable-cykl-end-range");
                    if (periodEndInput && periodEndRange) {
                        const initialEndValue = parseInt(periodEndInput.dataset.initialValue) || (parseInt(input.value) + 4);
                        const numberOfOverpayments = initialEndValue - (parseInt(periodStartInput.dataset.initialValue) || minPeriodStart) + 1;
                        let newEndValue = value + (numberOfOverpayments - 1);
                        if (newEndValue > maxPeriodLimit) {
                            newEndValue = maxPeriodLimit;
                        }
                        if (newEndValue < value) {
                            newEndValue = value;
                        }
                        periodEndInput.min = value;
                        periodEndRange.min = value;
                        periodEndInput.max = maxPeriodLimit;
                        periodEndRange.max = maxPeriodLimit;
                        periodEndInput.value = newEndValue;
                        periodEndRange.value = newEndValue;
                        syncInputWithRange(periodEndInput, periodEndRange);
                    }
                }
                debouncedUpdate();
            });
        } else if (input.classList.contains("variable-rate")) {
            const debouncedUpdate = debounce(() => {
                updateOverpaymentLimit(input, range, group);
                updateRatesArray("nadplata");
                updateNadplataKredytuRemoveButtons();
            }, 50);

            input.addEventListener("input", () => {
                let value = input.value.replace(",", ".").replace(/[^0-9.]/g, "");
                let parsedValue = parseFloat(value);
                let maxAllowed = parseFloat(input.max) || kwota;
                let minAllowed = 100;

                if (isNaN(parsedValue) || parsedValue < minAllowed) {
                    parsedValue = minAllowed;
                } else if (parsedValue > maxAllowed) {
                    parsedValue = maxAllowed;
                }
                input.value = parsedValue.toFixed(2);
                range.value = parsedValue;
                debouncedUpdate();
            });

            range.addEventListener("input", () => {
                let value = parseFloat(range.value);
                let maxAllowed = parseFloat(input.max) || kwota;
                let minAllowed = 100;
                if (value < minAllowed) value = minAllowed;
                if (value > maxAllowed) value = maxAllowed;
                input.value = value.toFixed(2);
                range.value = value;
                debouncedUpdate();
            });
        } else if (input.classList.contains("variable-cykl-end")) {
            const periodStartInput = group.querySelector(".variable-cykl-start");
            const { lastMonthWithCapital } = updateAllOverpaymentLimits();
            let maxPeriodLimit = lastMonthWithCapital !== null ? Math.min(lastMonthWithCapital, iloscRat) : iloscRat;

            const debouncedUpdate = debounce(() => {
                const rateInput = group.querySelector(".variable-rate");
                const rateRange = group.querySelector(".variable-rate-range");
                if (rateInput && rateRange) {
                    updateOverpaymentLimit(rateInput, range, group);
                    updateRatesArray("nadplata");
                    updateNadplataKredytuRemoveButtons();
                }
            }, 50);

            input.addEventListener("input", () => {
                let minValue = parseInt(periodStartInput?.value) || 1;
                let value = parseInt(input.value.replace(/[^0-9]/g, "")) || minValue;
                if (value < minValue) value = minValue;
                if (value > maxPeriodLimit) value = maxPeriodLimit;
                input.value = value;
                range.value = value;
                syncInputWithRange(input, range);
                debouncedUpdate();
            });

            range.addEventListener("input", () => {
                let minValue = parseInt(periodStartInput?.value) || 1;
                let value = parseInt(range.value);
                if (value < minValue) value = minValue;
                if (value > maxPeriodLimit) value = maxPeriodLimit;
                input.value = value;
                range.value = value;
                syncInputWithRange(input, range);
                debouncedUpdate();
            });
        }
    });

    if (typeSelect) {
        typeSelect.addEventListener("change", () => {
            updatePeriodBox();
            const rateInput = group.querySelector(".variable-rate");
            const rateRange = group.querySelector(".variable-rate-range");
            if (rateInput && rateRange) {
                updateOverpaymentLimit(rateInput, rateRange, group);
                updateRatesArray("nadplata");
            }
            updateNadplataKredytuRemoveButtons();
        });
    }

    if (effectSelect) {
        effectSelect.addEventListener("change", () => {
            updateRatesArray("nadplata");
            updateAllOverpaymentLimits();
            updateNadplataKredytuRemoveButtons();
        });
    }

    updatePeriodBox();
    const rateInput = group.querySelector(".variable-rate");
    const rateRange = group.querySelector(".variable-rate-range");
    if (rateInput && rateRange) {
        updateOverpaymentLimit(rateInput, rateRange, group);
    }

    updateNadplataKredytuRemoveButtons();
}

function resetNadplataKredytuSection() {
    elements.nadplataKredytuWrapper.innerHTML = "";
    state.overpaymentRates = [];
    if (elements.nadplataKredytuBtn) {
        elements.nadplataKredytuBtn.disabled = false;
        elements.nadplataKredytuBtn.parentElement?.classList.remove("disabled");
    }

    const existingRemoveBtnWrapper = elements.nadplataKredytuWrapper.querySelector(".remove-btn-wrapper");
    if (existingRemoveBtnWrapper) {
        existingRemoveBtnWrapper.remove();
    }
    updateInputFieldsState(false);
}

function updateNadplataKredytuRemoveButtons() {
    const wrapper = elements.nadplataKredytuWrapper;
    const groups = wrapper.querySelectorAll(".variable-input-group");
    const activeGroups = wrapper.querySelectorAll(".variable-input-group:not(.locked)");

    let existingRemoveBtnWrapper = wrapper.querySelector(".remove-btn-wrapper");

    if (groups.length === 0) {
        if (existingRemoveBtnWrapper && existingRemoveBtnWrapper.parentElement) {
            existingRemoveBtnWrapper.remove();
        }
        updateInputFieldsState(false);
        return;
    }

    if (!existingRemoveBtnWrapper) {
        existingRemoveBtnWrapper = document.createElement("div");
        existingRemoveBtnWrapper.classList.add("remove-btn-wrapper");
        existingRemoveBtnWrapper.style.display = "flex";
        existingRemoveBtnWrapper.style.justifyContent = "space-between";
        existingRemoveBtnWrapper.style.marginTop = "10px";
    } else {
        existingRemoveBtnWrapper.innerHTML = "";
    }

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.classList.add("btn", "btn-danger", "btn-sm", "btn-reset");
    removeBtn.setAttribute("aria-label", "Usuń nadpłatę");
    removeBtn.textContent = "Usuń";
    existingRemoveBtnWrapper.appendChild(removeBtn);

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.classList.add("btn", "btn-functional");
    addBtn.setAttribute("aria-label", "Dodaj kolejną nadpłatę");
    addBtn.textContent = "Dodaj kolejną nadpłatę";
    existingRemoveBtnWrapper.appendChild(addBtn);

    const lastGroup = groups[groups.length - 1];
    if (existingRemoveBtnWrapper.parentElement !== lastGroup) {
        lastGroup.appendChild(existingRemoveBtnWrapper);
    }

    removeBtn.addEventListener("click", () => {
        const groups = wrapper.querySelectorAll(".variable-input-group");
        const currentIndex = groups.length - 1;

        if (currentIndex === 0) {
            if (elements.nadplataKredytuBtn) {
                elements.nadplataKredytuBtn.checked = false;
                elements.nadplataKredytuInputs?.classList.remove("active");
            }
            resetNadplataKredytuSection();
        } else {
            const lastGroup = groups[currentIndex];
            const secondLastGroup = groups[currentIndex - 1];
            lastGroup.remove();
            if (secondLastGroup) {
                secondLastGroup.classList.remove("locked");
                secondLastGroup.querySelectorAll("input, select").forEach(el => el.disabled = false);
                secondLastGroup.querySelectorAll(".form-group").forEach(el => el.classList.remove("disabled"));
            }
            updateRatesArray("nadplata");
            updateAllOverpaymentLimits();
            updateNadplataKredytuRemoveButtons();
        }
    });

    addBtn.addEventListener("click", () => {
        const newGroup = createNadplataKredytuGroup();
        wrapper.appendChild(newGroup);
        const groups = wrapper.querySelectorAll(".variable-input-group");
        const activeGroups = wrapper.querySelectorAll(".variable-input-group:not(.locked)");
        if (activeGroups.length > 0) {
            const lastActiveGroup = activeGroups[activeGroups.length - 1];
            lastActiveGroup.classList.add("locked");
            lastActiveGroup.querySelectorAll("input, select").forEach(el => el.disabled = true);
            lastActiveGroup.querySelectorAll(".form-group").forEach(el => el.classList.add("disabled"));
        }
        initializeNadplataKredytuGroup(newGroup);
        updateRatesArray("nadplata");
        updateAllOverpaymentLimits();
        updateNadplataKredytuRemoveButtons();
    });

    const { remainingCapital } = updateAllOverpaymentLimits();
    const lastGroupData = groups[groups.length - 1];
    const rateInput = lastGroupData.querySelector(".variable-rate");
    const periodStartInput = lastGroupData.querySelector(".variable-cykl-start");
    const periodEndInput = lastGroupData.querySelector(".variable-cykl-end");

    const maxRate = parseFloat(rateInput.max) || 0;
    const maxPeriodStart = parseInt(periodStartInput.max) || 0;
    const maxPeriodEnd = periodEndInput ? parseInt(periodEndInput.max) || 0 : 0;
    const currentRate = parseFloat(rateInput.value) || 0;
    const currentPeriodStart = parseInt(periodStartInput.value) || 0;
    const currentPeriodEnd = periodEndInput ? parseInt(periodEndInput.value) || 0 : 0;

    if (remainingCapital <= 0 || currentRate >= maxRate || currentPeriodStart >= maxPeriodStart || (periodEndInput && currentPeriodEnd >= maxPeriodEnd)) {
        addBtn.style.display = "none";
    } else {
        addBtn.style.display = "inline-block";
    }
}

function initializeNadplataKredytuToggle() {
    if (elements.nadplataKredytuBtn) {
        elements.nadplataKredytuBtn.addEventListener("change", () => {
            const isChecked = elements.nadplataKredytuBtn.checked;
            elements.nadplataKredytuInputs?.classList.toggle("active", isChecked);

            if (isChecked) {
                elements.nadplataKredytuWrapper.innerHTML = "";
                const newGroup = createNadplataKredytuGroup();
                elements.nadplataKredytuWrapper.appendChild(newGroup);
                initializeNadplataKredytuGroup(newGroup);
                updateNadplataKredytuRemoveButtons();
                updateInputFieldsState(true);
            } else {
                resetNadplataKredytuSection();
                updateInputFieldsState(false);
            }
        });
    }
}

function updateInputFieldsState(lock = false) {
    const mainInputs = document.querySelectorAll("#main-form input, #main-form select");
    mainInputs.forEach(input => {
        input.disabled = lock;
        input.parentElement?.classList.toggle("disabled", lock);
    });
}













// F U N K C J E    Z M I E N N E    O P R O C E N T O W A N I E

function createVariableOprocentowanieGroup(startPeriod = 2) {
    const iloscRat = parseInt(elements.iloscRat?.value) || 420;
    const group = document.createElement("div");
    group.classList.add("variable-input-group");
    group.setAttribute("data-type", "oprocentowanie");
    group.innerHTML = `
        <div class="fields-wrapper">
            <div class="form-group box-period">
                <label class="form-label">Od</label>
                <div class="input-group">
                    <input type="number" class="form-control variable-cykl" min="${startPeriod}" max="${iloscRat}" step="1" value="${startPeriod}">
                    <span class="input-group-text unit-miesiaca">miesiąca</span>
                </div>
                <input type="range" class="form-range range-slider variable-cykl-range" min="${startPeriod}" max="${iloscRat}" step="1" value="${startPeriod}">
            </div>
            <div class="form-group box-rate">
                <label class="form-label">Oprocentowanie</label>
                <div class="input-group">
                    <input type="number" class="form-control variable-rate" min="0.1" max="25" step="0.1" value="7">
                    <span class="input-group-text">%</span>
                </div>
                <input type="range" class="form-range range-slider variable-rate-range" min="0.1" max="25" step="0.1" value="7">
            </div>
        </div>
    `;
    return group;
}

function initializeVariableOprocentowanieGroup(group) {
    const iloscRat = parseInt(elements.iloscRat?.value) || 420;

    const inputs = group.querySelectorAll(".form-control");
    const ranges = group.querySelectorAll(".form-range");

    inputs.forEach((input, index) => {
        const range = ranges[index];
        if (input.classList.contains("variable-cykl")) {
            input.max = iloscRat;
            range.max = iloscRat;
            syncInputWithRange(input, range);
        } else if (input.classList.contains("variable-rate")) {
            syncInputWithRange(input, range);
        }

        input.addEventListener("input", () => {
            syncInputWithRange(input, range);
            updateRatesArray("oprocentowanie");
            updateVariableOprocentowanieRemoveButtons(); // Aktualizuj przyciski po zmianie
        });

        range.addEventListener("input", () => {
            input.value = range.value;
            updateRatesArray("oprocentowanie");
            updateVariableOprocentowanieRemoveButtons(); // Aktualizuj przyciski po zmianie
        });
    });
}

function resetVariableOprocentowanieSection() {
    elements.variableOprocentowanieWrapper.innerHTML = "";
    state.variableRates = [];
    const defaultOprocentowanie = 7;
    let oprocentowanieValue = parseFloat(elements.oprocentowanie.dataset.lastManualValue) || defaultOprocentowanie;
    const minValue = parseFloat(elements.oprocentowanie.min) || 0;
    const maxValue = parseFloat(elements.oprocentowanie.max) || Infinity;

    if (oprocentowanieValue < minValue) oprocentowanieValue = minValue;
    if (oprocentowanieValue > maxValue) oprocentowanieValue = maxValue;

    elements.oprocentowanie.value = oprocentowanieValue.toFixed(2);
    elements.oprocentowanieRange.value = oprocentowanieValue;
    
    delete elements.oprocentowanie.dataset.lastManualValue;
    updateVariableOprocentowanieRemoveButtons(); // Upewnij się, że przyciski są odpowiednio zaktualizowane
    updateInputFieldsState(); // Aktualizuj stan pól po resecie
}

function updateVariableOprocentowanieRemoveButtons() {
    const wrapper = elements.variableOprocentowanieWrapper;
    const groups = wrapper.querySelectorAll(".variable-input-group");
    let existingRemoveBtnWrapper = wrapper.querySelector(".remove-btn-wrapper");

    if (existingRemoveBtnWrapper) {
        existingRemoveBtnWrapper.remove();
    }

    if (groups.length > 0) {
        const lastGroup = groups[groups.length - 1];
        existingRemoveBtnWrapper = document.createElement("div");
        existingRemoveBtnWrapper.classList.add("remove-btn-wrapper");
        existingRemoveBtnWrapper.style.display = "flex";
        existingRemoveBtnWrapper.style.flexDirection = "column";
        existingRemoveBtnWrapper.style.alignItems = "center";
        existingRemoveBtnWrapper.style.gap = "5px";
        existingRemoveBtnWrapper.style.marginTop = "10px";

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.classList.add("btn", "btn-danger", "btn-sm", "btn-reset");
        removeBtn.setAttribute("aria-label", "Usuń oprocentowanie");
        removeBtn.textContent = "Usuń";
        existingRemoveBtnWrapper.appendChild(removeBtn);

        const addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.id = "addVariableOprocentowanieBtn";
        addBtn.classList.add("btn", "btn-functional");
        addBtn.setAttribute("aria-label", "Dodaj kolejne zmienne oprocentowanie");
        addBtn.textContent = "Dodaj kolejną zmianę";
        existingRemoveBtnWrapper.appendChild(addBtn);

        lastGroup.appendChild(existingRemoveBtnWrapper);

        removeBtn.addEventListener("click", () => {
            lastGroup.remove();
            updateRatesArray("oprocentowanie");
            if (wrapper.querySelectorAll(".variable-input-group").length === 0) {
                elements.zmienneOprocentowanieBtn.checked = false;
                elements.variableOprocentowanieInputs.classList.remove("active");
                resetVariableOprocentowanieSection();
            }
            updateVariableOprocentowanieRemoveButtons();
            updateInputFieldsState(); // Aktualizuj stan pól po usunięciu
        });

        addBtn.addEventListener("click", () => {
            const groups = elements.variableOprocentowanieWrapper.querySelectorAll(".variable-input-group");
            const lastGroup = groups[groups.length - 1];
            const lastPeriodInput = lastGroup.querySelector(".variable-cykl");
            const lastPeriodValue = parseInt(lastPeriodInput.value) || 2;
            const maxPeriod = parseInt(elements.iloscRat?.value) || 420;
            const newStartPeriod = lastPeriodValue + 1;

            if (newStartPeriod <= maxPeriod) {
                const newGroup = createVariableOprocentowanieGroup(newStartPeriod);
                elements.variableOprocentowanieWrapper.appendChild(newGroup);
                initializeVariableOprocentowanieGroup(newGroup);
                updateRatesArray("oprocentowanie");
                updateVariableOprocentowanieRemoveButtons();
            }
        });

        // Ustaw widoczność przycisku "Dodaj kolejną zmianę" na podstawie okresu
        const lastPeriodInput = lastGroup.querySelector(".variable-cykl");
        const lastPeriodValue = parseInt(lastPeriodInput.value) || 2;
        const maxPeriod = parseInt(elements.iloscRat?.value) || 420;
        addBtn.style.display = lastPeriodValue >= maxPeriod ? "none" : "block";
    } else {
        updateInputFieldsState(); // Aktualizuj stan pól, jeśli nie ma grup
    }
}

function toggleAddButtonVisibility() {
    const addButton = document.getElementById("addVariableOprocentowanieBtn");
    const groups = elements.variableOprocentowanieWrapper.querySelectorAll(".variable-input-group");
    const maxPeriod = parseInt(elements.iloscRat?.value) || 420;

    // Jeśli nie ma przycisku "Dodaj" lub nie ma grup, nie rób nic
    if (!addButton) return;

    if (groups.length === 0) {
        // Nie ukrywaj przycisku, jeśli nie ma grup - pozwól, aby updateVariableOprocentowanieRemoveButtons zarządzało widocznością
        return;
    }

    const lastGroup = groups[groups.length - 1];
    const lastPeriodInput = lastGroup.querySelector(".variable-cykl");
    const lastPeriodValue = parseInt(lastPeriodInput.value) || 2;

    addButton.style.display = lastPeriodValue >= maxPeriod ? "none" : "block";
}

function initializeZmienneOprocentowanieToggle() {
    if (elements.zmienneOprocentowanieBtn) {
        elements.zmienneOprocentowanieBtn.addEventListener("change", () => {
            if (elements.zmienneOprocentowanieBtn.checked) {
                elements.variableOprocentowanieInputs.classList.add("active");
                elements.variableOprocentowanieWrapper.innerHTML = "";
                const newGroup = createVariableOprocentowanieGroup(2);
                elements.variableOprocentowanieWrapper.appendChild(newGroup);
                initializeVariableOprocentowanieGroup(newGroup);
                updateRatesArray("oprocentowanie");
                updateVariableOprocentowanieRemoveButtons(); // Upewnij się, że przyciski są widoczne
                updateInputFieldsState(); // Zablokuj pola przy włączeniu
            } else {
                elements.variableOprocentowanieInputs.classList.remove("active");
                resetVariableOprocentowanieSection();
                updateVariableOprocentowanieRemoveButtons();
                updateInputFieldsState(); // Odblokuj pola, jeśli Nadpłata Kredytu też jest wyłączona
            }
            updateKwotaInfo();
        });

        elements.oprocentowanie.addEventListener("change", () => {
            if (!elements.zmienneOprocentowanieBtn.checked) {
                elements.oprocentowanie.dataset.lastManualValue = elements.oprocentowanie.value;
            }
        });

        elements.oprocentowanieRange.addEventListener("change", () => {
            if (!elements.zmienneOprocentowanieBtn.checked) {
                elements.oprocentowanie.dataset.lastManualValue = elements.oprocentowanieRange.value;
            }
        });

        elements.iloscRat.addEventListener("input", () => {
            const groups = elements.variableOprocentowanieWrapper.querySelectorAll(".variable-input-group");
            groups.forEach(group => initializeVariableOprocentowanieGroup(group));
            updateVariableOprocentowanieRemoveButtons(); // Aktualizuj przyciski po zmianie ilości rat
        });

        elements.iloscRatRange.addEventListener("input", () => {
            const groups = elements.variableOprocentowanieWrapper.querySelectorAll(".variable-input-group");
            groups.forEach(group => initializeVariableOprocentowanieGroup(group));
            updateVariableOprocentowanieRemoveButtons(); // Aktualizuj przyciski po zmianie ilości rat
        });
    }
}









// F U N K C J E    O B L I C Z E N I A    K R E D Y T U

function calculateInstallment(kwota, iloscRat, pozostalyKapital, currentOprocentowanie, nadplata, activeOverpayment, rodzajRat) {
    let odsetki = pozostalyKapital * currentOprocentowanie;
    let rataKapitalowa = 0;
    let rataCalkowita = 0;

    if (rodzajRat === "rowne") {
        let q = 1 + currentOprocentowanie;
        // Sprawdź, czy q ** iloscRat nie powoduje nieskończoności
        if (iloscRat > 0 && !isNaN(q)) {
            rataCalkowita = kwota * (q ** iloscRat) * (q - 1) / ((q ** iloscRat) - 1);
            if (isNaN(rataCalkowita) || rataCalkowita <= 0) {
                rataCalkowita = 0;
            }
        }
        rataKapitalowa = rataCalkowita - odsetki;

        if (activeOverpayment && activeOverpayment.effect === "Zmniejsz ratę") {
            rataKapitalowa += nadplata;
        }

        if (rataKapitalowa > pozostalyKapital) {
            rataKapitalowa = pozostalyKapital;
            rataCalkowita = rataKapitalowa + odsetki;
        }
    } else {
        rataKapitalowa = kwota / iloscRat;
        rataCalkowita = rataKapitalowa + odsetki;

        if (activeOverpayment && activeOverpayment.effect === "Zmniejsz ratę") {
            rataKapitalowa += nadplata;
        }

        if (rataKapitalowa > pozostalyKapital) {
            rataKapitalowa = pozostalyKapital;
            rataCalkowita = rataKapitalowa + odsetki;
        }
    }

    return { rataCalkowita, rataKapitalowa, odsetki };
}

function calculateLoan(kwota, oprocentowanie, iloscRat, rodzajRat, prowizja, prowizjaJednostka, variableRates = [], overpaymentRates = []) {
    try {
        let pozostalyKapital = kwota;
        let harmonogram = [];
        let calkowiteOdsetki = 0;
        let calkowiteNadplaty = 0;
        let prowizjaKwota = prowizjaJednostka === "procent" ? (prowizja / 100) * kwota : prowizja;
        let pozostaleRaty = iloscRat;
        let oprocentowanieMiesieczne = oprocentowanie / 100 / 12;

        // Upewnij się, że variableRates i overpaymentRates są tablicami
        let activeVariableRates = Array.isArray(variableRates) ? [...variableRates].sort((a, b) => a.period - b.period) : [];
        let activeOverpaymentRates = Array.isArray(overpaymentRates) ? [...overpaymentRates].sort((a, b) => a.start - b.start) : [];

        // Walidacja danych wejściowych
        if (isNaN(kwota) || kwota <= 0) throw new Error("Nieprawidłowa kwota kredytu");
        if (isNaN(oprocentowanie) || oprocentowanie <= 0) throw new Error("Nieprawidłowe oprocentowanie");
        if (isNaN(iloscRat) || iloscRat <= 0) throw new Error("Nieprawidłowa ilość rat");
        if (!["rowne", "malejace"].includes(rodzajRat)) throw new Error("Nieprawidłowy rodzaj rat");

        for (let i = 1; i <= iloscRat; i++) {
            let currentOprocentowanie = oprocentowanieMiesieczne;
            let activeRate = activeVariableRates.find(rate => rate.period === i);
            if (activeRate && !isNaN(activeRate.value)) {
                currentOprocentowanie = activeRate.value / 100 / 12;
            }

            let nadplata = 0;
            let activeOverpayment = activeOverpaymentRates.find(over => i >= over.start && (over.type === "Jednorazowa" ? i === over.start : i <= over.end));
            if (activeOverpayment) {
                if (activeOverpayment.type === "Jednorazowa" && i === activeOverpayment.start) {
                    nadplata = activeOverpayment.amount;
                } else if (activeOverpayment.type === "Miesięczna") {
                    nadplata = activeOverpayment.amount;
                }

                if (nadplata > 0 && activeOverpayment.effect === "Skróć okres") {
                    calkowiteNadplaty += nadplata;
                    pozostalyKapital -= nadplata;
                    if (pozostalyKapital <= 0) {
                        pozostalyKapital = 0;
                        pozostaleRaty = i;
                        harmonogram.push({
                            miesiac: i,
                            rata: parseFloat((0).toFixed(2)),
                            oprocentowanie: parseFloat((currentOprocentowanie * 12 * 100).toFixed(2)),
                            nadplata: parseFloat(nadplata.toFixed(2)),
                            kapital: parseFloat((0).toFixed(2)),
                            odsetki: parseFloat((0).toFixed(2)),
                            kapitalDoSplaty: parseFloat((0).toFixed(2)),
                        });
                        break;
                    }
                }
            }

            const { rataCalkowita, rataKapitalowa, odsetki } = calculateInstallment(
                kwota,
                iloscRat,
                pozostalyKapital,
                currentOprocentowanie,
                nadplata,
                activeOverpayment,
                rodzajRat
            );

            if (activeOverpayment && activeOverpayment.effect === "Zmniejsz ratę" && nadplata > 0) {
                calkowiteNadplaty += nadplata;
            }

            pozostalyKapital -= rataKapitalowa;
            calkowiteOdsetki += odsetki;

            harmonogram.push({
                miesiac: i,
                rata: parseFloat(rataCalkowita.toFixed(2)),
                oprocentowanie: parseFloat((currentOprocentowanie * 12 * 100).toFixed(2)),
                nadplata: parseFloat(nadplata.toFixed(2)),
                kapital: parseFloat(rataKapitalowa.toFixed(2)),
                odsetki: parseFloat(odsetki.toFixed(2)),
                kapitalDoSplaty: parseFloat(pozostalyKapital.toFixed(2)),
            });

            if (pozostalyKapital <= 0) {
                pozostaleRaty = i;
                break;
            }
        }

        let calkowityKoszt = kwota + calkowiteOdsetki + prowizjaKwota;

        return {
            harmonogram,
            calkowityKoszt: parseFloat(calkowityKoszt.toFixed(2)),
            calkowiteOdsetki: parseFloat(calkowiteOdsetki.toFixed(2)),
            calkowiteNadplaty: parseFloat(calkowiteNadplaty.toFixed(2)),
            prowizja: parseFloat(prowizjaKwota.toFixed(2)),
            pozostaleRaty,
        };
    } catch (error) {
        console.error("Błąd podczas obliczania kredytu:", error.message);
        alert(`Wystąpił błąd podczas obliczania kredytu: ${error.message}`);
        return null;
    }
}







// F U N K C J E    W Y N I K I    I    W Y K R E S Y

function updateResults(data) {
    elements.valueKapital.textContent = (data.harmonogram.reduce((sum, row) => sum + row.kapital, 0)).toLocaleString("pl-PL", { minimumFractionDigits: 2 }) + " zł";
    elements.valueOdsetki.textContent = data.calkowiteOdsetki.toLocaleString("pl-PL", { minimumFractionDigits: 2 }) + " zł";
    elements.valueNadplata.textContent = data.calkowiteNadplaty.toLocaleString("pl-PL", { minimumFractionDigits: 2 }) + " zł";
    elements.valueProwizja.textContent = data.prowizja.toLocaleString("pl-PL", { minimumFractionDigits: 2 }) + " zł";
    elements.okresPoNadplacie.textContent = data.pozostaleRaty + " miesięcy (" + (data.pozostaleRaty / 12).toFixed(1) + " lat)";
    elements.koszt.textContent = data.calkowityKoszt.toLocaleString("pl-PL", { minimumFractionDigits: 2 }) + " zł";

    // Generowanie tabelki harmonogramu
    elements.harmonogramTabela.innerHTML = `
        <tr>
            <th>Miesiąc</th>
            <th>Rata całkowita</th>
            <th>Rata kapitałowa</th>
            <th>Odsetki</th>
            <th>Nadpłata</th>
            <th>Pozostały kapitał</th>
        </tr>
        ${data.harmonogram.map(row => `
            <tr>
                <td>${row.miesiac}</td>
                <td>${row.rata.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł</td>
                <td>${row.kapital.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł</td>
                <td>${row.odsetki.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł</td>
                <td>${row.nadplata.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł</td>
                <td>${row.kapitalDoSplaty.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł</td>
            </tr>
        `).join('')}
    `;

    // Aktualizacja wykresu po wygenerowaniu wyników
    updateChart(data);
}






// F U N K C J E    I N T E R A K C J I    Z   U Ż Y T K O W N I K I E M

let currentZoom = 1;
const zoomStep = 0.1;
const minZoom = 0.5;
const maxZoom = 2;

function updateZoom() {
    const container = document.querySelector('.container');
    if (!container) {
        console.error("Element .container nie został znaleziony!");
        return;
    }
    container.style.transform = `scale(${currentZoom})`;
    container.style.transformOrigin = 'top center';
}

function showForm() {
    if (elements.formSection && elements.resultSection) {
        elements.resultSection.style.display = "none";
        elements.formSection.style.display = "block";
        elements.resultSection.classList.remove("active");
        currentZoom = 1; // Reset zoomu
        updateZoom();
        console.log("Powrót do edycji wykonany, zoom zresetowany do 1");
    } else {
        console.error("Sekcje formSection lub resultSection nie zostały znalezione!");
    }
}

function initializeButtons() {
    elements.obliczBtn.addEventListener("click", () => {
        const kwota = parseFloat(elements.kwota.value) || 500000;
        const iloscRat = parseInt(elements.iloscRat.value) || 360;
        const oprocentowanie = parseFloat(elements.oprocentowanie.value) || 7;
        const rodzajRat = elements.rodzajRat.value || "rowne";
        const prowizja = parseFloat(elements.prowizja.value) || 2;
        const prowizjaJednostka = elements.jednostkaProwizji.value || "procent";

        const variableRates = Array.isArray(state.variableRates) ? state.variableRates : [];
        const overpaymentRates = Array.isArray(state.overpaymentRates) ? state.overpaymentRates : [];

        const data = calculateLoan(
            kwota,
            oprocentowanie,
            iloscRat,
            rodzajRat,
            prowizja,
            prowizjaJednostka,
            variableRates,
            overpaymentRates
        );

        if (data) {
            state.lastFormData = data;
            elements.formSection.style.display = "none";
            elements.resultSection.style.display = "block";
            elements.resultSection.classList.add("active");
            updateResults(data);
            updateZoom();
        } else {
            elements.resultSection.style.display = "none";
            elements.formSection.style.display = "block";
        }
    });

    elements.generatePdfBtn.addEventListener("click", () => {
        if (state.lastFormData && state.lastFormData.harmonogram) {
            generatePDF();
        } else {
            alert("Najpierw oblicz harmonogram, aby wygenerować PDF!");
        }
    });

    window.showForm = showForm;

    elements.zoomInBtn.addEventListener("click", () => {
        if (currentZoom < maxZoom) {
            currentZoom = Math.min(maxZoom, currentZoom + zoomStep);
            updateZoom();
            console.log(`Zoom zwiększony do: ${currentZoom}`);
        }
    });

    elements.zoomOutBtn.addEventListener("click", () => {
        if (currentZoom > minZoom) {
            currentZoom = Math.max(minZoom, currentZoom - zoomStep);
            updateZoom();
            console.log(`Zoom zmniejszony do: ${currentZoom}`);
        }
    });

    elements.toggleDarkModeBtn.addEventListener("click", () => {
        state.isDarkMode = !state.isDarkMode;
        document.body.classList.toggle("dark-mode", state.isDarkMode);
        elements.toggleDarkModeBtn.innerHTML = state.isDarkMode ? "☀️" : "🌙";
        elements.toggleDarkModeBtn.setAttribute("aria-label", state.isDarkMode ? "Przełącz na tryb jasny" : "Przełącz na tryb ciemny");
        if (state.lastFormData) {
            updateChart(state.lastFormData);
        }
    });
}








// I N I C J A L I Z A C J A

function initializeApp() {
    initializeInputHandling();
    initializeNadplataKredytuToggle();
    initializeZmienneOprocentowanieToggle();
    initializeButtons();

    // Ustaw początkowe wartości
    updateKwotaInfo();
    updateLata();
    updateProwizjaInfo();
    syncProwizjaWithKwota();
    updateInputFieldsState();

    // Załaduj domyślne dane i oblicz
    const defaultData = calculateLoan(
        state.lastFormData.kwota,
        state.lastFormData.oprocentowanie,
        state.lastFormData.iloscRat,
        state.lastFormData.rodzajRat,
        state.lastFormData.prowizja,
        state.lastFormData.jednostkaProwizji
    );
    if (defaultData) {
        state.lastFormData = defaultData;
        elements.resultSection.classList.add("active");
        updateResults(defaultData);
        applyZoom();
    }
}

document.addEventListener("DOMContentLoaded", initializeApp);
