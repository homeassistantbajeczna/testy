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
};











// ---------------------------------------
// FUNKCJE POMOCNICZE
// ---------------------------------------

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

function syncInputWithRange(input, range, onChange = null) {
    let value = input.classList.contains("variable-cykl") || input.id === "iloscRat"
        ? parseInt(input.value) || parseInt(range.value)
        : parseFloat(input.value) || parseFloat(range.value);
    value = Math.max(parseFloat(input.min) || 0, Math.min(parseFloat(input.max) || Infinity, value));
    input.value = input.classList.contains("variable-cykl") || input.id === "iloscRat" ? value : value.toFixed(2);
    range.value = value;
    if (onChange) onChange(value);
}











// ---------------------------------------
// FUNKCJE OGÓLNE
// ---------------------------------------

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

function toggleMainFormLock() {
    const isNadplataActive = elements.nadplataKredytuBtn?.checked || false;
    const isZmienneOprocentowanieActive = elements.zmienneOprocentowanieBtn?.checked || false;
    const isPorownajKredytActive = elements.porownajKredytBtn?.checked || false;
    const shouldLock = isNadplataActive || isZmienneOprocentowanieActive || isPorownajKredytActive;

    const mainFormInputs = [
        { input: elements.kwota, group: elements.kwota?.closest(".form-group") },
        { input: elements.kwotaRange, group: elements.kwotaRange?.closest(".form-group") },
        { input: elements.iloscRat, group: elements.iloscRat?.closest(".form-group") },
        { input: elements.iloscRatRange, group: elements.iloscRatRange?.closest(".form-group") },
        { input: elements.oprocentowanie, group: elements.oprocentowanie?.closest(".form-group") },
        { input: elements.oprocentowanieRange, group: elements.oprocentowanieRange?.closest(".form-group") },
        { input: elements.rodzajRat, group: elements.rodzajRat?.closest(".form-group") },
        { input: elements.prowizja, group: elements.prowizja?.closest(".form-group") },
        { input: elements.prowizjaRange, group: elements.prowizjaRange?.closest(".form-group") },
        { input: elements.jednostkaProwizji, group: elements.jednostkaProwizji?.closest(".form-group") },
    ];

    mainFormInputs.forEach(({ input, group }) => {
        if (input && group) {
            input.disabled = shouldLock;
            if (shouldLock) {
                group.classList.add("locked");
                input.style.backgroundColor = "#e9ecef";
                input.style.opacity = "0.6";
            } else {
                group.classList.remove("locked");
                input.style.backgroundColor = "";
                input.style.opacity = "";
            }
        }
    });
}












// ---------------------------------------
// FUNKCJE NADPŁATY KREDYTU
// ---------------------------------------

function createNadplataKredytuGroup() {
    const group = document.createElement("div");
    group.classList.add("variable-input-group");
    group.setAttribute("data-type", "nadplata");
    group.style.marginBottom = "10px";
    group.innerHTML = `
        <div class="fields-wrapper">
            <div class="form-row">
                <div class="form-group box-select">
                    <label class="form-label">Typ nadpłaty</label>
                    <select class="form-select nadplata-type-select">
                        <option value="Jednorazowa">Jednorazowa</option>
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
                    <input type="range" class="form-range range-slider variable-cykl-start-range" min="1" max="360" step="1" value="1">
                </div>
            </div>
        </div>
    `;
    return group;
}

function calculateRemainingCapital(loanAmount, interestRate, totalMonths, paymentType, overpayments, targetMonth) {
    let remainingCapital = loanAmount;
    const monthlyRate = interestRate / 100 / 12;
    let remainingMonths = totalMonths;

    for (let month = 1; month <= targetMonth && remainingCapital > 0; month++) {
        let overpaymentAmount = 0;
        let overpaymentEffect = null;
        let applyOverpayment = false;

        overpayments.forEach((overpayment) => {
            if (overpayment.type === "Jednorazowa" && overpayment.start === month) {
                applyOverpayment = true;
                overpaymentAmount = overpayment.amount;
                overpaymentEffect = overpayment.effect;
            }
        });

        const odsetki = remainingCapital * monthlyRate;
        let rataKapitalowa = paymentType === "rowne"
            ? remainingCapital * (1 + monthlyRate) ** (remainingMonths - (month - 1)) * (1 + monthlyRate - 1) / (((1 + monthlyRate) ** (remainingMonths - (month - 1))) - 1) - odsetki
            : loanAmount / totalMonths;

        if (rataKapitalowa > remainingCapital) rataKapitalowa = remainingCapital;
        remainingCapital -= rataKapitalowa;

        if (applyOverpayment && remainingCapital > 0) {
            if (overpaymentAmount > remainingCapital) overpaymentAmount = remainingCapital;
            remainingCapital -= overpaymentAmount;
            if (overpaymentEffect === "Skróć okres" && remainingCapital > 0) {
                remainingMonths = month + Math.ceil(remainingCapital / (loanAmount / totalMonths)) - 1;
            }
        }
    }
    return remainingCapital > 0 ? parseFloat(remainingCapital.toFixed(2)) : 0;
}

