"use client";

import { Dropdown } from "@/components/ui/dropdown";
import { Bell } from "@/components/ui/icons";

/**
 * There is no notification-producing system yet (no background jobs, no
 * push events) — this intentionally always shows an honest empty state
 * rather than fabricating unread counts or sample notifications.
 */
export function NotificationMenu() {
  return (
    <Dropdown
      align="right"
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-label="Notifications"
          className="flex h-8 w-8 items-center justify-center rounded-[3px] text-text-secondary hover:bg-brand-50 hover:text-text-primary"
        >
          <Bell size={16} />
        </button>
      )}
    >
      {() => (
        <div className="w-64 px-3 py-4 text-center text-xs text-text-secondary">
          No notifications.
        </div>
      )}
    </Dropdown>
  );
}
