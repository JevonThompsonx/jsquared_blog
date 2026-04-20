import type { Route } from "next";

export type AdminNavLink = {
  href: Route;
  label: string;
  description: string;
};

export const adminDashboardHref: Route = "/admin";

export const adminNavLinks: AdminNavLink[] = [
  {
    href: adminDashboardHref,
    label: "Dashboard",
    description: "Review post status, publishing queues, and editorial priorities.",
  },
  {
    href: "/admin/posts/new",
    label: "New post",
    description: "Start a new draft without digging through the dashboard controls.",
  },
  {
    href: "/admin/wishlist",
    label: "Travel wishlist",
    description: "Manage the destinations that power the public wishlist experiences.",
  },
  {
    href: "/admin/tags",
    label: "Manage tags",
    description: "Update tag descriptions and keep taxonomy tidy.",
  },
  {
    href: "/admin/seasons",
    label: "Season names",
    description: "Override auto-generated season labels shown on the homepage feed.",
  },
];
