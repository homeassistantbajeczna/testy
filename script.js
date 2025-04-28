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

function updateProwizjaInfo() {
    try {
        const prowizja = parseFloat(elements.prowizja?.value) || 0;
        const jednostka = elements.jednostkaProwizji?.value || "procent";
        const kwota = parseFloat(elements.kwota?.value) || 0;
        let prowizjaKwota = jednostka === "procent" ? (prowizja / 100) * kwota : prowizja;
        if (elements.prowizjaInfo) {
            elements.prowizjaInfo.textContent = `Prowizja: ${prowizjaKwota.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;
        }

        if (jednostka === "procent") {
            if (elements.prowizjaRange) {
                elements.prowizjaRange.max = 25;
                elements.prowizjaRange.min = 0;
                elements.prowizjaRange.step = 0.1;
                elements.prowizjaRange.value = prowizja;
                elements.prowizja.max = 25;
                elements.prowizja.min = 0;
                elements.prowizja.step = 0.1;
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

function updateVariableInputs(wrapper, templateId, ratesArray, iloscRat, type) {
    try {
        const template = document.getElementById(templateId)?.content.cloneNode(true);
        if (!template) return;

        const group = template.querySelector(".variable-input-group");
        const inputs = group.querySelectorAll(".form-control");
        const ranges = group.querySelectorAll(".form-range");
        const removeBtn = group.querySelector(".remove-btn");
        const removeFirstBtn = group.querySelector(".remove-first-btn");

        if (type === "oprocentowanie") {
            inputs[0].max = iloscRat;
            ranges[0].max = iloscRat;
        } else if (type === "nadplata") {
            inputs[0].max = iloscRat;
            ranges[0].max = iloscRat;
            ranges[1].max = parseFloat(elements.kwota.value) || 500000;
        }

        const existingGroups = wrapper.querySelectorAll(".variable-input-group");
        if (existingGroups.length === 0) {
            removeFirstBtn.style.display = "block";
        } else {
            removeBtn.style.display = "block";
        }

        inputs.forEach((input, index) => {
            const range = ranges[index];
            if (input.classList.contains("variable-cykl")) {
                syncInputWithRange(input, range);
            } else if (input.classList.contains("variable-rate")) {
                syncInputWithRange(input, range);
            }

            input.addEventListener("input", () => {
                syncInputWithRange(input, range);
                updateRatesArray(ratesArray, group, type);
            });

            range.addEventListener("input", () => {
                input.value = range.value;
                updateRatesArray(ratesArray, group, type);
            });
        });

        if (type === "nadplata") {
            const typeSelect = group.querySelector(".nadplata-type-select");
            const effectSelect = group.querySelector(".nadplata-effect-select");
            typeSelect?.addEventListener("change", () => updateRatesArray(ratesArray, group, type));
            effectSelect?.addEventListener("change", () => updateRatesArray(ratesArray, group, type));
        }

        removeBtn?.addEventListener("click", () => {
            group.remove();
            updateRatesArray(ratesArray, null, type);
        });

        removeFirstBtn?.addEventListener("click", () => {
            group.remove();
            updateRatesArray(ratesArray, null, type);
        });

        wrapper.appendChild(template);
    } catch (error) {
        console.error("Błąd podczas aktualizacji zmiennych wejść:", error);
    }
}

function updateRatesArray(ratesArray, group, type) {
    try {
        ratesArray.length = 0;
        const groups = (group ? group.parentElement : document.getElementById(`${type === "oprocentowanie" ? "variableOprocentowanie" : "nadplataKredytu"}Wrapper`)).querySelectorAll(".variable-input-group");
        groups.forEach(g => {
            const periodInput = g.querySelector(".variable-cykl");
            const valueInput = g.querySelector(".variable-rate");
            const period = parseInt(periodInput?.value) || 0;
            const value = parseFloat(valueInput?.value) || 0;

            if (period > 0 && value > 0) {
                if (type === "oprocentowanie") {
                    ratesArray.push({ period, value });
                } else if (type === "nadplata") {
                    const typeSelect = g.querySelector(".nadplata-type-select");
                    const effectSelect = g.querySelector(".nadplata-effect-select");
                    ratesArray.push({
                        period,
                        value,
                        type: typeSelect?.value || "Jednorazowa",
                        effect: effectSelect?.value || "Skróć okres",
                    });
                }
            }
        });
    } catch (error) {
        console.error("Błąd podczas aktualizacji tablicy stawek:", error);
    }
}

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
        console.error("Błąd podczas obliczania kredytu:", error);
        return null;
    }
}

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

// Inicjalizacja aplikacji
document.addEventListener("DOMContentLoaded", () => {
    try {
        elements.kwota?.addEventListener("input", () => {
            syncInputWithRange(elements.kwota, elements.kwotaRange, updateKwotaInfo);
        });
        elements.kwotaRange?.addEventListener("input", () => {
            elements.kwota.value = elements.kwotaRange.value;
            updateKwotaInfo();
        });

        elements.iloscRat?.addEventListener("input", () => {
            syncInputWithRange(elements.iloscRat, elements.iloscRatRange, updateLata);
            elements.nadplataKredytuWrapper.querySelectorAll(".variable-cykl").forEach(input => {
                input.max = elements.iloscRat.value;
                input.nextElementSibling.nextElementSibling.max = elements.iloscRat.value;
            });
            elements.variableOprocentowanieWrapper.querySelectorAll(".variable-cykl").forEach(input => {
                input.max = elements.iloscRat.value;
                input.nextElementSibling.nextElementSibling.max = elements.iloscRat.value;
            });
        });
        elements.iloscRatRange?.addEventListener("input", () => {
            elements.iloscRat.value = elements.iloscRatRange.value;
            updateLata();
            elements.nadplataKredytuWrapper.querySelectorAll(".variable-cykl").forEach(input => {
                input.max = elements.iloscRat.value;
                input.nextElementSibling.nextElementSibling.max = elements.iloscRat.value;
            });
            elements.variableOprocentowanieWrapper.querySelectorAll(".variable-cykl").forEach(input => {
                input.max = elements.iloscRat.value;
                input.nextElementSibling.nextElementSibling.max = elements.iloscRat.value;
            });
        });

        elements.oprocentowanie?.addEventListener("input", () => {
            syncInputWithRange(elements.oprocentowanie, elements.oprocentowanieRange);
        });
        elements.oprocentowanieRange?.addEventListener("input", () => {
            elements.oprocentowanie.value = elements.oprocentowanieRange.value;
        });

        elements.prowizja?.addEventListener("input", () => {
            syncInputWithRange(elements.prowizja, elements.prowizjaRange, updateProwizjaInfo);
        });
        elements.prowizjaRange?.addEventListener("input", () => {
            elements.prowizja.value = elements.prowizjaRange.value;
            updateProwizjaInfo();
        });

        elements.jednostkaProwizji?.addEventListener("change", updateProwizjaInfo);

        elements.nadplataKredytuBtn?.addEventListener("change", () => {
            const isChecked = elements.nadplataKredytuBtn.checked;
            elements.nadplataKredytuInputs.classList.toggle("active", isChecked);
            if (isChecked && elements.nadplataKredytuWrapper.children.length === 0) {
                updateVariableInputs(elements.nadplataKredytuWrapper, "nadplataKredytuTemplate", state.overpaymentRates, elements.iloscRat.value, "nadplata");
            }
        });

        elements.addNadplataKredytuBtn?.addEventListener("click", () => {
            updateVariableInputs(elements.nadplataKredytuWrapper, "nadplataKredytuTemplate", state.overpaymentRates, elements.iloscRat.value, "nadplata");
        });

        elements.zmienneOprocentowanieBtn?.addEventListener("change", () => {
            const isChecked = elements.zmienneOprocentowanieBtn.checked;
            elements.variableOprocentowanieInputs.classList.toggle("active", isChecked);
            if (isChecked && elements.variableOprocentowanieWrapper.children.length === 0) {
                updateVariableInputs(elements.variableOprocentowanieWrapper, "variableOprocentowanieTemplate", state.variableRates, elements.iloscRat.value, "oprocentowanie");
            }
        });

        elements.addVariableOprocentowanieBtn?.addEventListener("click", () => {
            updateVariableInputs(elements.variableOprocentowanieWrapper, "variableOprocentowanieTemplate", state.variableRates, elements.iloscRat.value, "oprocentowanie");
        });

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
