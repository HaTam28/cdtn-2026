import React from "react";
import { formatDraftTime } from "../utils/useDraft";

/**
 * DraftBanner – Banner thông báo có nháp local, cho phép người dùng:
 *  - Tiếp tục nháp (restore)
 *  - Xóa nháp (clear)
 *  - Tạo mới từ đầu (dismiss)
 *
 * @param {{
 *   draftSavedAt: Date|null,
 *   onResume: () => void,
 *   onDelete: () => void,
 *   onDismiss: () => void,
 * }} props
 */
export default function DraftBanner({ draftSavedAt, onResume, onDelete, onDismiss }) {
    return (
        <div className="draft-banner" role="alert">
            <div className="draft-banner-left">
                <span className="draft-banner-icon" aria-hidden="true">
                    {/* Clock icon */}
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                </span>
                <div className="draft-banner-text">
                    <span className="draft-banner-title">Bạn có nháp chưa hoàn tất</span>
                    {draftSavedAt && (
                        <span className="draft-banner-sub">
                            Lưu lần cuối: {formatDraftTime(draftSavedAt)}
                        </span>
                    )}
                </div>
            </div>
            <div className="draft-banner-actions">
                <button
                    id="draft-btn-resume"
                    type="button"
                    className="draft-btn-resume"
                    onClick={onResume}
                >
                    Tiếp tục nháp
                </button>
                <button
                    id="draft-btn-delete"
                    type="button"
                    className="draft-btn-delete"
                    onClick={onDelete}
                >
                    Xóa nháp
                </button>
                <button
                    id="draft-btn-dismiss"
                    type="button"
                    className="draft-btn-dismiss"
                    onClick={onDismiss}
                    title="Tạo mới từ đầu, không dùng nháp"
                >
                    Tạo mới từ đầu
                </button>
            </div>
        </div>
    );
}