function updateOverpaymentLimit(input, range, group, preserveValue = true) {
    if (!group || group.classList.contains("locked")) return 0;

    const typeSelect = group.querySelector(".nadplata-type-select");
    const effectSelect = group.querySelector(".nadplata-effect-select");
    const periodStartInput = group.querySelector(".variable-cykl-start");
    const periodStartRange = group.querySelector(".variable-cykl-start-range");
    const rateInput = input.classList.contains("variable-rate") ? input : group.querySelector(".variable-rate");
    const rateRange = range.classList.contains("variable-rate-range") ? range : group.querySelector(".variable-rate-range");

    if (!rateInput || !rateRange || !periodStartInput || !periodStartRange) return 0;

    const loanAmount = parseInt(elements.kwota.value) || 500000;
    const interestRate = parseFloat(elements.oprocentowanie.value) || 7;
    const totalMonths = parseInt(elements.iloscRat.value) || 360;
    const paymentType = elements.rodzajRat.value || "rowne";

    const allGroups = elements.nadplataKredytuWrapper.querySelectorAll(".variable-input-group");
    const currentIndex = Array.from(allGroups).indexOf(group);
    const previousOverpayments = [];
    for (let i = 0; i < currentIndex; i++) {
        const prevGroup = allGroups[i];
        if (!prevGroup) continue;
        const prevType = prevGroup.querySelector(".nadplata-type-select").value || "Jednorazowa";
        const prevPeriodStart = parseInt(prevGroup.querySelector(".variable-cykl-start").value) || 1;
        const prevAmount = parseInt(prevGroup.querySelector(".variable-rate").value) || 0;
        const prevEffect = prevGroup.querySelector(".nadplata-effect-select").value || "Skróć okres";
        previousOverpayments.push({ type: prevType, start: prevPeriodStart, amount: prevAmount, effect: prevEffect });
    }

    let periodStart = parseInt(periodStartInput.value) || 1;
    let adjustedPeriod = Math.max(1, periodStart - 1);
    let remainingCapital = calculateRemainingCapital(loanAmount, interestRate, totalMonths, paymentType, previousOverpayments, adjustedPeriod);
    let maxAllowed = Math.max(100, remainingCapital);

    rateInput.max = Math.floor(maxAllowed);
    rateRange.max = Math.floor(maxAllowed);

    if (!preserveValue) {
        let rateValue = Math.min(parseInt(rateInput.value) || 100, maxAllowed);
        rateInput.value = rateValue;
        rateRange.value = rateValue;
    } else if (parseInt(rateInput.value) > maxAllowed) {
        rateInput.value = maxAllowed;
        rateRange.value = maxAllowed;
    }

    let maxPeriodStart = totalMonths;
    let minPeriodStart = currentIndex > 0 ? (parseInt(allGroups[currentIndex - 1].querySelector(".variable-cykl-start").value) || 1) + 1 : 1;
    periodStartInput.min = minPeriodStart;
    periodStartRange.min = minPeriodStart;
    periodStartInput.max = maxPeriodStart;
    periodStartRange.max = maxPeriodStart;

    let currentStartValue = parseInt(periodStartInput.value) || minPeriodStart;
    if (currentStartValue < minPeriodStart) currentStartValue = minPeriodStart;
    if (currentStartValue > maxPeriodStart) currentStartValue = maxPeriodStart;
    periodStartInput.value = currentStartValue;
    periodStartRange.value = currentStartValue;
    syncInputWithRange(periodStartInput, periodStartRange);

    updateRatesArray("nadplata");
    return remainingCapital;
}

function updateAllOverpaymentLimits() {
    if (state.isUpdating) return { remainingCapital: 0, remainingMonths: 0 };

    state.isUpdating = true;
    const groups = elements.nadplataKredytuWrapper.querySelectorAll(".variable-input-group:not(.locked)");
    groups.forEach((g) => {
        const rateInput = g.querySelector(".variable-rate");
        const rateRange = g.querySelector(".variable-rate-range");
        if (rateInput && rateRange) updateOverpaymentLimit(rateInput, rateRange, g, true);
    });
    state.isUpdating = false;
    return { remainingCapital: 0, remainingMonths: parseInt(elements.iloscRat.value) || 360 };
}

