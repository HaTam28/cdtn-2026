import React, { useEffect, useMemo, useState } from "react";
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

    const firestore = useMemo(() => getFirestoreDb(), []);

    const user = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "{}");
        } catch {
            return {};
        }
    }, []);

    const displayName = (user.fullname || user.username || "U").trim();
    const initial = displayName ? displayName.charAt(0).toUpperCase() : "U";

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
        if (note.targetUrl) return note.targetUrl;
        if (note.targetType === "GOODS_RECEIPT") return `/receipts/${note.targetId}`;
        if (note.targetType === "GOODS_ISSUE") return `/issues/${note.targetId}`;
        if (note.targetType === "INVENTORY_AUDIT") {
            if (user?.role === "STAFF") return `/audits/requests?id=${note.targetId}`;
            return `/audits/${note.targetId}`;
        }
        return "/overview";
    };

    const toggleNotifications = async () => {
        const next = !open;
        setOpen(next);
        if (!next) return;
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
                        {loading && <div className="sp-notif-empty">Đang tải...</div>}
                        {!loading && notifications.length === 0 && (
                            <div className="sp-notif-empty">Chưa có thông báo.</div>
                        )}
                        {!loading && notifications.map((note) => (
                            <button
                                key={note.id}
                                className={`sp-notif-item${note.isRead ? "" : " sp-notif-unread"}`}
                                onClick={() => handleOpenNotification(note)}
                            >
                                <div className="sp-notif-title">{note.title || "Thông báo"}</div>
                                <div className="sp-notif-msg">{note.message || ""}</div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <button className="sp-avatar sp-avatar-btn" onClick={handleAccountClick}>
                <span className="sp-avatar-text">{initial}</span>
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
