import type { ComponentType } from "react";
import { Home, FileText, Mail, Users } from "@/components/ui/icons";

type Icon = ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;

export type MenuLink = { label: string; href: string };
export type MenuSection = { heading: string; links: MenuLink[] };

export type SimpleNavItem = { kind: "link"; label: string; href: string; icon: Icon };
export type MenuNavItem = {
  kind: "menu";
  label: string;
  href: string; // where clicking the label itself (not a sub-item) goes
  icon: Icon;
  activePrefix: string;
  sections: MenuSection[];
};

export const NAV_ITEMS: (SimpleNavItem | MenuNavItem)[] = [
  { kind: "link", label: "Home", href: "/home", icon: Home },
  {
    kind: "menu",
    label: "Documents",
    href: "/documents",
    icon: FileText,
    activePrefix: "/documents",
    sections: [
      {
        heading: "Search",
        links: [
          { label: "Document Register", href: "/documents" },
          { label: "Drawings", href: "/documents/drawings" },
          { label: "Temporary Files", href: "/documents/temporary-files" },
        ],
      },
      {
        heading: "Actions",
        links: [
          { label: "Extract PDF", href: "/documents/extract-pdf" },
          { label: "Split a PDF", href: "/documents/split-pdf" },
        ],
      },
    ],
  },
  {
    kind: "menu",
    label: "Mail",
    href: "/mail",
    icon: Mail,
    activePrefix: "/mail",
    sections: [
      {
        heading: "Search",
        links: [
          { label: "All", href: "/mail?tab=all" },
          { label: "Inbox", href: "/mail?tab=inbox" },
          { label: "Sent", href: "/mail?tab=sent" },
          { label: "Drafts", href: "/mail?tab=drafts" },
        ],
      },
      {
        heading: "Create New",
        links: [
          { label: "Letter", href: "/mail/new?type=Letter" },
          { label: "Blank Mail", href: "/mail/new" },
        ],
      },
      {
        heading: "Actions",
        links: [
          { label: "Register Incoming Mail", href: "/mail/register-incoming" },
          { label: "Mail Approvals", href: "/mail/approvals" },
        ],
      },
    ],
  },
  { kind: "link", label: "Directory", href: "/directory", icon: Users },
];
