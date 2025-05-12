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
    nadplataKredytuContainer: document.getElementById("nadplataKredytuContainer"),
    zmienneOprocentowanieBtn: document.getElementById("zmienneOprocentowanieBtn"),
    variableOprocentowanieInputs: document.getElementById("variableOprocentowanieInputs"),
    variableOprocentowanieWrapper: document.getElementById("variableOprocentowanieWrapper"),
    variableOprocentowanieContainer: document.getElementById("variableOprocentowanieContainer"),
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
    porownajKredytBtn: document.getElementById("porownajKredytBtn"),
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
    sUserInteracting: false
};

let creditChart = null;













// F U N K C J E    O G Ó L N E

function syncInputWithRange(input, range, onChange = null) {
    if (!input || !range) {
        console.warn("Brak input lub range w syncInputWithRange.");
        return;
    }
    let value;
    const isIntegerInput = input.id === "iloscRat" || input.classList.contains("variable-cykl") || input.classList.contains("variable-cykl-start");
    
    if (isIntegerInput) {
        value = parseInt(input.value) || parseInt(range.value) || parseInt(input.min) || 0;
        value = Math.max(parseInt(input.min) || 0, Math.min(parseInt(input.max) || Infinity, value));
        input.value = value;
    } else {
        value = parseFloat(input.value) || parseFloat(range.value) || parseFloat(input.min) || 0;
        value = Math.max(parseFloat(input.min) || 0, Math.min(parseFloat(input.max) || Infinity, value));
        input.value = value.toFixed(2);
    }
    range.value = value;
    if (onChange) onChange(value);
}

function updateKwotaInfo() {
    if (!elements.kwota || !elements.kwotaInfo) {
        console.warn("Brak elementów kwota lub kwotaInfo.");
        return;
    }
    const kwota = parseFloat(elements.kwota.value) || 0;
    elements.kwotaInfo.textContent = `Kwota kredytu: ${kwota.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł`;
    updateProwizjaInfo();
}

function updateProwizjaInfo() {
    if (!checkElements(elements.prowizja, elements.jednostkaProwizji, elements.kwota, elements.prowizjaInfo)) return;
    const prowizja = parseFloat(elements.prowizja.value) || 0;
    const jednostka = elements.jednostkaProwizji.value;
    const kwota = parseFloat(elements.kwota.value) || 0;
    const prowizjaKwota = jednostka === "procent" ? (prowizja / 100) * kwota : prowizja;
    elements.prowizjaInfo.textContent = `Prowizja: ${formatNumber(prowizjaKwota)} zł`;
    updateLoanDetails();
}









// F U N K C J E    B L O K A D Y   B O X Ó W
function setInputLockStyles(input, lock) {
    if (!input) return;
    input.disabled = lock;
    input.style.backgroundColor = lock ? "#e9ecef" : "";
    input.style.opacity = lock ? "0.6" : "";
    input.style.cursor = lock ? "not-allowed" : "";
}

function toggleMainFormLock() {
    console.log("toggleMainFormLock called");

    const isNadplataActive = elements.nadplataKredytuBtn?.checked || false;
    const isZmienneOprocentowanieActive = elements.zmienneOprocentowanieBtn?.checked || false;
    const isPorownajKredytActive = elements.porownajKredytBtn?.checked || false;
    const shouldLock = isNadplataActive || isZmienneOprocentowanieActive; // Porównaj Kredyt nie blokuje

    console.log("shouldLock:", shouldLock);

    const mainFormInputs = [
        { input: elements.kwota, group: elements.kwota?.closest('.form-group') },
        { input: elements.kwotaRange, group: elements.kwotaRange?.closest('.form-group') },
        { input: elements.iloscRat, group: elements.iloscRat?.closest('.form-group') },
        { input: elements.iloscRatRange, group: elements.iloscRatRange?.closest('.form-group') },
        { input: elements.oprocentowanie, group: elements.oprocentowanie?.closest('.form-group') },
        { input: elements.oprocentowanieRange, group: elements.oprocentowanieRange?.closest('.form-group') },
        { input: elements.rodzajRat, group: elements.rodzajRat?.closest('.form-group') },
        { input: elements.prowizja, group: elements.prowizja?.closest('.form-group') },
        { input: elements.prowizjaRange, group: elements.prowizjaRange?.closest('.form-group') },
        { input: elements.jednostkaProwizji, group: elements.jednostkaProwizji?.closest('.form-group') }
    ];

    mainFormInputs.forEach(({ input, group }, index) => {
        if (!input || !group) {
            console.warn(`Element ${index} nie znaleziony:`, { input, group });
            return;
        }
        group.classList.toggle("locked", shouldLock);
        setInputLockStyles(input, shouldLock);
    });
}












// F U N K C J E    P O M O C N I C Z E

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

function checkElements(...requiredElements) {
    const missing = requiredElements.filter(el => !el);
    if (missing.length > 0) {
        console.warn("Brak wymaganych elementów DOM:", missing);
        return false;
    }
    return true;
}

