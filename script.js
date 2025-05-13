const APP_CONSTANTS = {
    KWOTA_MIN: 10000,
    KWOTA_MAX: 5000000,
    ILOSC_RAT_MIN: 12,
    ILOSC_RAT_MAX: 420,
    OPROCENTOWANIE_MIN: 0.1,
    OPROCENTOWANIE_MAX: 25,
    PROWIZJA_MIN: 0,
    PROWIZJA_MAX: 10,
    NADPLATA_MIN: 100,
    NADPLATA_MAX: 5000000,
    ZOOM_MIN: 0.5,
    ZOOM_MAX: 2,
    ZOOM_STEP: 0.1,
};

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
    calculatorBox: document.getElementById("calculatorBox"),
};

// Debugowanie elementów
console.log("Sprawdzam elementy:", {
    zoomInBtn: elements.zoomInBtn,
    zoomOutBtn: elements.zoomOutBtn,
    toggleDarkModeBtn: elements.toggleDarkModeBtn
});

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











// F U N K C J E    P O M O C N I C Z E

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function syncInputWithRange(input, range, enforceLimits = false, maxLimit = null, onChange = null) {
    if (!input || !range) {
        console.warn("Brak input lub range w syncInputWithRange.");
        return;
    }
    let value;
    const isIntegerInput = input.id === "iloscRat" || input.classList.contains("variable-cykl") || input.classList.contains("variable-cykl-start");

    if (isIntegerInput) {
        value = parseInt(input.value) || parseInt(range.value) || parseInt(input.min) || 0;
        const min = parseInt(range.min) || parseInt(input.min) || 0;
        let max = maxLimit !== null ? maxLimit : parseInt(range.max) || parseInt(input.max) || Infinity;
        if (enforceLimits) {
            value = Math.max(min, Math.min(max, value));
        }
        input.value = value;
        range.value = value;
    } else {
        value = parseFloat(input.value) || parseFloat(range.value) || parseFloat(input.min) || 0;
        const min = parseFloat(range.min) || parseFloat(input.min) || 0;
        let max = maxLimit !== null ? maxLimit : parseFloat(range.max) || parseFloat(input.max) || Infinity;
        if (enforceLimits) {
            value = Math.max(min, Math.min(max, value));
        }
        input.value = value.toFixed(2);
        range.value = value;
    }

    if (onChange) onChange(value);
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

            const overpayment = {
                type: typeSelect.value,
                effect: effectSelect.value,
                amount: parseFloat(rateInput.value) || 0,
                start: parseInt(periodStartInput.value) || 2,
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

function updateKwotaInfo() {
    const kwota = parseFloat(elements.kwota.value) || 0;
    elements.kwotaInfo.textContent = `Kwota kredytu: ${kwota.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} zł`;
}

function updateLata() {
    const iloscRat = parseInt(elements.iloscRat.value) || 0;
    const lata = Math.floor(iloscRat / 12);
    const resztaMiesiecy = iloscRat % 12;
    elements.lata.textContent = lata + " lat" + (resztaMiesiecy > 0 ? " i " + resztaMiesiecy + " miesięcy" : "");
}

function updateProwizjaInfo() {
    if (!checkElements(elements.prowizja, elements.jednostkaProwizji, elements.kwota, elements.prowizjaInfo)) return;
    const prowizja = parseFloat(elements.prowizja.value) || 0;
    const jednostka = elements.jednostkaProwizji.value;
    const kwota = parseFloat(elements.kwota.value) || 0;
    const prowizjaKwota = jednostka === "procent" ? (prowizja / 100) * kwota : prowizja;
    elements.prowizjaInfo.textContent = `Prowizja: ${formatNumber(prowizjaKwota)} zł`;
}

function syncProwizjaWithKwota(force = false) {
    if (!elements.prowizja || !elements.kwota || !elements.jednostkaProwizji) return;

    const kwota = parseFloat(elements.kwota.value) || 0;
    let prowizja = parseFloat(elements.prowizja.value) || 0;
    const jednostka = elements.jednostkaProwizji.value;

    if (jednostka === "procent" && (!elements.prowizja.dataset.manual || force)) {
        if (prowizja < APP_CONSTANTS.PROWIZJA_MIN) prowizja = APP_CONSTANTS.PROWIZJA_MIN;
        if (prowizja > APP_CONSTANTS.PROWIZJA_MAX) prowizja = APP_CONSTANTS.PROWIZJA_MAX;
        elements.prowizja.value = prowizja.toFixed(2);
        elements.prowizjaRange.value = prowizja;
        delete elements.prowizja.dataset.manual;
    } else if (jednostka === "zl" && (!elements.prowizja.dataset.manual || force)) {
        prowizja = (prowizja / 100) * kwota;
        elements.prowizja.value = prowizja.toFixed(2);
        elements.prowizjaRange.value = prowizja;
        delete elements.prowizja.dataset.manual;
    }
    updateProwizjaInfo();
}

function setInputLockStyles(input, isLocked) {
    if (!input) return;
    input.disabled = isLocked;
    input.style.backgroundColor = isLocked ? "#f0f0f0" : "";
    input.style.opacity = isLocked ? "0.6" : "1";
    input.style.cursor = isLocked ? "not-allowed" : "text";
}

function checkElements(...elements) {
    return elements.every(element => {
        if (!element) {
            console.warn("Brak wymaganego elementu:", element);
            return false;
        }
        return true;
    });
}

function formatNumber(number) {
    return number.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}










// F U N K C J E    W P R O W A D Z A N I E    D A N Y C H

const debouncedUpdateLoanDetails = debounce(updateLoanDetails, 300);

function initializeInputHandling() {
    if (!elements.kwota || !elements.kwotaRange || !elements.iloscRat || !elements.iloscRatRange || 
        !elements.oprocentowanie || !elements.oprocentowanieRange || !elements.prowizja || 
        !elements.prowizjaRange || !elements.jednostkaProwizji || !elements.rodzajRat) {
        console.error("Brak wymaganych elementów formularza. Sprawdź HTML.");
        return;
    }

    // Kwota Kredytu
    elements.kwota.addEventListener("beforeinput", (e) => {
        if (e.data && !/[0-9]/.test(e.data)) {
            e.preventDefault();
        }
    });

    elements.kwota.addEventListener("blur", () => {
        let value = elements.kwota.value;
        let parsedValue = parseInt(value) || 0;
        let minValue = APP_CONSTANTS.KWOTA_MIN;
        let maxValue = APP_CONSTANTS.KWOTA_MAX;

        if (isNaN(parsedValue) || value === "") {
            parsedValue = minValue;
        } else {
            if (parsedValue < minValue) parsedValue = minValue;
            if (parsedValue > maxValue) parsedValue = maxValue;
        }

        elements.kwota.value = parsedValue;
        elements.kwotaRange.value = parsedValue;
        updateKwotaInfo();
        debouncedUpdateLoanDetails();
    });

    elements.kwotaRange.addEventListener("input", () => {
        let value = parseInt(elements.kwotaRange.value);
        elements.kwota.value = value;
        updateKwotaInfo();
        debouncedUpdateLoanDetails();
    });

    // Ilość Rat
    elements.iloscRat.addEventListener("beforeinput", (e) => {
        if (e.data && !/[0-9]/.test(e.data)) {
            e.preventDefault();
        }
    });

    elements.iloscRat.addEventListener("blur", () => {
        let value = elements.iloscRat.value;
        let parsedValue = parseInt(value) || 0;
        let minValue = APP_CONSTANTS.ILOSC_RAT_MIN;
        let maxValue = APP_CONSTANTS.ILOSC_RAT_MAX;

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
        debouncedUpdateLoanDetails();
    });

    elements.iloscRatRange.addEventListener("input", () => {
        let value = parseInt(elements.iloscRatRange.value);
        elements.iloscRat.value = value.toString();
        updateLata();
        debouncedUpdateLoanDetails();
    });

    // Oprocentowanie
    elements.oprocentowanie.addEventListener("beforeinput", (e) => {
        if (e.data && !/[0-9,.]/.test(e.data)) {
            e.preventDefault();
        }
    });

    elements.oprocentowanie.addEventListener("input", (e) => {
        let value = e.target.value;
        value = value.replace(",", ".");
        e.target.value = value;

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
        let minValue = APP_CONSTANTS.OPROCENTOWANIE_MIN;
        let maxValue = APP_CONSTANTS.OPROCENTOWANIE_MAX;

        if (isNaN(parsedValue) || value === "") {
            parsedValue = minValue;
        } else {
            if (parsedValue < minValue) parsedValue = minValue;
            if (parsedValue > maxValue) parsedValue = maxValue;
        }

        elements.oprocentowanie.value = parsedValue.toFixed(2);
        elements.oprocentowanieRange.value = parsedValue;
        debouncedUpdateLoanDetails();
    });

    elements.oprocentowanieRange.addEventListener("input", () => {
        let value = parseFloat(elements.oprocentowanieRange.value);
        elements.oprocentowanie.value = value.toFixed(2);
        debouncedUpdateLoanDetails();
    });

    // Prowizja
    elements.prowizja.addEventListener("beforeinput", (e) => {
        if (e.data && !/[0-9,.]/.test(e.data)) {
            e.preventDefault();
        }
    });

    elements.prowizja.addEventListener("input", (e) => {
        let value = e.target.value;
        value = value.replace(",", ".");
        e.target.value = value;

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
        let minValue = APP_CONSTANTS.PROWIZJA_MIN;
        let maxValue = APP_CONSTANTS.PROWIZJA_MAX;
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
        debouncedUpdateLoanDetails();
    });

    elements.prowizjaRange.addEventListener("input", () => {
        let value = parseFloat(elements.prowizjaRange.value);
        elements.prowizja.value = value.toFixed(2);
        elements.prowizja.dataset.manual = "true";
        updateProwizjaInfo();
        debouncedUpdateLoanDetails();
    });

    // Jednostka Prowizji
    elements.jednostkaProwizji.addEventListener("change", () => {
        syncProwizjaWithKwota(true);
        updateProwizjaInfo();
        debouncedUpdateLoanDetails();
    });

    // Rodzaj Rat
    elements.rodzajRat.addEventListener("change", () => {
        debouncedUpdateLoanDetails();
    });
}











// F U N K C J A     N A D P Ł A T A     K R E D Y T U

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
                        <input type="number" inputmode="numeric" class="form-control variable-rate" min="${APP_CONSTANTS.NADPLATA_MIN}" max="${APP_CONSTANTS.NADPLATA_MAX}" step="1" value="100">
                        <span class="input-group-text unit-zl">zł</span>
                    </div>
                    <input type="range" class="form-range range-slider variable-rate-range" min="${APP_CONSTANTS.NADPLATA_MIN}" max="${APP_CONSTANTS.NADPLATA_MAX}" step="1" value="100">
                </div>
                <div class="form-group box-period box-period-start">
                    <label class="form-label">W</label>
                    <div class="input-group">
                        <input type="number" class="form-control variable-cykl variable-cykl-start" min="1" max="${APP_CONSTANTS.ILOSC_RAT_MAX}" step="1" value="1">
                        <span class="input-group-text unit-period">miesiącu</span>
                    </div>
                    <input type="range" class="form-range range-slider variable-cykl-range variable-cykl-start-range" min="1" max="${APP_CONSTANTS.ILOSC_RAT_MAX}" step="1" value="1">
                </div>
            </div>
        </div>
    `;
    return group;
}

function initializeNadplataKredytuGroup(group) {
    if (!group) return;

    const periodStartBox = group.querySelector(".box-period-start");
    const periodLabel = periodStartBox?.querySelector(".form-label");
    const periodUnit = periodStartBox?.querySelector(".unit-period");
    const typeSelect = group.querySelector(".nadplata-type-select");

    if (!periodStartBox || !periodLabel || !periodUnit || !typeSelect) {
        console.error("Brak wymaganych elementów w grupie nadpłaty:", { periodStartBox, periodLabel, periodUnit, typeSelect });
        return;
    }

    const updatePeriodBox = () => {
        if (state.isUpdating) return;

        state.isUpdating = true;
        const periodStartInput = group.querySelector(".variable-cykl-start");
        const periodStartRange = group.querySelector(".variable-cykl-start-range");

        if (!periodStartInput || !periodStartRange) {
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

        state.isUpdating = false;
    };

    const initializeInputsAndRanges = (inputs, ranges) => {
        inputs.forEach((input, index) => {
            const range = ranges[index];
            if (!input || !range) return;

            syncInputWithRange(input, range, false, null);

            if (input.classList.contains("variable-cykl-start")) {
                input.addEventListener("beforeinput", (e) => {
                    if (e.data && !/[0-9]/.test(e.data)) {
                        e.preventDefault();
                    }
                });

                const debouncedUpdate = debounce(() => {
                    if (!state.isUpdating) {
                        updateRatesArray("nadplata");
                        updateNadplataKredytuRemoveButtons();
                        updateLoanDetails();
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
                input.addEventListener("beforeinput", (e) => {
                    if (e.data && !/[0-9]/.test(e.data)) {
                        e.preventDefault();
                    }
                });

                const debouncedUpdate = debounce(() => {
                    if (!state.isUpdating) {
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
                        input.value = parsedValue; // Ustawiamy wartość bez zer po przecinku
                    }
                    debouncedUpdate();
                });

                input.addEventListener("change", () => {
                    let value = parseInt(input.value) || parseInt(input.min);
                    if (value < parseInt(input.min)) value = parseInt(input.min);
                    if (value > parseInt(input.max)) value = parseInt(input.max);
                    input.value = value; // Ustawiamy wartość bez zer po przecinku
                    range.value = value;
                    debouncedUpdate();
                });

                range.addEventListener("input", () => {
                    let value = parseInt(range.value);
                    if (value < parseInt(range.min)) value = parseInt(range.min);
                    if (value > parseInt(range.max)) value = parseInt(range.max);
                    input.value = value; // Ustawiamy wartość bez zer po przecinku
                    range.value = value;
                    debouncedUpdate();
                });

                range.addEventListener("change", () => {
                    let value = parseInt(range.value);
                    if (value < parseInt(range.min)) value = parseInt(range.min);
                    if (value > parseInt(range.max)) value = parseInt(range.max);
                    input.value = value; // Ustawiamy wartość bez zer po przecinku
                    range.value = value;
                    debouncedUpdate();
                });
            }
        });
    };

    const inputs = group.querySelectorAll(".form-control");
    const ranges = group.querySelectorAll(".form-range");
    initializeInputsAndRanges(inputs, ranges);

    typeSelect.addEventListener("change", () => {
        updatePeriodBox();
        updateRatesArray("nadplata");
        updateLoanDetails();
    });

    updatePeriodBox();
}

function updateNadplataKredytuRemoveButtons() {
    const groups = elements.nadplataKredytuWrapper.querySelectorAll(".variable-input-group");
    groups.forEach(group => {
        let removeBtn = group.querySelector(".remove-btn");
        if (groups.length > 1) {
            if (!removeBtn) {
                removeBtn = document.createElement("button");
                removeBtn.type = "button";
                removeBtn.classList.add("remove-btn");
                removeBtn.innerHTML = "×";
                group.appendChild(removeBtn);
            }
            removeBtn.onclick = () => {
                group.remove();
                updateRatesArray("nadplata");
                updateNadplataKredytuRemoveButtons();
                updateLoanDetails();
            };
        } else if (removeBtn) {
            removeBtn.remove();
        }
    });
}

function initializeNadplataKredytuToggle() {
    if (!elements.nadplataKredytuBtn || !elements.nadplataKredytuInputs || !elements.nadplataKredytuWrapper) {
        console.error("Brak elementów do nadpłaty kredytu. Sprawdź HTML.");
        return;
    }

    elements.nadplataKredytuBtn.addEventListener("change", () => {
        const isChecked = elements.nadplataKredytuBtn.checked;
        elements.nadplataKredytuInputs.style.display = isChecked ? "block" : "none";
        if (isChecked) {
            const group = createNadplataKredytuGroup();
            elements.nadplataKredytuWrapper.appendChild(group);
            initializeNadplataKredytuGroup(group);
            updateRatesArray("nadplata");
            updateNadplataKredytuRemoveButtons();
        } else {
            elements.nadplataKredytuWrapper.innerHTML = "";
            state.overpaymentRates = [];
        }
        toggleMainFormLock();
        updateLoanDetails();
    });

    elements.nadplataKredytuInputs.querySelector(".variable-add-btn").addEventListener("click", () => {
        const group = createNadplataKredytuGroup();
        elements.nadplataKredytuWrapper.appendChild(group);
        initializeNadplataKredytuGroup(group);
        updateRatesArray("nadplata");
        updateNadplataKredytuRemoveButtons();
        updateLoanDetails();
    });
}













// F U N K C J E    Z M I E N N E    O P R O C E N T O W A N I E

function createVariableOprocentowanieGroup() {
    const group = document.createElement("div");
    group.classList.add("variable-input-group");
    group.setAttribute("data-type", "oprocentowanie");
    group.style.marginBottom = "10px";

    group.innerHTML = `
        <div class="fields-wrapper">
            <div class="form-row">
                <div class="form-group box-amount">
                    <label class="form-label">Oprocentowanie</label>
                    <div class="input-group">
                        <input type="number" inputmode="decimal" class="form-control variable-rate" min="${APP_CONSTANTS.OPROCENTOWANIE_MIN}" max="${APP_CONSTANTS.OPROCENTOWANIE_MAX}" step="0.01" value="7">
                        <span class="input-group-text unit-percent">%</span>
                    </div>
                    <input type="range" class="form-range range-slider variable-rate-range" min="${APP_CONSTANTS.OPROCENTOWANIE_MIN}" max="${APP_CONSTANTS.OPROCENTOWANIE_MAX}" step="0.01" value="7">
                </div>
                <div class="form-group box-period">
                    <label class="form-label">Od okresu</label>
                    <div class="input-group">
                        <input type="number" class="form-control variable-cykl" min="2" max="${APP_CONSTANTS.ILOSC_RAT_MAX}" step="1" value="2">
                        <span class="input-group-text unit-period">miesiąc</span>
                    </div>
                    <input type="range" class="form-range range-slider variable-cykl-range" min="2" max="${APP_CONSTANTS.ILOSC_RAT_MAX}" step="1" value="2">
                </div>
            </div>
        </div>
    `;
    return group;
}

function initializeVariableOprocentowanieGroup(group) {
    if (!group) return;

    const iloscRat = parseInt(elements.iloscRat?.value) || APP_CONSTANTS.ILOSC_RAT_MAX;
    const debouncedUpdateLoanDetails = debounce(updateLoanDetails, 300);

    const allGroups = elements.variableOprocentowanieWrapper.querySelectorAll(".variable-input-group");
    const currentIndex = Array.from(allGroups).indexOf(group);
    let minPeriod = 2;
    if (currentIndex > 0) {
        const prevGroup = allGroups[currentIndex - 1];
        const prevPeriodInput = prevGroup.querySelector(".variable-cykl");
        const prevPeriodValue = parseInt(prevPeriodInput.value) || 2;
        minPeriod = prevPeriodValue + 1;
    }

    const inputs = group.querySelectorAll(".form-control");
    const ranges = group.querySelectorAll(".form-range");

    inputs.forEach((input, index) => {
        const range = ranges[index];
        if (!input || !range) return;

        if (input.classList.contains("variable-cykl")) {
            input.min = minPeriod;
            input.max = iloscRat;
            range.min = minPeriod;
            range.max = iloscRat;
            syncInputWithRange(input, range);

            input.addEventListener("beforeinput", (e) => {
                if (e.data && !/[0-9]/.test(e.data)) {
                    e.preventDefault();
                }
            });

            input.addEventListener("input", (e) => {
                let value = input.value;
                const cursorPosition = input.selectionStart;
                const sanitizedValue = value.replace(/[^0-9]/g, "");
                if (value !== sanitizedValue) {
                    input.value = sanitizedValue;
                }
                if (!isNaN(parseInt(sanitizedValue))) {
                    range.value = parseInt(sanitizedValue);
                }
                setTimeout(() => {
                    input.setSelectionRange(cursorPosition, cursorPosition);
                }, 0);
                updateRatesArray("oprocentowanie"); // Aktualizacja zmiennych oprocentowań
                debouncedUpdateLoanDetails();
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

                if (currentIndex < allGroups.length - 1) {
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
                debouncedUpdateLoanDetails();
            });

        } else if (input.classList.contains("variable-rate")) {
            input.min = APP_CONSTANTS.OPROCENTOWANIE_MIN;
            input.max = APP_CONSTANTS.OPROCENTOWANIE_MAX;
            range.min = APP_CONSTANTS.OPROCENTOWANIE_MIN;
            range.max = APP_CONSTANTS.OPROCENTOWANIE_MAX;
            syncInputWithRange(input, range);

            input.addEventListener("beforeinput", (e) => {
                if (e.data && !/[0-9,.]/.test(e.data)) {
                    e.preventDefault();
                }
            });

            input.addEventListener("input", (e) => {
                let value = input.value;
                const cursorPosition = input.selectionStart;

                value = value.replace(",", ".");
                input.value = value;

                const dotCount = value.split(".").length - 1;
                if (dotCount > 1) {
                    input.value = value.substring(0, value.lastIndexOf("."));
                    return;
                }

                const parts = value.split(".");
                if (parts.length > 1 && parts[1].length > 2) {
                    parts[1] = parts[1].slice(0, 2);
                    value = parts.join(".");
                    input.value = value;
                }

                if (!isNaN(parseFloat(value))) {
                    range.value = parseFloat(value).toFixed(2);
                }

                setTimeout(() => {
                    input.setSelectionRange(cursorPosition, cursorPosition);
                }, 0);
                updateRatesArray("oprocentowanie"); // Aktualizacja zmiennych oprocentowań
                debouncedUpdateLoanDetails();
            });

            input.addEventListener("change", () => {
                let value = parseFloat(input.value) || 0;
                const min = parseFloat(input.min);
                const max = parseFloat(input.max);

                if (value < min) value = min;
                else if (value > max) value = max;

                input.value = value.toFixed(2);
                range.value = value.toFixed(2);
                updateRatesArray("oprocentowanie");
                updateVariableOprocentowanieRemoveButtons();
                debouncedUpdateLoanDetails();
            });
        }

        range.addEventListener("input", () => {
            if (range.classList.contains("variable-cykl-range")) {
                input.value = parseInt(range.value);
            } else {
                input.value = parseFloat(range.value).toFixed(2);
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
            debouncedUpdateLoanDetails();
        });
    });
}

function updateVariableOprocentowanieRemoveButtons() {
    const groups = elements.variableOprocentowanieWrapper.querySelectorAll(".variable-input-group");
    groups.forEach(group => {
        let removeBtn = group.querySelector(".remove-btn");
        if (groups.length > 1) {
            if (!removeBtn) {
                removeBtn = document.createElement("button");
                removeBtn.type = "button";
                removeBtn.classList.add("remove-btn");
                removeBtn.innerHTML = "×";
                group.appendChild(removeBtn);
            }
            removeBtn.onclick = () => {
                group.remove();
                updateRatesArray("oprocentowanie");
                updateVariableOprocentowanieRemoveButtons();
                updateLoanDetails();
            };
        } else if (removeBtn) {
            removeBtn.remove();
        }
    });
}

function initializeZmienneOprocentowanieToggle() {
    if (!elements.zmienneOprocentowanieBtn || !elements.variableOprocentowanieInputs || !elements.variableOprocentowanieWrapper) {
        console.error("Brak elementów do zmiennego oprocentowania. Sprawdź HTML.");
        return;
    }

    elements.zmienneOprocentowanieBtn.addEventListener("change", () => {
        const isChecked = elements.zmienneOprocentowanieBtn.checked;
        elements.variableOprocentowanieInputs.style.display = isChecked ? "block" : "none";
        if (isChecked) {
            const group = createVariableOprocentowanieGroup();
            elements.variableOprocentowanieWrapper.appendChild(group);
            initializeVariableOprocentowanieGroup(group);
            updateRatesArray("oprocentowanie");
            updateVariableOprocentowanieRemoveButtons();
        } else {
            elements.variableOprocentowanieWrapper.innerHTML = "";
            state.variableRates = [];
        }
        toggleMainFormLock();
        updateLoanDetails();
    });

    elements.variableOprocentowanieInputs.querySelector(".variable-add-btn").addEventListener("click", () => {
        const group = createVariableOprocentowanieGroup();
        elements.variableOprocentowanieWrapper.appendChild(group);
        initializeVariableOprocentowanieGroup(group);
        updateRatesArray("oprocentowanie");
        updateVariableOprocentowanieRemoveButtons();
        updateLoanDetails();
    });
}











// F U N K C J E    P O R Ó W N A J     K R E D Y T

function initializePorownajKredytToggle() {
    if (!elements.porownajKredytBtn) {
        console.error("Brak elementu porownajKredytBtn. Sprawdź HTML.");
        return;
    }

    elements.porownajKredytBtn.addEventListener("change", () => {
        const isChecked = elements.porownajKredytBtn.checked;
        if (isChecked) {
            alert("Porównanie kredytów nie jest jeszcze zaimplementowane. Funkcjonalność wkrótce dostępna!");
        }
        toggleMainFormLock();
        updateLoanDetails();
    });
}











// F U N K C J E    I N T E R A K C J I    Z   U Ż Y T K O W N I K I E M

function updateZoom() {
    const container = document.querySelector('.container');
    if (!container) {
        console.error("Element .container nie został znaleziony!");
        return;
    }
    const previousZoom = state.zoomLevel;
    container.style.transform = `scale(${state.zoomLevel})`;
    container.style.transformOrigin = 'top center';
    container.style.transition = 'transform 0.2s ease';
    // updateCalculatorPosition(previousZoom); // Zakomentuj tymczasowo
    console.log(`Zoom ustawiony na: ${state.zoomLevel}`);
}

function showForm() {
    if (!elements.formSection || !elements.resultSection) {
        console.error("Sekcje formSection lub resultSection nie zostały znalezione!");
        return;
    }
    elements.resultSection.style.display = "none";
    elements.formSection.style.display = "block";
    elements.resultSection.classList.remove("active");
    state.zoomLevel = 1; // Reset zoomu
    updateZoom();
    console.log("Powrót do edycji wykonany, zoom zresetowany do 1");
}

function initializeButtons() {
    if (!elements.obliczBtn || !elements.generatePdfBtn || !elements.zoomInBtn || 
        !elements.zoomOutBtn || !elements.toggleDarkModeBtn) {
        console.error("Brak wymaganych przycisków. Sprawdź HTML.");
        return;
    }

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
            updateSummaryTable(data);
            updateScheduleTable(data.harmonogram);
            updateChart(data);
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
        if (state.zoomLevel < APP_CONSTANTS.ZOOM_MAX) {
            state.zoomLevel = Math.min(APP_CONSTANTS.ZOOM_MAX, state.zoomLevel + APP_CONSTANTS.ZOOM_STEP);
            updateZoom();
            console.log(`Zoom zwiększony do: ${state.zoomLevel}`);
        }
    });

    elements.zoomOutBtn.addEventListener("click", () => {
        if (state.zoomLevel > APP_CONSTANTS.ZOOM_MIN) {
            state.zoomLevel = Math.max(APP_CONSTANTS.ZOOM_MIN, state.zoomLevel - APP_CONSTANTS.ZOOM_STEP);
            updateZoom();
            console.log(`Zoom zmniejszony do: ${state.zoomLevel}`);
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













// F U N K C J E     O B L I C Z E N I A    K R E D Y T U

function calculateLoan(kwota, oprocentowanie, iloscRat, rodzajRat, prowizja, jednostkaProwizji, variableRates = [], overpaymentRates = []) {
    if (kwota < APP_CONSTANTS.KWOTA_MIN || kwota > APP_CONSTANTS.KWOTA_MAX || 
        iloscRat < APP_CONSTANTS.ILOSC_RAT_MIN || iloscRat > APP_CONSTANTS.ILOSC_RAT_MAX || 
        oprocentowanie < APP_CONSTANTS.OPROCENTOWANIE_MIN || oprocentowanie > APP_CONSTANTS.OPROCENTOWANIE_MAX) {
        console.error("Nieprawidłowe dane wejściowe dla kredytu:", { kwota, iloscRat, oprocentowanie });
        return null;
    }

    let prowizjaKwota = 0;
    if (jednostkaProwizji === "procent") {
        prowizjaKwota = (kwota * prowizja) / 100;
    } else {
        prowizjaKwota = prowizja;
    }

    let kapitalDoSplaty = kwota;
    let calkowiteOdsetki = 0;
    let calkowiteNadplaty = 0;
    let nadplatyJednorazowe = 0;
    let nadplatyMiesieczne = 0;
    let nadplatyKwartalne = 0;
    let nadplatyRoczne = 0;
    let harmonogram = [];
    let pozostaleRaty = iloscRat;

    const monthlyRateBase = oprocentowanie / 100 / 12;
    let monthlyRate = monthlyRateBase;

    for (let miesiac = 1; miesiac <= iloscRat; miesiac++) {
        // Aktualizacja oprocentowania zmiennego
        const variableRate = variableRates.find(rate => rate.period === miesiac);
        if (variableRate && variableRate.value >= APP_CONSTANTS.OPROCENTOWANIE_MIN && variableRate.value <= APP_CONSTANTS.OPROCENTOWANIE_MAX) {
            monthlyRate = variableRate.value / 100 / 12;
        }

        // Obsługa nadpłat
        let nadplata = 0;
        let overpaymentApplied = false;
        overpaymentRates.forEach(rate => {
            const shouldApply = 
                (rate.type === "Jednorazowa" && rate.start === miesiac) ||
                (rate.type === "Miesięczne" && miesiac >= rate.start) ||
                (rate.type === "Kwartalne" && miesiac >= rate.start && (miesiac - rate.start) % 3 === 0) ||
                (rate.type === "Roczne" && miesiac >= rate.start && (miesiac - rate.start) % 12 === 0);

            if (shouldApply) {
                nadplata += rate.amount;
                overpaymentApplied = true;

                if (rate.type === "Jednorazowa") nadplatyJednorazowe += rate.amount;
                else if (rate.type === "Miesięczne") nadplatyMiesieczne += rate.amount;
                else if (rate.type === "Kwartalne") nadplatyKwartalne += rate.amount;
                else if (rate.type === "Roczne") nadplatyRoczne += rate.amount;
            }
        });

        calkowiteNadplaty += nadplata;

        if (overpaymentApplied) {
            kapitalDoSplaty -= nadplata;
            if (kapitalDoSplaty <= 0) {
                kapitalDoSplaty = 0;
                pozostaleRaty = miesiac;
                break;
            }
        }

        const odsetki = kapitalDoSplaty * monthlyRate;
        calkowiteOdsetki += odsetki;

        let rataKapitalowa;
        let rata;
        if (rodzajRat === "rowne" && kapitalDoSplaty > 0) {
            const q = 1 + monthlyRate;
            const mianownik = Math.pow(q, iloscRat - (miesiac - 1)) - 1;
            if (mianownik === 0) {
                console.error("Mianownik równy zero w obliczeniach raty równej:", { q, iloscRat, miesiac });
                return null;
            }
            rata = (kapitalDoSplaty * Math.pow(q, iloscRat - (miesiac - 1)) * monthlyRate) / mianownik;
            rataKapitalowa = rata - odsetki;
        } else {
            rataKapitalowa = kapitalDoSplaty / (iloscRat - (miesiac - 1));
            rata = rataKapitalowa + odsetki;
        }

        if (kapitalDoSplaty <= 0) {
            rata = 0;
            rataKapitalowa = 0;
        }

        kapitalDoSplaty -= rataKapitalowa;
        if (kapitalDoSplaty < 0.01) kapitalDoSplaty = 0;

        harmonogram.push({
            miesiac,
            rata: rata > 0 ? rata : 0,
            oprocentowanie: (monthlyRate * 12 * 100),
            nadplata,
            kapital: rataKapitalowa > 0 ? rataKapitalowa : 0,
            odsetki,
            kapitalDoSplaty: kapitalDoSplaty > 0 ? kapitalDoSplaty : 0,
        });

        if (kapitalDoSplaty <= 0) {
            pozostaleRaty = miesiac;
            break;
        }
    }

    const calkowityKoszt = kwota + calkowiteOdsetki + prowizjaKwota - calkowiteNadplaty;

    return {
        kwota,
        iloscRat,
        oprocentowanie,
        rodzajRat,
        prowizja: prowizjaKwota,
        calkowityKoszt,
        calkowiteOdsetki,
        calkowiteNadplaty,
        nadplatyJednorazowe,
        nadplatyMiesieczne,
        nadplatyKwartalne,
        nadplatyRoczne,
        pozostaleRaty,
        harmonogram,
    };
}











// F U N K C J A    A K T U A L I Z A C J I    W Y N I K Ó W

function updateResults(data) {
    if (!data || !elements.valueKapital || !elements.valueOdsetki || !elements.valueNadplata || 
        !elements.valueProwizja || !elements.okresPoNadplacie || !elements.koszt) {
        console.error("Brak danych lub wymaganych elementów wyników. Sprawdź dane i HTML.", { data, elements });
        return;
    }

    elements.valueKapital.textContent = data.kwota.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " zł";
    elements.valueOdsetki.textContent = data.calkowiteOdsetki.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " zł";
    elements.valueNadplata.textContent = data.calkowiteNadplaty.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " zł";
    elements.valueProwizja.textContent = data.prowizja.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " zł";
    elements.okresPoNadplacie.textContent = data.pozostaleRaty + " miesięcy";
    elements.koszt.textContent = data.calkowityKoszt.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " zł";
}

function updateSummaryTable(summary) {
    if (!summary) return;

    const summaryTable = document.querySelector("#summaryTable");
    if (!summaryTable) {
        console.error("Element #summaryTable nie istnieje. Sprawdź HTML.");
        return;
    }

    const summaryTableBody = summaryTable.querySelector("tbody");
    if (!summaryTableBody) {
        console.error("Element tbody w #summaryTable nie istnieje. Sprawdź HTML.");
        return;
    }

    summaryTableBody.innerHTML = "";

    const rows = [
        { label: "Całkowity koszt kredytu", value: summary.calkowityKoszt.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " zł" },
        { label: "Całkowite odsetki", value: summary.calkowiteOdsetki.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " zł" },
        { label: "Prowizja", value: summary.prowizja.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " zł" },
        { label: "Całkowite nadpłaty", value: summary.calkowiteNadplaty.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " zł" },
        { label: "Nadpłaty jednorazowe", value: summary.nadplatyJednorazowe.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " zł" },
        { label: "Nadpłaty miesięczne", value: summary.nadplatyMiesieczne.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " zł" },
        { label: "Nadpłaty kwartalne", value: summary.nadplatyKwartalne.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " zł" },
        { label: "Nadpłaty roczne", value: summary.nadplatyRoczne.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " zł" },
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
    if (!elements.harmonogramTabela) {
        console.error("Element #harmonogramTabela nie istnieje. Sprawdź HTML.");
        return;
    }
    if (!schedule || schedule.length === 0) {
        elements.harmonogramTabela.innerHTML = "<tr><td colspan='7'>Brak danych do wyświetlenia harmonogramu.</td></tr>";
        return;
    }

    const fragment = document.createDocumentFragment();
    schedule.forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${row.miesiac}</td>
            <td>${row.rata.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
            <td>${row.oprocentowanie.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
            <td>${row.nadplata.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
            <td>${row.kapital.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
            <td>${row.odsetki.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
            <td>${row.kapitalDoSplaty.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
        `;
        fragment.appendChild(tr);
    });

    elements.harmonogramTabela.innerHTML = "";
    elements.harmonogramTabela.appendChild(fragment);

    const table = document.querySelector("table.table-striped");
    const tableWrapper = document.querySelector(".harmonogram-header")?.nextElementSibling;
    if (table && tableWrapper) {
        tableWrapper.scrollTop = table.offsetTop;
    }
}

