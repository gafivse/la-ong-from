"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";

export default function ProfileMenu({ user, busy, onLogout }) {
  const [open, setOpen] = useState(false);
  const container = useRef(null);
  const trigger = useRef(null);
  const logout = useRef(null);
  useEffect(() => {
    if (!open) return;
    logout.current?.focus();
    function closeOutside(event) {
      if (!container.current?.contains(event.target)) setOpen(false);
    }
    function closeOnKey(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus();
      }
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        logout.current?.focus();
      }
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnKey);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnKey);
    };
  }, [open]);
  return (
    <div
      className="profile-menu"
      ref={container}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        className="profile-trigger"
        aria-label="โปรไฟล์"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="profile-dropdown"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="avatar" aria-hidden="true">
          {user.name?.slice(0, 1) || "F"}
        </span>
        <span className="profile-trigger-name">{user.name || "โปรไฟล์"}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <div
          id="profile-dropdown"
          className="profile-dropdown"
          role="menu"
          aria-label="เมนูโปรไฟล์"
        >
          <div className="profile-details" role="presentation">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
            <small>{user.role}</small>
          </div>
          <button
            role="menuitem"
            ref={logout}
            className="profile-logout"
            onClick={onLogout}
            disabled={busy}
          >
            <LogOut size={17} />
            <span>{busy ? "กำลังดำเนินการ…" : "ออกจากระบบ"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
