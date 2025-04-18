let chart1, chart2;
let harmonogram1Data = [];
let harmonogram2Data = [];
let scale = 1;
const container = document.querySelector(".container");

// Theme Toggle
function toggleTheme() {
    try {
        console.log("Toggling theme");
        const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("theme", newTheme);
        const themeToggleBtn = document.getElementById("themeToggleBtn");
        if (themeToggleBtn) {
            themeToggleBtn.textContent = newTheme === "dark" ? "☀" : "🌙";
            console.log("Theme toggled to:", newTheme);
        } else {
            console.error("Theme toggle button not found");
        }
    } catch (error) {
        console.error("Error in toggleTheme:", error);
    }
}

// Zoom Controls
function zoomIn() {
    try {
        console.log("Zoom in triggered, current scale:", scale);
        if (!container) throw new Error("Container element not found");
        if (scale < 2) {
            scale = Math.min(scale + 0.1, 2);
            container.style.transform = `scale(${scale})`;
            console.log("New scale applied:", scale);
        } else {
            console.log("Max zoom reached:", scale);
        }
    } catch (error) {
        console.error("Error in zoomIn:", error);
    }
}

function zoomOut() {
    try {
        console.log("Zoom out triggered, current scale:", scale);
        if (!container) throw new Error("Container element not found");
        if (scale > 0.5) {
            scale = Math.max(scale - 0.1, 0.5);
            container.style.transform = `scale(${scale})`;
            console.log("New scale applied:", scale);
        } else {
            console.log("Min zoom reached:", scale);
        }
    } catch (error) {
        console.error("Error in zoomOut:", error);
    }
}

// Harmonogram Toggle
function toggleHarmonogram(sectionId, toggleBtnId) {
    try {
        console.log("Toggling harmonogram:", sectionId);
        const content = document.getElementById(sectionId);
        const toggleBtn = document.getElementById(toggleBtnId);
        if (!content || !toggleBtn) throw new Error(`Harmonogram content or toggle button not found: ${sectionId}, ${toggleBtnId}`);
        if (content.style.display === "none") {
            content.style.display = "block";
            toggleBtn.textContent = "Harmonogram spłat ▼";
        } else {
            content.style.display = "none";
            toggleBtn.textContent = "Harmonogram spłat ►";
        }
        console.log("Harmonogram toggled, new display:", content.style.display);
    } catch (error) {
        console.error("Error in toggleHarmonogram:", error);
    }
}

// Show Form
function showForm() {
    try {
        console.log("Showing form");
        const formSection = document.getElementById("formSection");
        const resultSection = document.getElementById("resultSection");
        if (!formSection || !resultSection) throw new Error("Form or result section not found");
        formSection.style.display = "block";
        resultSection.style.display = "none";
        console.log("Form displayed");
    } catch (error) {
        console.error("Error in showForm:", error);
    }
}

// Generate PDF (Placeholder)
function generatePdf() {
    try {
        console.log("Generate PDF triggered");
        alert("Funkcjonalność generowania PDF nie jest jeszcze zaimplementowana.");
    } catch (error) {
        console.error("Error in generatePdf:", error);
    }
}

// Toggle Compare Section
function toggleCompareSection() {
    try {
        console.log("Toggling compare section");
        const compareCheckbox = document.getElementById("porownajKredyt");
        const formSection2 = document.getElementById("formSection2");
        const resultSection2 = document.getElementById("resultSection2");
        const harmonogramSection2 = document.getElementById("harmonogramSection2");
        const formDivider = document.getElementById("formDivider");
        const resultDivider = document.getElementById("resultDivider");
        const harmonogramDivider = document.getElementById("harmonogramDivider");
        if (!compareCheckbox || !formSection2 || !resultSection2 || !harmonogramSection2 || !formDivider || !resultDivider || !harmonogramDivider) {
            throw new Error("Compare section elements not found");
        }
        if (compareCheckbox.checked) {
            formSection2.style.display = "block";
            resultSection2.style.display = "block";
            harmonogramSection2.style.display = "block";
            formDivider.style.display = "block";
            resultDivider.style.display = "block";
            harmonogramDivider.style.display = "none";
        } else {
            formSection2.style.display = "none";
            resultSection2.style.display = "none";
            harmonogramSection2.style.display = "none";
            formDivider.style.display = "none";
            resultDivider.style.display = "none";
            harmonogramDivider.style.display = "none";
            document.getElementById("benefitSummary").style.display = "none";
        }
        console.log("Compare section toggled, checked:", compareCheckbox.checked);
    } catch (error) {
        console.error("Error in toggleCompareSection:", error);
    }
}

