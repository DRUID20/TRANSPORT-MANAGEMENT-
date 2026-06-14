/**
 * Single source of truth for the primary navigation. Imported by both
 * the desktop sidebar and the mobile drawer so the two views never drift.
 *
 * Group ordering matters — items appear in this order in the chrome.
 */
import {
  LayoutDashboard,
  Truck,
  Route,
  Receipt,
  Wrench,
  Users,
  Building2,
  BarChart3,
  Settings,
  Wallet,
  Handshake,
  Container,
  IdCard,
  Store,
  ShieldCheck,
  ClipboardList,
  Tag,
  Fuel as FuelIcon,
  BookOpen,
  ListChecks,
  Scale,
  ScrollText,
  Hourglass,
  FileText,
  Banknote,
  CalendarRange,
  CalendarDays,
  GraduationCap,
  KeyRound,
  Sparkles,
  Trophy,
  Pause,
  Grid3X3,
  FileBarChart,
  Calendar,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: string;
};

export const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: "Operations",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/calendar", label: "Schedule", icon: Calendar },
      { href: "/bookings", label: "Bookings", icon: ClipboardList },
      { href: "/trips", label: "Trips", icon: Route },
      { href: "/trucks", label: "Trucks", icon: Truck },
      { href: "/trailers", label: "Trailers", icon: Container },
      { href: "/drivers", label: "Drivers", icon: IdCard },
      { href: "/workshop", label: "Workshop", icon: Wrench },
      { href: "/compliance", label: "Compliance", icon: ShieldCheck },
      { href: "/rates", label: "Rates", icon: Tag },
    ],
  },
  {
    title: "Partners",
    items: [
      { href: "/customers", label: "Customers", icon: Building2 },
      { href: "/subcontractors", label: "Subcontractors", icon: Handshake },
      { href: "/suppliers", label: "Suppliers", icon: Store },
    ],
  },
  {
    title: "Finance",
    items: [
      { href: "/expenses", label: "Expenses", icon: Receipt },
      { href: "/fuel", label: "Fuel", icon: FuelIcon },
      { href: "/accounts", label: "Chart of Accounts", icon: BookOpen },
      { href: "/ledger", label: "General Ledger", icon: ListChecks },
      { href: "/ledger/trial-balance", label: "Trial Balance", icon: Scale },
      { href: "/invoices", label: "Invoices (AR)", icon: ScrollText },
      { href: "/invoices/aged", label: "Aged AR", icon: Hourglass },
      { href: "/bills", label: "Bills (AP)", icon: FileText },
      { href: "/bills/aged", label: "Aged AP", icon: Hourglass },
      { href: "/bank", label: "Bank Reconciliation", icon: Banknote },
      { href: "/reports", label: "Reports", icon: BarChart3 },
      { href: "/management-pack", label: "Management Pack", icon: FileBarChart },
    ],
  },
  {
    title: "People",
    items: [
      { href: "/hr", label: "HR Hub", icon: Users },
      { href: "/hr/employees", label: "Employees", icon: IdCard },
      { href: "/hr/departments", label: "Departments", icon: Building2 },
      { href: "/hr/compliance", label: "HR Compliance", icon: ShieldCheck },
      { href: "/hr/leave", label: "Leave", icon: CalendarRange },
      { href: "/hr/attendance", label: "Attendance", icon: CalendarDays },
      { href: "/hr/payroll", label: "Payroll", icon: Wallet },
      { href: "/hr/loans", label: "Loans", icon: Wallet },
      { href: "/hr/appraisals", label: "Appraisals", icon: GraduationCap },
      { href: "/hr/job-descriptions", label: "Job Descriptions", icon: KeyRound },
      { href: "/hr/permissions", label: "Permission Matrix", icon: KeyRound },
    ],
  },
  {
    title: "Performance",
    items: [
      { href: "/tracker", label: "Truck tracker", icon: Trophy },
      { href: "/tracker/idle", label: "Idle trucks", icon: Pause },
      { href: "/tracker/matrix", label: "Customer × route", icon: Grid3X3 },
    ],
  },
  {
    title: "AI",
    items: [{ href: "/assistant", label: "Assistant", icon: Sparkles }],
  },
  {
    title: "Admin",
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
];
