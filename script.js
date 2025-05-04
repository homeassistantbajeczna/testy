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
    elements.lata.textContent = `Okres spłaty: ${iloscRat / 12} lat (${iloscRat} miesięcy)`;
}

function updateProwizjaInfo() {
    const prowizja = parseFloat(elements.prowizja.value) || 0;
    const jednostka = elements.jednostkaProwizji.value;
    const kwota = parseFloat(elements.kwota.value) || 0;
    const prowizjaKwota = jednostka === "procent" ? (prowizja / 100) * kwota : prowizja;
    elements.prowizjaInfo.textContent = `Prowizja: ${prowizjaKwota.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł`;
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

        // Zamień przecinek na kropkę i usuń nieprawidłowe znaki, zachowując kropkę
        value = value.replace(",", ".").replace(/[^0-9.]/g, "");

        // Zapobiegnij wpisywaniu więcej niż jednej kropki
        const dotCount = value.split(".").length - 1;
        if (dotCount > 1) {
            value = value.substring(0, value.lastIndexOf("."));
        }

        // Aktualizuj pole tekstowe bez natychmiastowego formatowania
        elements.kwota.value = value;

        // Parsuj wartość do synchronizacji z suwakiem
        let parsedValue = parseFloat(value) || 0;
        let minValue = parseFloat(elements.kwota.min) || 0;
        let maxValue = parseFloat(elements.kwota.max) || Infinity;

        if (parsedValue < minValue) parsedValue = minValue;
        if (parsedValue > maxValue) parsedValue = maxValue;

        elements.kwotaRange.value = parsedValue; // Synchronizuj suwak
        updateKwotaInfo();
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

        // Zachowaj pełną precyzję w polu, formatowanie w updateKwotaInfo
        elements.kwota.value = parsedValue.toString();
        elements.kwotaRange.value = parsedValue;
        updateKwotaInfo();
    });

    elements.kwotaRange.addEventListener("input", () => {
        let value = parseFloat(elements.kwotaRange.value);
        elements.kwota.value = value.toString(); // Zachowaj pełną wartość z suwaka
        updateKwotaInfo();
    });

    // Ilość Rat
    elements.iloscRat.addEventListener("input", () => {
        syncInputWithRange(elements.iloscRat, elements.iloscRatRange, updateLata);
    });
    elements.iloscRatRange.addEventListener("input", () => {
        syncInputWithRange(elements.iloscRatRange, elements.iloscRat, updateLata);
    });

    // Oprocentowanie
    elements.oprocentowanie.addEventListener("input", () => {
        syncInputWithRange(elements.oprocentowanie, elements.oprocentowanieRange);
    });
    elements.oprocentowanieRange.addEventListener("input", () => {
        syncInputWithRange(elements.oprocentowanieRange, elements.oprocentowanie);
    });

    // Prowizja
    elements.prowizja.addEventListener("input", () => {
        syncInputWithRange(elements.prowizja, elements.prowizjaRange, updateProwizjaInfo);
    });
    elements.prowizjaRange.addEventListener("input", () => {
        syncInputWithRange(elements.prowizjaRange, elements.prowizja, updateProwizjaInfo);
    });

    // Jednostka Prowizji
    elements.jednostkaProwizji.addEventListener("change", updateProwizjaInfo);
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