function updateChart(data) {
    console.warn("Funkcja updateChart nie jest jeszcze zaimplementowana.");
}

function updateLoanDetails() {
    const kwota = parseFloat(elements.kwota.value) || state.lastFormData.kwota;
    const iloscRat = parseInt(elements.iloscRat.value) || state.lastFormData.iloscRat;
    const oprocentowanie = parseFloat(elements.oprocentowanie.value) || state.lastFormData.oprocentowanie;
    const rodzajRat = elements.rodzajRat.value || state.lastFormData.rodzajRat;
    const prowizja = parseFloat(elements.prowizja.value) || state.lastFormData.prowizja;
    const prowizjaJednostka = elements.jednostkaProwizji.value || state.lastFormData.jednostkaProwizji;

    const variableRates = state.variableRates;
    const overpaymentRates = state.overpaymentRates;

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
        updateResults(data);
        updateSummaryTable(data);
        updateScheduleTable(data.harmonogram);
        updateChart(data);
    } else {
        console.error("Błąd podczas obliczania kredytu. Sprawdź dane wejściowe.");
    }
}

function toggleMainFormLock() {
    const isNadplataActive = elements.nadplataKredytuBtn?.checked || false;
    const isZmienneOprocentowanieActive = elements.zmienneOprocentowanieBtn?.checked || false;
    const isPorownajKredytActive = elements.porownajKredytBtn?.checked || false;
    const shouldLock = isNadplataActive || isZmienneOprocentowanieActive;

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












// F U N K C J A     K A L K U L T O R

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
        const windowWidth = window.innerWidth / state.zoomLevel;
        const windowHeight = window.innerHeight / state.zoomLevel;
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
        const currentX = (calcRect.left + window.scrollX) / state.zoomLevel;
        const currentY = (calcRect.top + window.scrollY) / state.zoomLevel;

        calculatorBox.style.left = currentX + 'px';
        calculatorBox.style.top = currentY + 'px';

        initialX = (e.clientX / state.zoomLevel) - currentX;
        initialY = (e.clientY / state.zoomLevel) - currentY;
        calculatorBox.style.cursor = 'grabbing';
        e.preventDefault();
    }
});