// Toggle Nadplata Sections
function toggleNadplataSection() {
    try {
        console.log("Toggling nadplata section 1");
        const nadplataSection = document.getElementById("nadplataSection");
        const nadplataCheckbox = document.getElementById("wlaczNadplate");
        const nadplataInput = document.getElementById("nadplata");
        const nadplataJednorazowaInput = document.getElementById("nadplataJednorazowa");
        const nadplataRange = document.getElementById("nadplataRange");
        const nadplataJednorazowaRange = document.getElementById("nadplataJednorazowaRange");
        if (!nadplataSection || !nadplataCheckbox || !nadplataInput || !nadplataJednorazowaInput || !nadplataRange || !nadplataJednorazowaRange) {
            throw new Error("Nadplata section 1 elements not found");
        }
        nadplataSection.style.display = nadplataCheckbox.checked ? "flex" : "none";
        if (!nadplataCheckbox.checked) {
            nadplataInput.value = 0;
            nadplataJednorazowaInput.value = 0;
            nadplataRange.value = 0;
            nadplataJednorazowaRange.value = 0;
            console.log("Nadplata section 1 reset");
        }
        console.log("Nadplata section 1 toggled, checked:", nadplataCheckbox.checked, "display:", nadplataSection.style.display);
    } catch (error) {
        console.error("Error in toggleNadplataSection:", error);
    }
}

function toggleNadplataSection2() {
    try {
        console.log("Toggling nadplata section 2");
        const nadplataSection = document.getElementById("nadplataSection2");
        const nadplataCheckbox = document.getElementById("wlaczNadplate2");
        const nadplataInput = document.getElementById("nadplata2");
        const nadplataJednorazowaInput = document.getElementById("nadplataJednorazowa2");
        const nadplataRange = document.getElementById("nadplataRange2");
        const nadplataJednorazowaRange = document.getElementById("nadplataJednorazowaRange2");
        if (!nadplataSection || !nadplataCheckbox || !nadplataInput || !nadplataJednorazowaInput || !nadplataRange || !nadplataJednorazowaRange) {
            throw new Error("Nadplata section 2 elements not found");
        }
        nadplataSection.style.display = nadplataCheckbox.checked ? "flex" : "none";
        if (!nadplataCheckbox.checked) {
            nadplataInput.value = 0;
            nadplataJednorazowaInput.value = 0;
            nadplataRange.value = 0;
            nadplataJednorazowaRange.value = 0;
            console.log("Nadplata section 2 reset");
        }
        console.log("Nadplata section 2 toggled, checked:", nadplataCheckbox.checked, "display:", nadplataSection.style.display);
    } catch (error) {
        console.error("Error in toggleNadplataSection2:", error);
    }
}

// Input and Range Synchronization
function syncInputRange(inputId, rangeId, callback) {
    try {
        console.log(`Initializing sync for input: ${inputId}, range: ${rangeId}`);
        const input = document.getElementById(inputId);
        const range = document.getElementById(rangeId);
        if (!input || !range) throw new Error(`Input or range not found: ${inputId}, ${rangeId}`);
        range.addEventListener("input", () => {
            input.value = range.value;
            if (callback) callback();
            console.log(`Range ${rangeId} updated to: ${range.value}`);
        });
        input.addEventListener("input", () => {
            range.value = input.value;
            if (callback) callback();
            console.log(`Input ${inputId} updated to: ${input.value}`);
        });
    } catch (error) {
        console.error("Error in syncInputRange:", error);
    }
}

// Update Functions
function updateLata() {
    try {
        console.log("Updating lata");
        const miesiace = parseInt(document.getElementById("okres").value) || 0;
        const lata = (miesiace / 12).toFixed(0);
        document.getElementById("lata").textContent = `Ilość lat: ${lata}`;
        console.log("Lata updated:", lata);
    } catch (error) {
        console.error("Error in updateLata:", error);
    }
}