function updateOverpaymentLimit(input, range, group) {
    if (!group || !group.parentElement) {
        console.log("Group jest undefined lub nie istnieje w DOM, pomijam updateOverpaymentLimit");
        return 0;
    }

    const typeSelect = group.querySelector(".nadplata-type-select");
    const type = typeSelect?.value || "Jednorazowa";
    const periodStartInput = group.querySelector(".variable-cykl-start");
    const periodEndInput = group.querySelector(".variable-cykl-end");
    
    const iloscRat = parseInt(elements.iloscRat?.value) || 360;
    const periodStart = parseInt(periodStartInput?.value) || 1;
    const periodEnd = periodEndInput ? parseInt(periodEndInput?.value) || periodStart : periodStart;

    const groups = elements.nadplataKredytuWrapper.querySelectorAll(".variable-input-group");
    const currentIndex = Array.from(groups).indexOf(group);

    let remainingCapital = parseFloat(elements.kwota?.value) || 500000;
    const oprocentowanie = parseFloat(elements.oprocentowanie?.value) || 7;
    const rodzajRat = elements.rodzajRat?.value || "rowne";
    const monthlyRate = oprocentowanie / 100 / 12;

    let previousOverpayments = [];
    for (let i = 0; i < currentIndex; i++) {
        const prevGroup = groups[i];
        if (!prevGroup || !prevGroup.parentElement) continue;
        const prevType = prevGroup.querySelector(".nadplata-type-select")?.value || "Jednorazowa";
        const prevPeriodStart = parseInt(prevGroup.querySelector(".variable-cykl-start")?.value) || 1;
        const prevPeriodEnd = prevGroup.querySelector(".variable-cykl-end") ? parseInt(prevGroup.querySelector(".variable-cykl-end")?.value) || prevPeriodStart : prevPeriodStart;
        const prevAmount = parseFloat(prevGroup.querySelector(".variable-rate")?.value) || 0;
        const prevEffect = prevGroup.querySelector(".nadplata-effect-select")?.value || "Skróć okres";

        previousOverpayments.push({
            type: prevType,
            start: prevPeriodStart,
            end: prevPeriodEnd,
            amount: prevAmount,
            effect: prevEffect,
        });
    }

    let currentCapital = remainingCapital;
    let rata = rodzajRat === "rowne"
        ? (currentCapital * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -iloscRat))
        : (currentCapital / iloscRat) + (currentCapital * monthlyRate);

    for (let month = 1; month <= periodStart - 1; month++) {
        const odsetki = currentCapital * monthlyRate;
        let kapital = rata - odsetki;
        if (kapital > currentCapital) kapital = currentCapital;

        currentCapital -= kapital;

        previousOverpayments.forEach((overpayment) => {
            let applyOverpayment = false;
            if (overpayment.type === "Jednorazowa" && overpayment.start === month) {
                applyOverpayment = true;
            } else if (overpayment.type === "Miesięczna" && month >= overpayment.start && month <= overpayment.end) {
                applyOverpayment = true;
            }

            if (applyOverpayment) {
                let overpaymentAmount = overpayment.amount;
                if (overpaymentAmount > currentCapital) overpaymentAmount = currentCapital;
                currentCapital -= overpaymentAmount;

                if (overpayment.effect === "Zmniejsz ratę" && currentCapital > 0) {
                    const remainingMonths = iloscRat - month;
                    if (remainingMonths > 0) {
                        rata = rodzajRat === "rowne"
                            ? (currentCapital * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -remainingMonths))
                            : (currentCapital / remainingMonths) + (currentCapital * monthlyRate);
                    }
                }
            }
        });

        if (currentCapital <= 0) break;
    }

    remainingCapital = currentCapital;

    let maxAllowed = remainingCapital;

    if (type !== "Jednorazowa") {
        let numberOfOverpayments = 0;
        if (type === "Miesięczna") {
            numberOfOverpayments = periodEnd - periodStart + 1;
        }

        if (numberOfOverpayments > 0) {
            maxAllowed = remainingCapital / numberOfOverpayments;
        }
    }

    maxAllowed = Math.max(100, maxAllowed);

    input.max = maxAllowed;
    range.max = maxAllowed;

    let value = parseFloat(input.value) || 0;
    if (value > maxAllowed) {
        input.value = maxAllowed.toFixed(2);
        range.value = maxAllowed;
    }

    if (remainingCapital <= 0) {
        for (let i = groups.length - 1; i > currentIndex; i--) {
            const groupToRemove = groups[i];
            if (groupToRemove && groupToRemove.parentElement) {
                groupToRemove.remove();
            }
        }
    }

    updateRatesArray("nadplata");
    debouncedUpdateAllOverpaymentLimits();

    return remainingCapital;
}

const debouncedUpdateAllOverpaymentLimits = debounce(() => {
    state.isUpdating = false;
    updateAllOverpaymentLimits();
}, 150);

