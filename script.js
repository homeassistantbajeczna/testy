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
    rodzajRatInfo: document.getElementById("rodzajRatInfo"),
    prowizja: document.getElementById("prowizja"),
    prowizjaRange: document.getElementById("prowizjaRange"),
    prowizjaInfo: document.getElementById("prowizjaInfo"),
    jednostkaProwizji: document.getElementById("jednostkaProwizji"),
    nadplataKredytuBtn: document.getElementById("nadplataKredytuBtn"),
    nadplataKredytuInputs: document.getElementById("nadplataKredytuInputs"),
    nadplataKredytuWrapper: document.getElementById("nadplataKredytuWrapper"),
    addNadplataKredytuBtn: document.getElementById("addNadplataKredytuBtn"),
    zmienneOprocentowanieBtn: document.getElementById("zmienneOprocentowanieBtn"),
    variableOprocentowanieInputs: document.getElementById("variableOprocentowanieInputs"),
    variableOprocentowanieWrapper: document.getElementById("variableOprocentowanieWrapper"),
    addVariableOprocentowanieBtn: document.getElementById("addVariableOprocentowanieBtn"),
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

function syncInputWithRange(input, range, onChange = null, skipOnChange = false) {
    try {
        const parsedValue = parseFloat(input?.value) || 0;
        if (range) {
            range.value = parsedValue;
        }
        if (!skipOnChange && onChange) {
            onChange(parsedValue);
        }
    } catch (error) {
        console.error("Błąd podczas synchronizacji wejścia z suwakiem:", error);
    }
}

function validateKwota(value) {
    let parsedValue = parseFloat(value) || 0;
    parsedValue = parseFloat(parsedValue.toFixed(2));
    if (parsedValue < 50000) {
        parsedValue = 50000;
    }
    if (parsedValue > 5000000) {
        parsedValue = 5000000;
    }
    return parsedValue;
}

function validateIloscRat(value) {
    let parsedValue = parseInt(value) || 0;
    if (parsedValue < 12) {
        parsedValue = 12;
    }
    if (parsedValue > 420) {
        parsedValue = 420;
    }
    return parsedValue;
}