function formatNumber(value) {
    return value.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function updateLata() {
    if (!checkElements(elements.iloscRat, elements.lata)) return;
    const iloscRat = parseInt(elements.iloscRat.value) || 0;
    const lata = (iloscRat / 12).toFixed(0); // Obliczamy lata i zaokrąglamy do liczby całkowitej
    elements.lata.textContent = `Okres kredytowania: ${lata} lat`;
}








// F U N K C J E    W P R O W A D Z A N I E    D A N Y C H

function initializeInputHandling() {
    // Kwota Kredytu
    elements.kwota.addEventListener("keypress", (e) => {
        if (e.key === "." || e.key === ",") {
            e.preventDefault();
        }
        if (!/[0-9]/.test(e.key) && e.key !== "Backspace" && e.key !== "Delete" && e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Tab") {
            e.preventDefault();
        }
    });

    elements.kwota.addEventListener("blur", () => {
        let value = elements.kwota.value;
        let parsedValue = parseInt(value) || 0;
        let minValue = parseInt(elements.kwota.min) || 0;
        let maxValue = parseInt(elements.kwota.max) || Infinity;

        if (isNaN(parsedValue) || value === "") {
            parsedValue = minValue;
        } else {
            if (parsedValue < minValue) parsedValue = minValue;
            if (parsedValue > maxValue) parsedValue = maxValue;
        }

        elements.kwota.value = parsedValue;
        elements.kwotaRange.value = parsedValue;
        updateKwotaInfo();
        if (elements.jednostkaProwizji.value === "zl" && !elements.prowizja.dataset.manual) {
            syncProwizjaWithKwota();
        }
    });

    elements.kwotaRange.addEventListener("input", () => {
        let value = parseInt(elements.kwotaRange.value);
        elements.kwota.value = value;
        updateKwotaInfo();
        if (elements.jednostkaProwizji.value === "zl" && !elements.prowizja.dataset.manual) {
            syncProwizjaWithKwota();
        }
    });

    // Ilość Rat
    elements.iloscRat.addEventListener("keypress", (e) => {
        if (e.key === "." || e.key === ",") {
            e.preventDefault();
        }
        if (!/[0-9]/.test(e.key) && e.key !== "Backspace" && e.key !== "Delete" && e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Tab") {
            e.preventDefault();
        }
    });

    elements.iloscRat.addEventListener("blur", () => {
        let value = elements.iloscRat.value;
        let parsedValue = parseInt(value) || 0;
        let minValue = parseInt(elements.iloscRat.min) || 0;
        let maxValue = parseInt(elements.iloscRat.max) || Infinity;

        if (isNaN(parsedValue) || value === "") {
            parsedValue = minValue;
        } else {
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

        if (value.includes(",")) {
            value = value.replace(",", ".");
            e.target.value = value;
        }

        const dotCount = value.split(".").length - 1;
        if (dotCount > 1) {
            e.target.value = value.substring(0, value.lastIndexOf("."));
            return;
        }

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

        if (value.includes(",")) {
            value = value.replace(",", ".");
            e.target.value = value;
        }

        const dotCount = value.split(".").length - 1;
        if (dotCount > 1) {
            e.target.value = value.substring(0, value.lastIndexOf("."));
            return;
        }

        const parts = value.split(".");
        if (parts.length > 1 && parts[1].length > 2) {
            parts[1] = parts[1].substring(0, 2);
            e.target.value = parts.join(".");
        }

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
            delete elements.prowizja.dataset.manual;
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
        elements.prowizja.dataset.manual = "true";
        updateProwizjaInfo();
    });

    // Jednostka Prowizji
    elements.jednostkaProwizji.addEventListener("change", () => {
        syncProwizjaWithKwota(true);
        updateProwizjaInfo();
    });

    // Rodzaj Rat
    elements.rodzajRat.addEventListener("change", () => {
        updateLoanDetails();
    });
}

// Funkcja do synchronizacji prowizji z kwotą (przeniesiona na poziom globalny)
function syncProwizjaWithKwota(reset = false) {
    if (!checkElements(elements.jednostkaProwizji, elements.kwota, elements.prowizja, elements.prowizjaRange)) return;
    const jednostka = elements.jednostkaProwizji.value;
    const kwota = parseInt(elements.kwota.value) || 0;
    let prowizjaValue = parseFloat(elements.prowizja.value) || 0;
    const minValue = parseFloat(elements.prowizja.min) || 0;
    const maxValue = parseFloat(elements.prowizja.max) || Infinity;

    if (reset) {
        delete elements.prowizja.dataset.manual;
    }

    if (jednostka === "zl" && (reset || !elements.prowizja.dataset.manual)) {
        const defaultProwizja = (kwota * 0.02);
        prowizjaValue = Math.max(defaultProwizja, minValue);
        if (prowizjaValue > maxValue) prowizjaValue = maxValue;
        elements.prowizja.value = prowizjaValue.toFixed(2);
        elements.prowizjaRange.value = prowizjaValue;
        delete elements.prowizja.dataset.manual;
    } else if (jednostka === "procent" && reset) {
        prowizjaValue = 2;
        if (prowizjaValue < minValue) prowizjaValue = minValue;
        if (prowizjaValue > maxValue) prowizjaValue = maxValue;
        elements.prowizja.value = prowizjaValue.toFixed(2);
        elements.prowizjaRange.value = prowizjaValue;
        delete elements.prowizja.dataset.manual;
    }
    updateProwizjaInfo();
}














// F U N K C J A     N A D P Ł A T A     K R E D Y T U

if (!elements.nadplataKredytuBtn || !elements.nadplataKredytuInputs || !elements.nadplataKredytuWrapper || !elements.kwota || !elements.oprocentowanie || !elements.iloscRat || !elements.rodzajRat) {
    console.error("Niektóre elementy DOM nie zostały znalezione:", {
        nadplataKredytuBtn: elements.nadplataKredytuBtn,
        nadplataKredytuInputs: elements.nadplataKredytuInputs,
        nadplataKredytuWrapper: elements.nadplataKredytuWrapper,
        kwota: elements.kwota,
        oprocentowanie: elements.oprocentowanie,
        iloscRat: elements.iloscRat,
        rodzajRat: elements.rodzajRat
    });
}

function createNadplataKredytuGroup() {
    const group = document.createElement("div");
    group.classList.add("variable-input-group");
    group.setAttribute("data-type", "nadplata");
    group.style.marginBottom = "10px";

    const typeOptions = `
        <option value="Jednorazowa">Jednorazowa</option>
        <option value="Miesięczne">Miesięczne</option>
        <option value="Kwartalne">Kwartalne</option>
        <option value="Roczne">Roczne</option>
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
                        <input type="number" inputmode="numeric" class="form-control variable-rate" min="100" max="5000000" step="1" value="100">
                        <span class="input-group-text unit-zl">zł</span>
                    </div>
                    <input type="range" class="form-range range-slider variable-rate-range" min="100" max="5000000" step="1" value="100">
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

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

function syncInputWithRange(input, range, enforceLimits = false, maxLimit = null) {
    if (!input || !range) return;
    let value = parseInt(input.value);
    if (!isNaN(value)) {
        const min = parseInt(range.min) || 1;
        let max = maxLimit !== null ? maxLimit : parseInt(range.max) || 360;
        if (enforceLimits) {
            if (value < min) value = min;
            if (value > max) value = max;
            if (input.value !== value.toString()) {
                input.value = value;
            }
        }
        if (parseInt(range.value) !== value) {
            range.value = value;
        }
        console.log(`SyncInputWithRange: Input=${input.value}, Range=${range.value}, Min=${min}, Max=${max}, EnforceLimits=${enforceLimits}`);
    }
}

function calculateRemainingCapital(loanAmount, interestRate, totalMonths, paymentType, overpayments, targetMonth) {
    let remainingCapital = Math.round(loanAmount);
    let monthlyRate = interestRate / 100 / 12;
    let monthlyPayment = 0;

    if (paymentType === "rowne") {
        const numerator = Math.round(loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)));
        const denominator = Math.round(Math.pow(1 + monthlyRate, totalMonths) - 1);
        monthlyPayment = Math.round(numerator / denominator) || 100;
    }

    let overpaymentMap = new Map();
    overpayments.forEach(overpayment => {
        let interval = 1;
        if (overpayment.type === "Kwartalne") interval = 3;
        else if (overpayment.type === "Roczne") interval = 12;

        if (overpayment.type === "Jednorazowa") {
            if (overpayment.start <= targetMonth + 1) {
                overpaymentMap.set(overpayment.start, (overpaymentMap.get(overpayment.start) || 0) + overpayment.amount);
            }
        } else {
            for (let month = overpayment.start; month <= targetMonth + 1; month += interval) {
                overpaymentMap.set(month, (overpaymentMap.get(month) || 0) + overpayment.amount);
            }
        }
    });

    for (let month = 1; month <= targetMonth + 1 && remainingCapital > 0; month++) {
        let interest = Math.round(remainingCapital * monthlyRate);
        let capitalPayment = 0;

        if (paymentType === "rowne") {
            capitalPayment = Math.round(monthlyPayment - interest);
        } else {
            capitalPayment = Math.round(loanAmount / totalMonths);
            monthlyPayment = Math.round(capitalPayment + interest);
        }

        if (capitalPayment > remainingCapital) capitalPayment = remainingCapital;

        remainingCapital = Math.max(0, Math.round(remainingCapital - capitalPayment));

        if (overpaymentMap.has(month)) {
            let overpaymentAmount = overpaymentMap.get(month);
            if (overpaymentAmount > remainingCapital) overpaymentAmount = remainingCapital;
            remainingCapital = Math.max(0, Math.round(remainingCapital - overpaymentAmount));
        }
    }

    return Math.max(0, Math.round(remainingCapital));
}

function updateOverpaymentLimit(input, range, group, preserveValue = true, isChangeEvent = false) {
    if (!group || group.classList.contains("locked")) return 0;

    const typeSelect = group.querySelector(".nadplata-type-select");
    const type = typeSelect?.value || "Jednorazowa";
    const effectSelect = group.querySelector(".nadplata-effect-select");
    const effect = effectSelect?.value || "Skróć okres";
    const periodStartInput = group.querySelector(".variable-cykl-start");
    const periodStartRange = group.querySelector(".variable-cykl-start-range");
    const rateInput = input.classList.contains("variable-rate") ? input : group.querySelector(".variable-rate");
    const rateRange = range.classList.contains("variable-rate-range") ? range : group.querySelector(".variable-rate-range");
    const periodLabel = group.querySelector(".box-period-start .form-label");
    const periodUnit = group.querySelector(".box-period-start .unit-period");

    if (!rateInput || !rateRange || !periodStartInput || !periodStartRange || !periodLabel || !periodUnit) return 0;

    const loanAmount = parseInt(elements.kwota?.value) || 500000;
    const interestRate = parseFloat(elements.oprocentowanie?.value) || 7;
    const totalMonths = parseInt(elements.iloscRat?.value) || 360;
    const paymentType = elements.rodzajRat?.value || "rowne";

    const allGroups = elements.nadplataKredytuWrapper.querySelectorAll(".variable-input-group");
    const currentIndex = Array.from(allGroups).indexOf(group);
    const previousOverpayments = [];
    for (let i = 0; i < currentIndex; i++) {
        const prevGroup = allGroups[i];
        if (!prevGroup) continue;
        const prevType = prevGroup.querySelector(".nadplata-type-select")?.value || "Jednorazowa";
        const prevPeriodStart = parseInt(prevGroup.querySelector(".variable-cykl-start")?.value) || 1;
        const prevAmount = parseInt(prevGroup.querySelector(".variable-rate")?.value) || 0;
        const prevEffect = prevGroup.querySelector(".nadplata-effect-select")?.value || "Skróć okres";
        previousOverpayments.push({ type: prevType, start: prevPeriodStart, amount: prevAmount, effect: prevEffect });
    }

    let periodStart = parseInt(periodStartInput.value) || 1;
    let adjustedPeriod = Math.max(0, periodStart - 1);
    let overpaymentAmount = parseInt(rateInput.value) || 0;
    let remainingCapital = calculateRemainingCapital(loanAmount, interestRate, totalMonths, paymentType, previousOverpayments, adjustedPeriod);
    let maxAllowed = Math.max(100, remainingCapital);

    if (currentIndex === 0) {
        remainingCapital = calculateRemainingCapital(loanAmount, interestRate, totalMonths, paymentType, [], adjustedPeriod);
        maxAllowed = Math.max(100, remainingCapital);
    }

    rateInput.max = Math.floor(maxAllowed);
    rateRange.max = Math.floor(maxAllowed);

    if (!preserveValue) {
        let rateValue = Math.min(parseInt(rateInput.value) || 100, maxAllowed);
        rateInput.value = rateValue;
        rateRange.value = rateValue;
    }

    let interval = 1;
    if (type === "Kwartalne") interval = 3;
    else if (type === "Roczne") interval = 12;

    let currentOverpayments = [...previousOverpayments];
    let month = periodStart;
    if (type === "Jednorazowa") {
        currentOverpayments.push({ type, start: periodStart, amount: overpaymentAmount, effect });
    } else {
        let tempRemainingCapital = remainingCapital;
        while (month <= totalMonths && tempRemainingCapital > 0 && overpaymentAmount > 0) {
            let amountToAdd = Math.min(overpaymentAmount, tempRemainingCapital);
            currentOverpayments.push({ type, start: month, amount: amountToAdd, effect });
            tempRemainingCapital = calculateRemainingCapital(loanAmount, interestRate, totalMonths, paymentType, currentOverpayments, month);
            month += interval;
        }
    }

    let loanDetails = calculateLoan(
        loanAmount,
        interestRate,
        totalMonths,
        paymentType,
        parseFloat(elements.prowizja?.value) || 0,
        elements.jednostkaProwizji?.value || "procent",
        state.variableRates,
        currentOverpayments
    );

    let maxPeriodStart = totalMonths;
    if (loanDetails && loanDetails.pozostaleRaty > 0) {
        maxPeriodStart = Math.min(totalMonths, loanDetails.pozostaleRaty);
        if (maxPeriodStart < periodStart) maxPeriodStart = periodStart;
    } else {
        maxPeriodStart = Math.min(totalMonths, Math.floor(remainingCapital / (overpaymentAmount || 100)) + periodStart);
    }

    if (maxPeriodStart > totalMonths || maxPeriodStart <= 0) {
        maxPeriodStart = totalMonths;
    }

    let minPeriodStart = currentIndex > 0 ? (parseInt(allGroups[currentIndex - 1].querySelector(".variable-cykl-start")?.value) || 1) + 1 : 1;
    if (minPeriodStart > maxPeriodStart) minPeriodStart = 1;

    periodStartInput.min = minPeriodStart;
    periodStartRange.min = minPeriodStart;
    periodStartInput.max = maxPeriodStart;
    periodStartRange.max = maxPeriodStart;

    if (type === "Miesięczne" || type === "Kwartalne" || type === "Roczne") {
        periodLabel.textContent = "OD";
        periodUnit.textContent = type === "Miesięczne" ? "miesiąca" : type === "Kwartalne" ? "kwartału" : "roku";
    } else {
        periodLabel.textContent = "W";
        periodUnit.textContent = "miesiącu";
    }

    let currentStartValue = parseInt(periodStartInput.value) || minPeriodStart;
    if (currentStartValue < minPeriodStart) currentStartValue = minPeriodStart;
    if (currentStartValue > maxPeriodStart) currentStartValue = maxPeriodStart;

    periodStartInput.value = currentStartValue;
    periodStartRange.value = currentStartValue;
    syncInputWithRange(periodStartInput, periodStartRange, true, maxPeriodStart);

    updateRatesArray("nadplata");
    return remainingCapital;
}

function updateAllOverpaymentLimits() {
    if (state.isUpdating) return { remainingCapital: 0, remainingMonths: 0 };

    state.isUpdating = true;
    try {
        const allGroups = elements.nadplataKredytuWrapper.querySelectorAll(".variable-input-group");
        let lastRemainingCapital = 0;
        let lastRemainingMonths = 0;

        const loanAmount = parseInt(elements.kwota?.value) || 500000;
        const interestRate = parseFloat(elements.oprocentowanie?.value) || 7;
        const totalMonths = parseInt(elements.iloscRat?.value) || 360;
        const paymentType = elements.rodzajRat?.value || "rowne";

        let lastOverpaymentMonth = 1;
        const overpayments = [];
        allGroups.forEach((g, index) => {
            if (!g) return;
            const type = g.querySelector(".nadplata-type-select")?.value || "Jednorazowa";
            const periodStart = parseInt(g.querySelector(".variable-cykl-start")?.value) || 1;
            const amount = parseInt(g.querySelector(".variable-rate")?.value) || 0;
            const effect = g.querySelector(".nadplata-effect-select")?.value || "Skróć okres";

            let interval = 1;
            if (type === "Kwartalne") interval = 3;
            else if (type === "Roczne") interval = 12;

            let month = periodStart;
            let tempRemainingCapital = calculateRemainingCapital(loanAmount, interestRate, totalMonths, paymentType, overpayments, month - 1);
            if (type === "Jednorazowa") {
                overpayments.push({ type, start: periodStart, amount, effect });
                if (periodStart > lastOverpaymentMonth) lastOverpaymentMonth = periodStart;
            } else {
                while (month <= totalMonths && tempRemainingCapital > 0 && amount > 0) {
                    let amountToAdd = Math.min(amount, tempRemainingCapital);
                    overpayments.push({ type, start: month, amount: amountToAdd, effect });
                    tempRemainingCapital = calculateRemainingCapital(loanAmount, interestRate, totalMonths, paymentType, overpayments, month);
                    month += interval;
                    if (month > lastOverpaymentMonth) lastOverpaymentMonth = month;
                }
            }

            const rateInput = g.querySelector(".variable-rate");
            const rateRange = g.querySelector(".variable-rate-range");
            if (rateInput && rateRange && !g.classList.contains("locked")) {
                updateOverpaymentLimit(rateInput, rateRange, g, true);
            }
        });

        const loanDetails = calculateLoan(
            loanAmount,
            interestRate,
            totalMonths,
            paymentType,
            parseFloat(elements.prowizja?.value) || 0,
            elements.jednostkaProwizji?.value || "procent",
            state.variableRates,
            overpayments
        );

        if (loanDetails) {
            lastRemainingCapital = loanDetails.harmonogram[loanDetails.harmonogram.length - 1]?.kapitalDoSplaty || 0;
            lastRemainingMonths = loanDetails.pozostaleRaty;
        } else {
            lastRemainingCapital = loanAmount;
            lastRemainingMonths = totalMonths;
        }

        return { remainingCapital: lastRemainingCapital, remainingMonths: lastRemainingMonths };
    } finally {
        state.isUpdating = false;
    }
}

function initializeNadplataKredytuGroup(group) {
    if (!group) return;

    const periodStartBox = group.querySelector(".box-period-start");
    const periodLabel = periodStartBox?.querySelector(".form-label");
    const periodUnit = periodStartBox?.querySelector(".unit-period");
    const typeSelect = group.querySelector(".nadplata-type-select");

    if (!periodStartBox || !periodLabel || !periodUnit || !typeSelect) return;

    const updatePeriodBox = () => {
        if (state.isUpdating) return;

        state.isUpdating = true;
        const periodStartInput = group.querySelector(".variable-cykl-start");
        const periodStartRange = group.querySelector(".variable-cykl-start-range");
        const rateInput = group.querySelector(".variable-rate");
        const rateRange = group.querySelector(".variable-rate-range");

        if (!periodStartInput || !periodStartRange || !rateInput || !rateRange) {
            state.isUpdating = false;
            return;
        }

        const type = typeSelect.value;
        if (type === "Miesięczne" || type === "Kwartalne" || type === "Roczne") {
            periodLabel.textContent = "OD";
            periodUnit.textContent = type === "Miesięczne" ? "miesiąca" : type === "Kwartalne" ? "kwartału" : "roku";
        } else {
            periodLabel.textContent = "W";
            periodUnit.textContent = "miesiącu";
        }

        let minValue;
        const groups = elements.nadplataKredytuWrapper.querySelectorAll(".variable-input-group");
        const currentIndex = Array.from(groups).indexOf(group);

        minValue = currentIndex > 0 ? (parseInt(groups[currentIndex - 1].querySelector(".variable-cykl-start")?.value) || 1) + 1 : 1;

        periodStartInput.min = minValue;
        periodStartRange.min = minValue;

        updateOverpaymentLimit(rateInput, rateRange, group, true);
        updateLoanDetails();

        state.isUpdating = false;
    };

    const initializeInputsAndRanges = (inputs, ranges) => {
        inputs.forEach((input, index) => {
            const range = ranges[index];
            if (!input || !range) return;

            syncInputWithRange(input, range);

            if (input.classList.contains("variable-cykl-start")) {
                const periodStartInput = input;
                const debouncedUpdate = debounce(() => {
                    if (!state.isUpdating) {
                        const rateInput = group.querySelector(".variable-rate");
                        const rateRange = group.querySelector(".variable-rate-range");
                        if (rateInput && rateRange) {
                            updateOverpaymentLimit(rateInput, rateRange, group, true, false);
                            updateRatesArray("nadplata");
                            updateNadplataKredytuRemoveButtons();
                            updateLoanDetails();
                        }
                    }
                }, 10);

                input.addEventListener("input", () => {
                    let value = input.value.replace(/[^0-9]/g, "");
                    if (value) {
                        let parsedValue = parseInt(value);
                        if (parsedValue < parseInt(input.min)) parsedValue = parseInt(input.min);
                        range.value = parsedValue;
                    }
                    debouncedUpdate();
                });

                input.addEventListener("change", () => {
                    let value = parseInt(input.value) || parseInt(input.min);
                    if (value < parseInt(input.min)) value = parseInt(input.min);
                    input.value = value;
                    range.value = value;
                    debouncedUpdate();
                });

                range.addEventListener("input", () => {
                    let value = parseInt(range.value);
                    if (value < parseInt(range.min)) value = parseInt(range.min);
                    input.value = value;
                    range.value = value;
                    debouncedUpdate();
                });

                range.addEventListener("change", () => {
                    let value = parseInt(range.value);
                    if (value < parseInt(range.min)) value = parseInt(input.min);
                    input.value = value;
                    range.value = value;
                    debouncedUpdate();
                });
            } else if (input.classList.contains("variable-rate")) {
                const debouncedUpdate = debounce(() => {
                    if (!state.isUpdating) {
                        updateOverpaymentLimit(input, range, group, false, false);
                        updateRatesArray("nadplata");
                        updateNadplataKredytuRemoveButtons();
                        updateLoanDetails();
                    }
                }, 50);

                const debouncedChangeUpdate = debounce(() => {
                    if (!state.isUpdating) {
                        updateOverpaymentLimit(input, range, group, false, true);
                        updateRatesArray("nadplata");
                        updateNadplataKredytuRemoveButtons();
                        updateLoanDetails();
                    }
                }, 50);

                input.addEventListener("input", () => {
                    let value = input.value.replace(/[^0-9]/g, "");
                    if (value) {
                        let parsedValue = parseInt(value);
                        if (parsedValue < parseInt(input.min)) parsedValue = parseInt(input.min);
                        if (parsedValue > parseInt(input.max)) parsedValue = parseInt(input.max);
                        range.value = parsedValue;
                    }
                    debouncedUpdate();
                });

                input.addEventListener("change", () => {
                    let value = parseInt(input.value) || parseInt(input.min);
                    if (value < parseInt(input.min)) value = parseInt(input.min);
                    if (value > parseInt(input.max)) value = parseInt(input.max);
                    input.value = value;
                    range.value = value;
                    debouncedChangeUpdate();
                });

                range.addEventListener("input", () => {
                    let value = parseInt(range.value);
                    if (value < parseInt(range.min)) value = parseInt(range.min);
                    if (value > parseInt(range.max)) value = parseInt(range.max);
                    input.value = value;
                    range.value = value;
                    debouncedUpdate();
                });

                range.addEventListener("change", () => {
                    let value = parseInt(range.value);
                    if (value < parseInt(range.min)) value = parseInt(range.min);
                    if (value > parseInt(range.max)) value = parseInt(range.max);
                    input.value = value;
                    range.value = value;
                    debouncedChangeUpdate();
                });
            }
        });
    };

    const inputs = group.querySelectorAll(".form-control");
    const ranges = group.querySelectorAll(".form-range");
    initializeInputsAndRanges(inputs, ranges);

    typeSelect.addEventListener("change", () => {
        updatePeriodBox();
        const rateInput = group.querySelector(".variable-rate");
        const rateRange = group.querySelector(".variable-rate-range");
        if (rateInput && rateRange) {
            updateOverpaymentLimit(rateInput, rateRange, group, true);
        }
    });

    updatePeriodBox();
}

function resetNadplataKredytuSection() {
    if (!elements.nadplataKredytuWrapper) return;
    elements.nadplataKredytuWrapper.innerHTML = "";
    state.overpaymentRates = [];
    if (elements.nadplataKredytuBtn) {
        elements.nadplataKredytuBtn.checked = false;
        elements.nadplataKredytuBtn.disabled = false;
        elements.nadplataKredytuBtn.parentElement?.classList.remove("disabled");
    }
    if (elements.nadplataKredytuInputs) {
        elements.nadplataKredytuInputs.classList.remove("active");
    }
    toggleMainFormLock();
}

function updateNadplataKredytuRemoveButtons() {
    if (!elements.nadplataKredytuWrapper) return;

    const wrapper = elements.nadplataKredytuWrapper;
    const groups = wrapper.querySelectorAll(".variable-input-group");
    let existingRemoveBtnWrapper = wrapper.querySelector(".remove-btn-wrapper");

    if (groups.length === 0) {
        if (existingRemoveBtnWrapper) existingRemoveBtnWrapper.remove();
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
    addBtn.id = "addNadplataKredytuBtn";
    addBtn.classList.add("btn", "btn-functional");
    addBtn.setAttribute("aria-label", "Dodaj kolejną nadpłatę");
    addBtn.textContent = "Dodaj kolejną nadpłatę";
    existingRemoveBtnWrapper.appendChild(addBtn);

    const lastGroup = groups[groups.length - 1];
    if (existingRemoveBtnWrapper.parentElement !== lastGroup) lastGroup.appendChild(existingRemoveBtnWrapper);

    groups.forEach((group, index) => {
        if (index < groups.length - 1 && !group.classList.contains("locked")) {
            group.classList.add("locked");
            group.querySelectorAll(".form-control, .form-select, .form-range").forEach(input => {
                input.disabled = true;
                if (input.classList.contains("nadplata-type-select") || input.classList.contains("nadplata-effect-select")) {
                    input.style.backgroundColor = "#e9ecef";
                    input.style.opacity = "0.7";
                    input.classList.remove("unlocked-select");
                }
            });
        } else if (index === groups.length - 1 && group.classList.contains("locked")) {
            group.classList.remove("locked");
            group.querySelectorAll(".form-control, .form-select, .form-range").forEach(input => {
                input.disabled = false;
                if (input.classList.contains("nadplata-type-select") || input.classList.contains("nadplata-effect-select")) {
                    input.classList.add("unlocked-select");
                    input.style.backgroundColor = "#ffffff";
                    input.style.opacity = "1";
                }
            });
        }
    });

    const hasCyclicOverpayment = Array.from(groups).some(g =>
        ["Miesięczne", "Kwartalne", "Roczne"].includes(g.querySelector(".nadplata-type-select")?.value)
    );

    removeBtn.addEventListener("click", () => {
        const groups = wrapper.querySelectorAll(".variable-input-group");
        if (groups.length === 1) {
            elements.nadplataKredytuBtn.checked = false;
            elements.nadplataKredytuInputs?.classList.remove("active");
            resetNadplataKredytuSection();
        } else {
            groups[groups.length - 1].remove();
            if (groups.length - 2 >= 0) {
                const previousGroup = groups[groups.length - 2];
                if (previousGroup.classList.contains("locked")) {
                    previousGroup.classList.remove("locked");
                    previousGroup.querySelectorAll(".form-control, .form-select, .form-range").forEach(input => {
                        input.disabled = false;
                        if (input.classList.contains("nadplata-type-select") || input.classList.contains("nadplata-effect-select")) {
                            input.classList.add("unlocked-select");
                            input.style.backgroundColor = "#ffffff";
                            input.style.opacity = "1";
                        }
                    });
                }
            }
            updateRatesArray("nadplata");
            updateAllOverpaymentLimits();
            updateNadplataKredytuRemoveButtons();
            updateLoanDetails();
        }
    });

    addBtn.addEventListener("click", () => {
        const newGroup = createNadplataKredytuGroup();
        wrapper.appendChild(newGroup);
        initializeNadplataKredytuGroup(newGroup);

        updateRatesArray("nadplata");
        updateAllOverpaymentLimits();
        updateNadplataKredytuRemoveButtons();
        updateLoanDetails();
    });

    const loanDetails = calculateLoan(
        parseInt(elements.kwota?.value) || 500000,
        parseFloat(elements.oprocentowanie?.value) || 7,
        parseInt(elements.iloscRat?.value) || 360,
        elements.rodzajRat?.value || "rowne",
        parseFloat(elements.prowizja?.value) || 0,
        elements.jednostkaProwizji?.value || "procent",
        state.variableRates,
        state.overpaymentRates
    );

    if (loanDetails) {
        const lastGroup = groups[groups.length - 1];
        const rateInput = lastGroup.querySelector(".variable-rate");
        const currentOverpayment = parseInt(rateInput?.value) || 0;
        const maxOverpayment = parseInt(rateInput?.max) || 0;
        const currentPeriodStart = parseInt(lastGroup.querySelector(".variable-cykl-start")?.value) || 1;
        const maxPeriodStart = parseInt(lastGroup.querySelector(".variable-cykl-start")?.max) || totalMonths;

        if (hasCyclicOverpayment) {
            addBtn.style.display = "none";
        } else if (currentOverpayment >= maxOverpayment || (currentPeriodStart >= maxPeriodStart && loanDetails.harmonogram[loanDetails.harmonogram.length - 1]?.kapitalDoSplaty <= 0)) {
            addBtn.style.display = "none";
        } else {
            addBtn.style.display = "block";
        }
    }
}

function initializeNadplataKredytuToggle() {
    if (!elements.nadplataKredytuBtn) return;

    elements.nadplataKredytuBtn.addEventListener("change", () => {
        const isChecked = elements.nadplataKredytuBtn.checked;
        if (elements.nadplataKredytuInputs) {
            elements.nadplataKredytuInputs.classList.toggle("active", isChecked);
        }

        if (isChecked) {
            if (!elements.nadplataKredytuWrapper) return;
            elements.nadplataKredytuWrapper.innerHTML = "";
            const newGroup = createNadplataKredytuGroup();
            elements.nadplataKredytuWrapper.appendChild(newGroup);
            initializeNadplataKredytuGroup(newGroup);
            updateNadplataKredytuRemoveButtons();
        } else {
            resetNadplataKredytuSection();
        }
        toggleMainFormLock();
    });
}

state.isUpdating = false;
state.hasUserInteracted = false;

document.addEventListener("DOMContentLoaded", () => {
    initializeNadplataKredytuToggle();
    const wrapper = elements.nadplataKredytuWrapper;
    if (wrapper) {
        wrapper.addEventListener("input", () => {
            state.hasUserInteracted = true;
            updateNadplataKredytuRemoveButtons();
        });
        wrapper.addEventListener("change", () => {
            state.hasUserInteracted = true;
            updateNadplataKredytuRemoveButtons();
        });
    }
});











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
                    <input type="number" class="form-control variable-cykl" min="${startPeriod}" max="${iloscRat}" step="1" value="${startPeriod}" inputmode="numeric" pattern="[0-9]*">
                    <span class="input-group-text unit-miesiaca">miesiąca</span>
                </div>
                <input type="range" class="form-range range-slider variable-cykl-range" min="${startPeriod}" max="${iloscRat}" step="1" value="${startPeriod}">
            </div>
            <div class="form-group box-rate">
                <label class="form-label">Oprocentowanie</label>
                <div class="input-group">
                    <input type="number" class="form-control variable-rate" min="0.1" max="25" step="0.01" value="7.00">
                    <span class="input-group-text">%</span>
                </div>
                <input type="range" class="form-range range-slider variable-rate-range" min="0.1" max="25" step="0.01" value="7.00">
            </div>
        </div>
    `;
    return group;
}

function initializeVariableOprocentowanieGroup(group) {
    const iloscRat = parseInt(elements.iloscRat?.value) || 420;

    // Ustaw dynamiczne min dla boxa "Od" na podstawie poprzedniej grupy
    const allGroups = elements.variableOprocentowanieWrapper.querySelectorAll(".variable-input-group");
    const currentIndex = Array.from(allGroups).indexOf(group);
    let minPeriod = 2; // Domyślne minimum dla pierwszej grupy
    if (currentIndex > 0) {
        const prevGroup = allGroups[currentIndex - 1];
        const prevPeriodInput = prevGroup.querySelector(".variable-cykl");
        const prevPeriodValue = parseInt(prevPeriodInput.value) || 2;
        minPeriod = prevPeriodValue + 1; // Minimum to okres poprzedniej grupy + 1
    }

    const inputs = group.querySelectorAll(".form-control");
    const ranges = group.querySelectorAll(".form-range");

    inputs.forEach((input, index) => {
        const range = ranges[index];
        if (input.classList.contains("variable-cykl")) {
            input.min = minPeriod;
            input.max = iloscRat;
            range.min = minPeriod;
            range.max = iloscRat;
            syncInputWithRange(input, range);

            // Blokuj niecyfrowe znaki przed wprowadzeniem
            input.addEventListener("beforeinput", (e) => {
                if (e.data && !/[0-9]/.test(e.data)) {
                    e.preventDefault(); // Zablokuj wprowadzenie znaku
                }
            });

            input.addEventListener("input", (e) => {
                let value = input.value;
                const cursorPosition = input.selectionStart;

                // Usuń wszystkie znaki niebędące cyframi (na wypadek wklejenia)
                const sanitizedValue = value.replace(/[^0-9]/g, "");
                if (value !== sanitizedValue) {
                    input.value = sanitizedValue;
                }

                // Synchronizuj z suwakiem, jeśli wartość jest liczbą
                if (!isNaN(parseInt(sanitizedValue))) {
                    range.value = parseInt(sanitizedValue);
                }

                // Przywróć pozycję kursora z opóźnieniem
                setTimeout(() => {
                    input.setSelectionRange(cursorPosition, cursorPosition);
                }, 0);
            });

            input.addEventListener("change", () => {
                let value = parseInt(input.value);
                const min = parseInt(input.min);
                const max = parseInt(input.max);

                if (isNaN(value) || value < min) {
                    value = min;
                    input.value = value;
                } else if (value > max) {
                    value = max;
                    input.value = value;
                }

                syncInputWithRange(input, range);
                updateRatesArray("oprocentowanie");
                updateVariableOprocentowanieRemoveButtons();

                if (input.classList.contains("variable-cykl") && currentIndex < allGroups.length - 1) {
                    const nextGroup = allGroups[currentIndex + 1];
                    const nextPeriodInput = nextGroup.querySelector(".variable-cykl");
                    const nextPeriodRange = nextGroup.querySelector(".variable-cykl-range");
                    const newMin = value + 1;
                    nextPeriodInput.min = newMin;
                    nextPeriodRange.min = newMin;
                    if (parseInt(nextPeriodInput.value) < newMin) {
                        nextPeriodInput.value = newMin;
                        nextPeriodRange.value = newMin;
                    }
                }
            });

        } else if (input.classList.contains("variable-rate")) {
            input.min = "0.1";
            input.max = "25";
            range.min = "0.1";
            range.max = "25";
            syncInputWithRange(input, range);

            // Obsługa inputu dla wartości z dwoma miejscami po przecinku
            input.addEventListener("input", (e) => {
                let value = input.value;
                const cursorPosition = input.selectionStart;

                // Zezwól na kropkę i przecinek, ale ogranicz do dwóch miejsc po przecinku
                if (value.includes(".") || value.includes(",")) {
                    const parts = value.replace(",", ".").split(".");
                    if (parts.length > 1 && parts[1].length > 2) {
                        parts[1] = parts[1].slice(0, 2); // Ogranicz do 2 miejsc po przecinku
                        value = parts.join(".");
                        input.value = value;
                    }
                }

                // Synchronizuj z suwakiem
                if (!isNaN(parseFloat(value))) {
                    range.value = parseFloat(value).toFixed(2);
                }

                // Przywróć pozycję kursora
                setTimeout(() => {
                    input.setSelectionRange(cursorPosition, cursorPosition);
                }, 0);
            });

            input.addEventListener("change", () => {
                let value = parseFloat(input.value) || 0;
                const min = parseFloat(input.min);
                const max = parseFloat(input.max);

                // Walidacja po zakończeniu edycji
                if (value < min) value = min;
                else if (value > max) value = max;

                input.value = value.toFixed(2);
                range.value = value.toFixed(2);
                updateRatesArray("oprocentowanie");
                updateVariableOprocentowanieRemoveButtons();
            });
        }

        range.addEventListener("input", () => {
            if (range.classList.contains("variable-cykl-range")) {
                input.value = parseInt(range.value); // Liczba całkowita dla "Od"
            } else {
                input.value = parseFloat(range.value).toFixed(2); // Dwa miejsca po przecinku dla "Oprocentowanie"
            }
            updateRatesArray("oprocentowanie");
            updateVariableOprocentowanieRemoveButtons();

            if (range.classList.contains("variable-cykl-range") && currentIndex < allGroups.length - 1) {
                const nextGroup = allGroups[currentIndex + 1];
                const nextPeriodInput = nextGroup.querySelector(".variable-cykl");
                const nextPeriodRange = nextGroup.querySelector(".variable-cykl-range");
                const newMin = parseInt(range.value) + 1;
                nextPeriodInput.min = newMin;
                nextPeriodRange.min = newMin;
                if (parseInt(nextPeriodInput.value) < newMin) {
                    nextPeriodInput.value = newMin;
                    nextPeriodRange.value = newMin;
                }
            }
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
    elements.zmienneOprocentowanieBtn.checked = false;
    elements.variableOprocentowanieInputs.classList.remove("active");
    toggleMainFormLock(); // Wywołaj blokadę po zresetowaniu sekcji
}

function updateVariableOprocentowanieRemoveButtons() {
    const wrapper = elements.variableOprocentowanieWrapper;
    const groups = wrapper.querySelectorAll(".variable-input-group");
    let existingRemoveBtnWrapper = wrapper.querySelector(".remove-btn-wrapper");

    if (existingRemoveBtnWrapper) {
        existingRemoveBtnWrapper.remove();
    }

    groups.forEach((group, index) => {
        const inputs = group.querySelectorAll(".form-control");
        const ranges = group.querySelectorAll(".form-range");
        const isLastGroup = index === groups.length - 1;

        if (!isLastGroup) {
            group.classList.add("locked");
        } else {
            group.classList.remove("locked");
        }

        inputs.forEach(input => {
            input.disabled = !isLastGroup;
        });

        ranges.forEach(range => {
            range.disabled = !isLastGroup;
        });
    });

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
                resetVariableOprocentowanieSection();
            }
            updateVariableOprocentowanieRemoveButtons();
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

        const lastPeriodInput = lastGroup.querySelector(".variable-cykl");
        const lastPeriodValue = parseInt(lastPeriodInput.value) || 2;
        const maxPeriod = parseInt(elements.iloscRat?.value) || 420;
        addBtn.style.display = lastPeriodValue >= maxPeriod ? "none" : "block";
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
                updateVariableOprocentowanieRemoveButtons();
            } else {
                elements.variableOprocentowanieInputs.classList.remove("active");
                resetVariableOprocentowanieSection();
                updateVariableOprocentowanieRemoveButtons();
            }
            toggleMainFormLock(); // Wywołaj blokadę po zmianie stanu
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
            updateVariableOprocentowanieRemoveButtons();
        });

        elements.iloscRatRange.addEventListener("input", () => {
            const groups = elements.variableOprocentowanieWrapper.querySelectorAll(".variable-input-group");
            groups.forEach(group => initializeVariableOprocentowanieGroup(group));
            updateVariableOprocentowanieRemoveButtons();
        });
    }
}





// F U N K C J E    P O R Ó W N A J     K R E D Y T

function initializePorownajKredytToggle() {
    if (elements.porownajKredytBtn) {
        elements.porownajKredytBtn.addEventListener("change", () => {
            const isChecked = elements.porownajKredytBtn.checked;
            if (isChecked) {
                if (elements.nadplataKredytuBtn) {
                    elements.nadplataKredytuBtn.checked = false;
                    elements.nadplataKredytuInputs?.classList.remove("active");
                    elements.nadplataKredytuContainer.style.display = "none";
                    resetNadplataKredytuSection();
                }
                if (elements.zmienneOprocentowanieBtn) {
                    elements.zmienneOprocentowanieBtn.checked = false;
                    elements.variableOprocentowanieInputs.classList.remove("active");
                    elements.variableOprocentowanieContainer.style.display = "none";
                    resetVariableOprocentowanieSection();
                }
                // Nie wywołuj toggleMainFormLock, tylko ukryj sekcje
            } else {
                if (elements.nadplataKredytuContainer) {
                    elements.nadplataKredytuContainer.style.display = "block";
                }
                if (elements.variableOprocentowanieContainer) {
                    elements.variableOprocentowanieContainer.style.display = "block";
                }
            }
        });
    }
}









// F U N K C J E     W Y N I K I   T A B E L I    I     W Y K R E S U

function calculateInstallment(kwota, iloscRat, pozostalyKapital, currentOprocentowanie, applyRateReduction, rodzajRat, miesiac) {
    let odsetki = pozostalyKapital * currentOprocentowanie;
    let rataKapitalowa = 0;
    let rataCalkowita = 0;

    if (rodzajRat === "rowne") {
        let q = 1 + currentOprocentowanie;
        let remainingMonths = iloscRat - miesiac + 1;
        if (remainingMonths <= 0) remainingMonths = 1;

        if (applyRateReduction) {
            const numerator = Math.round(pozostalyKapital * (currentOprocentowanie * Math.pow(q, remainingMonths)));
            const denominator = Math.round(Math.pow(q, remainingMonths) - 1);
            rataCalkowita = Math.round(numerator / denominator) || 100;
        } else {
            rataCalkowita = Math.round(kwota * (q ** iloscRat) * (q - 1) / ((q ** iloscRat) - 1)) || 100;
        }

        if (isNaN(rataCalkowita) || rataCalkowita <= 0) {
            rataCalkowita = 0;
        }

        rataKapitalowa = rataCalkowita - odsetki;

        if (rataKapitalowa > pozostalyKapital) {
            rataKapitalowa = pozostalyKapital;
            rataCalkowita = rataKapitalowa + odsetki;
        }
    } else {
        rataKapitalowa = kwota / iloscRat;
        rataCalkowita = rataKapitalowa + odsetki;

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
        let nadplatyJednorazowe = 0;
        let nadplatyMiesieczne = 0;
        let nadplatyKwartalne = 0;
        let nadplatyRoczne = 0;
        let jednostka = prowizjaJednostka;
        if (!jednostka && elements.jednostkaProwizji) {
            console.warn("Brak jednostki prowizji w parametrze, używam wartości z elements.jednostkaProwizji.");
            jednostka = elements.jednostkaProwizji.value || "procent";
        }
        let prowizjaKwota = jednostka === "procent" ? (prowizja / 100) * kwota : prowizja;
        let pozostaleRaty = iloscRat;
        let oprocentowanieMiesieczne = oprocentowanie / 100 / 12;

        let activeVariableRates = Array.isArray(variableRates) ? [...variableRates].sort((a, b) => a.period - b.period) : [];
        let activeOverpaymentRates = Array.isArray(overpaymentRates) ? [...overpaymentRates].sort((a, b) => a.start - b.start) : [];

        let lastNadplataMonth = 0;
        let applyRateReduction = false;
        let lastOverpaymentEffect = null;

        for (let i = 1; i <= iloscRat; i++) {
            let currentOprocentowanie = oprocentowanieMiesieczne;
            let activeRate = activeVariableRates.find(rate => rate.period === i);
            if (activeRate && !isNaN(activeRate.value)) {
                currentOprocentowanie = activeRate.value / 100 / 12;
            }

            let nadplata = 0;
            let activeOverpayment = null;

            activeOverpaymentRates.forEach(over => {
                let applies = false;
                if (over.type === "Jednorazowa" && over.start === i) {
                    applies = true;
                } else if (over.type === "Miesięczne" && i >= over.start) {
                    applies = true;
                } else if (over.type === "Kwartalne" && i >= over.start && (i - over.start) % 3 === 0) {
                    applies = true;
                } else if (over.type === "Roczne" && i >= over.start && (i - over.start) % 12 === 0) {
                    applies = true;
                }

                if (applies) {
                    let currentNadplata = over.amount;
                    if (currentNadplata > pozostalyKapital) currentNadplata = pozostalyKapital;

                    nadplata += currentNadplata;

                    if (over.type === "Jednorazowa") nadplatyJednorazowe += currentNadplata;
                    else if (over.type === "Miesięczne") nadplatyMiesieczne += currentNadplata;
                    else if (over.type === "Kwartalne") nadplatyKwartalne += currentNadplata;
                    else if (over.type === "Roczne") nadplatyRoczne += currentNadplata;

                    calkowiteNadplaty += currentNadplata;
                    if (over.effect === "Zmniejsz ratę") lastNadplataMonth = i;

                    activeOverpayment = over;
                    lastOverpaymentEffect = over.effect;
                }
            });

            applyRateReduction = (lastNadplataMonth > 0 && i > lastNadplataMonth && lastOverpaymentEffect === "Zmniejsz ratę");

            const { rataCalkowita, rataKapitalowa, odsetki } = calculateInstallment(
                kwota,
                iloscRat,
                pozostalyKapital,
                currentOprocentowanie,
                applyRateReduction,
                rodzajRat,
                i
            );

            pozostalyKapital -= rataKapitalowa;

            if (nadplata > 0) {
                if (nadplata > pozostalyKapital) nadplata = pozostalyKapital;
                pozostalyKapital -= nadplata;
            }

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

            if (pozostalyKapital <= 0 && lastOverpaymentEffect !== "Zmniejsz ratę") {
                pozostaleRaty = i;
                break;
            }
        }

        let calkowityKoszt = kwota + calkowiteOdsetki + prowizjaKwota + calkowiteNadplaty;

        return {
            harmonogram,
            calkowityKoszt: parseFloat(calkowityKoszt.toFixed(2)),
            calkowiteOdsetki: parseFloat(calkowiteOdsetki.toFixed(2)),
            calkowiteNadplaty: parseFloat(calkowiteNadplaty.toFixed(2)),
            nadplatyJednorazowe: parseFloat(nadplatyJednorazowe.toFixed(2)),
            nadplatyMiesieczne: parseFloat(nadplatyMiesieczne.toFixed(2)),
            nadplatyKwartalne: parseFloat(nadplatyKwartalne.toFixed(2)),
            nadplatyRoczne: parseFloat(nadplatyRoczne.toFixed(2)),
            prowizja: parseFloat(prowizjaKwota.toFixed(2)),
            pozostaleRaty,
        };
    } catch (error) {
        console.error("Błąd podczas obliczania kredytu:", error.message);
        alert(`Wystąpił błąd podczas obliczania kredytu: ${error.message}`);
        return null;
    }
}

function updateSummaryTable(summary) {
    if (!summary) return;

    const summaryTableBody = document.querySelector("#summaryTable tbody");
    if (!summaryTableBody) return;

    summaryTableBody.innerHTML = "";

    const rows = [
        { label: "Całkowity koszt kredytu", value: summary.calkowityKoszt.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " zł" },
        { label: "Całkowite odsetki", value: summary.calkowiteOdsetki.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " zł" },
        { label: "Prowizja", value: summary.prowizja.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " zł" },
        { label: "Całkowite nadpłaty", value: summary.calkowiteNadplaty.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " zł" },
        { label: "Nadpłaty jednorazowe", value: summary.nadplatyJednorazowe.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " zł" },
        { label: "Nadpłaty miesięczne", value: summary.nadplatyMiesieczne.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " zł" },
        { label: "Nadpłaty kwartalne", value: summary.nadplatyKwartalne.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " zł" },
        { label: "Nadpłaty roczne", value: summary.nadplatyRoczne.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " zł" },
        { label: "Okres kredytowania", value: summary.pozostaleRaty + " miesięcy" }
    ];

    rows.forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${row.label}</td>
            <td>${row.value}</td>
        `;
        summaryTableBody.appendChild(tr);
    });
}

function updateScheduleTable(schedule) {
    const scheduleTableBody = document.querySelector("#harmonogramTabela");
    if (!scheduleTableBody) {
        console.error("Element #harmonogramTabela nie istnieje. Sprawdź HTML.");
        return;
    }
    if (!schedule || schedule.length === 0) {
        scheduleTableBody.innerHTML = "<tr><td colspan='7'>Brak danych do wyświetlenia harmonogramu.</td></tr>";
        return;
    }

    const fragment = document.createDocumentFragment();
    schedule.forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${row.miesiac}</td>
            <td>${row.rata.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>${row.oprocentowanie.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>${row.nadplata.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>${row.kapital.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>${row.odsetki.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>${row.kapitalDoSplaty.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        `;
        fragment.appendChild(tr);
    });

    scheduleTableBody.innerHTML = "";
    scheduleTableBody.appendChild(fragment);

    const table = document.querySelector("table.table-striped");
    const tableWrapper = document.querySelector(".harmonogram-header").nextElementSibling;
    if (table && tableWrapper) {
        tableWrapper.scrollTop = table.offsetTop;
    }
}