function updateAllOverpaymentLimits() {
    if (state.isUpdating) {
        console.log("Aktualizacja już w toku, pomijam updateAllOverpaymentLimits");
        return { remainingCapital: 0, lastMonthWithCapital: null };
    }

    state.isUpdating = true;

    const groups = elements.nadplataKredytuWrapper.querySelectorAll(".variable-input-group");
    let lastRemainingCapital = null;
    let lastMonthWithCapital = null;

    let lastOverpaymentMonth = 1;
    const overpayments = [];
    groups.forEach((g, index) => {
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
    const oprocentowanie = parseFloat(elements.oprocentowanie?.value) || 7;
    const iloscRat = parseInt(elements.iloscRat?.value) || 360;
    const rodzajRat = elements.rodzajRat?.value || "rowne";
    const monthlyRate = oprocentowanie / 100 / 12;

    let currentCapital = remainingCapital;
    let rata = rodzajRat === "rowne"
        ? (currentCapital * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -iloscRat))
        : (currentCapital / iloscRat) + (currentCapital * monthlyRate);

    for (let month = 1; month <= lastOverpaymentMonth; month++) {
        const odsetki = currentCapital * monthlyRate;
        let kapital = rata - odsetki;
        if (kapital < 0) kapital = 0;
        if (kapital > currentCapital) kapital = currentCapital;

        currentCapital -= kapital;

        overpayments.forEach((overpayment) => {
            let applyOverpayment = false;
            if (overpayment.type === "Jednorazowa" && overpayment.start === month) {
                applyOverpayment = true;
            } else if (overpayment.type === "Miesięczna" && month >= overpayment.start && month <= overpayment.end) {
                applyOverpayment = true;
            }

            if (applyOverpayment && currentCapital > 0) {
                let overpaymentAmount = overpayment.amount;
                if (overpaymentAmount > currentCapital) overpaymentAmount = currentCapital;
                currentCapital -= overpaymentAmount;

                if (overpayment.effect === "Zmniejsz ratę" && currentCapital > 0) {
                    const remainingMonths = iloscRat - month;
                    if (remainingMonths > 0) {
                        rata = rodzajRat === "rowne"
                            ? (currentCapital * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -remainingMonths))
                            : (currentCapital / remainingMonths) + (currentCapital * monthlyRate);
                        if (isNaN(rata) || rata < 0) rata = 0;
                    }
                }
            }
        });

        if (currentCapital <= 0) {
            currentCapital = 0;
            lastMonthWithCapital = month;
            break;
        }
    }

    lastRemainingCapital = currentCapital;

    let maxPeriodLimit = lastMonthWithCapital !== null ? Math.min(lastMonthWithCapital, iloscRat) : iloscRat;
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

        let minPeriodStart = 1;
        if (index > 0) {
            const previousGroup = groups[index - 1];
            if (previousGroup && previousGroup.parentElement) {
                const previousType = previousGroup.querySelector(".nadplata-type-select")?.value || "Jednorazowa";
                const previousPeriodStartValue = parseInt(previousGroup.querySelector(".variable-cykl-start")?.value) || 1;
                let previousPeriodEndValue = previousPeriodStartValue;
                if (previousType !== "Jednorazowa") {
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

        if (periodEndInput && periodEndRange) {
            const type = g.querySelector(".nadplata-type-select")?.value || "Jednorazowa";
            if (type !== "Jednorazowa") {
                const periodStartValue = parseInt(periodStartInput?.value) || minPeriodStart;
                const minPeriodEnd = periodStartValue;
                periodEndInput.min = minPeriodEnd;
                periodEndRange.min = minPeriodEnd;
                periodEndInput.max = maxPeriodLimit;
                periodEndRange.max = maxPeriodLimit;

                let periodEndValue = parseInt(periodEndInput.value) || minPeriodEnd;
                if (periodEndValue < minPeriodEnd) periodEndValue = minPeriodEnd;
                if (periodEndValue > maxPeriodLimit) periodEndValue = maxPeriodLimit;
                periodEndInput.value = periodEndValue;
                periodEndRange.value = periodEndValue;
                syncInputWithRange(periodEndInput, periodEndRange);
            }
        }
    });

    updateRatesArray("nadplata");
    state.isUpdating = false;
    debouncedUpdateNadplataKredytuRemoveButtons();
    return { remainingCapital: lastRemainingCapital !== null ? lastRemainingCapital : remainingCapital, lastMonthWithCapital: maxPeriodLimit };
}

function initializeNadplataKredytuGroup(group) {
    const kwota = parseFloat(elements.kwota?.value) || 500000;
    const iloscRat = parseInt(elements.iloscRat?.value) || 360;
    const oprocentowanie = parseFloat(elements.oprocentowanie?.value) || 7;
    const rodzajRat = elements.rodzajRat?.value || "rowne";

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
        if (state.isUpdating) {
            console.log("Aktualizacja już w toku, pomijam updatePeriodBox");
            return;
        }

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
                periodStartInput.min = 1;
                periodStartRange.min = 1;
                periodStartInput.max = maxValue;
                periodStartRange.max = maxValue;
                periodStartInput.step = 1;
                periodStartRange.step = 1;

                let periodStartValue = parseInt(periodStartInput.value) || 1;
                if (periodStartValue > maxValue) periodStartValue = maxValue;
                periodStartInput.value = periodStartValue;
                periodStartRange.value = periodStartValue;
                syncInputWithRange(periodStartInput, periodStartRange);
            }
        } else {
            if (periodLabel) periodLabel.textContent = "OD";
            if (type === "Miesięczna") {
                if (periodUnit) periodUnit.textContent = "miesiąca";
                maxValue = maxPeriodLimit;
                stepValue = 1;
            }

            let minPeriodStart = 1;
            if (currentIndex > 0) {
                const previousGroup = groups[currentIndex - 1];
                if (previousGroup && previousGroup.parentElement) {
                    const previousType = previousGroup.querySelector(".nadplata-type-select")?.value || "Jednorazowa";
                    const previousPeriodStartValue = parseInt(previousGroup.querySelector(".variable-cykl-start")?.value) || 1;
                    let previousPeriodEndValue = previousPeriodStartValue;
                    if (previousType !== "Jednorazowa") {
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
                if (endUnit) {
                    endUnit.textContent = type === "Miesięczna" ? "miesiąca" : "miesiąca";
                }

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
            } else if (type !== "Jednorazowa") {
                minValue = parseInt(periodStartInput?.value) || minPeriodStart;
                defaultValue = minValue;

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
                    if (previousType !== "Jednorazowa") {
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
                }
            }, 300);

            input.addEventListener("blur", () => {
                let value = parseInt(input.value.replace(/[^0-9]/g, "")) || minPeriodStart;
                if (value < minPeriodStart) value = minPeriodStart;
                if (value > maxPeriodLimit) value = maxPeriodLimit;
                input.value = value;
                range.value = value;
                debouncedUpdate();
            });

            range.addEventListener("input", () => {
                input.value = parseInt(range.value);
                debouncedUpdate();
            });
        } else if (input.classList.contains("variable-rate")) {
            const debouncedUpdate = debounce(() => {
                updateOverpaymentLimit(input, range, group);
                debouncedUpdateNadplataKredytuRemoveButtons();
            }, 300);

            input.addEventListener("blur", () => {
                let value = input.value.replace(",", ".").replace(/[^0-9.]/g, "");
                let parsedValue = parseFloat(value);
                let maxAllowed = parseFloat(input.max) || 5000000;
                let minAllowed = parseFloat(input.min) || 100;

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
                input.value = value.toFixed(2);
                debouncedUpdate();
            });
        } else if (input.classList.contains("variable-cykl-end")) {
            const range = group.querySelector(".variable-cykl-end-range");
            const periodStartInput = group.querySelector(".variable-cykl-start");

            const { lastMonthWithCapital } = updateAllOverpaymentLimits();
            let maxPeriodLimit = lastMonthWithCapital !== null ? Math.min(lastMonthWithCapital, iloscRat) : iloscRat;

            if (input && range) {
                const debouncedUpdate = debounce(() => {
                    const rateInput = group.querySelector(".variable-rate");
                    const rateRange = group.querySelector(".variable-rate-range");
                    if (rateInput && rateRange) {
                        updateOverpaymentLimit(rateInput, rateRange, group);
                        updateRatesArray("nadplata");
                    }
                }, 300);

                input.addEventListener("blur", () => {
                    let minValue = parseInt(periodStartInput?.value) || 1;
                    let value = parseInt(input.value.replace(/[^0-9]/g, "")) || minValue;
                    if (value < minValue) value = minValue;
                    if (value > maxPeriodLimit) value = maxPeriodLimit;
                    input.value = value;
                    range.value = value;
                    debouncedUpdate();
                });

                range.addEventListener("input", () => {
                    let minValue = parseInt(periodStartInput?.value) || 1;
                    let value = parseInt(range.value);
                    if (value < minValue) value = minValue;
                    if (value > maxPeriodLimit) value = maxPeriodLimit;
                    input.value = value;
                    range.value = value;
                    debouncedUpdate();
                });
            }
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
        });
    }

    if (effectSelect) {
        effectSelect.addEventListener("change", () => {
            updateRatesArray("nadplata");
            updateAllOverpaymentLimits();
        });
    }

    updatePeriodBox();
    const rateInput = group.querySelector(".variable-rate");
    const rateRange = group.querySelector(".variable-rate-range");
    if (rateInput && rateRange) {
        updateOverpaymentLimit(rateInput, rateRange, group);
    }

    debouncedUpdateNadplataKredytuRemoveButtons();
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
}