function initializeNadplataKredytuGroup(group) {
    if (!group) return;

    const inputs = group.querySelectorAll(".form-control");
    const ranges = group.querySelectorAll(".form-range");
    const debouncedUpdate = debounce(() => {
        if (!state.isUpdating) {
            const rateInput = group.querySelector(".variable-rate");
            const rateRange = group.querySelector(".variable-rate-range");
            if (rateInput && rateRange) updateOverpaymentLimit(rateInput, rateRange, group, true);
            updateRatesArray("nadplata");
            updateNadplataKredytuRemoveButtons();
            updateLoanDetails();
        }
    }, 50);

    inputs.forEach((input, index) => {
        const range = ranges[index];
        if (!input || !range) return;

        syncInputWithRange(input, range);

        if (input.classList.contains("variable-cykl-start")) {
            input.addEventListener("input", (e) => {
                let value = input.value.replace(/[^0-9]/g, "");
                if (value) {
                    let parsedValue = parseInt(value);
                    if (parsedValue < parseInt(input.min)) parsedValue = parseInt(input.min);
                    if (parsedValue > parseInt(input.max)) parsedValue = parseInt(input.max);
                    input.value = parsedValue;
                    range.value = parsedValue;
                    syncInputWithRange(input, range);
                    debouncedUpdate();
                }
            });

            input.addEventListener("change", () => {
                let value = parseInt(input.value) || parseInt(input.min);
                if (value < parseInt(input.min)) value = parseInt(input.min);
                if (value > parseInt(input.max)) value = parseInt(input.max);
                input.value = value;
                range.value = value;
                syncInputWithRange(input, range);
                debouncedUpdate();
            });

            range.addEventListener("input", () => {
                let value = parseInt(range.value);
                if (value < parseInt(range.min)) value = parseInt(range.min);
                if (value > parseInt(range.max)) value = parseInt(range.max);
                input.value = value;
                range.value = value;
                syncInputWithRange(input, range);
                debouncedUpdate();
            });
        } else if (input.classList.contains("variable-rate")) {
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
                syncInputWithRange(input, range);
                debouncedUpdate();
            });

            range.addEventListener("input", () => {
                let value = parseInt(range.value);
                if (value < parseInt(range.min)) value = parseInt(range.min);
                if (value > parseInt(range.max)) value = parseInt(range.max);
                input.value = value;
                range.value = value;
                syncInputWithRange(input, range);
                debouncedUpdate();
            });
        }
    });

    updateOverpaymentLimit(group.querySelector(".variable-rate"), group.querySelector(".variable-rate-range"), group, true);
}

function initializeNadplataKredytuToggle() {
    if (!elements.nadplataKredytuBtn) return;
    elements.nadplataKredytuBtn.addEventListener("change", () => {
        if (elements.nadplataKredytuBtn.checked) {
            elements.nadplataKredytuInputs.classList.add("active");
            const newGroup = createNadplataKredytuGroup();
            elements.nadplataKredytuWrapper.appendChild(newGroup);
            initializeNadplataKredytuGroup(newGroup);
        } else {
            elements.nadplataKredytuInputs.classList.remove("active");
            resetNadplataKredytuSection();
        }
        updateLoanDetails();
        toggleMainFormLock();
    });
}

function resetNadplataKredytuSection() {
    if (!elements.nadplataKredytuWrapper) return;
    elements.nadplataKredytuWrapper.innerHTML = "";
    state.overpaymentRates = [];
    updateLoanDetails();
}

