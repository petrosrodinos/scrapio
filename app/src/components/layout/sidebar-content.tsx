import { NavLink } from 'react-router-dom';
import {
  Activity,
  Bell,
  Globe,
  LayoutDashboard,
  Plug,
  Play,
  Settings2,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Routes } from '@/routes/routes';
import { RoleTypes } from '@/features/user/interfaces/user.interface';
import { useAuthStore } from '@/stores/auth';

interface SidebarContentProps {
  collapsed: boolean;
  onNavigate?: () => void;
}

const dashboardNavItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: Routes.dashboard.root, end: true },
];

const scraperNavItems = [
  { label: 'Targets', icon: Globe, href: Routes.websiteTargets.list, end: false },
  { label: 'Generation', icon: Sparkles, href: Routes.generationRuns.list, end: false },
  { label: 'Crawl Runs', icon: Play, href: Routes.crawlRuns.list, end: false },
  { label: 'Diagnostics', icon: Activity, href: Routes.diagnostics.list, end: false },
  { label: 'Integrations', icon: Plug, href: Routes.integrations.list, end: false },
];

const adminNavItems = [
  { label: 'Jobs', icon: Wrench, href: Routes.admin.jobs.list, end: false },
  { label: 'Crawler Config', icon: Settings2, href: Routes.admin.crawlerConfig, end: false },
  { label: 'Notifications', icon: Bell, href: Routes.admin.notifications, end: false },
  { label: 'Health', icon: Activity, href: Routes.admin.health, end: true },
];

function NavItem({
  label,
  icon: Icon,
  href,
  end,
  collapsed,
  onNavigate,
}: {
  label: string;
  icon: React.ElementType;
  href: string;
  end: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <li>
      <NavLink
        to={href}
        end={end}
        title={collapsed ? label : undefined}
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            'group flex items-center w-full rounded-xl transition-all duration-200 outline-none',
            'focus-visible:ring-1 focus-visible:ring-accent/50',
            collapsed ? 'justify-center py-2.5 px-0' : 'gap-2.5 px-2.5 py-[8px]',
            isActive
              ? 'text-foreground'
              : 'text-muted hover:text-foreground hover:bg-surface-secondary',
          )
        }
        style={({ isActive }) =>
          isActive
            ? {
                background: 'color-mix(in oklch, var(--accent) 12%, transparent)',
                boxShadow: 'inset 0 0 0 1px color-mix(in oklch, var(--accent) 22%, transparent)',
              }
            : {}
        }
      >
        {({ isActive }) => (
          <>
            <Icon
              className="shrink-0 transition-transform duration-200 group-hover:scale-[1.07]"
              style={{ width: 16, height: 16, color: isActive ? 'var(--accent)' : undefined }}
            />
            {!collapsed && (
              <span
                className="text-[13px] font-medium truncate leading-none"
                style={{ letterSpacing: '-0.005em' }}
              >
                {label}
              </span>
            )}
          </>
        )}
      </NavLink>
    </li>
  );
}

function NavSection({
  title,
  items,
  collapsed,
  onNavigate,
}: {
  title?: string;
  items: typeof dashboardNavItems;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div>
      {title && !collapsed ? (
        <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
          {title}
        </p>
      ) : null}
      <ul className="space-y-0.5">
        {items.map(({ label, icon, href, end }) => (
          <NavItem
            key={href}
            label={label}
            icon={icon}
            href={href}
            end={end}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
    </div>
  );
}

export default function SidebarContent({ collapsed, onNavigate }: SidebarContentProps) {
  const { role } = useAuthStore();
  const canAccessAdmin =
    role === RoleTypes.ADMIN ||
    role === RoleTypes.SUPER_ADMIN ||
    role === RoleTypes.SUPPORT;

  return (
    <div className="space-y-4">
      <NavSection items={dashboardNavItems} collapsed={collapsed} onNavigate={onNavigate} />

      <NavSection
        title="Scrapers"
        items={scraperNavItems}
        collapsed={collapsed}
        onNavigate={onNavigate}
      />

      {canAccessAdmin ? (
        <NavSection
          title="Admin"
          items={adminNavItems}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      ) : null}
    </div>
  );
}