const debouncedUpdateNadplataKredytuRemoveButtons = debounce(() => {
    const wrapper = elements.nadplataKredytuWrapper;
    const groups = wrapper.querySelectorAll(".variable-input-group");

    let existingRemoveBtnWrapper = wrapper.querySelector(".remove-btn-wrapper");

    if (groups.length === 0) {
        if (existingRemoveBtnWrapper && existingRemoveBtnWrapper.parentElement) {
            existingRemoveBtnWrapper.parentElement.removeChild(existingRemoveBtnWrapper);
        }
        return;
    }

    if (!existingRemoveBtnWrapper) {
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
        removeBtn.setAttribute("aria-label", "Usuń nadpłatę");
        removeBtn.textContent = "Usuń";
        existingRemoveBtnWrapper.appendChild(removeBtn);

        const addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.classList.add("btn", "btn-functional");
        addBtn.setAttribute("aria-label", "Dodaj kolejną nadpłatę");
        addBtn.textContent = "Dodaj kolejną nadpłatę";
        addBtn.style.alignSelf = "flex-end";
        existingRemoveBtnWrapper.appendChild(addBtn);

        const lastGroup = groups[groups.length - 1];
        lastGroup.appendChild(existingRemoveBtnWrapper);

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
                lastGroup.remove();
                updateRatesArray("nadplata");
                updateAllOverpaymentLimits();
            }
        });

        addBtn.addEventListener("click", () => {
            const newGroup = createNadplataKredytuGroup();
            wrapper.appendChild(newGroup);
            initializeNadplataKredytuGroup(newGroup);
            updateRatesArray("nadplata");
            updateAllOverpaymentLimits();
        });
    } else {
        const lastGroup = groups[groups.length - 1];
        const currentParent = existingRemoveBtnWrapper.parentElement;
        if (currentParent !== lastGroup) {
            lastGroup.appendChild(existingRemoveBtnWrapper);
        }
    }

    const addBtn = existingRemoveBtnWrapper.querySelector(".btn-functional");
    const { remainingCapital } = updateAllOverpaymentLimits();

    if (addBtn) {
        if (remainingCapital <= 0) {
            addBtn.style.display = "none";
        } else {
            addBtn.style.display = "block";
        }
    }
}, 150);