function updateRatesArray(type) {
    if (type !== "nadplata") return;
    const wrapper = elements.nadplataKredytuWrapper;
    if (!wrapper) return;
    state.overpaymentRates = Array.from(wrapper.querySelectorAll(".variable-input-group:not(.locked)"))
        .map(group => {
            const typeSelect = group.querySelector(".nadplata-type-select");
            const effectSelect = group.querySelector(".nadplata-effect-select");
            const periodStartInput = group.querySelector(".variable-cykl-start");
            const rateInput = group.querySelector(".variable-rate");
            const periodStart = parseInt(periodStartInput.value) || 1;
            const amount = parseInt(rateInput.value) || 0;
            return amount > 0 ? {
                type: typeSelect.value || "Jednorazowa",
                start: periodStart,
                amount,
                effect: effectSelect.value || "Skróć okres"
            } : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.start - b.start);
}

function updateNadplataKredytuRemoveButtons() {
    if (!elements.nadplataKredytuWrapper) return;
    const wrapper = elements.nadplataKredytuWrapper;
    const groups = wrapper.querySelectorAll(".variable-input-group");
    let removeBtnWrapper = wrapper.querySelector(".remove-btn-wrapper");

    if (groups.length === 0) {
        if (removeBtnWrapper) removeBtnWrapper.remove();
        return;
    }

    if (!removeBtnWrapper) {
        removeBtnWrapper = document.createElement("div");
        removeBtnWrapper.classList.add("remove-btn-wrapper");
        removeBtnWrapper.style.display = "flex";
        removeBtnWrapper.style.flexDirection = "column";
        removeBtnWrapper.style.alignItems = "center";
        removeBtnWrapper.style.gap = "5px";
        removeBtnWrapper.style.marginTop = "10px";
        wrapper.appendChild(removeBtnWrapper);
    } else {
        removeBtnWrapper.innerHTML = "";
    }

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.classList.add("btn", "btn-danger", "btn-sm", "btn-reset");
    removeBtn.setAttribute("aria-label", "Usuń nadpłatę");
    removeBtn.textContent = "Usuń";
    removeBtnWrapper.appendChild(removeBtn);

    if (groups.length >= 1) {
        const addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.id = "addNadplataKredytuBtn";
        addBtn.classList.add("btn", "btn-functional");
        addBtn.setAttribute("aria-label", "Dodaj kolejną nadpłatę");
        addBtn.textContent = "Dodaj kolejną nadpłatę";
        removeBtnWrapper.appendChild(addBtn);

        addBtn.addEventListener("click", () => {
            const newGroup = createNadplataKredytuGroup();
            wrapper.appendChild(newGroup);
            initializeNadplataKredytuGroup(newGroup);
            updateAllOverpaymentLimits();
            updateNadplataKredytuRemoveButtons();
            updateLoanDetails();
        });
    }

    groups.forEach((group, index) => {
        if (index < groups.length - 1 && !group.classList.contains("locked")) {
            group.classList.add("locked");
            group.querySelectorAll(".form-control, .form-select, .form-range").forEach(input => {
                input.disabled = true;
                if (input.classList.contains("nadplata-type-select") || input.classList.contains("nadplata-effect-select")) {
                    input.style.backgroundColor = "#e9ecef";
                    input.style.opacity = "0.7";
                }
            });
        } else if (index === groups.length - 1 && group.classList.contains("locked")) {
            group.classList.remove("locked");
            group.querySelectorAll(".form-control, .form-select, .form-range").forEach(input => {
                input.disabled = false;
                if (input.classList.contains("nadplata-type-select") || input.classList.contains("nadplata-effect-select")) {
                    input.style.backgroundColor = "#ffffff";
                    input.style.opacity = "1";
                }
            });
        }
    });

    removeBtn.addEventListener("click", () => {
        if (groups.length === 1) {
            elements.nadplataKredytuBtn.checked = false;
            elements.nadplataKredytuInputs.classList.remove("active");
            resetNadplataKredytuSection();
        } else {
            groups[groups.length - 1].remove();
            updateAllOverpaymentLimits();
            updateNadplataKredytuRemoveButtons();
            updateLoanDetails();
        }
    });
}












// ---------------------------------------
// FUNKCJE ZMIENNE OPROCENTOWANIE
// ---------------------------------------

function createVariableOprocentowanieGroup(startPeriod = 2) {
    const iloscRat = parseInt(elements.iloscRat.value) || 420;
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
    const iloscRat = parseInt(elements.iloscRat.value) || 420;
    const allGroups = elements.variableOprocentowanieWrapper.querySelectorAll(".variable-input-group");
    const currentIndex = Array.from(allGroups).indexOf(group);
    const minPeriod = currentIndex > 0 ? parseInt(allGroups[currentIndex - 1].querySelector(".variable-cykl").value) + 1 : 2;

    const inputs = group.querySelectorAll(".form-control");
    const ranges = group.querySelectorAll(".form-range");

    inputs.forEach((input, index) => {
        const range = ranges[index];
        if (input.classList.contains("variable-cykl")) {
            input.min = minPeriod;
            input.max = iloscRat;
            range.min = minPeriod;
            range.max = iloscRat;
        } else if (input.classList.contains("variable-rate")) {
            input.min = "0.1";
            input.max = "25";
            range.min = "0.1";
            range.max = "25";
        }
        syncInputWithRange(input, range);

        input.addEventListener("input", () => syncInputWithRange(input, range));
        input.addEventListener("change", () => {
            syncInputWithRange(input, range);
            updateRatesArray("oprocentowanie");
            updateVariableOprocentowanieRemoveButtons();
        });
        range.addEventListener("input", () => {
            syncInputWithRange(input, range);
            updateRatesArray("oprocentowanie");
            updateVariableOprocentowanieRemoveButtons();
        });
    });
}

function resetVariableOprocentowanieSection() {
    elements.variableOprocentowanieWrapper.innerHTML = "";
    state.variableRates = [];
    elements.oprocentowanie.value = "7.00";
    elements.oprocentowanieRange.value = "7.00";
    updateVariableOprocentowanieRemoveButtons();
}

function updateRatesArray(type) {
    if (type !== "oprocentowanie") return;
    state.variableRates = Array.from(elements.variableOprocentowanieWrapper.querySelectorAll(".variable-input-group"))
        .map(group => {
            const periodInput = group.querySelector(".variable-cykl");
            const rateInput = group.querySelector(".variable-rate");
            const period = parseInt(periodInput.value) || 2;
            const rate = parseFloat(rateInput.value) || 7;
            return { period, value: rate };
        })
        .sort((a, b) => a.period - b.period);
}

function updateVariableOprocentowanieRemoveButtons() {
    const wrapper = elements.variableOprocentowanieWrapper;
    const groups = wrapper.querySelectorAll(".variable-input-group");
    let removeBtnWrapper = wrapper.querySelector(".remove-btn-wrapper");

    if (groups.length === 0) {
        if (removeBtnWrapper) removeBtnWrapper.remove();
        return;
    }

    if (!removeBtnWrapper) {
        removeBtnWrapper = document.createElement("div");
        removeBtnWrapper.classList.add("remove-btn-wrapper");
        removeBtnWrapper.style.display = "flex";
        removeBtnWrapper.style.flexDirection = "column";
        removeBtnWrapper.style.alignItems = "center";
        removeBtnWrapper.style.gap = "5px";
        removeBtnWrapper.style.marginTop = "10px";
        wrapper.appendChild(removeBtnWrapper);
    } else {
        removeBtnWrapper.innerHTML = "";
    }

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.classList.add("btn", "btn-danger", "btn-sm", "btn-reset");
    removeBtn.setAttribute("aria-label", "Usuń oprocentowanie");
    removeBtn.textContent = "Usuń";
    removeBtnWrapper.appendChild(removeBtn);

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.id = "addVariableOprocentowanieBtn";
    addBtn.classList.add("btn", "btn-functional");
    addBtn.setAttribute("aria-label", "Dodaj kolejną zmianę");
    addBtn.textContent = "Dodaj kolejną zmianę";
    removeBtnWrapper.appendChild(addBtn);

    groups.forEach((group, index) => {
        if (index < groups.length - 1) group.classList.add("locked");
        else group.classList.remove("locked");
        group.querySelectorAll(".form-control, .form-range").forEach(input => input.disabled = index < groups.length - 1);
    });

    removeBtn.addEventListener("click", () => {
        if (groups.length === 1) {
            elements.zmienneOprocentowanieBtn.checked = false;
            elements.variableOprocentowanieInputs.classList.remove("active");
            resetVariableOprocentowanieSection();
        } else {
            groups[groups.length - 1].remove();
            updateVariableOprocentowanieRemoveButtons();
        }
        updateLoanDetails();
    });

    addBtn.addEventListener("click", () => {
        const lastGroup = groups[groups.length - 1];
        const lastPeriod = parseInt(lastGroup.querySelector(".variable-cykl").value) || 2;
        const maxPeriod = parseInt(elements.iloscRat.value) || 420;
        if (lastPeriod < maxPeriod) {
            const newGroup = createVariableOprocentowanieGroup(lastPeriod + 1);
            wrapper.appendChild(newGroup);
            initializeVariableOprocentowanieGroup(newGroup);
            updateVariableOprocentowanieRemoveButtons();
            updateLoanDetails();
        }
    });
}

function initializeZmienneOprocentowanieToggle() {
    if (!elements.zmienneOprocentowanieBtn) return;
    elements.zmienneOprocentowanieBtn.addEventListener("change", () => {
        if (elements.zmienneOprocentowanieBtn.checked) {
            elements.variableOprocentowanieInputs.classList.add("active");
            const newGroup = createVariableOprocentowanieGroup(2);
            elements.variableOprocentowanieWrapper.appendChild(newGroup);
            initializeVariableOprocentowanieGroup(newGroup);
            updateVariableOprocentowanieRemoveButtons();
        } else {
            elements.variableOprocentowanieInputs.classList.remove("active");
            resetVariableOprocentowanieSection();
        }
        updateLoanDetails();
        toggleMainFormLock();
    });
}












// ---------------------------------------
// FUNKCJE PORÓWNANIA KREDYTU
// ---------------------------------------

function initializePorownajKredytToggle() {
    if (!elements.porownajKredytBtn) return;
    elements.porownajKredytBtn.addEventListener("change", () => {
        const isChecked = elements.porownajKredytBtn.checked;
        if (isChecked) {
            if (elements.nadplataKredytuBtn) {
                elements.nadplataKredytuBtn.checked = false;
                elements.nadplataKredytuInputs.classList.remove("active");
                resetNadplataKredytuSection();
            }
            if (elements.zmienneOprocentowanieBtn) {
                elements.zmienneOprocentowanieBtn.checked = false;
                elements.variableOprocentowanieInputs.classList.remove("active");
                resetVariableOprocentowanieSection();
            }
        }
        toggleMainFormLock();
    });
}












// ---------------------------------------
// FUNKCJE OBLICZEŃ KREDYTU
// ---------------------------------------

function calculateInstallment(kwota, iloscRat, pozostalyKapital, currentOprocentowanie, nadplata, activeOverpayment, rodzajRat, miesiac) {
    let odsetki = pozostalyKapital * currentOprocentowanie;
    let rataKapitalowa = 0;
    let rataCalkowita = 0;

    if (rodzajRat === "rowne") {
        const q = 1 + currentOprocentowanie;
        const remainingMonths = iloscRat - (miesiac - 1);
        rataCalkowita = pozostalyKapital * (q ** remainingMonths) * (q - 1) / ((q ** remainingMonths) - 1);
        if (isNaN(rataCalkowita) || rataCalkowita <= 0) rataCalkowita = 0;
        rataKapitalowa = rataCalkowita - odsetki;
        if (activeOverpayment && activeOverpayment.effect === "Zmniejsz ratę" && nadplata > 0) rataKapitalowa += nadplata;
    } else {
        rataKapitalowa = kwota / iloscRat;
        rataCalkowita = rataKapitalowa + odsetki;
        if (activeOverpayment && activeOverpayment.effect === "Zmniejsz ratę" && nadplata > 0) rataKapitalowa += nadplata;
    }

    if (rataKapitalowa > pozostalyKapital) {
        rataKapitalowa = pozostalyKapital;
        rataCalkowita = rataKapitalowa + odsetki;
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

        let activeVariableRates = Array.isArray(variableRates) ? [...variableRates].sort((a, b) => a.period - b.period) : [];
        let activeOverpaymentRates = Array.isArray(overpaymentRates) ? [...overpaymentRates].sort((a, b) => a.start - b.start) : [];

        console.log("calculateLoan inputs:", { kwota, oprocentowanie, iloscRat, rodzajRat, prowizja, prowizjaJednostka, variableRates: activeVariableRates.length, overpaymentRates: activeOverpaymentRates.length });

        if (isNaN(kwota) || kwota <= 0) throw new Error("Nieprawidłowa kwota kredytu");
        if (isNaN(oprocentowanie) || oprocentowanie <= 0) throw new Error("Nieprawidłowe oprocentowanie");
        if (isNaN(iloscRat) || iloscRat <= 0) throw new Error("Nieprawidłowa ilość rat");
        if (!["rowne", "malejace"].includes(rodzajRat)) throw new Error("Nieprawidłowy rodzaj rat");

        let lastNadplataMonth = 0;

        for (let i = 1; i <= iloscRat; i++) {
            let currentOprocentowanie = oprocentowanieMiesieczne;
            let activeRate = activeVariableRates.find(rate => rate.period === i);
            if (activeRate && !isNaN(activeRate.value)) currentOprocentowanie = activeRate.value / 100 / 12;

            let nadplata = 0;
            let activeOverpayment = activeOverpaymentRates.find(over => over.start === i && over.type === "Jednorazowa");
            if (activeOverpayment) {
                nadplata = activeOverpayment.amount;
                if (nadplata > pozostalyKapital) nadplata = pozostalyKapital;
                calkowiteNadplaty += nadplata;
                if (activeOverpayment.effect === "Zmniejsz ratę") lastNadplataMonth = i;
            }

            const { rataCalkowita, rataKapitalowa, odsetki } = calculateInstallment(kwota, iloscRat, pozostalyKapital, currentOprocentowanie, nadplata, activeOverpayment, rodzajRat, i);
            pozostalyKapital -= rataKapitalowa + nadplata;
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

        let calkowityKoszt = kwota + calkowiteOdsetki + prowizjaKwota + calkowiteNadplaty;

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

function updateSummaryTable(summary) {
    if (!summary) return;
    const summaryTableBody = document.querySelector("#summaryTable tbody");
    if (!summaryTableBody) {
        console.error("Element #summaryTable tbody nie istnieje.");
        return;
    }
    summaryTableBody.innerHTML = "";
    const rows = [
        { label: "Całkowity koszt kredytu", value: `${summary.calkowityKoszt.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł` },
        { label: "Całkowite odsetki", value: `${summary.calkowiteOdsetki.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł` },
        { label: "Prowizja", value: `${summary.prowizja.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł` },
        { label: "Całkowite nadpłaty", value: `${summary.calkowiteNadplaty.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł` },
        { label: "Okres kredytowania", value: `${summary.pozostaleRaty} miesięcy` },
    ];
    rows.forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${row.label}</td><td>${row.value}</td>`;
        summaryTableBody.appendChild(tr);
    });
}

function updateScheduleTable(schedule) {
    const scheduleTableBody = elements.harmonogramTabela;
    if (!scheduleTableBody) {
        console.error("Element #harmonogramTabela nie istnieje.");
        return;
    }
    if (!schedule || schedule.length === 0) {
        scheduleTableBody.innerHTML = "<tr><td colspan='7'>Brak danych do wyświetlenia harmonogramu.</td></tr>";
        return;
    }
    scheduleTableBody.innerHTML = "";
    schedule.forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${row.miesiac}</td>
            <td>${row.rata.toLocaleString('pl-PL', { minimumFractionDigits: 2 })}</td>
            <td>${row.oprocentowanie.toLocaleString('pl-PL', { minimumFractionDigits: 2 })}</td>
            <td>${row.nadplata.toLocaleString('pl-PL', { minimumFractionDigits: 2 })}</td>
            <td>${row.kapital.toLocaleString('pl-PL', { minimumFractionDigits: 2 })}</td>
            <td>${row.odsetki.toLocaleString('pl-PL', { minimumFractionDigits: 2 })}</td>
            <td>${row.kapitalDoSplaty.toLocaleString('pl-PL', { minimumFractionDigits: 2 })}</td>
        `;
        scheduleTableBody.appendChild(tr);
    });
}

function updateLoanDetails() {
    const kwota = parseFloat(elements.kwota.value) || 500000;
    const oprocentowanie = parseFloat(elements.oprocentowanie.value) || 7;
    const iloscRat = parseInt(elements.iloscRat.value) || 360;
    const rodzajRat = elements.rodzajRat.value || "rowne";
    const prowizja = parseFloat(elements.prowizja.value) || 0;
    const prowizjaJednostka = elements.jednostkaProwizji.value || "procent";

    const loanDetails = calculateLoan(kwota, oprocentowanie, iloscRat, rodzajRat, prowizja, prowizjaJednostka, state.variableRates, state.overpaymentRates);
    if (loanDetails) {
        updateSummaryTable(loanDetails);
        updateScheduleTable(loanDetails.harmonogram);
        updateResults(loanDetails);
    }
    if (elements.nadplataKredytuWrapper) updateNadplataKredytuRemoveButtons();
}













// ---------------------------------------
// FUNKCJE WYNIKÓW I WYKRESÓW
// ---------------------------------------

function updateResults(data) {
    if (!data) return;
    elements.valueKapital.textContent = data.harmonogram.reduce((sum, row) => sum + row.kapital, 0).toLocaleString("pl-PL", { minimumFractionDigits: 2 }) + " zł";
    elements.valueOdsetki.textContent = data.calkowiteOdsetki.toLocaleString("pl-PL", { minimumFractionDigits: 2 }) + " zł";
    elements.valueNadplata.textContent = data.calkowiteNadplaty.toLocaleString("pl-PL", { minimumFractionDigits: 2 }) + " zł";
    elements.valueProwizja.textContent = data.prowizja.toLocaleString("pl-PL", { minimumFractionDigits: 2 }) + " zł";
    elements.okresPoNadplacie.textContent = `${data.pozostaleRaty} miesięcy (${(data.pozostaleRaty / 12).toFixed(1)} lat)`;
    elements.koszt.textContent = data.calkowityKoszt.toLocaleString("pl-PL", { minimumFractionDigits: 2 }) + " zł";
}

function toggleHarmonogram(contentId) {
    const content = document.getElementById(contentId);
    const toggleBtn = content.previousElementSibling.querySelector(".btn-toggle");
    if (content.style.display === "none" || !content.style.display) {
        content.style.display = "block";
        toggleBtn.textContent = "Harmonogram spłat ▼";
    } else {
        content.style.display = "none";
        toggleBtn.textContent = "Harmonogram spłat ►";
    }
}











// ---------------------------------------
// FUNKCJE INTERAKCJI Z UŻYTKOWNIKIEM
// ---------------------------------------

let currentZoom = 1;
const zoomStep = 0.1;
const minZoom = 0.5;
const maxZoom = 2;

function updateZoom() {
    const container = document.querySelector(".container");
    if (container) container.style.transform = `scale(${currentZoom})`;
}

function showForm() {
    if (elements.formSection && elements.resultSection) {
        elements.resultSection.style.display = "none";
        elements.formSection.style.display = "block";
        elements.resultSection.classList.remove("active");
        currentZoom = 1;
        updateZoom();
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

        const data = calculateLoan(kwota, oprocentowanie, iloscRat, rodzajRat, prowizja, prowizjaJednostka, state.variableRates, state.overpaymentRates);
        if (data) {
            state.lastFormData = data;
            elements.formSection.style.display = "none";
            elements.resultSection.style.display = "block";
            elements.resultSection.classList.add("active");
            updateResults(data);
            updateZoom();
        }
    });

    elements.generatePdfBtn.addEventListener("click", () => {
        if (state.lastFormData && state.lastFormData.harmonogram) {
            // generatePDF(); // Zakładam, że funkcja istnieje
        } else alert("Najpierw oblicz harmonogram!");
    });

    window.showForm = showForm;

    elements.zoomInBtn.addEventListener("click", () => {
        if (currentZoom < maxZoom) {
            currentZoom += zoomStep;
            updateZoom();
        }
    });

    elements.zoomOutBtn.addEventListener("click", () => {
        if (currentZoom > minZoom) {
            currentZoom -= zoomStep;
            updateZoom();
        }
    });

    elements.toggleDarkModeBtn.addEventListener("click", () => {
        state.isDarkMode = !state.isDarkMode;
        document.body.classList.toggle("dark-mode", state.isDarkMode);
        elements.toggleDarkModeBtn.innerHTML = state.isDarkMode ? "☀️" : "🌙";
        elements.toggleDarkModeBtn.setAttribute("aria-label", state.isDarkMode ? "Przełącz na tryb jasny" : "Przełącz na tryb ciemny");
    });
}
















// ---------------------------------------
// FUNKCJE KALKULATORA
// ---------------------------------------

const calcDisplay = document.getElementById("calcDisplay");
let currentInput = "0";
let previousInput = "";
let operation = null;
let shouldResetDisplay = false;

function updateDisplay() {
    calcDisplay.value = currentInput;
}

function clearCalculator() {
    currentInput = "0";
    previousInput = "";
    operation = null;
    shouldResetDisplay = false;
    updateDisplay();
}

function toggleSign() {
    if (currentInput === "0") return;
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
    } else currentInput = currentInput === "0" ? number : currentInput + number;
    updateDisplay();
}

