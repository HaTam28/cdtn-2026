import React from "react";

/**
 * Reusable table header sorting component.
 * Displays column title with clickable upward/downward triangles.
 * 
 * @param {string} title - The display text of the column header
 * @param {string} field - The field key used to sort the data
 * @param {string} type - The data type: 'string' | 'number' | 'date'
 * @param {Object} sortConfig - The active sort config from useTableSort hook { field, direction, type }
 * @param {Function} onSort - The sort handler function from useTableSort hook
 * @param {Object} style - Optional styles overrides
 */
export default function SortableHeader({
    title,
    field,
    type = "string",
    sortConfig,
    onSort,
    style = {},
}) {
    const isAscActive = sortConfig?.field === field && sortConfig?.direction === "asc";
    const isDescActive = sortConfig?.field === field && sortConfig?.direction === "desc";

    return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", userSelect: "none", ...style }}>
            <span>{title}</span>
            <span style={{ display: "inline-flex", flexDirection: "column", justifyContent: "center", alignItems: "center", lineHeight: 1 }}>
                <svg
                    width="10"
                    height="8"
                    viewBox="0 0 10 8"
                    style={{
                        cursor: "pointer",
                        opacity: isAscActive ? 1 : 0.35,
                        color: isAscActive ? "#1E854A" : "currentColor",
                        transform: "translateY(1px)",
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onSort(field, "asc", type);
                    }}
                >
                    <path d="M5 0L10 8H0L5 0Z" fill="currentColor" />
                </svg>
                <svg
                    width="10"
                    height="8"
                    viewBox="0 0 10 8"
                    style={{
                        cursor: "pointer",
                        opacity: isDescActive ? 1 : 0.35,
                        color: isDescActive ? "#1E854A" : "currentColor",
                        transform: "translateY(-1px)",
                        marginTop: "2px",
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onSort(field, "desc", type);
                    }}
                >
                    <path d="M5 8L10 0H0L5 8Z" fill="currentColor" />
                </svg>
            </span>
        </span>
    );
}