if (elements.nadplataKredytuBtn) {
    elements.nadplataKredytuBtn.addEventListener("change", () => {
        const isChecked = elements.nadplataKredytuBtn.checked;
        elements.nadplataKredytuInputs?.classList.toggle("active", isChecked);

        if (isChecked) {
            elements.nadplataKredytuWrapper.innerHTML = "";
            const newGroup = createNadplataKredytuGroup();
            elements.nadplataKredytuWrapper.appendChild(newGroup);
            initializeNadplataKredytuGroup(newGroup);
            debouncedUpdateNadplataKredytuRemoveButtons();
        } else {
            resetNadplataKredytuSection();
        }
    });
}

elements.addNadplataKredytuBtn?.addEventListener("click", () => {
    const newGroup = createNadplataKredytuGroup();
    elements.nadplataKredytuWrapper.appendChild(newGroup);
    initializeNadplataKredytuGroup(newGroup);
    debouncedUpdateNadplataKredytuRemoveButtons();
});














// F U N K C J E    Z M I E N N E    O P R O C E N T O W A N I E

function createVariableOprocentowanieGroup() {
    const group = document.createElement("div");
    group.classList.add("variable-input-group");
    group.setAttribute("data-type", "oprocentowanie");
    group.innerHTML = `
        <div class="fields-wrapper">
            <div class="form-group box-period">
                <label>Od</label>
                <div class="input-group">
                    <input type="number" class="form-control variable-cykl" min="2" max="420" step="1" value="2">
                    <span class="input-group-text unit-miesiaca">miesiąca</span>
                </div>
                <input type="range" class="form-range range-slider variable-cykl-range" min="2" max="420" step="1" value="2">
            </div>
            <div class="form-group box-rate">
                <label>Oprocentowanie</label>
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
    const iloscRat = parseInt(elements.iloscRat.value) || 360;

    const inputs = group.querySelectorAll(".form-control");
    const ranges = group.querySelectorAll(".form-range");

    inputs.forEach((input, index) => {
        const range = ranges[index];
        if (input.classList.contains("variable-cykl")) {
            input.max = iloscRat;
            range.max = iloscRat;
            let value = parseInt(input.value) || 2;
            if (value > iloscRat) value = iloscRat;
            if (value < 2) value = 2;
            input.value = value;
            range.value = value;

            const debouncedUpdate = debounce(() => {
                updateRatesArray("oprocentowanie");
            }, 300);

            input.addEventListener("blur", () => {
                let value = parseInt(input.value) || 2;
                if (value < 2) value = 2;
                if (value > iloscRat) value = iloscRat;
                input.value = value;
                range.value = value;
                debouncedUpdate();
            });

            range.addEventListener("input", () => {
                input.value = parseInt(range.value);
                debouncedUpdate();
            });
        } else if (input.classList.contains("variable-rate")) {
            const debouncedUpdate = debounce(() => {
                updateRatesArray("oprocentowanie");
            }, 300);

            input.addEventListener("blur", () => {
                let value = parseFloat(input.value);
                let maxAllowed = parseFloat(input.max) || 25;
                let minAllowed = parseFloat(input.min) || 0.1;

                if (isNaN(value) || value < minAllowed) {
                    value = minAllowed;
                } else if (value > maxAllowed) {
                    value = maxAllowed;
                }
                input.value = value.toFixed(2);
                range.value = value;
                debouncedUpdate();
            });

            range.addEventListener("input", () => {
                let value = parseFloat(range.value);
                input.value = value.toFixed(2);
                debouncedUpdate();
            });
        }
    });
}

function resetVariableOprocentowanieSection() {
    elements.variableOprocentowanieWrapper.innerHTML = "";
    state.variableRates = [];
}

function updateVariableOprocentowanieRemoveButtons() {
    const wrapper = elements.variableOprocentowanieWrapper;
    const groups = wrapper.querySelectorAll(".variable-input-group");
    const existingRemoveBtnWrapper = wrapper.querySelector(".remove-btn-wrapper");

    if (existingRemoveBtnWrapper) {
        existingRemoveBtnWrapper.remove();
    }

    if (groups.length > 0) {
        const lastGroup = groups[groups.length - 1];
        const removeBtnWrapper = document.createElement("div");
        removeBtnWrapper.classList.add("remove-btn-wrapper");
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.classList.add("btn", "btn-danger");
        removeBtn.setAttribute("aria-label", "Usuń oprocentowanie");
        removeBtn.textContent = "Usuń";
        removeBtnWrapper.appendChild(removeBtn);
        lastGroup.appendChild(removeBtnWrapper);

        removeBtn.addEventListener("click", () => {
            lastGroup.remove();
            updateRatesArray("oprocentowanie");
            if (wrapper.querySelectorAll(".variable-input-group").length === 0) {
                elements.zmienneOprocentowanieBtn.checked = false;
                elements.variableOprocentowanieInputs.classList.remove("active");
                resetVariableOprocentowanieSection();
            }
            updateVariableOprocentowanieRemoveButtons();
        });
    }
}

elements.zmienneOprocentowanieBtn.addEventListener("change", () => {
    const isChecked = elements.zmienneOprocentowanieBtn.checked;
    elements.variableOprocentowanieInputs.classList.toggle("active", isChecked);

    if (isChecked) {
        elements.variableOprocentowanieWrapper.innerHTML = "";
        const newGroup = createVariableOprocentowanieGroup();
        elements.variableOprocentowanieWrapper.appendChild(newGroup);
        initializeVariableOprocentowanieGroup(newGroup);
        updateVariableOprocentowanieRemoveButtons();
    } else {
        resetVariableOprocentowanieSection();
    }
});








// F U N K C J E    O B L I C Z E N I A    K R E D Y T U

function calculateInstallment(kwota, iloscRat, pozostalyKapital, currentOprocentowanie, nadplata, activeOverpayment, rodzajRat) {
    let odsetki = pozostalyKapital * currentOprocentowanie;
    let rataKapitalowa = 0;
    let rataCalkowita = 0;

    if (rodzajRat === "rowne") {
        let q = 1 + currentOprocentowanie;
        rataCalkowita = kwota * (q ** iloscRat) * (q - 1) / ((q ** iloscRat) - 1);
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
    let pozostalyKapital = kwota;
    let harmonogram = [];
    let calkowiteOdsetki = 0;
    let calkowiteNadplaty = 0;
    let prowizjaKwota = prowizjaJednostka === "procent" ? (prowizja / 100) * kwota : prowizja;
    let pozostaleRaty = iloscRat;
    let oprocentowanieMiesieczne = oprocentowanie / 100 / 12;
    let activeVariableRates = [...variableRates].sort((a, b) => a.period - b.period);
    let activeOverpaymentRates = [...overpaymentRates].sort((a, b) => a.start - b.start);

    for (let i = 1; i <= iloscRat; i++) {
        let currentOprocentowanie = oprocentowanieMiesieczne;
        let activeRate = activeVariableRates.find(rate => rate.period === i);
        if (activeRate) {
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
}










// F U N K C J E    W Y N I K I    I    W Y K R E S Y

function updateChart(data) {
    if (creditChart) {
        creditChart.destroy();
    }

    const ctx = document.getElementById("creditChart").getContext("2d");
    creditChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Koszty kredytu"],
            datasets: [
                {
                    label: "Kapitał",
                    data: [data.harmonogram.reduce((sum, row) => sum + row.kapital, 0)],
                    backgroundColor: "#28a745",
                    borderWidth: 0,
                    barPercentage: 0.5,
                },
                {
                    label: "Odsetki",
                    data: [data.calkowiteOdsetki],
                    backgroundColor: "#007bff",
                    borderWidth: 0,
                    barPercentage: 0.5,
                },
                {
                    label: "Nadpłaty",
                    data: [data.calkowiteNadplaty],
                    backgroundColor: "#dc3545",
                    borderWidth: 0,
                    barPercentage: 0.5,
                },
                {
                    label: "Prowizja",
                    data: [data.prowizja],
                    backgroundColor: "#6f42c1",
                    borderWidth: 0,
                    barPercentage: 0.5,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${context.raw.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł`,
                    },
                },
            },
            scales: {
                x: { stacked: true, display: false },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => `${value.toLocaleString("pl-PL")} zł`,
                        font: { size: 10 },
                    },
                },
            },
        },
    });

    elements.valueKapital.textContent = `${data.harmonogram.reduce((sum, row) => sum + row.kapital, 0).toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł`;
    elements.valueOdsetki.textContent = `${data.calkowiteOdsetki.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł`;
    elements.valueNadplata.textContent = `${data.calkowiteNadplaty.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł`;
    elements.valueProwizja.textContent = `${data.prowizja.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł`;
}