function appendDecimal() {
    if (!currentInput.includes(".")) currentInput += ".";
    updateDisplay();
}

function setOperation(op) {
    if (currentInput === "") return;
    if (previousInput !== "") calculate();
    operation = op;
    previousInput = currentInput;
    shouldResetDisplay = true;
}

function calculate() {
    if (!previousInput || !currentInput || !operation) return;
    let result = 0;
    const prev = parseFloat(previousInput);
    const curr = parseFloat(currentInput);
    switch (operation) {
        case "+": result = prev + curr; break;
        case "-": result = prev - curr; break;
        case "*": result = prev * curr; break;
        case "/": if (curr === 0) { alert("Nie można dzielić przez zero!"); clearCalculator(); return; } result = prev / curr; break;
    }
    currentInput = result.toString();
    operation = null;
    previousInput = "";
    shouldResetDisplay = true;
    updateDisplay();
}

document.querySelectorAll(".calc-btn").forEach(button => {
    button.addEventListener("click", () => {
        const value = button.textContent;
        if (button.classList.contains("calc-number")) appendNumber(value);
        else if (button.classList.contains("calc-operation")) {
            if (value === "±") toggleSign();
            else if (value === "%") percent();
            else setOperation(value);
        } else if (button.classList.contains("calc-clear")) clearCalculator();
        else if (button.classList.contains("calc-equals")) calculate();
        else if (value === ".") appendDecimal();
    });
});

