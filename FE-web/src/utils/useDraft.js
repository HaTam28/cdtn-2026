import { useState, useCallback } from "react";

/**
 * useDraft – hook quản lý nháp local qua localStorage.
 *
 * @param {string} draftKey - Key duy nhất cho từng loại phiếu.
 *   Ví dụ: "draft_receipt_create", "draft_issue_create", "draft_audit_create"
 *
 * @returns {{
 *   hasDraft: boolean,
 *   draftSavedAt: Date|null,
 *   saveDraft: (data: Object) => void,
 *   loadDraft: () => Object|null,
 *   clearDraft: () => void,
 * }}
 */
export function useDraft(draftKey) {
    const META_KEY = `${draftKey}__meta`;

    const readMeta = useCallback(() => {
        try {
            const raw = localStorage.getItem(META_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }, [META_KEY]);

    const [hasDraft, setHasDraft] = useState(() => {
        try {
            const data = localStorage.getItem(draftKey);
            return !!data;
        } catch {
            return false;
        }
    });

    const [draftSavedAt, setDraftSavedAt] = useState(() => {
        try {
            const meta = readMeta();
            return meta?.savedAt ? new Date(meta.savedAt) : null;
        } catch {
            return null;
        }
    });

    const saveDraft = useCallback((data) => {
        try {
            localStorage.setItem(draftKey, JSON.stringify(data));
            const now = new Date();
            localStorage.setItem(META_KEY, JSON.stringify({ savedAt: now.toISOString() }));
            setHasDraft(true);
            setDraftSavedAt(now);
        } catch (e) {
            console.warn("[useDraft] Không thể lưu nháp:", e);
        }
    }, [draftKey, META_KEY]);

    const loadDraft = useCallback(() => {
        try {
            const raw = localStorage.getItem(draftKey);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }, [draftKey]);

    const clearDraft = useCallback(() => {
        try {
            localStorage.removeItem(draftKey);
            localStorage.removeItem(META_KEY);
            setHasDraft(false);
            setDraftSavedAt(null);
        } catch (e) {
            console.warn("[useDraft] Không thể xóa nháp:", e);
        }
    }, [draftKey, META_KEY]);

    return { hasDraft, draftSavedAt, saveDraft, loadDraft, clearDraft };
}

/**
 * formatDraftTime – hiển thị thời điểm lưu nháp dạng "dd/MM/yyyy HH:mm".
 */
export function formatDraftTime(date) {
    if (!date) return "";
    const d = new Date(date);
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