function updateHarmonogram(data) {
    elements.harmonogramTabela.innerHTML = "";
    data.harmonogram.forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${row.miesiac}</td>
            <td>${row.rata.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł</td>
            <td>${row.oprocentowanie.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} %</td>
            <td>${row.nadplata.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł</td>
            <td>${row.kapital.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł</td>
            <td>${row.odsetki.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł</td>
            <td>${row.kapitalDoSplaty.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł</td>
        `;
        elements.harmonogramTabela.appendChild(tr);
    });
}

function updateSummary(data) {
    elements.okresPoNadplacie.textContent = data.pozostaleRaty;
    elements.koszt.textContent = data.calkowityKoszt.toLocaleString("pl-PL", { minimumFractionDigits: 2 });
}

function generatePDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFont("helvetica");
    doc.setFontSize(12);
    doc.text(APP_TITLE, 10, 10);

    doc.setFontSize(10);
    doc.text(`Kwota kredytu: ${state.lastFormData.kwota.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł`, 10, 20);
    doc.text(`Ilość rat: ${state.lastFormData.iloscRat}`, 10, 30);
    doc.text(`Oprocentowanie: ${state.lastFormData.oprocentowanie.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} %`, 10, 40);
    doc.text(`Rodzaj rat: ${state.lastFormData.rodzajRat === "rowne" ? "Równe" : "Malejące"}`, 10, 50);
    doc.text(`Prowizja: ${state.lastFormData.prowizja.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} ${state.lastFormData.jednostkaProwizji === "procent" ? "%" : "zł"}`, 10, 60);
    doc.text(`Całkowity koszt: ${data.calkowityKoszt.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł`, 10, 70);
    doc.text(`Całkowite odsetki: ${data.calkowiteOdsetki.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł`, 10, 80);
    doc.text(`Całkowite nadpłaty: ${data.calkowiteNadplaty.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł`, 10, 90);

    const tableData = data.harmonogram.map(row => [
        row.miesiac.toString(),
        `${row.rata.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł`,
        `${row.oprocentowanie.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} %`,
        `${row.nadplata.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł`,
        `${row.kapital.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł`,
        `${row.odsetki.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł`,
        `${row.kapitalDoSplaty.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł`,
    ]);

    doc.autoTable({
        head: [["Miesiąc", "Rata", "Oprocentowanie", "Nadpłata", "Kapitał", "Odsetki", "Kapitał do spłaty"]],
        body: tableData,
        startY: 100,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [194, 178, 128] },
    });

    doc.save("kalkulator_kredytu.pdf");
}













// F U N K C J E    I N T E R F E J S U

function showResults() {
    elements.formSection.style.display = "none";
    elements.resultSection.style.display = "block";
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function showForm() {
    elements.formSection.style.display = "block";
    elements.resultSection.style.display = "none";
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function toggleHarmonogram(contentId) {
    const content = document.getElementById(contentId);
    const header = content.previousElementSibling.querySelector(".btn-toggle");
    const isHidden = content.style.display === "none" || content.style.display === "";
    content.style.display = isHidden ? "block" : "none";
    header.textContent = `Harmonogram spłat ${isHidden ? "▼" : "▲"}`;
}

function updateZoom() {
    document.body.style.zoom = state.zoomLevel;
    elements.zoomInBtn.disabled = state.zoomLevel >= 2;
    elements.zoomOutBtn.disabled = state.zoomLevel <= 0.5;
}

function toggleDarkMode() {
    state.isDarkMode = !state.isDarkMode;
    document.body.classList.toggle("dark-mode", state.isDarkMode);
    elements.toggleDarkModeBtn.textContent = state.isDarkMode ? "☀️" : "🌙";
}








// I N I C J A L I Z A C J A       A P L I K A C J I
function initialize() {
    updateKwotaInfo();
    updateLata();
    updateProwizjaInfo();

    // Initialize input handling
    initializeInputHandling();

    elements.obliczBtn.addEventListener("click", () => {
        state.lastFormData.kwota = parseFloat(elements.kwota.value) || 500000;
        state.lastFormData.iloscRat = parseInt(elements.iloscRat.value) || 360;
        state.lastFormData.oprocentowanie = parseFloat(elements.oprocentowanie.value) || 7;
        state.lastFormData.rodzajRat = elements.rodzajRat.value;
        state.lastFormData.prowizja = parseFloat(elements.prowizja.value) || 2;
        state.lastFormData.jednostkaProwizji = elements.jednostkaProwizji.value;

        const result = calculateLoan(
            state.lastFormData.kwota,
            state.lastFormData.oprocentowanie,
            state.lastFormData.iloscRat,
            state.lastFormData.rodzajRat,
            state.lastFormData.prowizja,
            state.lastFormData.jednostkaProwizji,
            state.variableRates,
            state.overpaymentRates
        );

        if (result) {
            updateChart(result);
            updateHarmonogram(result);
            updateSummary(result);
            showResults();
        }
    });

    elements.generatePdfBtn.addEventListener("click", () => {
        const result = calculateLoan(
            state.lastFormData.kwota,
            state.lastFormData.oprocentowanie,
            state.lastFormData.iloscRat,
            state.lastFormData.rodzajRat,
            state.lastFormData.prowizja,
            state.lastFormData.jednostkaProwizji,
            state.variableRates,
            state.overpaymentRates
        );
        if (result) {
            generatePDF(result);
        }
    });

    elements.zoomInBtn.addEventListener("click", () => {
        state.zoomLevel += 0.1;
        updateZoom();
    });

    elements.zoomOutBtn.addEventListener("click", () => {
        state.zoomLevel -= 0.1;
        updateZoom();
    });

    elements.toggleDarkModeBtn.addEventListener("click", toggleDarkMode);
}

initialize();