updateDisplay();

const calculatorBox = document.getElementById("calculatorBox");
const calcToggleBtn = document.getElementById("calcToggleBtn");
const closeCalcBtn = document.getElementById("closeCalcBtn");
let isDragging = false;
let initialX = 0;
let initialY = 0;

function toggleCalculator() {
    calculatorBox.style.display = calculatorBox.style.display === "block" ? "none" : "block";
    if (calculatorBox.style.display === "block") {
        const windowWidth = window.innerWidth / currentZoom;
        const windowHeight = window.innerHeight / currentZoom;
        const calcWidth = calculatorBox.offsetWidth;
        const calcHeight = calculatorBox.offsetHeight;
        calculatorBox.style.left = ((windowWidth - calcWidth) / 2) + "px";
        calculatorBox.style.top = ((windowHeight - calcHeight) / 2) + "px";
    }
}

calcToggleBtn.addEventListener("click", toggleCalculator);
closeCalcBtn.addEventListener("click", () => (calculatorBox.style.display = "none"));

calculatorBox.addEventListener("mousedown", (e) => {
    if (e.target.classList.contains("sidebar-header") && !e.target.classList.contains("close-btn")) {
        isDragging = true;
        const calcRect = calculatorBox.getBoundingClientRect();
        initialX = e.clientX / currentZoom - calcRect.left;
        initialY = e.clientY / currentZoom - calcRect.top;
        calculatorBox.style.cursor = "grabbing";
    }
});