function updateProwizjaInfo() {
    try {
        const prowizja = parseFloat(elements.prowizja?.value) || 0;
        const jednostka = elements.jednostkaProwizji?.value || "procent";
        const kwota = parseFloat(elements.kwota?.value) || 0;
        let prowizjaKwota = jednostka === "procent" ? (prowizja / 100) * kwota : prowizja;
        if (isNaN(prowizjaKwota)) prowizjaKwota = 0;
        if (elements.prowizjaInfo) {
            elements.prowizjaInfo.textContent = `Prowizja: ${prowizjaKwota.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;
        }

        if (jednostka === "procent") {
            if (elements.prowizjaRange) {
                elements.prowizjaRange.max = 25;
                elements.prowizjaRange.min = 0;
                elements.prowizjaRange.step = 0.01;
                elements.prowizjaRange.value = prowizja;
                elements.prowizja.max = 25;
                elements.prowizja.min = 0;
                elements.prowizja.step = 0.01;
            }
        } else {
            if (elements.prowizjaRange) {
                elements.prowizjaRange.max = 1250000;
                elements.prowizjaRange.min = 0;
                elements.prowizjaRange.step = 1;
                elements.prowizjaRange.value = prowizja;
                elements.prowizja.max = 1250000;
                elements.prowizja.min = 0;
                elements.prowizja.step = 1;
            }
        }
    } catch (error) {
        console.error("Błąd podczas aktualizacji informacji o prowizji:", error);
    }
}

function updateLata() {
    try {
        const iloscRat = parseInt(elements.iloscRat?.value) || 0;
        const lata = Math.floor(iloscRat / 12);
        if (elements.lata) {
            elements.lata.textContent = `Ilość lat: ${lata}`;
        }
    } catch (error) {
        console.error("Błąd podczas aktualizacji liczby lat:", error);
    }
}

function updateKwotaInfo() {
    try {
        const kwota = parseFloat(elements.kwota?.value) || 0;
        if (elements.kwotaInfo) {
            elements.kwotaInfo.textContent = `Kwota kredytu: ${kwota.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;
        }
        updateProwizjaInfo();
    } catch (error) {
        console.error("Błąd podczas aktualizacji informacji o kwocie:", error);
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

function calculateMaxOverpayment(kwota, oprocentowanie, iloscRat, rodzajRat, variableRates, overpaymentRates, currentGroup) {
    const groups = elements.nadplataKredytuWrapper.querySelectorAll(".variable-input-group");
    const currentIndex = Array.from(groups).indexOf(currentGroup);
    const periodStart = parseInt(currentGroup.querySelector(".variable-cykl-start")?.value) || 1;

    let remainingCapital = calculateRemainingCapital(
        kwota,
        oprocentowanie,
        iloscRat,
        rodzajRat,
        variableRates,
        overpaymentRates.filter((_, idx) => idx < currentIndex),
        periodStart - 1
    );

    return Math.max(100, remainingCapital);
}

function calculateMaxEndPeriod(kwota, oprocentowanie, iloscRat, rodzajRat, variableRates, overpaymentRates, currentGroup) {
    let remainingCapital = kwota;
    const monthlyInterestRate = oprocentowanie / 100 / 12;
    let activeVariableRates = [...variableRates].sort((a, b) => a.period - b.period);
    let activeOverpaymentRates = [...overpaymentRates].sort((a, b) => a.start - b.start);
    let maxEndPeriod = iloscRat - 1;

    const groups = elements.nadplataKredytuWrapper.querySelectorAll(".variable-input-group");
    const currentIndex = Array.from(groups).indexOf(currentGroup);
    const type = currentGroup.querySelector(".nadplata-type-select")?.value || "Jednorazowa";
    const value = parseFloat(currentGroup.querySelector(".variable-rate")?.value) || 0;

    for (let i = 1; i <= iloscRat; i++) {
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
                    maxEndPeriod = i;
                    break;
                }
            }
        }

        if (currentIndex === Array.from(groups).indexOf(currentGroup) && i >= parseInt(currentGroup.querySelector(".variable-cykl-start")?.value)) {
            if (type === "Jednorazowa" && i === parseInt(currentGroup.querySelector(".variable-cykl-start")?.value)) {
                nadplata = value;
            } else if (type === "Miesięczna") {
                nadplata = value;
            }

            if (nadplata > 0) {
                remainingCapital -= nadplata;
                if (remainingCapital <= 0) {
                    maxEndPeriod = i;
                    break;
                }
            }
        }

        let odsetki = remainingCapital * currentInterestRate;
        let rataKapitalowa = 0;

        if (rodzajRat === "rowne") {
            let q = 1 + currentInterestRate;
            let rataCalkowita = kwota * (q ** iloscRat) * (q - 1) / ((q ** iloscRat) - 1);
            rataKapitalowa = rataCalkowita - odsetki;

            if (activeOverpayment && activeOverpayment.effect === "Zmniejsz ratę") {
                rataKapitalowa += nadplata;
            }

            if (rataKapitalowa > remainingCapital) {
                rataKapitalowa = remainingCapital;
            }
        } else {
            rataKapitalowa = kwota / iloscRat;

            if (activeOverpayment && activeOverpayment.effect === "Zmniejsz ratę") {
                rataKapitalowa += nadplata;
            }

            if (rataKapitalowa > remainingCapital) {
                rataKapitalowa = remainingCapital;
            }
        }

        remainingCapital -= rataKapitalowa;

        if (remainingCapital <= 0) {
            maxEndPeriod = i;
            break;
        }
    }

    return maxEndPeriod;
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
                type: typeSelect?.value || "Jednorazowa",
                effect: effectSelect?.value || "Skróć okres",
                amount: parseFloat(rateInput?.value) || 0,
                start: parseInt(periodStartInput?.value) || 2,
                end: periodEndInput ? parseInt(periodEndInput?.value) || 2 : null
            };
            state.overpaymentRates.push(overpayment);
        });
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

    let value;
    if (input.classList.contains("variable-cykl")) {
        value = parseInt(input.value);
    } else {
        value = parseFloat(input.value);
        input.value = value.toFixed(2);
    }

    const min = parseFloat(range.min);
    const max = parseFloat(range.max);
    if (value < min) {
        value = min;
        input.value = input.classList.contains("variable-cykl") ? min : min.toFixed(2);
    } else if (value > max) {
        value = max;
        input.value = input.classList.contains("variable-cykl") ? max : max.toFixed(2);
    }

    // Wymuszenie odświeżenia pozycji suwaka
    range.setAttribute("data-reset", Date.now());
    range.value = value;
    range.removeAttribute("data-reset");
    range.dispatchEvent(new Event('input'));
}