function updateProwizja() {
    try {
        console.log("Updating prowizja");
        const kwota = parseFloat(document.getElementById("kwota").value) || 0;
        const prowizja = parseFloat(document.getElementById("prowizja").value) || 0;
        const typ = document.getElementById("prowizjaTyp").value;
        const prowizjaPLN = typ === "procent" ? (kwota * prowizja / 100) : prowizja;
        document.getElementById("prowizjaWartosc").textContent = `Wartość prowizji: ${prowizjaPLN.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł`;
        console.log("Prowizja updated:", prowizjaPLN);
        return prowizjaPLN;
    } catch (error) {
        console.error("Error in updateProwizja:", error);
        return 0;
    }
}

function updateLata2() {
    try {
        console.log("Updating lata2");
        const miesiace = parseInt(document.getElementById("okres2").value) || 0;
        const lata = (miesiace / 12).toFixed(0);
        document.getElementById("lata2").textContent = `Ilość lat: ${lata}`;
        console.log("Lata2 updated:", lata);
    } catch (error) {
        console.error("Error in updateLata2:", error);
    }
}

function updateProwizja2() {
    try {
        console.log("Updating prowizja2");
        const kwota = parseFloat(document.getElementById("kwota2").value) || 0;
        const prowizja = parseFloat(document.getElementById("prowizja2").value) || 0;
        const typ = document.getElementById("prowizjaTyp2").value;
        const prowizjaPLN = typ === "procent" ? (kwota * prowizja / 100) : prowizja;
        document.getElementById("prowizjaWartosc2").textContent = `Wartość prowizji: ${prowizjaPLN.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł`;
        console.log("Prowizja2 updated:", prowizjaPLN);
        return prowizjaPLN;
    } catch (error) {
        console.error("Error in updateProwizja2:", error);
        return 0;
    }
}