function updateLoanDetails() {
    const kwota = parseFloat(elements.kwota?.value) || 500000;
    const oprocentowanie = parseFloat(elements.oprocentowanie?.value) || 7;
    const iloscRat = parseInt(elements.iloscRat?.value) || 360;
    const rodzajRat = elements.rodzajRat?.value || "rowne";
    const prowizja = parseFloat(elements.prowizja?.value) || 0;
    const prowizjaJednostka = elements.jednostkaProwizji?.value || "procent";

    const loanDetails = calculateLoan(kwota, oprocentowanie, iloscRat, rodzajRat, prowizja, prowizjaJednostka, state.variableRates, state.overpaymentRates);

    if (loanDetails) {
        updateSummaryTable(loanDetails);
        updateScheduleTable(loanDetails.harmonogram);
        updateResults(loanDetails);
    }
    if (elements.nadplataKredytuWrapper) {
        updateNadplataKredytuRemoveButtons();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const debouncedUpdateLoanDetails = debounce(updateLoanDetails, 300);

    const inputs = document.querySelectorAll(".form-control, .form-select");
    inputs.forEach(input => {
        input.addEventListener("input", debouncedUpdateLoanDetails);
        input.addEventListener("change", debouncedUpdateLoanDetails);
    });

    if (elements.nadplataKredytuWrapper) {
        elements.nadplataKredytuWrapper.addEventListener("input", debouncedUpdateLoanDetails);
        elements.nadplataKredytuWrapper.addEventListener("change", debouncedUpdateLoanDetails);
    }

    updateLoanDetails();
});

