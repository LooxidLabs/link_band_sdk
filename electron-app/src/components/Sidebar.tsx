import { useState } from 'react';
import { Brain, Cpu, Eye, Database, FileText, Settings, ChevronLeft } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from './ui/utils';
import { useUIStore } from '../stores/uiStore';
import type { MenuId } from '../stores/uiStore';

const menuItems = [
  { icon: Cpu, label: 'Engine', id: 'engine' as MenuId },
  { icon: Brain, label: 'Link Band', id: 'linkband' as MenuId },
  { icon: Eye, label: 'Visualizer', id: 'visualizer' as MenuId },
  { icon: Database, label: 'Data Center', id: 'datacenter' as MenuId },
  { icon: FileText, label: 'Documents', id: 'cloudmanager' as MenuId },
  { icon: Settings, label: 'Settings', id: 'settings' as MenuId },
];

export function Sidebar() {
  const { activeMenu, setActiveMenu } = useUIStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={cn(
      "bg-sidebar border-r border-sidebar-border transition-all duration-300 h-screen flex flex-col",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header - 고정 */}
      <div className="flex-shrink-0 p-6 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <h1 className="text-sidebar-foreground font-semibold text-left">
              LINK BAND SDK
            </h1>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <ChevronLeft className={cn(
              "h-4 w-4 transition-transform",
              isCollapsed && "rotate-180"
            )} />
          </Button>
        </div>
      </div>

      {/* Navigation - 스크롤 가능 (필요시) */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeMenu === item.id;
          
          return (
            <Button
              key={item.id}
              variant={isActive ? "default" : "ghost"}
              className={cn(
                "w-full gap-3 h-12 !justify-start",
                isActive 
                  ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isCollapsed && "!justify-center"
              )}
              onClick={() => setActiveMenu(item.id)}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span className="flex-1 text-left">{item.label}</span>}
            </Button>
          );
        })}
      </nav>
    </div>
  );
} 