// Calculate Credit for Form
function obliczKredytDlaFormularza(formPrefix = "") {
    try {
        console.log(`Calculating credit for form: ${formPrefix || "main"}`);
        let kwota = parseFloat(document.getElementById(`kwota${formPrefix}`).value) || 0;
        let oprocentowanie = parseFloat(document.getElementById(`oprocentowanie${formPrefix}`).value) / 100 / 12 || 0;
        let miesiace = parseInt(document.getElementById(`okres${formPrefix}`).value) || 0;
        let nadplata = parseFloat(document.getElementById(`nadplata${formPrefix}`).value) || 0;
        let nadplataJednorazowa = parseFloat(document.getElementById(`nadplataJednorazowa${formPrefix}`).value) || 0;
        let rodzajRat = document.getElementById(`rodzajRat${formPrefix}`).value || "rowne";
        let efektNadplaty = document.querySelector(`input[name="efektNadplaty${formPrefix}"]:checked`)?.value || "skrocenie";
        let prowizjaPLN = formPrefix === "" ? updateProwizja() : updateProwizja2();

        if (kwota <= 0 || miesiace <= 0 || oprocentowanie <= 0) {
            alert("Proszę wypełnić wszystkie wymagane pola poprawnymi wartościami dla " + (formPrefix === "" ? "Twojego Kredytu" : "Nowego Kredytu") + ".");
            console.log("Invalid input values");
            return null;
        }

        let rata, calkowityKoszt = 0, odsetki = 0, harmonogram = [];
        let pozostalyKapital = kwota;
        let calkowitaNadplata = 0;

        if (nadplataJednorazowa > 0) {
            pozostalyKapital -= nadplataJednorazowa;
            calkowitaNadplata += nadplataJednorazowa;
        }

        if (rodzajRat === "rowne" && oprocentowanie > 0) {
            rata = (pozostalyKapital * oprocentowanie) / (1 - Math.pow(1 + oprocentowanie, -miesiace));
            if (isNaN(rata) || !isFinite(rata)) rata = 0;
            if (nadplata > 0 && efektNadplaty === "obnizenie") {
                rata = ((pozostalyKapital - nadplata * miesiace) * oprocentowanie) / (1 - Math.pow(1 + oprocentowanie, -miesiace));
                if (isNaN(rata) || !isFinite(rata)) rata = 0;
            }
            for (let i = 1; i <= miesiace && pozostalyKapital > 0; i++) {
                let odsetkiMiesiac = pozostalyKapital * oprocentowanie;
                let kapital = rata - odsetkiMiesiac;
                let nadplataMiesiac = 0;
                if (nadplata > 0 && efektNadplaty === "skrocenie") {
                    kapital += nadplata;
                    nadplataMiesiac = nadplata;
                    calkowitaNadplata += nadplata;
                }
                pozostalyKapital -= kapital;
                if (pozostalyKapital < 0) pozostalyKapital = 0;
                calkowityKoszt += rata;
                odsetki += odsetkiMiesiac;
                harmonogram.push({
                    miesiac: i,
                    rata: rata.toFixed(2),
                    nadplata: (nadplataMiesiac + (i === 1 ? nadplataJednorazowa : 0)).toFixed(2),
                    kapital: kapital.toFixed(2),
                    odsetki: odsetkiMiesiac.toFixed(2),
                    pozostaly: pozostalyKapital.toFixed(2)
                });
                if (nadplata > 0 && efektNadplaty === "skrocenie" && pozostalyKapital <= 0) break;
            }
        } else if (rodzajRat === "malejace" && oprocentowanie > 0) {
            let kapitalStaly = pozostalyKapital / miesiace;
            if (nadplata > 0 && efektNadplaty === "obnizenie") {
                kapitalStaly = (pozostalyKapital - nadplata * miesiace) / miesiace;
            }
            for (let i = 1; i <= miesiace && pozostalyKapital > 0; i++) {
                let odsetkiMiesiac = pozostalyKapital * oprocentowanie;
                let kapital = kapitalStaly;
                rata = kapital + odsetkiMiesiac;
                let nadplataMiesiac = 0;
                if (nadplata > 0 && efektNadplaty === "skrocenie") {
                    kapital += nadplata;
                    nadplataMiesiac = nadplata;
                    calkowitaNadplata += nadplata;
                }
                pozostalyKapital -= kapital;
                if (pozostalyKapital < 0) pozostalyKapital = 0;
                calkowityKoszt += rata;
                odsetki += odsetkiMiesiac;
                harmonogram.push({
                    miesiac: i,
                    rata: rata.toFixed(2),
                    nadplata: (nadplataMiesiac + (i === 1 ? nadplataJednorazowa : 0)).toFixed(2),
                    kapital: kapital.toFixed(2),
                    odsetki: odsetkiMiesiac.toFixed(2),
                    pozostaly: pozostalyKapital.toFixed(2)
                });
                if (nadplata > 0 && efektNadplaty === "skrocenie" && pozostalyKapital <= 0) break;
            }
        }

        calkowityKoszt += prowizjaPLN;

        console.log("Credit calculated successfully");
        return {
            kwota,
            odsetki,
            calkowitaNadplata,
            prowizjaPLN,
            calkowityKoszt,
            harmonogram,
            okresPoNadplacie: harmonogram.length || miesiace
        };
    } catch (error) {
        console.error("Error in obliczKredytDlaFormularza:", error);
        return null;
    }
}

