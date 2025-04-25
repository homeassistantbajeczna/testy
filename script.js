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
        let parsedValue = isDecimal ? parseFloat(value) : parseInt(value);
        if (isNaN(parsedValue)) parsedValue = min;

        // Stosujemy ograniczenie minimalne TYLKO, jeśli wartość jest mniejsza niż min
        if (parsedValue < min) {
            parsedValue = min;
        }
        // Nadal stosujemy ograniczenie maksymalne
        if (parsedValue > max) {
            parsedValue = max;
        }

        // Dla nadpłaty stosujemy dodatkową walidację minimalnej wartości 100, ale tylko jeśli wartość jest mniejsza
        if (applyMinValidation && input.classList.contains("variable-rate") && activeType === "nadplata" && parsedValue < 100) {
            parsedValue = 100;
        }

        if (input.id === "oprocentowanie" || (activeType === "oprocentowanie" && input.classList.contains("variable-rate"))) {
            input.value = parsedValue.toFixed(2);
        } else {
            input.value = isDecimal ? parsedValue.toFixed(step === 1 ? 0 : 1) : parsedValue;
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
    const step = parseFloat(input.step) || 1;
    let initialValue = isDecimal ? parseFloat(range.value) : parseInt(range.value);
    if (isNaN(initialValue)) initialValue = min;

    // Stosujemy ograniczenie minimalne TYLKO, jeśli wartość początkowa jest mniejsza niż min
    if (initialValue < min) {
        initialValue = min;
    }
    if (initialValue > max) {
        initialValue = max;
    }

    if (activeType === "nadplata" && input.classList.contains("variable-rate") && initialValue < 100) {
        initialValue = 100;
    }

    if (input.id === "oprocentowanie" || (activeType === "oprocentowanie" && input.classList.contains("variable-rate"))) {
        input.value = initialValue.toFixed(2);
    } else {
        input.value = isDecimal ? initialValue.toFixed(step === 1 ? 0 : 1) : initialValue;
    }
    range.value = initialValue;
    console.log(`Initial sync: ${input.id || range.className} = ${initialValue}`);
}
