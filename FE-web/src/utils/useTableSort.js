import { useState, useMemo } from "react";

/**
 * Custom hook for sorting table data client-side.
 * 
 * @param {Array} initialData - The raw array of data to sort
 * @param {Object} config - Configuration options
 * @param {Object} config.extractors - Map of field name to custom extractor function e.g. { total: (row) => ... }
 * @param {string} config.defaultField - The default field to sort by
 * @param {string} config.defaultDirection - The default direction ('asc' | 'desc')
 * @param {string} config.defaultType - The default sort type ('string' | 'number' | 'date')
 */
export function useTableSort(initialData, config = {}) {
    const [sortConfig, setSortConfig] = useState({
        field: config.defaultField || null,
        direction: config.defaultDirection || null,
        type: config.defaultType || "string",
    });

    const handleSort = (field, direction, type = "string") => {
        setSortConfig({ field, direction, type });
    };

    const sortedData = useMemo(() => {
        if (!sortConfig.field || !sortConfig.direction) {
            return initialData;
        }

        const dataToSort = [...initialData];
        const { field, direction, type } = sortConfig;
        const extractor = config.extractors?.[field];

        dataToSort.sort((a, b) => {
            let valA = extractor ? extractor(a) : a[field];
            let valB = extractor ? extractor(b) : b[field];

            if (valA === undefined || valA === null) valA = "";
            if (valB === undefined || valB === null) valB = "";

            if (type === "number") {
                const numA = Number(valA) || 0;
                const numB = Number(valB) || 0;
                return direction === "asc" ? numA - numB : numB - numA;
            }

            if (type === "date") {
                const timeA = valA ? new Date(valA).getTime() : 0;
                const timeB = valB ? new Date(valB).getTime() : 0;
                return direction === "asc" ? timeA - timeB : timeB - timeA;
            }

            // Default: string alphabetical comparison
            const strA = String(valA).trim().toLowerCase();
            const strB = String(valB).trim().toLowerCase();
            return direction === "asc"
                ? strA.localeCompare(strB, "vi", { numeric: true })
                : strB.localeCompare(strA, "vi", { numeric: true });
        });

        return dataToSort;
    }, [initialData, sortConfig, config.extractors]);

    return {
        sortedData,
        sortConfig,
        handleSort,
    };
}
