import { useRole } from '../hooks/useRole';
import type { UserRole } from '../types';
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Settings,
  ShieldCheck,
  Users,
  ChevronLeft,
  ChevronRight,
  Zap,
  PenTool,
  MapPin,
  BarChart3,
  PieChart,
  CalendarDays,
  CalendarRange,
  Plus,
  Wrench,
  Contact,
} from 'lucide-react';
import { useState } from 'react';

interface NavLink {
  label: string;
  icon: React.ReactNode;
  path: string;
  roles: UserRole[];
  search?: string;
}

const NAV_LINKS: NavLink[] = [
  {
    label: 'Tableau de bord',
    icon: <LayoutDashboard size={18} />,
    path: '/',
    roles: ['DGS', 'DST', 'Chargé d\'Affaires', 'Prestataire Extérieur'],
  },
  {
    label: 'Affaires',
    icon: <FolderKanban size={18} />,
    path: '/affaires',
    roles: ['DGS', 'DST', 'Chargé d\'Affaires'],
  },
  {
    label: 'GED Documents',
    icon: <FileText size={18} />,
    path: '/ged',
    roles: ['DGS', 'DST', 'Chargé d\'Affaires', 'Prestataire Extérieur'],
  },
  {
    label: 'Signatures',
    icon: <PenTool size={18} />,
    path: '/signatures',
    roles: ['DGS', 'DST', 'Chargé d\'Affaires'],
  },
  {
    label: 'Carte',
    icon: <MapPin size={18} />,
    path: '/carte',
    roles: ['DGS', 'DST', 'Chargé d\'Affaires'],
  },
  {
    label: 'Maintenance',
    icon: <Wrench size={18} />,
    path: '/maintenance',
    roles: ['DGS', 'DST', 'Chargé d\'Affaires', 'Prestataire Extérieur'],
  },
  {
    label: 'Planning',
    icon: <CalendarRange size={18} />,
    path: '/planning',
    roles: ['DGS', 'DST', 'Chargé d\'Affaires'],
  },
  {
    label: 'Rapports',
    icon: <BarChart3 size={18} />,
    path: '/rapports',
    roles: ['DGS', 'DST', 'Chargé d\'Affaires'],
  },
  {
    label: '📊 Analytics',
    icon: <PieChart size={18} />,
    path: '/analytics',
    roles: ['DGS', 'DST'],
  },
  {
    label: '📅 Planification PPI',
    icon: <CalendarDays size={18} />,
    path: '/ppi',
    roles: ['DGS', 'DST'],
  },
  {
    label: 'Interlocuteurs',
    icon: <Contact size={18} />,
    path: '/contacts',
    roles: ['DGS', 'DST', 'Chargé d\'Affaires'],
  },
  {
    label: 'Utilisateurs',
    icon: <Users size={18} />,
    path: '/utilisateurs',
    roles: ['DGS', 'DST'],
  },
  {
    label: 'Intégrations',
    icon: <Settings size={18} />,
    path: '/integrations',
    roles: ['DGS', 'DST'],
  },
  {
    label: 'Conformité',
    icon: <ShieldCheck size={18} />,
    path: '/conformite',
    roles: ['DGS', 'DST'],
  },
];

const COMMUNE_NAV_LINKS: NavLink[] = [
  {
    label: 'Carte de la Commune',
    icon: <MapPin size={18} />,
    path: '/commune/carte',
    roles: ['COMMUNE'],
  },
  {
    label: 'Nos Dossiers',
    icon: <FolderKanban size={18} />,
    path: '/commune/dossiers',
    roles: ['COMMUNE'],
  },
  {
    label: 'Maintenance',
    icon: <Wrench size={18} />,
    path: '/maintenance',
    roles: ['COMMUNE'],
  },
  {
    label: 'Nouvelle Demande',
    icon: <Plus size={18} />,
    path: '/commune/carte',
    search: '?mode=demande',
    roles: ['COMMUNE'],
  },
];

interface SidebarProps {
  activePath: string;
  onNavigate: (path: string) => void;
}

export default function Sidebar({ activePath, onNavigate }: SidebarProps) {
  const { user, canAccess, isCommune } = useRole();
  const [collapsed, setCollapsed] = useState(false);

  const links = isCommune ? COMMUNE_NAV_LINKS : NAV_LINKS;
  const visibleLinks = links.filter((link) => canAccess(link.roles));

  return (
    <aside
      className={`flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900">
            <Zap size={18} className="text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-900 leading-tight">SINFONI</span>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide leading-tight">
                {isCommune ? 'Portail Commune' : 'GSI Concept'}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {visibleLinks.map((link) => {
          const fullPath = link.path + (link.search ?? '');
          const active = activePath === link.path;
          return (
            <button
              key={fullPath}
              onClick={() => onNavigate(fullPath)}
              title={collapsed ? link.label : undefined}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="shrink-0">{link.icon}</span>
              {!collapsed && <span className="truncate">{link.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <div
          className={`flex items-center gap-2 rounded-lg bg-slate-50 p-2 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">
            {user.avatar}
          </div>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-xs font-semibold text-slate-900">
                {user.name}
              </span>
              <span className="truncate text-[10px] text-slate-500">
                {isCommune ? 'Élu / Commune' : user.role}
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