function updateResults(data) {
    if (!data) return;

    elements.valueKapital.textContent = (data.harmonogram.reduce((sum, row) => sum + row.kapital, 0)).toLocaleString("pl-PL", { minimumFractionDigits: 2 }) + " zł";
    elements.valueOdsetki.textContent = data.calkowiteOdsetki.toLocaleString("pl-PL", { minimumFractionDigits: 2 }) + " zł";
    elements.valueNadplata.textContent = data.calkowiteNadplaty.toLocaleString("pl-PL", { minimumFractionDigits: 2 }) + " zł";
    elements.valueProwizja.textContent = data.prowizja.toLocaleString("pl-PL", { minimumFractionDigits: 2 }) + " zł";
    elements.okresPoNadplacie.textContent = data.pozostaleRaty + " miesięcy (" + (data.pozostaleRaty / 12).toFixed(1) + " lat)";
    elements.koszt.textContent = data.calkowityKoszt.toLocaleString("pl-PL", { minimumFractionDigits: 2 }) + " zł";
}

function toggleHarmonogram(contentId) {
    const content = document.getElementById(contentId);
    const toggleBtn = content.previousElementSibling.querySelector('.btn-toggle');
    if (content.style.display === 'none' || content.style.display === '') {
        content.style.display = 'block';
        toggleBtn.textContent = 'Harmonogram spłat ▼';
    } else {
        content.style.display = 'none';
        toggleBtn.textContent = 'Harmonogram spłat ►';
    }
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





// F U N K C J A     K A L K U L T O R

// Logika kalkulatora
    const calcDisplay = document.getElementById('calcDisplay');
    let currentInput = '0';
    let previousInput = '';
    let operation = null;
    let shouldResetDisplay = false;

    function updateDisplay() {
        calcDisplay.value = currentInput;
    }

    function clearCalculator() {
        currentInput = '0';
        previousInput = '';
        operation = null;
        shouldResetDisplay = false;
        updateDisplay();
    }

    function toggleSign() {
        if (currentInput === '0') return;
        currentInput = (parseFloat(currentInput) * -1).toString();
        updateDisplay();
    }

    function percent() {
        currentInput = (parseFloat(currentInput) / 100).toString();
        updateDisplay();
    }

    function appendNumber(number) {
        if (shouldResetDisplay) {
            currentInput = number;
            shouldResetDisplay = false;
        } else {
            currentInput = currentInput === '0' ? number : currentInput + number;
        }
        updateDisplay();
    }

    function appendDecimal() {
        if (!currentInput.includes('.')) {
            currentInput += '.';
        }
        updateDisplay();
    }

    function setOperation(op) {
        if (currentInput === '') return;
        if (previousInput !== '') {
            calculate();
        }
        operation = op;
        previousInput = currentInput;
        shouldResetDisplay = true;
    }

    function calculate() {
        if (previousInput === '' || currentInput === '' || operation === null) return;
        let result;
        const prev = parseFloat(previousInput);
        const curr = parseFloat(currentInput);

        switch (operation) {
            case '+':
                result = prev + curr;
                break;
            case '-':
                result = prev - curr;
                break;
            case '*':
                result = prev * curr;
                break;
            case '/':
                if (curr === 0) {
                    alert("Nie można dzielić przez zero!");
                    clearCalculator();
                    return;
                }
                result = prev / curr;
                break;
            default:
                return;
        }

        currentInput = result.toString();
        operation = null;
        previousInput = '';
        shouldResetDisplay = true;
        updateDisplay();
    }

    document.querySelectorAll('.calc-btn').forEach(button => {
        button.addEventListener('click', () => {
            const value = button.textContent;

            if (button.classList.contains('calc-number')) {
                appendNumber(value);
            } else if (button.classList.contains('calc-operation')) {
                if (value === '±') {
                    toggleSign();
                } else if (value === '%') {
                    percent();
                } else {
                    setOperation(value);
                }
            } else if (button.classList.contains('calc-clear')) {
                clearCalculator();
            } else if (button.classList.contains('calc-equals')) {
                calculate();
            } else if (value === '.') {
                appendDecimal();
            }
        });
    });

    updateDisplay();

    // Logika pokazywania/ukrywania i przeciągania kalkulatora
    const calculatorBox = document.getElementById('calculatorBox');
    const calcToggleBtn = document.getElementById('calcToggleBtn');
    const closeCalcBtn = document.getElementById('closeCalcBtn');
    let isDragging = false;
    let initialX = 0;
    let initialY = 0;

    function toggleCalculator() {
        const isVisible = calculatorBox.style.display === 'block';
        if (isVisible) {
            calculatorBox.style.display = 'none';
        } else {
            calculatorBox.style.display = 'block';
            // Ustaw domyślną pozycję w centrum strony
            const windowWidth = window.innerWidth / currentZoom;
            const windowHeight = window.innerHeight / currentZoom;
            const calcWidth = calculatorBox.offsetWidth;
            const calcHeight = calculatorBox.offsetHeight;
            calculatorBox.style.left = ((windowWidth - calcWidth) / 2) + 'px';
            calculatorBox.style.top = ((windowHeight - calcHeight) / 2) + 'px';
        }
    }

    calcToggleBtn.addEventListener('click', toggleCalculator);
    closeCalcBtn.addEventListener('click', () => {
        calculatorBox.style.display = 'none';
    });

    calculatorBox.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('sidebar-header') && !e.target.classList.contains('close-btn')) {
            isDragging = true;
            const calcRect = calculatorBox.getBoundingClientRect();
            const currentX = (calcRect.left + window.scrollX) / currentZoom;
            const currentY = (calcRect.top + window.scrollY) / currentZoom;

            calculatorBox.style.left = currentX + 'px';
            calculatorBox.style.top = currentY + 'px';

            initialX = (e.clientX / currentZoom) - currentX;
            initialY = (e.clientY / currentZoom) - currentY;
            calculatorBox.style.cursor = 'grabbing';
            e.preventDefault();
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            e.preventDefault();
            const newX = (e.clientX / currentZoom) - initialX;
            const newY = (e.clientY / currentZoom) - initialY;

            const windowWidth = window.innerWidth / currentZoom;
            const calcWidth = calculatorBox.offsetWidth;
            const calcHeight = calculatorBox.offsetHeight;
            const documentHeight = document.documentElement.scrollHeight / currentZoom;

            const boundedX = Math.max(0, Math.min(newX, windowWidth - calcWidth));
            const boundedY = Math.max(0, Math.min(newY, documentHeight - calcHeight));

            calculatorBox.style.left = boundedX + 'px';
            calculatorBox.style.top = boundedY + 'px';
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            calculatorBox.style.cursor = 'move';
        }
    });

    // Obsługa dotyku dla urządzeń mobilnych
    calculatorBox.addEventListener('touchstart', (e) => {
        if (e.target.classList.contains('sidebar-header') && !e.target.classList.contains('close-btn')) {
            isDragging = true;
            const calcRect = calculatorBox.getBoundingClientRect();
            const currentX = (calcRect.left + window.scrollX) / currentZoom;
            const currentY = (calcRect.top + window.scrollY) / currentZoom;

            calculatorBox.style.left = currentX + 'px';
            calculatorBox.style.top = currentY + 'px';

            const touch = e.touches[0];
            initialX = (touch.clientX / currentZoom) - currentX;
            initialY = (touch.clientY / currentZoom) - currentY;
            e.preventDefault();
        }
    });

    document.addEventListener('touchmove', (e) => {
        if (isDragging) {
            e.preventDefault();
            const touch = e.touches[0];
            const newX = (touch.clientX / currentZoom) - initialX;
            const newY = (touch.clientY / currentZoom) - initialY;

            const windowWidth = window.innerWidth / currentZoom;
            const calcWidth = calculatorBox.offsetWidth;
            const calcHeight = calculatorBox.offsetHeight;
            const documentHeight = document.documentElement.scrollHeight / currentZoom;

            const boundedX = Math.max(0, Math.min(newX, windowWidth - calcWidth));
            const boundedY = Math.max(0, Math.min(newY, documentHeight - calcHeight));

            calculatorBox.style.left = boundedX + 'px';
            calculatorBox.style.top = boundedY + 'px';
        }
    }, { passive: false });

    document.addEventListener('touchend', () => {
        if (isDragging) {
            isDragging = false;
        }
    });

    // Funkcja aktualizująca pozycję kalkulatora po zmianie zoomu
    function updateCalculatorPosition(previousZoom) {
        if (calculatorBox.style.display === 'block') {
            const calcRect = calculatorBox.getBoundingClientRect();
            const zoomRatio = previousZoom / currentZoom;
            const newX = (calcRect.left + window.scrollX) * zoomRatio - window.scrollX;
            const newY = (calcRect.top + window.scrollY) * zoomRatio - window.scrollY;
            calculatorBox.style.left = (newX / currentZoom) + 'px';
            calculatorBox.style.top = (newY / currentZoom) + 'px';
        }
    }