document.addEventListener('mousemove', (e) => {
    if (isDragging) {
        e.preventDefault();
        const newX = (e.clientX / state.zoomLevel) - initialX;
        const newY = (e.clientY / state.zoomLevel) - initialY;

        const windowWidth = window.innerWidth / state.zoomLevel;
        const calcWidth = calculatorBox.offsetWidth;
        const calcHeight = calculatorBox.offsetHeight;
        const documentHeight = document.documentElement.scrollHeight / state.zoomLevel;

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

calculatorBox.addEventListener('touchstart', (e) => {
    if (e.target.classList.contains('sidebar-header') && !e.target.classList.contains('close-btn')) {
        isDragging = true;
        const calcRect = calculatorBox.getBoundingClientRect();
        const currentX = (calcRect.left + window.scrollX) / state.zoomLevel;
        const currentY = (calcRect.top + window.scrollY) / state.zoomLevel;

        calculatorBox.style.left = currentX + 'px';
        calculatorBox.style.top = currentY + 'px';

        const touch = e.touches[0];
        initialX = (touch.clientX / state.zoomLevel) - currentX;
        initialY = (touch.clientY / state.zoomLevel) - currentY;
        e.preventDefault();
    }
});

document.addEventListener('touchmove', (e) => {
    if (isDragging) {
        e.preventDefault();
        const touch = e.touches[0];
        const newX = (touch.clientX / state.zoomLevel) - initialX;
        const newY = (touch.clientY / state.zoomLevel) - initialY;

        const windowWidth = window.innerWidth / state.zoomLevel;
        const calcWidth = calculatorBox.offsetWidth;
        const calcHeight = calculatorBox.offsetHeight;
        const documentHeight = document.documentElement.scrollHeight / state.zoomLevel;

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

function updateCalculatorPosition(previousZoom) {
    if (calculatorBox.style.display === 'block') {
        console.log("Aktualizuję pozycję kalkulatora...");
        const calcRect = calculatorBox.getBoundingClientRect();
        const zoomRatio = previousZoom / state.zoomLevel;
        const newX = (calcRect.left + window.scrollX) * zoomRatio - window.scrollX;
        const newY = (calcRect.top + window.scrollY) * zoomRatio - window.scrollY;
        calculatorBox.style.left = (newX / state.zoomLevel) + 'px';
        calculatorBox.style.top = (newY / state.zoomLevel) + 'px';
    } else {
        console.log("Kalkulator jest ukryty, pomijam aktualizację pozycji.");
    }
}












// I N I C J A L I Z A C J A

function initializeApp() {
    console.log("Inicjalizacja aplikacji...");
    
    }

    initializeInputHandling();
    initializeNadplataKredytuToggle();
    initializeZmienneOprocentowanieToggle();
    initializePorownajKredytToggle();
    initializeButtons();
    console.log("Inicjalizacja zakończona.");

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

    document.addEventListener("DOMContentLoaded", () => {
        toggleMainFormLock();
        console.log("DOMContentLoaded - formularz zablokowany, jeśli trzeba.");
    });
}

// Uruchom aplikację
initializeApp();
