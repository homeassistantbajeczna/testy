
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
        if (isNaN(prowizjaKwota)) prowizjaKwota = 0; // Dodatkowa walidacja
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

// F U N K C J E    N A D P Ł A T A     K R E D Y T U

function createNadplataKredytuGroup() {
    const group = document.createElement("div");
    group.classList.add("variable-input-group");
    group.setAttribute("data-type", "nadplata");
    group.innerHTML = `
        <div class="fields-wrapper">
            <div class="form-row-container">
                <div class="form-row">
                    <div class="form-group box-select">
                        <label class="form-label">Typ nadpłaty</label>
                        <select class="form-select nadplata-type-select">
                            <option value="Jednorazowa">Jednorazowa</option>
                            <option value="Miesięczna">Miesięczna</option>
                            <option value="Kwartalna">Kwartalna</option>
                            <option value="Roczna">Roczna</option>
                        </select>
                    </div>
                    <div class="form-group box-select">
                        <label class="form-label">Efekt nadpłaty</label>
                        <select class="form-select nadplata-effect-select">
                            <option value="Skróć okres">Skróć okres</option>
                            <option value="Zmniejsz ratę">Zmniejsz ratę</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group box-amount">
                    <label class="form-label">Kwota nadpłaty</label>
                    <div class="input-group">
                        <input type="number" class="form-control variable-rate" min="0" max="1000000" step="1" value="1000">
                        <span class="input-group-text unit-zl">zł</span>
                    </div>
                    <input type="range" class="form-range range-slider variable-rate-range" min="0" max="1000000" step="1" value="1000">
                </div>
                <div class="form-group box-period box-period-start">
                    <label class="form-label">W</label>
                    <div class="input-group">
                        <input type="number" class="form-control variable-cykl variable-cykl-start" min="1" max="419" step="1" value="1">
                        <span class="input-group-text unit-miesiacu">miesiącu</span>
                    </div>
                    <input type="range" class="form-range range-slider variable-cykl-range variable-cykl-start-range" min="1" max="419" step="1" value="1">
                </div>
            </div>
        </div>
    `;
    return group;
}

// Pozostałe funkcje bez zmian
function createNadplataKredytuEndPeriodBox(minValue, maxValue, defaultValue) {
    const box = document.createElement("div");
    box.classList.add("form-group", "box-period", "box-period-end");
    box.innerHTML = `
        <label class="form-label">DO</label>
        <div class="input-group">
            <input type="number" class="form-control variable-cykl variable-cykl-end" min="${minValue}" max="${maxValue}" step="1" value="${defaultValue}">
            <span class="input-group-text unit-miesiacu">miesiąca</span>
        </div>
        <input type="range" class="form-range range-slider variable-cykl-range variable-cykl-end-range" min="${minValue}" max="${maxValue}" step="1" value="${defaultValue}">
    `;
    return box;
}