// Update Results
function aktualizujWyniki(dane, prefix = "") {
    try {
        if (!dane) throw new Error("No data provided to aktualizujWyniki");
        console.log(`Updating results for prefix: ${prefix || "main"}`);

        const { kwota, odsetki, calkowitaNadplata, prowizjaPLN, calkowityKoszt, harmonogram, okresPoNadplacie } = dane;

        document.getElementById(`valueKapital${prefix}`).textContent = `${kwota.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł`;
        document.querySelector(`.result-wrapper${prefix === "" ? ":nth-child(1)" : "#resultSection2"} .legend-item[data-index="0"] .color-box`).setAttribute('data-tooltip', `Kapitał: ${kwota.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł`);

        document.getElementById(`valueOdsetki${prefix}`).textContent = `${odsetki.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;
        document.querySelector(`.result-wrapper${prefix === "" ? ":nth-child(1)" : "#resultSection2"} .legend-item[data-index="1"] .color-box`).setAttribute('data-tooltip', `Odsetki: ${odsetki.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`);

        document.getElementById(`valueNadplata${prefix}`).textContent = `${calkowitaNadplata.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł`;
        document.querySelector(`.result-wrapper${prefix === "" ? ":nth-child(1)" : "#resultSection2"} .legend-item[data-index="2"] .color-box`).setAttribute('data-tooltip', `Nadpłaty: ${calkowitaNadplata.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł`);

        document.getElementById(`valueProwizja${prefix}`).textContent = `${prowizjaPLN.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł`;
        document.querySelector(`.result-wrapper${prefix === "" ? ":nth-child(1)" : "#resultSection2"} .legend-item[data-index="3"] .color-box`).setAttribute('data-tooltip', `Prowizja: ${prowizjaPLN.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł`);

        document.getElementById(`okresPoNadplacie${prefix}`).textContent = okresPoNadplacie;
        document.querySelector(`.result-wrapper${prefix === "" ? ":nth-child(1)" : "#resultSection2"} .highlight.yellow`).setAttribute('data-hover', `${okresPoNadplacie} miesięcy`);

        document.getElementById(`koszt${prefix}`).textContent = `${calkowityKoszt.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;
        document.querySelector(`.result-wrapper${prefix === "" ? ":nth-child(1)" : "#resultSection2"} .highlight.red`).setAttribute('data-hover', `${calkowityKoszt.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`);

        let chart = prefix === "" ? chart1 : chart2;
        if (chart) {
            chart.destroy();
        }

        const ctx = document.getElementById(`creditChart${prefix}`).getContext("2d");
        chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Kapitał', 'Odsetki', 'Nadpłaty', 'Prowizja'],
                datasets: [{
                    data: [kwota, odsetki, calkowitaNadplata, prowizjaPLN],
                    backgroundColor: ['#28a745', '#007bff', '#dc3545', '#6f42c1'],
                    borderWidth: 1,
                    hoverOffset: 8,
                    hoverBackgroundColor: ['#28a745', '#007bff', '#dc3545', '#6f42c1']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: { size: 10 },
                        bodyFont: { size: 8 }
                    }
                },
                onHover: (event, chartElement) => {
                    event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
                }
            }
        });

        if (prefix === "") {
            chart1 = chart;
        } else {
            chart2 = chart;
        }

        document.querySelectorAll(`.result-wrapper${prefix === "" ? ":nth-child(1)" : "#resultSection2"} .legend-item`).forEach(item => {
            item.addEventListener('mouseenter', function() {
                const index = parseInt(this.getAttribute('data-index'));
                chart.setActiveElements([{ datasetIndex: 0, index: index }]);
                chart.update();
            });
            item.addEventListener('mouseleave', function() {
                chart.setActiveElements([]);
                chart.update();
            });
        });

        let tabela = document.getElementById(`harmonogramTabela${prefix}`);
        tabela.innerHTML = "";
        harmonogram.forEach(wiersz => {
            tabela.innerHTML += `
                <tr>
                    <td>${wiersz.miesiac}</td>
                    <td>${parseFloat(wiersz.rata).toLocaleString('pl-PL', { minimumFractionDigits: 2 })}</td>
                    <td>${parseFloat(wiersz.nadplata).toLocaleString('pl-PL', { minimumFractionDigits: 2 })}</td>
                    <td>${parseFloat(wiersz.kapital).toLocaleString('pl-PL', { minimumFractionDigits: 2 })}</td>
                    <td>${parseFloat(wiersz.odsetki).toLocaleString('pl-PL', { minimumFractionDigits: 2 })}</td>
                    <td>${parseFloat(wiersz.pozostaly).toLocaleString('pl-PL', { minimumFractionDigits: 2 })}</td>
                </tr>
            `;
        });

        console.log("Results updated successfully");
    } catch (error) {
        console.error("Error in aktualizujWyniki:", error);
    }
}

// Calculate Credit
function obliczKredyt() {
    try {
        console.log("Calculating credit");
        const formSection = document.getElementById("formSection");
        const resultSection = document.getElementById("resultSection");
        const benefitSummary = document.getElementById("benefitSummary");
        if (!formSection || !resultSection || !benefitSummary) throw new Error("Form, result, or benefit section not found");

        const daneKredyt1 = obliczKredytDlaFormularza();
        if (!daneKredyt1) return;

        formSection.style.display = "none";
        resultSection.style.display = "block";
        harmonogram1Data = daneKredyt1.harmonogram;
        aktualizujWyniki(daneKredyt1);

        if (document.getElementById("porownajKredyt").checked) {
            const daneKredyt2 = obliczKredytDlaFormularza("2");
            if (!daneKredyt2) return;

            harmonogram2Data = daneKredyt2.harmonogram;
            aktualizujWyniki(daneKredyt2, "2");

            const kosztRoznica = daneKredyt1.calkowityKoszt - daneKredyt2.calkowityKoszt;
            const okresRoznica = daneKredyt1.okresPoNadplacie - daneKredyt2.okresPoNadplacie;
            const procentRoznica = ((daneKredyt1.calkowityKoszt - daneKredyt2.calkowityKoszt) / daneKredyt1.calkowityKoszt * 100).toFixed(2);

            document.getElementById("benefitCostValue").textContent = `${kosztRoznica.toLocaleString('pl-PL', { minimumFractionDigits: 2 })}`;
            document.getElementById("benefitPeriodValue").textContent = `${okresRoznica}`;
            document.getElementById("benefitPercentageValue").textContent = `${procentRoznica}`;
            benefitSummary.style.display = "block";
        } else {
            benefitSummary.style.display = "none";
        }

        console.log("Credit calculation completed");
    } catch (error) {
        console.error("Error in obliczKredyt:", error);
    }
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
    try {
        console.log("Initializing application");

        // Load theme
        const savedTheme = localStorage.getItem("theme") || "light";
        document.documentElement.setAttribute("data-theme", savedTheme);
        document.getElementById("themeToggleBtn").textContent = savedTheme === "dark" ? "☀" : "🌙";

        // Event Listeners
        document.getElementById("themeToggleBtn")?.addEventListener("click", toggleTheme);
        document.getElementById("zoomInBtn")?.addEventListener("click", zoomIn);
        document.getElementById("zoomOutBtn")?.addEventListener("click", zoomOut);
        document.getElementById("toggleHarmonogram1")?.addEventListener("click", () => toggleHarmonogram("harmonogramContent", "toggleHarmonogram1"));
        document.getElementById("toggleHarmonogram2")?.addEventListener("click", () => toggleHarmonogram("harmonogramContent2", "toggleHarmonogram2"));
        document.getElementById("returnToFormBtn")?.addEventListener("click", showForm);
        document.getElementById("generatePdfBtn")?.addEventListener("click", generatePdf);
        document.getElementById("obliczBtn")?.addEventListener("click", obliczKredyt);
        document.getElementById("porownajKredyt")?.addEventListener("change", toggleCompareSection);
        document.getElementById("wlaczNadplate")?.addEventListener("change", toggleNadplataSection);
        document.getElementById("wlaczNadplate2")?.addEventListener("change", toggleNadplataSection2);

        // Sync Inputs and Ranges
        syncInputRange("kwota", "kwotaRange", updateProwizja);
        syncInputRange("okres", "okresRange", updateLata);
        syncInputRange("oprocentowanie", "oprocentowanieRange");
        syncInputRange("prowizja", "prowizjaRange", updateProwizja);
        syncInputRange("nadplata", "nadplataRange");
        syncInputRange("nadplataJednorazowa", "nadplataJednorazowaRange");
        syncInputRange("kwota2", "kwotaRange2", updateProwizja2);
        syncInputRange("okres2", "okresRange2", updateLata2);
        syncInputRange("oprocentowanie2", "oprocentowanieRange2");
        syncInputRange("prowizja2", "prowizjaRange2", updateProwizja2);
        syncInputRange("nadplata2", "nadplataRange2");
        syncInputRange("nadplataJednorazowa2", "nadplataJednorazowaRange2");

        document.getElementById("prowizjaTyp")?.addEventListener("change", updateProwizja);
        document.getElementById("prowizjaTyp2")?.addEventListener("change", updateProwizja2);

        // Initialize values
        updateLata();
        updateProwizja();
        updateLata2();
        updateProwizja2();

        // Logo redirect on hover
        const logoLink = document.getElementById("logoLink");
        if (logoLink) {
            logoLink.addEventListener("mouseenter", () => {
                console.log("Logo mouseenter, redirecting...");
                window.location.href = "https://finance-brothers.pl";
            });
            logoLink.addEventListener("click", (e) => {
                e.preventDefault();
                console.log("Logo click prevented");
            });
        } else {
            console.error("Logo link not found");
        }

        console.log("Application initialized successfully");
    } catch (error) {
        console.error("Error in initialization:", error);
    }
});
