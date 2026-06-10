import React, { useEffect, useMemo, useState } from "react";
// avatar will display user's initial; no logo import needed
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { getNotifications, getUnreadCount, markRead, markReadAll } from "../api/notificationApi";
import { getFirestoreDb } from "../firebase/firebaseClient";

class TopbarRightBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error) {
        console.error("TopbarRight error:", error);
    }

    render() {
        if (this.state.hasError) return null;
        return this.props.children;
    }
}

function TopbarRightContent() {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [realtimeEnabled, setRealtimeEnabled] = useState(true);
    const [visibleCount, setVisibleCount] = useState(10);
    const [search, setSearch] = useState("");

    const firestore = useMemo(() => getFirestoreDb(), []);

    const user = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "{}");
        } catch {
            return {};
        }
    }, []);

    const displayName = (user.fullname || user.username || "User").trim();
    const initial = displayName ? displayName.charAt(0).toUpperCase() : "U";

    useEffect(() => {
        // Keep the site title stable (CDTN) instead of overwriting with user name
        try { document.title = 'CDTN'; } catch { /* ignore */ }
    }, [displayName]);

    useEffect(() => {
        if (!firestore || !user?.id || !realtimeEnabled) return;
        let unsubscribe = null;
        try {
            const ref = collection(firestore, "users", String(user.id), "notifications");
            const q = query(ref, orderBy("createdAt", "desc"));
            unsubscribe = onSnapshot(
                q,
                (snapshot) => {
                    const list = snapshot.docs.map((doc) => {
                        const data = doc.data() || {};
                        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt || null;
                        return {
                            id: data.id ?? (Number(doc.id) || doc.id),
                            ...data,
                            createdAt,
                        };
                    });
                    setNotifications(list);
                    setUnreadCount(list.filter((n) => !n.isRead).length);
                },
                () => {
                    setNotifications([]);
                    setUnreadCount(0);
                    setRealtimeEnabled(false);
                    setLoading(false);
                }
            );
        } catch {
            setRealtimeEnabled(false);
        }
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [firestore, user?.id, realtimeEnabled]);

    useEffect(() => {
        if (firestore && realtimeEnabled) return;
        let cancelled = false;
        const loadUnread = async () => {
            try {
                const count = await getUnreadCount();
                if (!cancelled) setUnreadCount(Number(count) || 0);
            } catch {
                if (!cancelled) setUnreadCount(0);
            }
        };
        loadUnread();
        return () => { cancelled = true; };
    }, [firestore, realtimeEnabled]);

    const buildTargetUrl = (note) => {
        if (!note) return "/overview";
        const t = String(note.targetType || "").toUpperCase();
        const id = note.targetId ?? (note.target && note.target.id) ?? (note.targetUrl ? note.targetUrl.split("/").pop() : null);
        if (t.includes("AUDIT") || (note.targetUrl && note.targetUrl.startsWith("/audits/"))) {
            if (user?.role === "STAFF" || user?.role === "NV") {
                return `/audits/requests?id=${id}`;
            }
        }
        if (note.targetUrl) return note.targetUrl;
        if (t.includes("GOODS_RECEIPT")) return `/receipts/${id}`;
        if (t.includes("GOODS_ISSUE")) return `/issues/${id}`;
        if (t.includes("AUDIT")) {
            return `/audits/${id}`;
        }
        return "/overview";
    };

    const toggleNotifications = async () => {
        const next = !open;
        setOpen(next);
        if (!next) return;
        setVisibleCount(10);
        setSearch("");
        if (!firestore || !realtimeEnabled) {
            setLoading(true);
            try {
                const list = await getNotifications();
                setNotifications(list);
            } catch {
                setNotifications([]);
            } finally {
                setLoading(false);
            }
        }

        if (unreadCount > 0) {
            try {
                await markReadAll();
                setUnreadCount(0);
                setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
            } catch { /* ignore */ }
        }
    };

    const handleOpenNotification = async (note) => {
        if (!note) return;
        if (!note.isRead) {
            try {
                await markRead(note.id);
                setUnreadCount((prev) => Math.max(0, prev - 1));
                setNotifications((prev) => prev.map((n) => (n.id === note.id ? { ...n, isRead: true } : n)));
            } catch { /* ignore */ }
        }
        setOpen(false);
        navigate(buildTargetUrl(note));
    };

    const handleAccountClick = () => {
        navigate("/account");
    };

    const formatDateLabel = (date) => {
        if (!date) return "Không rõ ngày";
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d)) return "Không rõ ngày";
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const isSameDay = (a, b) =>
            a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate();
        if (isSameDay(d, today)) return "Hôm nay";
        if (isSameDay(d, yesterday)) return "Hôm qua";
        return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    };

    const filteredNotifications = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return notifications;
        return notifications.filter(
            (n) =>
                (n.title || "").toLowerCase().includes(q) ||
                (n.message || "").toLowerCase().includes(q)
        );
    }, [notifications, search]);

    const groupedNotifications = useMemo(() => {
        const visible = filteredNotifications.slice(0, visibleCount);
        const groups = [];
        let lastLabel = null;
        for (const note of visible) {
            const label = formatDateLabel(note.createdAt);
            if (label !== lastLabel) {
                groups.push({ type: "date", label });
                lastLabel = label;
            }
            groups.push({ type: "note", note });
        }
        return groups;
    }, [filteredNotifications, visibleCount]);

    return (
        <div className="sp-topbar-right">
            <div className="sp-notif-wrap">
                <button className="sp-icon-btn" onClick={toggleNotifications}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4c6152" strokeWidth="2" strokeLinecap="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    {unreadCount > 0 && (
                        <span className="sp-notif-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
                    )}
                </button>
                {open && (
                    <div className="sp-notif-panel">
                        <div className="sp-notif-head">Thông báo</div>
                        <div className="sp-notif-search-wrap">
                            <input
                                className="sp-notif-search"
                                type="text"
                                placeholder="Tìm kiếm thông báo..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setVisibleCount(10); }}
                            />
                        </div>
                        {loading && <div className="sp-notif-empty">Đang tải...</div>}
                        {!loading && filteredNotifications.length === 0 && (
                            <div className="sp-notif-empty">
                                {search ? "Không tìm thấy thông báo." : "Chưa có thông báo."}
                            </div>
                        )}
                        {!loading && groupedNotifications.map((item, idx) =>
                            item.type === "date" ? (
                                <div key={`date-${idx}`} className="sp-notif-date-label">{item.label}</div>
                            ) : (
                                <button
                                    key={item.note.id}
                                    className={`sp-notif-item${item.note.isRead ? "" : " sp-notif-unread"}`}
                                    onClick={() => handleOpenNotification(item.note)}
                                >
                                    <div className="sp-notif-title">{item.note.title || "Thông báo"}</div>
                                    <div className="sp-notif-msg">{item.note.message || ""}</div>
                                </button>
                            )
                        )}
                        {!loading && filteredNotifications.length > visibleCount && (
                            <button
                                className="sp-notif-load-more"
                                onClick={() => setVisibleCount((v) => v + 10)}
                            >
                                Xem thêm ({filteredNotifications.length - visibleCount} thông báo)
                            </button>
                        )}
                    </div>
                )}
            </div>
            <button
                className="sp-avatar sp-avatar-btn"
                onClick={handleAccountClick}
                title={user.fullname || user.username || "Account"}
                aria-label="Account"
                style={{ padding: 0, border: "none", background: "transparent" }}
            >
                <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#1E854A",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 14,
                    userSelect: "none"
                }}>{initial}</div>
            </button>
        </div>
    );
}

export default function TopbarRight() {
    return (
        <TopbarRightBoundary>
            <TopbarRightContent />
        </TopbarRightBoundary>
    );
}