function initializeNadplataKredytuGroup(group) {
    const kwota = parseFloat(elements.kwota?.value) || 500000;
    const iloscRat = parseInt(elements.iloscRat?.value) || 360;

    const inputs = group.querySelectorAll(".form-control");
    const ranges = group.querySelectorAll(".form-range");
    const typeSelect = group.querySelector(".nadplata-type-select");
    const effectSelect = group.querySelector(".nadplata-effect-select");
    const periodStartBox = group.querySelector(".box-period-start");
    const periodLabel = periodStartBox?.querySelector(".form-label");
    const periodUnit = periodStartBox?.querySelector(".unit-miesiacu");
    const formRow = periodStartBox?.parentElement;

    const updatePeriodBox = () => {
        const type = typeSelect?.value || "Jednorazowa";
        const periodStartInput = group.querySelector(".variable-cykl-start");
        const periodStartRange = group.querySelector(".variable-cykl-start-range");
        const existingEndBox = group.querySelector(".box-period-end");

        if (type === "Jednorazowa") {
            if (periodLabel) periodLabel.textContent = "W";
            if (periodUnit) periodUnit.textContent = "miesiącu";
            if (existingEndBox) {
                existingEndBox.remove();
            }
        } else {
            if (periodLabel) periodLabel.textContent = "OD";
            if (periodUnit) periodUnit.textContent = "miesiąca";
            if (!existingEndBox) {
                const minValue = parseInt(periodStartInput?.value) || 1;
                const maxValue = iloscRat - 1;
                const defaultValue = iloscRat - 1;
                const endBox = createNadplataKredytuEndPeriodBox(minValue, maxValue, defaultValue);
                formRow?.appendChild(endBox);

                const endInput = endBox.querySelector(".variable-cykl-end");
                const endRange = endBox.querySelector(".variable-cykl-end-range");

                endInput?.addEventListener("input", () => {
                    syncInputWithRange(endInput, endRange);
                    updateRatesArray("nadplata");
                });

                endRange?.addEventListener("input", () => {
                    endInput.value = endRange.value;
                    updateRatesArray("nadplata");
                });
            } else {
                const endInput = existingEndBox.querySelector(".variable-cykl-end");
                const endRange = existingEndBox.querySelector(".variable-cykl-end-range");
                const minValue = parseInt(periodStartInput?.value) || 1;
                const maxValue = iloscRat - 1;
                if (endInput) {
                    endInput.min = minValue;
                    endInput.max = maxValue;
                    if (parseInt(endInput.value) < minValue) endInput.value = minValue;
                    if (parseInt(endInput.value) > maxValue) endInput.value = maxValue;
                }
                if (endRange) {
                    endRange.min = minValue;
                    endRange.max = maxValue;
                    if (parseInt(endRange.value) < minValue) endRange.value = minValue;
                    if (parseInt(endRange.value) > maxValue) endRange.value = maxValue;
                }
            }
        }
    };

    inputs.forEach((input, index) => {
        const range = ranges[index];
        if (input.classList.contains("variable-cykl-start")) {
            input.max = iloscRat - 1;
            range.max = iloscRat - 1;
            syncInputWithRange(input, range);

            input.addEventListener("input", () => {
                syncInputWithRange(input, range);
                updatePeriodBox();
                updateRatesArray("nadplata");
            });

            range.addEventListener("input", () => {
                input.value = range.value;
                updatePeriodBox();
                updateRatesArray("nadplata");
            });
        } else if (input.classList.contains("variable-rate")) {
            input.max = kwota;
            range.max = kwota;
            syncInputWithRange(input, range);

            input.addEventListener("input", () => {
                syncInputWithRange(input, range);
                updateRatesArray("nadplata");
            });

            range.addEventListener("input", () => {
                input.value = range.value;
                updateRatesArray("nadplata");
            });
        }
    });

    typeSelect?.addEventListener("change", () => {
        updatePeriodBox();
        updateRatesArray("nadplata");
    });

    effectSelect?.addEventListener("change", () => updateRatesArray("nadplata"));

    updatePeriodBox();
}

function resetNadplataKredytuSection() {
    elements.nadplataKredytuWrapper.innerHTML = "";
    state.overpaymentRates = [];
}

function updateNadplataKredytuRemoveButtons() {
    const wrapper = elements.nadplataKredytuWrapper;
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
        removeBtn.classList.add("btn-reset");
        removeBtn.setAttribute("aria-label", "Usuń nadpłatę");
        removeBtn.textContent = "Usuń";
        removeBtnWrapper.appendChild(removeBtn);
        lastGroup.appendChild(removeBtnWrapper);

        removeBtn.addEventListener("click", () => {
            lastGroup.remove();
            updateRatesArray("nadplata");
            if (wrapper.querySelectorAll(".variable-input-group").length === 0) {
                elements.nadplataKredytuBtn.checked = false;
                elements.nadplataKredytuInputs.classList.remove("active");
                resetNadplataKredytuSection();
            }
            updateNadplataKredytuRemoveButtons();
        });
    }
}

function updateRatesArray(type) {
    try {
        if (type === "oprocentowanie") {
            state.variableRates.length = 0;
            const groups = elements.variableOprocentowanieWrapper.querySelectorAll(".variable-input-group");
            groups.forEach(group => {
                const periodInput = group.querySelector(".variable-cykl");
                const valueInput = group.querySelector(".variable-rate");
                const period = parseInt(periodInput?.value) || 0;
                const value = parseFloat(valueInput?.value) || 0;
                if (period > 0 && value > 0) {
                    state.variableRates.push({ period, value });
                }
            });
        } else if (type === "nadplata") {
            state.overpaymentRates.length = 0;
            const groups = elements.nadplataKredytuWrapper.querySelectorAll(".variable-input-group");
            groups.forEach(group => {
                const periodStartInput = group.querySelector(".variable-cykl-start");
                const periodEndInput = group.querySelector(".variable-cykl-end");
                const valueInput = group.querySelector(".variable-rate");
                const typeSelect = group.querySelector(".nadplata-type-select");
                const effectSelect = group.querySelector(".nadplata-effect-select");
                const periodStart = parseInt(periodStartInput?.value) || 0;
                const periodEnd = periodEndInput ? parseInt(periodEndInput?.value) || 0 : periodStart;
                const value = parseFloat(valueInput?.value) || 0;
                if (periodStart > 0 && value > 0) {
                    state.overpaymentRates.push({
                        periodStart,
                        periodEnd,
                        value,
                        type: typeSelect?.value || "Jednorazowa",
                        effect: effectSelect?.value || "Skróć okres",
                    });
                }
            });
        }
    } catch (error) {
        console.error("Błąd podczas aktualizacji tablicy stawek:", error);
    }
}