document.addEventListener("mousemove", (e) => {
    if (isDragging) {
        const newX = e.clientX / currentZoom - initialX;
        const newY = e.clientY / currentZoom - initialY;
        const windowWidth = window.innerWidth / currentZoom;
        const calcWidth = calculatorBox.offsetWidth;
        const calcHeight = calculatorBox.offsetHeight;
        const boundedX = Math.max(0, Math.min(newX, windowWidth - calcWidth));
        const boundedY = Math.max(0, Math.min(newY, document.documentElement.scrollHeight / currentZoom - calcHeight));
        calculatorBox.style.left = boundedX + "px";
        calculatorBox.style.top = boundedY + "px";
    }
});

document.addEventListener("mouseup", () => {
    if (isDragging) {
        isDragging = false;
        calculatorBox.style.cursor = "move";
    }
});

calculatorBox.addEventListener("touchstart", (e) => {
    if (e.target.classList.contains("sidebar-header") && !e.target.classList.contains("close-btn")) {
        isDragging = true;
        const calcRect = calculatorBox.getBoundingClientRect();
        const touch = e.touches[0];
        initialX = touch.clientX / currentZoom - calcRect.left;
        initialY = touch.clientY / currentZoom - calcRect.top;
    }
});

document.addEventListener("touchmove", (e) => {
    if (isDragging) {
        const touch = e.touches[0];
        const newX = touch.clientX / currentZoom - initialX;
        const newY = touch.clientY / currentZoom - initialY;
        const windowWidth = window.innerWidth / currentZoom;
        const calcWidth = calculatorBox.offsetWidth;
        const calcHeight = calculatorBox.offsetHeight;
        const boundedX = Math.max(0, Math.min(newX, windowWidth - calcWidth));
        const boundedY = Math.max(0, Math.min(newY, document.documentElement.scrollHeight / currentZoom - calcHeight));
        calculatorBox.style.left = boundedX + "px";
        calculatorBox.style.top = boundedY + "px";
    }
}, { passive: false });