function updateOverpaymentLimit(input, range, group) {
    if (!group || !group.parentElement || state.isUpdating) {
        console.log("Group jest undefined, nie istnieje w DOM lub aktualizacja w toku, pomijam updateOverpaymentLimit");
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

    return remainingCapital;
}

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

    // Obliczanie maksymalnego okresu na podstawie pozostałego kapitału
    let maxPeriodLimit = lastMonthWithCapital !== null ? Math.min(lastMonthWithCapital, iloscRat) : iloscRat;
    if (lastRemainingCapital > 0) {
        let monthsToPayOff = Math.ceil(lastRemainingCapital / 100); // Przyjmujemy minimalną nadpłatę 100 zł
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

    const { lastMonthWithCapital } = updateAllOverpaymentLimits();
    let maxPeriodLimit = lastMonthWithCapital !== null ? Math.min(lastMonthWithCapital, iloscRat) : iloscRat;

    const updatePeriodBox = () => {
        if (state.isUpdating) {
            console.log("Aktualizacja już w toku, pomijam updatePeriodBox");
            return;
        }

        state.isUpdating = true;

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
                    minValue = parseInt(periodStartInput?.value) || 1;
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
                minValue = parseInt(periodStartInput?.value) || 1;
                defaultValue = minValue;

                if (defaultValue > maxValue) defaultValue = maxValue;
                if (minValue > maxValue) minValue = maxValue;

                const endBox = createNadplataKredytuEndPeriodBox(minValue, maxValue, defaultValue, stepValue, type);
                formRow?.appendChild(endBox);

                const endInput = endBox.querySelector(".variable-cykl-end");
                const endRange = endBox.querySelector(".variable-cykl-end-range");

                if (endInput && endRange) {
                    syncInputWithRange(endInput, endRange);

                    const debouncedUpdate = debounce(() => {
                        const rateInput = group.querySelector(".variable-rate");
                        const rateRange = group.querySelector(".variable-rate-range");
                        if (rateInput && rateRange) {
                            updateOverpaymentLimit(rateInput, rateRange, group);
                            updateRatesArray("nadplata");
                            debouncedUpdateNadplataPeriodLimits();
                        }
                    }, 150);

                    endInput.addEventListener("input", () => {
                        let value = parseInt(endInput.value) || minValue;
                        if (value < minValue) value = minValue;
                        if (value > maxValue) value = maxValue;
                        endInput.value = value;
                        endRange.value = value;
                        syncInputWithRange(endInput, endRange);
                        debouncedUpdate();
                    });

                    endRange.addEventListener("input", () => {
                        let value = parseInt(endRange.value) || minValue;
                        if (value < minValue) value = minValue;
                        if (value > maxValue) value = maxValue;
                        endInput.value = value;
                        endRange.value = value;
                        syncInputWithRange(endInput, endRange);
                        debouncedUpdate();
                    });
                }
            }
        }

        const maxEndPeriod = maxPeriodLimit;
        const endInput = group.querySelector(".variable-cykl-end");
        const endRange = group.querySelector(".variable-cykl-end-range");
        if (endInput && endRange) {
            const periodStartValue = parseInt(periodStartInput?.value) || 1;
            const minValue = periodStartValue;
            const stepValue = 1;

            endInput.min = minValue;
            endRange.min = minValue;
            endInput.max = maxEndPeriod;
            endRange.max = maxEndPeriod;
            endInput.step = stepValue;
            endRange.step = stepValue;

            let endValue = parseInt(endInput.value) || minValue;
            if (endValue < minValue) endValue = minValue;
            if (endValue > maxEndPeriod) endValue = maxEndPeriod;
            endInput.value = endValue;
            endRange.value = endValue;

            syncInputWithRange(endInput, endRange);
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

            input.min = minPeriodStart;
            input.max = maxPeriodLimit;
            range.min = minPeriodStart;
            range.max = maxPeriodLimit;

            let value = Math.max(minPeriodStart, Math.min(defaultPeriodStart, maxPeriodLimit));
            input.value = value;
            range.value = value;
            syncInputWithRange(input, range);

            const validateAndSync = () => {
                let value = parseInt(range.value) || minPeriodStart;
                if (value < minPeriodStart) value = minPeriodStart;
                if (value > maxPeriodLimit) value = maxPeriodLimit;
                input.value = value;
                range.value = value;
                syncInputWithRange(input, range);
            };

            const debouncedUpdate = debounce(() => {
                const rateInput = group.querySelector(".variable-rate");
                const rateRange = group.querySelector(".variable-rate-range");
                if (rateInput && rateRange) {
                    updateOverpaymentLimit(rateInput, rateRange, group);
                    updateRatesArray("nadplata");
                    debouncedUpdateNadplataPeriodLimits();
                }
            }, 150);

            input.addEventListener("input", () => {
                let value = parseInt(input.value) || minPeriodStart;
                if (value < minPeriodStart) value = minPeriodStart;
                if (value > maxPeriodLimit) value = maxPeriodLimit;
                input.value = value;
                range.value = value;
                syncInputWithRange(input, range);
                updatePeriodBox();
                debouncedUpdate();
            });

            range.addEventListener("input", () => {
                validateAndSync();
                updatePeriodBox();
                debouncedUpdate();
            });

            range.addEventListener("change", validateAndSync);
        } else if (input.classList.contains("variable-rate")) {
            syncInputWithRange(input, range);

            const debouncedUpdate = debounce(() => {
                updateOverpaymentLimit(input, range, group);
                debouncedUpdateNadplataKredytuRemoveButtons();
            }, 150);

            input.addEventListener("input", (e) => {
                let value = parseFloat(input.value) || 0;
                let maxAllowed = parseFloat(input.max) || 5000000;
                value = Math.max(100, Math.min(value, maxAllowed));
                input.value = value.toFixed(2);
                range.value = value;
                syncInputWithRange(input, range);
                debouncedUpdate();
            });

            input.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === "Tab") return;

                let maxAllowed = parseFloat(input.max) || 5000000;
                let currentValue = input.value;

                if (
                    (e.key >= "0" && e.key <= "9") ||
                    e.key === "." ||
                    e.key === "Backspace" ||
                    e.key === "Delete" ||
                    e.key === "ArrowLeft" ||
                    e.key === "ArrowRight"
                ) {
                    let newValueStr = currentValue;
                    if (e.key === "Backspace") {
                        newValueStr = newValueStr.slice(0, -1);
                    } else if (e.key === "Delete") {
                        return;
                    } else if (e.key >= "0" && e.key <= "9") {
                        newValueStr += e.key;
                    } else if (e.key === ".") {
                        if (newValueStr.includes(".")) {
                            e.preventDefault();
                            return;
                        }
                        newValueStr += e.key;
                    }

                    let newValue = parseFloat(newValueStr) || 0;
                    if (newValue > maxAllowed) {
                        e.preventDefault();
                        input.value = maxAllowed.toFixed(2);
                        range.value = maxAllowed;
                        syncInputWithRange(input, range);
                    }
                } else {
                    e.preventDefault();
                }
            });

            range.addEventListener("input", () => {
                let value = parseFloat(range.value) || 0;
                let maxAllowed = parseFloat(range.max) || 5000000;
                value = Math.max(100, Math.min(value, maxAllowed));
                input.value = value.toFixed(2);
                range.value = value;
                syncInputWithRange(input, range);
                debouncedUpdate();
            });

            range.addEventListener("change", () => {
                let value = parseFloat(range.value) || 0;
                let maxAllowed = parseFloat(range.max) || 5000000;
                value = Math.max(100, Math.min(value, maxAllowed));
                input.value = value.toFixed(2);
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
                updateOverpaymentLimit(rateInput, range, group);
                updateRatesArray("nadplata");
                debouncedUpdateNadplataPeriodLimits();
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

    // Jeśli nie ma grup, usuwamy wrapper i kończymy
    if (groups.length === 0) {
        if (existingRemoveBtnWrapper && existingRemoveBtnWrapper.parentElement) {
            existingRemoveBtnWrapper.parentElement.removeChild(existingRemoveBtnWrapper);
        }
        return;
    }

    // Jeśli wrapper nie istnieje, tworzymy nowy
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

        // Dodajemy wrapper do ostatniej grupy
        const lastGroup = groups[groups.length - 1];
        lastGroup.appendChild(existingRemoveBtnWrapper);

        // Dodajemy event listenery
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
        // Jeśli wrapper istnieje, upewniamy się, że jest w ostatniej grupie
        const lastGroup = groups[groups.length - 1];
        const currentParent = existingRemoveBtnWrapper.parentElement;
        if (currentParent !== lastGroup) {
            lastGroup.appendChild(existingRemoveBtnWrapper);
        }
    }

    // Aktualizujemy widoczność przycisku "Dodaj kolejną nadpłatę"
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
    try {
        let pozostalyKapital = kwota;
        let harmonogram = [];
        let calkowiteOdsetki = 0;
        let calkowiteNadplaty = 0;
        let prowizjaKwota = prowizjaJednostka === "procent" ? (prowizja / 100) * kwota : prowizja;
        let pozostaleRaty = iloscRat;
        let oprocentowanieMiesieczne = oprocentowanie / 100 / 12;
        let activeVariableRates = [...variableRates].sort((a, b) => a.period - b.period);
        let activeOverpaymentRates = [...overpaymentRates].sort((a, b) => a.periodStart - b.periodStart);

        for (let i = 1; i <= iloscRat; i++) {
            let currentOprocentowanie = oprocentowanieMiesieczne;
            let activeRate = activeVariableRates.find(rate => rate.period === i);
            if (activeRate) {
                currentOprocentowanie = activeRate.value / 100 / 12;
            }

            let nadplata = 0;
            let activeOverpayment = activeOverpaymentRates.find(over => i >= over.periodStart && (over.type === "Jednorazowa" ? i === over.periodStart : i <= over.periodEnd));
            if (activeOverpayment) {
                if (activeOverpayment.type === "Jednorazowa" && i === activeOverpayment.periodStart) {
                    nadplata = activeOverpayment.value;
                } else if (activeOverpayment.type === "Miesięczna") {
                    nadplata = activeOverpayment.value;
                } else if (activeOverpayment.type === "Kwartalna" && (i - activeOverpayment.periodStart + 1) % 3 === 0) {
                    nadplata = activeOverpayment.value;
                } else if (activeOverpayment.type === "Roczna" && (i - activeOverpayment.periodStart + 1) % 12 === 0) {
                    nadplata = activeOverpayment.value;
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
        console.error("Błąd podczas obliczania kredytu:", error);
        return null;
    }
}

// Aktualizacja limitów przy zmianie kwoty kredytu
document.addEventListener("DOMContentLoaded", () => {
    const updateAllOverpaymentLimits = () => {
        const groups = elements.nadplataKredytuWrapper.querySelectorAll(".variable-input-group");
        groups.forEach(group => {
            const rateInput = group.querySelector(".variable-rate");
            const rateRange = group.querySelector(".variable-rate-range");
            if (rateInput && rateRange) {
                updateOverpaymentLimit(rateInput, rateRange, group);
                let value = parseFloat(rateInput.value) || 0;
                let maxAllowed = parseFloat(rateInput.max) || 5000000;
                if (value > maxAllowed) {
                    rateInput.value = maxAllowed.toFixed(2);
                    rateRange.value = maxAllowed;
                }
            }
        });
    };

    elements.kwota?.addEventListener("input", () => {
        let value = elements.kwota.value;
        if (value.includes(".")) {
            const parts = value.split(".");
            if (parts[1].length > 2) {
                value = `${parts[0]}.${parts[1].substring(0, 2)}`;
                elements.kwota.value = value;
            }
        }
        syncInputWithRange(elements.kwota, elements.kwotaRange, updateKwotaInfo);
        updateAllOverpaymentLimits();
    });

    elements.kwota?.addEventListener("blur", () => {
        let validatedValue = validateKwota(elements.kwota.value);
        elements.kwota.value = validatedValue.toFixed(2);
        syncInputWithRange(elements.kwota, elements.kwotaRange, updateKwotaInfo);
        updateAllOverpaymentLimits();
    });

    elements.kwotaRange?.addEventListener("input", () => {
        elements.kwota.value = parseFloat(elements.kwotaRange.value).toFixed(2);
        updateKwotaInfo();
        updateAllOverpaymentLimits();
    });

    elements.kwotaRange?.addEventListener("change", () => {
        let validatedValue = validateKwota(elements.kwotaRange.value);
        elements.kwota.value = validatedValue.toFixed(2);
        elements.kwotaRange.value = validatedValue;
        updateKwotaInfo();
        updateAllOverpaymentLimits();
    });
});



// F U N K C J E    W Y N I K I    I    W Y K R E S Y

function updateChart(data) {
    try {
        if (creditChart) {
            creditChart.destroy();
        }

        const ctx = document.getElementById("creditChart")?.getContext("2d");
        if (!ctx) return;

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

        if (elements.valueKapital) {
            elements.valueKapital.textContent = `${data.harmonogram.reduce((sum, row) => sum + row.kapital, 0).toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł`;
        }
        if (elements.valueOdsetki) {
            elements.valueOdsetki.textContent = `${data.calkowiteOdsetki.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł`;
        }
        if (elements.valueNadplata) {
            elements.valueNadplata.textContent = `${data.calkowiteNadplaty.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł`;
        }
        if (elements.valueProwizja) {
            elements.valueProwizja.textContent = `${data.prowizja.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł`;
        }
    } catch (error) {
        console.error("Błąd podczas aktualizacji wykresu:", error);
    }
}

function updateHarmonogram(data) {
    try {
        if (elements.harmonogramTabela) {
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
    } catch (error) {
        console.error("Błąd podczas aktualizacji harmonogramu:", error);
    }
}

function updateSummary(data) {
    try {
        if (elements.okresPoNadplacie) {
            elements.okresPoNadplacie.textContent = data.pozostaleRaty;
        }
        if (elements.koszt) {
            elements.koszt.textContent = data.calkowityKoszt.toLocaleString("pl-PL", { minimumFractionDigits: 2 });
        }
    } catch (error) {
        console.error("Błąd podczas aktualizacji podsumowania:", error);
    }
}

function generatePDF(data) {
    try {
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
    } catch (error) {
        console.error("Błąd podczas generowania PDF:", error);
    }
}

// F U N K C J E    I N T E R F E J S U

function showResults() {
    try {
        if (elements.formSection) elements.formSection.style.display = "none";
        if (elements.resultSection) elements.resultSection.style.display = "block";
        window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
        console.error("Błąd podczas pokazywania wyników:", error);
    }
}

function showForm() {
    try {
        if (elements.formSection) elements.formSection.style.display = "block";
        if (elements.resultSection) elements.resultSection.style.display = "none";
        window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
        console.error("Błąd podczas pokazywania formularza:", error);
    }
}

function toggleHarmonogram(contentId) {
    try {
        const content = document.getElementById(contentId);
        const header = content?.previousElementSibling?.querySelector(".btn-toggle");
        if (content && header) {
            const isHidden = content.style.display === "none";
            content.style.display = isHidden ? "block" : "none";
            header.textContent = `Harmonogram spłat ${isHidden ? "▼" : "▲"}`;
        }
    } catch (error) {
        console.error("Błąd podczas przełączania harmonogramu:", error);
    }
}

function updateZoom() {
    try {
        document.body.style.zoom = state.zoomLevel;
        if (elements.zoomInBtn) {
            elements.zoomInBtn.disabled = state.zoomLevel >= 2;
        }
        if (elements.zoomOutBtn) {
            elements.zoomOutBtn.disabled = state.zoomLevel <= 0.5;
        }
    } catch (error) {
        console.error("Błąd podczas aktualizacji zoomu:", error);
    }
}

function toggleDarkMode() {
    try {
        state.isDarkMode = !state.isDarkMode;
        document.body.classList.toggle("dark-mode", state.isDarkMode);
        if (elements.toggleDarkModeBtn) {
            elements.toggleDarkModeBtn.textContent = state.isDarkMode ? "☀️" : "🌙";
        }
        localStorage.setItem("darkMode", state.isDarkMode);
    } catch (error) {
        console.error("Błąd podczas przełączania trybu ciemnego:", error);
    }
}

// I N I C J A L I Z A C J A    A P L I K A C J I

document.addEventListener("DOMContentLoaded", () => {
    try {
        // Inicjalizacja boxa Kwota Kredytu
        if (elements.kwota) {
            elements.kwota.min = 50000;
            elements.kwota.max = 5000000;
            elements.kwota.step = 100;
            elements.kwota.value = 500000; // Domyślna wartość
        }
        if (elements.kwotaRange) {
            elements.kwotaRange.min = 50000;
            elements.kwotaRange.max = 5000000;
            elements.kwotaRange.step = 100;
            elements.kwotaRange.value = 500000; // Domyślna wartość
        }

        elements.kwota?.addEventListener("input", () => {
            let value = elements.kwota.value;
            if (value.includes(".")) {
                const parts = value.split(".");
                if (parts[1].length > 2) {
                    value = `${parts[0]}.${parts[1].substring(0, 2)}`;
                    elements.kwota.value = value;
                }
            }
            syncInputWithRange(elements.kwota, elements.kwotaRange, updateKwotaInfo);
            if (elements.nadplataKredytuWrapper) {
                elements.nadplataKredytuWrapper.querySelectorAll(".variable-rate").forEach((input, index) => {
                    const range = elements.nadplataKredytuWrapper.querySelectorAll(".variable-rate-range")[index];
                    updateOverpaymentLimit(input, range);
                });
            }
        });

        elements.kwota?.addEventListener("blur", () => {
            let validatedValue = validateKwota(elements.kwota.value);
            elements.kwota.value = validatedValue.toFixed(2);
            syncInputWithRange(elements.kwota, elements.kwotaRange, updateKwotaInfo);
            if (elements.nadplataKredytuWrapper) {
                elements.nadplataKredytuWrapper.querySelectorAll(".variable-rate").forEach((input, index) => {
                    const range = elements.nadplataKredytuWrapper.querySelectorAll(".variable-rate-range")[index];
                    updateOverpaymentLimit(input, range);
                });
            }
        });

        elements.kwotaRange?.addEventListener("input", () => {
            elements.kwota.value = parseFloat(elements.kwotaRange.value).toFixed(2);
            updateKwotaInfo();
            if (elements.nadplataKredytuWrapper) {
                elements.nadplataKredytuWrapper.querySelectorAll(".variable-rate").forEach((input, index) => {
                    const range = elements.nadplataKredytuWrapper.querySelectorAll(".variable-rate-range")[index];
                    updateOverpaymentLimit(input, range);
                });
            }
        });

        elements.kwotaRange?.addEventListener("change", () => {
            let validatedValue = validateKwota(elements.kwotaRange.value);
            elements.kwota.value = validatedValue.toFixed(2);
            elements.kwotaRange.value = validatedValue;
            updateKwotaInfo();
            if (elements.nadplataKredytuWrapper) {
                elements.nadplataKredytuWrapper.querySelectorAll(".variable-rate").forEach((input, index) => {
                    const range = elements.nadplataKredytuWrapper.querySelectorAll(".variable-rate-range")[index];
                    updateOverpaymentLimit(input, range);
                });
            }
        });

        // Inicjalizacja boxa Ilość Rat
        if (elements.iloscRat) {
            elements.iloscRat.min = 12;
            elements.iloscRat.max = 420;
            elements.iloscRat.step = 1;
            elements.iloscRat.value = 360; // Domyślna wartość
        }
        if (elements.iloscRatRange) {
            elements.iloscRatRange.min = 12;
            elements.iloscRatRange.max = 420;
            elements.iloscRatRange.step = 1;
            elements.iloscRatRange.value = 360; // Domyślna wartość
        }

        // Zablokowanie wprowadzania przecinka i kropki
        elements.iloscRat?.addEventListener("keydown", (event) => {
            if (event.key === "," || event.key === ".") {
                event.preventDefault();
            }
        });

        elements.iloscRat?.addEventListener("input", () => {
            let value = elements.iloscRat.value;
            if (value.includes(",") || value.includes(".")) {
                value = value.replace(/[,|.]/g, "");
                elements.iloscRat.value = value;
            }
            syncInputWithRange(elements.iloscRat, elements.iloscRatRange, updateLata);
            if (elements.nadplataKredytuWrapper) {
                elements.nadplataKredytuWrapper.querySelectorAll(".variable-cykl").forEach(input => {
                    input.max = elements.iloscRat.value - 1;
                    if (input.nextElementSibling?.nextElementSibling) {
                        input.nextElementSibling.nextElementSibling.max = elements.iloscRat.value - 1;
                    }
                });
            }
            if (elements.variableOprocentowanieWrapper) {
                elements.variableOprocentowanieWrapper.querySelectorAll(".variable-cykl").forEach(input => {
                    input.max = elements.iloscRat.value;
                    if (input.nextElementSibling?.nextElementSibling) {
                        input.nextElementSibling.nextElementSibling.max = elements.iloscRat.value;
                    }
                });
            }
        });

        elements.iloscRat?.addEventListener("blur", () => {
            let validatedValue = validateIloscRat(elements.iloscRat.value);
            elements.iloscRat.value = validatedValue;
            syncInputWithRange(elements.iloscRat, elements.iloscRatRange, updateLata);
            if (elements.nadplataKredytuWrapper) {
                elements.nadplataKredytuWrapper.querySelectorAll(".variable-cykl").forEach(input => {
                    input.max = validatedValue - 1;
                    if (input.nextElementSibling?.nextElementSibling) {
                        input.nextElementSibling.nextElementSibling.max = validatedValue - 1;
                    }
                });
            }
            if (elements.variableOprocentowanieWrapper) {
                elements.variableOprocentowanieWrapper.querySelectorAll(".variable-cykl").forEach(input => {
                    input.max = validatedValue;
                    if (input.nextElementSibling?.nextElementSibling) {
                        input.nextElementSibling.nextElementSibling.max = validatedValue;
                    }
                });
            }
        });

        elements.iloscRatRange?.addEventListener("input", () => {
            elements.iloscRat.value = parseInt(elements.iloscRatRange.value);
            updateLata();
            if (elements.nadplataKredytuWrapper) {
                elements.nadplataKredytuWrapper.querySelectorAll(".variable-cykl").forEach(input => {
                    input.max = elements.iloscRat.value - 1;
                    if (input.nextElementSibling?.nextElementSibling) {
                        input.nextElementSibling.nextElementSibling.max = elements.iloscRat.value - 1;
                    }
                });
            }
            if (elements.variableOprocentowanieWrapper) {
                elements.variableOprocentowanieWrapper.querySelectorAll(".variable-cykl").forEach(input => {
                    input.max = elements.iloscRat.value;
                    if (input.nextElementSibling?.nextElementSibling) {
                        input.nextElementSibling.nextElementSibling.max = elements.iloscRat.value;
                    }
                });
            }
        });

        elements.iloscRatRange?.addEventListener("change", () => {
            let validatedValue = validateIloscRat(elements.iloscRatRange.value);
            elements.iloscRat.value = validatedValue;
            elements.iloscRatRange.value = validatedValue;
            updateLata();
            if (elements.nadplataKredytuWrapper) {
                elements.nadplataKredytuWrapper.querySelectorAll(".variable-cykl").forEach(input => {
                    input.max = validatedValue - 1;
                    if (input.nextElementSibling?.nextElementSibling) {
                        input.nextElementSibling.nextElementSibling.max = validatedValue - 1;
                    }
                });
            }
            if (elements.variableOprocentowanieWrapper) {
                elements.variableOprocentowanieWrapper.querySelectorAll(".variable-cykl").forEach(input => {
                    input.max = validatedValue;
                    if (input.nextElementSibling?.nextElementSibling) {
                        input.nextElementSibling.nextElementSibling.max = validatedValue;
                    }
                });
            }
        });

        // Inicjalizacja boxa Oprocentowanie
        if (elements.oprocentowanie) {
            elements.oprocentowanie.min = 0.1;
            elements.oprocentowanie.max = 25;
            elements.oprocentowanie.step = 0.01;
            elements.oprocentowanie.value = 7;
        }
        if (elements.oprocentowanieRange) {
            elements.oprocentowanieRange.min = 0.1;
            elements.oprocentowanieRange.max = 25;
            elements.oprocentowanieRange.step = 0.01;
            elements.oprocentowanieRange.value = 7;
        }

        elements.oprocentowanie?.addEventListener("keydown", (event) => {
            const allowedKeys = [
                "Backspace", "Delete", "Tab", "Enter", "ArrowLeft", "ArrowRight",
                "ArrowUp", "ArrowDown", "Home", "End", ".", ","
            ];
            if (
                !allowedKeys.includes(event.key) &&
                !/^[0-9]$/.test(event.key)
            ) {
                event.preventDefault();
            }
        });

        elements.oprocentowanie?.addEventListener("input", () => {
            let value = elements.oprocentowanie.value;
            if (value.includes(",")) {
                value = value.replace(",", ".");
                elements.oprocentowanie.value = value;
            }
            if (value.includes(".")) {
                const parts = value.split(".");
                if (parts[1].length > 2) {
                    value = `${parts[0]}.${parts[1].substring(0, 2)}`;
                    elements.oprocentowanie.value = value;
                }
            }
            syncInputWithRange(elements.oprocentowanie, elements.oprocentowanieRange);
        });

        elements.oprocentowanieRange?.addEventListener("input", () => {
            elements.oprocentowanie.value = parseFloat(elements.oprocentowanieRange.value).toFixed(2);
        });

        // Inicjalizacja boxa Prowizja
        if (elements.prowizja) {
            elements.prowizja.min = 0;
            elements.prowizja.max = 25;
            elements.prowizja.step = 0.01;
            elements.prowizja.value = 2;
        }
        if (elements.prowizjaRange) {
            elements.prowizjaRange.min = 0;
            elements.prowizjaRange.max = 25;
            elements.prowizjaRange.step = 0.01;
            elements.prowizjaRange.value = 2;
        }

        elements.prowizja?.addEventListener("keydown", (event) => {
            const allowedKeys = [
                "Backspace", "Delete", "Tab", "Enter", "ArrowLeft", "ArrowRight",
                "ArrowUp", "ArrowDown", "Home", "End", ".", ","
            ];
            if (
                !allowedKeys.includes(event.key) &&
                !/^[0-9]$/.test(event.key)
            ) {
                event.preventDefault();
            }
        });

        elements.prowizja?.addEventListener("input", () => {
            let value = elements.prowizja.value;
            if (value.includes(",")) {
                value = value.replace(",", ".");
                elements.prowizja.value = value;
            }
            if (value.includes(".")) {
                const parts = value.split(".");
                if (parts[1].length > 2) {
                    value = `${parts[0]}.${parts[1].substring(0, 2)}`;
                    elements.prowizja.value = value;
                }
            }
            syncInputWithRange(elements.prowizja, elements.prowizjaRange, updateProwizjaInfo);
        });

        elements.prowizjaRange?.addEventListener("input", () => {
            elements.prowizja.value = parseFloat(elements.prowizjaRange.value).toFixed(2);
            updateProwizjaInfo();
        });

        elements.jednostkaProwizji?.addEventListener("change", () => {
            const jednostka = elements.jednostkaProwizji.value;
            const kwota = parseFloat(elements.kwota?.value) || 0;
            if (jednostka === "zl") {
                const defaultProwizjaZl = (2 / 100) * kwota;
                elements.prowizja.value = defaultProwizjaZl.toFixed(2);
            } else {
                elements.prowizja.value = 2;
            }
            updateProwizjaInfo();
        });

        // Inicjalizacja sekcji Nadpłata Kredytu
        elements.nadplataKredytuBtn?.addEventListener("change", () => {
            const isChecked = elements.nadplataKredytuBtn.checked;
            elements.nadplataKredytuInputs.classList.toggle("active", isChecked);
            if (isChecked) {
                resetNadplataKredytuSection();
                const newGroup = createNadplataKredytuGroup();
                elements.nadplataKredytuWrapper.appendChild(newGroup);
                initializeNadplataKredytuGroup(newGroup);
                updateNadplataKredytuRemoveButtons();
            } else {
                resetNadplataKredytuSection();
            }
        });

        elements.addNadplataKredytuBtn?.addEventListener("click", () => {
            const newGroup = createNadplataKredytuGroup();
            elements.nadplataKredytuWrapper.appendChild(newGroup);
            initializeNadplataKredytuGroup(newGroup);
            updateNadplataKredytuRemoveButtons();
        });

        // Inicjalizacja sekcji Zmienne Oprocentowanie
        elements.zmienneOprocentowanieBtn?.addEventListener("change", () => {
            const isChecked = elements.zmienneOprocentowanieBtn.checked;
            elements.variableOprocentowanieInputs.classList.toggle("active", isChecked);
            if (isChecked) {
                resetVariableOprocentowanieSection();
                const newGroup = createVariableOprocentowanieGroup();
                elements.variableOprocentowanieWrapper.appendChild(newGroup);
                initializeVariableOprocentowanieGroup(newGroup);
                updateVariableOprocentowanieRemoveButtons();
            } else {
                resetVariableOprocentowanieSection();
            }
        });

        elements.addVariableOprocentowanieBtn?.addEventListener("click", () => {
            const newGroup = createVariableOprocentowanieGroup();
            elements.variableOprocentowanieWrapper.appendChild(newGroup);
            initializeVariableOprocentowanieGroup(newGroup);
            updateVariableOprocentowanieRemoveButtons();
        });

        // Przycisk Oblicz
        elements.obliczBtn?.addEventListener("click", () => {
            state.lastFormData = {
                kwota: parseFloat(elements.kwota?.value) || 500000,
                iloscRat: parseInt(elements.iloscRat?.value) || 360,
                oprocentowanie: parseFloat(elements.oprocentowanie?.value) || 7,
                rodzajRat: elements.rodzajRat?.value || "rowne",
                prowizja: parseFloat(elements.prowizja?.value) || 2,
                jednostkaProwizji: elements.jednostkaProwizji?.value || "procent",
            };

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

        elements.generatePdfBtn?.addEventListener("click", () => {
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

        elements.zoomInBtn?.addEventListener("click", () => {
            state.zoomLevel = Math.min(state.zoomLevel + 0.1, 2);
            updateZoom();
        });

        elements.zoomOutBtn?.addEventListener("click", () => {
            state.zoomLevel = Math.max(state.zoomLevel - 0.1, 0.5);
            updateZoom();
        });

        elements.toggleDarkModeBtn?.addEventListener("click", toggleDarkMode);

        const savedDarkMode = localStorage.getItem("darkMode");
        if (savedDarkMode === "true") {
            state.isDarkMode = true;
            document.body.classList.add("dark-mode");
            if (elements.toggleDarkModeBtn) {
                elements.toggleDarkModeBtn.textContent = "☀️";
            }
        }

        resetNadplataKredytuSection();
        resetVariableOprocentowanieSection();

        updateKwotaInfo();
        updateLata();
        updateProwizjaInfo();
        syncInputWithRange(elements.kwota, elements.kwotaRange, updateKwotaInfo, true);
        syncInputWithRange(elements.iloscRat, elements.iloscRatRange, updateLata, true);
        syncInputWithRange(elements.oprocentowanie, elements.oprocentowanieRange, null, true);
        syncInputWithRange(elements.prowizja, elements.prowizjaRange, updateProwizjaInfo, true);

        document.querySelectorAll(".legend-item").forEach(item => {
            item.addEventListener("click", () => {
                const index = parseInt(item.dataset.index);
                if (creditChart) {
                    const meta = creditChart.getDatasetMeta(index);
                    meta.hidden = !meta.hidden;
                    creditChart.update();
                }
            });
        });
    } catch (error) {
        console.error("Błąd podczas inicjalizacji aplikacji:", error);
    }
});