// F U N K C J E    Z M I E N N E    O P R O C E N T O W A N I E

function createVariableOprocentowanieGroup() {
    const group = document.createElement("div");
    group.classList.add("variable-input-group");
    group.setAttribute("data-type", "oprocentowanie");
    group.innerHTML = `
        <div class="fields-wrapper">
            <div class="form-group box-period">
                <label class="form-label">Od</label>
                <div class="input-group">
                    <input type="number" class="form-control variable-cykl" min="2" max="420" step="1" value="2">
                    <span class="input-group-text unit-miesiaca">miesiąca</span>
                </div>
                <input type="range" class="form-range range-slider variable-cykl-range" min="2" max="420" step="1" value="2">
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
    const iloscRat = parseInt(elements.iloscRat?.value) || 360;

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
        });

        range.addEventListener("input", () => {
            input.value = range.value;
            updateRatesArray("oprocentowanie");
        });
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
        removeBtn.classList.add("btn-reset");
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
        let activeOverpaymentRates = [...overpaymentRates].sort((a, b) => a.period - b.period);

        for (let i = 1; i <= iloscRat; i++) {
            let currentOprocentowanie = oprocentowanieMiesieczne;
            let activeRate = activeVariableRates.find(rate => rate.period === i);
            if (activeRate) {
                currentOprocentowanie = activeRate.value / 100 / 12;
            }

            let nadplata = 0;
            let activeOverpayment = activeOverpaymentRates.find(over => over.period === i);
            if (activeOverpayment) {
                if (activeOverpayment.type === "Jednorazowa") {
                    nadplata = activeOverpayment.value;
                } else if (activeOverpayment.type === "Miesięczna") {
                    nadplata = activeOverpayment.value;
                } else if (activeOverpayment.type === "Kwartalna" && i % 3 === 0) {
                    nadplata = activeOverpayment.value;
                } else if (activeOverpayment.type === "Roczna" && i % 12 === 0) {
                    nadplata = activeOverpayment.value;
                }

                if (activeOverpayment.effect === "Skróć okres" && nadplata > 0) {
                    pozostalyKapital -= nadplata;
                    calkowiteNadplaty += nadplata;
                    if (pozostalyKapital <= 0) {
                        pozostalyKapital = 0;
                        pozostaleRaty = i;
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

            if (activeOverpayment && activeOverpayment.effect === "Zmniejsz ratę") {
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
                elements.nadplataKredytuWrapper.querySelectorAll(".variable-rate").forEach(input => {
                    input.max = elements.kwota.value;
                    if (input.nextElementSibling?.nextElementSibling) {
                        input.nextElementSibling.nextElementSibling.max = elements.kwota.value;
                    }
                });
            }
        });

        elements.kwota?.addEventListener("blur", () => {
            let validatedValue = validateKwota(elements.kwota.value);
            elements.kwota.value = validatedValue.toFixed(2);
            syncInputWithRange(elements.kwota, elements.kwotaRange, updateKwotaInfo);
            if (elements.nadplataKredytuWrapper) {
                elements.nadplataKredytuWrapper.querySelectorAll(".variable-rate").forEach(input => {
                    input.max = validatedValue;
                    if (input.nextElementSibling?.nextElementSibling) {
                        input.nextElementSibling.nextElementSibling.max = validatedValue;
                    }
                });
            }
        });

        elements.kwotaRange?.addEventListener("input", () => {
            elements.kwota.value = parseFloat(elements.kwotaRange.value).toFixed(2);
            updateKwotaInfo();
            if (elements.nadplataKredytuWrapper) {
                elements.nadplataKredytuWrapper.querySelectorAll(".variable-rate").forEach(input => {
                    input.max = elements.kwota.value;
                    if (input.nextElementSibling?.nextElementSibling) {
                        input.nextElementSibling.nextElementSibling.max = elements.kwota.value;
                    }
                });
            }
        });

        elements.kwotaRange?.addEventListener("change", () => {
            let validatedValue = validateKwota(elements.kwotaRange.value);
            elements.kwota.value = validatedValue.toFixed(2);
            elements.kwotaRange.value = validatedValue;
            updateKwotaInfo();
            if (elements.nadplataKredytuWrapper) {
                elements.nadplataKredytuWrapper.querySelectorAll(".variable-rate").forEach(input => {
                    input.max = validatedValue;
                    if (input.nextElementSibling?.nextElementSibling) {
                        input.nextElementSibling.nextElementSibling.max = validatedValue;
                    }
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
            // Dodatkowe zabezpieczenie na wypadek wklejenia wartości z przecinkiem lub kropką
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
            elements.oprocentowanie.min = 0.1; // Minimalna wartość 0.1
            elements.oprocentowanie.max = 25;
            elements.oprocentowanie.step = 0.01;
            elements.oprocentowanie.value = 7; // Domyślna wartość
        }
        if (elements.oprocentowanieRange) {
            elements.oprocentowanieRange.min = 0.1; // Minimalna wartość 0.1
            elements.oprocentowanieRange.max = 25;
            elements.oprocentowanieRange.step = 0.01;
            elements.oprocentowanieRange.value = 7; // Domyślna wartość
        }

        // Blokada liter i niedozwolonych znaków
        elements.oprocentowanie?.addEventListener("keydown", (event) => {
            const allowedKeys = [
                "Backspace", "Delete", "Tab", "Enter", "ArrowLeft", "ArrowRight",
                "ArrowUp", "ArrowDown", "Home", "End", ".", "," // Dodajemy przecinek
            ];
            // Zezwalaj na cyfry i dozwolone klawisze
            if (
                !allowedKeys.includes(event.key) &&
                !/^[0-9]$/.test(event.key) // Tylko cyfry
            ) {
                event.preventDefault();
            }
        });

        elements.oprocentowanie?.addEventListener("input", () => {
            let value = elements.oprocentowanie.value;
            // Zamiana przecinka na kropkę, jeśli użytkownik wpisuje przecinek
            if (value.includes(",")) {
                value = value.replace(",", ".");
                elements.oprocentowanie.value = value;
            }
            // Ograniczenie do dwóch miejsc po przecinku
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
            elements.prowizja.min = 0; // Minimalna wartość 0
            elements.prowizja.max = 25; // Początkowo w procentach
            elements.prowizja.step = 0.01;
            elements.prowizja.value = 2; // Domyślna wartość w procentach
        }
        if (elements.prowizjaRange) {
            elements.prowizjaRange.min = 0; // Minimalna wartość 0
            elements.prowizjaRange.max = 25; // Początkowo w procentach
            elements.prowizjaRange.step = 0.01;
            elements.prowizjaRange.value = 2; // Domyślna wartość w procentach
        }

        // Blokada liter i niedozwolonych znaków
        elements.prowizja?.addEventListener("keydown", (event) => {
            const allowedKeys = [
                "Backspace", "Delete", "Tab", "Enter", "ArrowLeft", "ArrowRight",
                "ArrowUp", "ArrowDown", "Home", "End", ".", "," // Dodajemy przecinek
            ];
            // Zezwalaj na cyfry i dozwolone klawisze
            if (
                !allowedKeys.includes(event.key) &&
                !/^[0-9]$/.test(event.key) // Tylko cyfry
            ) {
                event.preventDefault();
            }
        });

        elements.prowizja?.addEventListener("input", () => {
            let value = elements.prowizja.value;
            // Zamiana przecinka na kropkę, jeśli użytkownik wpisuje przecinek
            if (value.includes(",")) {
                value = value.replace(",", ".");
                elements.prowizja.value = value;
            }
            // Ograniczenie do dwóch miejsc po przecinku
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
                // Ustawienie domyślnej wartości jako 2% kwoty kredytu
                const defaultProwizjaZl = (2 / 100) * kwota;
                elements.prowizja.value = defaultProwizjaZl.toFixed(2);
            } else {
                // Przywracamy domyślną wartość procentową (2%)
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