// I N I C J A L I Z A C J A

function initializeApp() {
    initializeInputHandling();
    initializeNadplataKredytuToggle();
    initializeZmienneOprocentowanieToggle();
    initializePorownajKredytToggle();
    initializeButtons();

    // Ustaw początkowe wartości
    updateKwotaInfo();
    updateLata();
    updateProwizjaInfo();
    syncProwizjaWithKwota();

    // Załaduj domyślne dane i oblicz
    const defaultData = calculateLoan(
        state.lastFormData.kwota,
        state.lastFormData.oprocentowanie,
        state.lastFormData.iloscRat,
        state.lastFormData.rodzajRat,
        state.lastFormData.prowizja,
        state.lastFormData.jednostkaProwizji,
        state.variableRates,
        state.overpaymentRates
    );
    if (defaultData) {
        state.lastFormData = defaultData;
        elements.resultSection.classList.add("active");
        updateResults(defaultData);
        updateSummaryTable(defaultData);
        updateScheduleTable(defaultData.harmonogram);
    } else {
        console.warn("Nie udało się obliczyć domyślnych danych kredytu. Sprawdź dane wejściowe.");
        elements.resultSection.classList.remove("active");
        elements.formSection.style.display = "block";
    }
}

document.addEventListener("DOMContentLoaded", initializeApp);
