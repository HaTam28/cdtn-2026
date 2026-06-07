export function formatDateForDisplay(value) {
    if (!value) return "";
    const raw = String(value).trim();
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    const display = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (display) return raw;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export function normalizeDateDisplayInput(value) {
    const raw = String(value || "").trim();
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function parseDisplayDateToIso(value) {
    const raw = String(value || "").trim();
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return raw;

    const display = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!display) return "";
    const [, dd, mm, yyyy] = display;
    const day = Number(dd);
    const month = Number(mm);
    const year = Number(yyyy);
    const d = new Date(year, month - 1, day);
    if (
        d.getFullYear() !== year
        || d.getMonth() !== month - 1
        || d.getDate() !== day
    ) {
        return "";
    }
    return `${yyyy}-${mm}-${dd}`;
}