document.addEventListener("touchend", () => {
    if (isDragging) isDragging = false;
});

function updateCalculatorPosition(previousZoom) {
    if (calculatorBox.style.display === "block") {
        const calcRect = calculatorBox.getBoundingClientRect();
        const zoomRatio = previousZoom / currentZoom;
        calculatorBox.style.left = (calcRect.left * zoomRatio) / currentZoom + "px";
        calculatorBox.style.top = (calcRect.top * zoomRatio) / currentZoom + "px";
    }
}












// ---------------------------------------
// INICJALIZACJA
// ---------------------------------------

function initializeInputHandling() {
    const inputs = [elements.kwota, elements.iloscRat, elements.oprocentowanie, elements.prowizja];
    const ranges = [elements.kwotaRange, elements.iloscRatRange, elements.oprocentowanieRange, elements.prowizjaRange];

    inputs.forEach((input, index) => {
        const range = ranges[index];
        if (!input || !range) return;

        input.addEventListener("keypress", (e) => {
            if (e.key === "." || e.key === ",") e.preventDefault();
            if (!/[0-9]/.test(e.key) && !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)) e.preventDefault();
        });

        input.addEventListener("input", () => syncInputWithRange(input, range));
        input.addEventListener("change", () => {
            syncInputWithRange(input, range);
            if (input === elements.kwota) updateKwotaInfo();
            else if (input === elements.iloscRat) updateLata();
            else if (input === elements.prowizja) updateProwizjaInfo();
            updateLoanDetails();
        });

        range.addEventListener("input", () => {
            syncInputWithRange(input, range);
            if (range === elements.kwotaRange) updateKwotaInfo();
            else if (range === elements.iloscRatRange) updateLata();
            else if (range === elements.prowizjaRange) updateProwizjaInfo();
            updateLoanDetails();
        });
    });

    elements.jednostkaProwizji.addEventListener("change", () => {
        updateProwizjaInfo();
        updateLoanDetails();
    });
}

function initializeApp() {
    initializeInputHandling();
    initializeNadplataKredytuToggle();
    initializeZmienneOprocentowanieToggle();
    initializePorownajKredytToggle();
    initializeButtons();

    updateKwotaInfo();
    updateLata();
    updateProwizjaInfo();
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
        updateSummaryTable(defaultData);
        updateScheduleTable(defaultData.harmonogram);
    }
}

document.addEventListener("DOMContentLoaded", initializeApp);
