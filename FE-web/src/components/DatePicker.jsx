import React, { useState, useEffect, useRef } from "react";
import "./DatePicker.css";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

function parseDate(str) {
    if (!str) return null;
    // yyyy-MM-dd or yyyy-MM-ddTHH:mm:ss
    const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return null;
}

function formatISO(d) {
    if (!d) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T00:00:00`;
}

function formatDisplay(d) {
    if (!d) return "";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${d.getFullYear()}`;
}

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
}

export default function DatePicker({ value, onChange, disabled, placeholder = "dd/mm/yyyy" }) {
    const [open, setOpen] = useState(false);
    const [popupStyle, setPopupStyle] = useState({});
    const selected = parseDate(value);
    const today = new Date();

    const [viewYear, setViewYear] = useState((selected || today).getFullYear());
    const [viewMonth, setViewMonth] = useState((selected || today).getMonth());
    const [tempDate, setTempDate] = useState(selected);

    const ref = useRef(null);

    useEffect(() => {
        function handleClick(e) {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    useEffect(() => {
        if (open) {
            const d = parseDate(value) || today;
            setViewYear(d.getFullYear());
            setViewMonth(d.getMonth());
            setTempDate(parseDate(value));
            // Calculate fixed position based on input element
            if (ref.current) {
                const rect = ref.current.getBoundingClientRect();
                const spaceBelow = window.innerHeight - rect.bottom;
                const popupHeight = 320;
                if (spaceBelow >= popupHeight) {
                    setPopupStyle({ top: rect.bottom + 6, left: rect.left });
                } else {
                    setPopupStyle({ top: rect.top - popupHeight - 6, left: rect.left });
                }
            }
        }
    }, [open]);

    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const isSelected = (d) =>
        tempDate &&
        tempDate.getFullYear() === viewYear &&
        tempDate.getMonth() === viewMonth &&
        tempDate.getDate() === d;

    const isToday = (d) =>
        today.getFullYear() === viewYear &&
        today.getMonth() === viewMonth &&
        today.getDate() === d;

    const handleApply = () => {
        onChange(tempDate ? formatISO(tempDate) : "");
        setOpen(false);
    };

    const handleToday = () => {
        const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        setTempDate(t);
        setViewYear(t.getFullYear());
        setViewMonth(t.getMonth());
    };

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
        else setViewMonth((m) => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
        else setViewMonth((m) => m + 1);
    };
    const prevYear = () => setViewYear((y) => y - 1);
    const nextYear = () => setViewYear((y) => y + 1);

    return (
        <div className="dp-wrap" ref={ref}>
            <div className={`dp-input-row${disabled ? " dp-disabled" : ""}`} onClick={() => !disabled && setOpen((v) => !v)}>
                <span className={`dp-display${!selected ? " dp-placeholder" : ""}`}>
                    {selected ? formatDisplay(selected) : placeholder}
                </span>
                <span className="dp-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                </span>
            </div>

            {open && (
                <div className="dp-popup" style={{ position: "fixed", ...popupStyle }}>
                    <div className="dp-header">
                        <div className="dp-header-group">
                            <button className="dp-nav-btn" onClick={prevMonth}>‹</button>
                            <span className="dp-header-label">
                                Month &nbsp;<span className="dp-hval">{MONTHS[viewMonth]}</span>
                            </span>
                            <button className="dp-nav-btn" onClick={nextMonth}>›</button>
                        </div>
                        <div className="dp-header-group">
                            <button className="dp-nav-btn" onClick={prevYear}>‹</button>
                            <span className="dp-header-label">
                                Year &nbsp;<span className="dp-hval">{viewYear}</span>
                            </span>
                            <button className="dp-nav-btn" onClick={nextYear}>›</button>
                        </div>
                    </div>

                    <div className="dp-grid">
                        {DAYS.map((d) => (
                            <div key={d} className="dp-day-hd">{d}</div>
                        ))}
                        {cells.map((d, i) => (
                            <div
                                key={i}
                                className={`dp-cell${d === null ? " dp-empty" : ""}${d && isSelected(d) ? " dp-selected" : ""}${d && isToday(d) && !isSelected(d) ? " dp-today" : ""}`}
                                onClick={() => d && setTempDate(new Date(viewYear, viewMonth, d))}
                            >
                                {d}
                            </div>
                        ))}
                    </div>

                    <div className="dp-footer">
                        <button className="dp-footer-btn dp-today-btn" onClick={handleToday}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
                                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            Today
                        </button>
                        <div className="dp-footer-right">
                            <button className="dp-footer-btn dp-cancel-btn" onClick={() => setOpen(false)}>Cancel</button>
                            <button className="dp-footer-btn dp-apply-btn" onClick={handleApply}>Apply</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
