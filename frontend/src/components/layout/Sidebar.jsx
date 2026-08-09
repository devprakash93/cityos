import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Building2, ChevronDown, ChevronRight } from 'lucide-react';

export function Sidebar({ navigation, groups }) {
  // Optional: keep track of which groups are expanded. 
  // By default, we can keep them all expanded for now, or just default to true.
  const [expanded, setExpanded] = useState({});

  const toggleGroup = (groupName) => {
    setExpanded(prev => ({
      ...prev,
      [groupName]: prev[groupName] === undefined ? false : !prev[groupName]
    }));
  };

  const renderNavItems = (items) => (
    <ul role="list" className="-mx-2 space-y-1">
      {items.map((item) => (
        <li key={item.name}>
          <NavLink
            to={item.href}
            className={({ isActive }) =>
              cn(
                isActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50',
                'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-medium transition-colors'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    isActive ? 'text-primary-400' : 'text-slate-400 group-hover:text-primary-400',
                    'h-5 w-5 shrink-0 transition-colors'
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-slate-900 border-r border-slate-800 px-4 pb-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
      <div className="flex h-16 shrink-0 items-center text-white space-x-3 px-2 sticky top-0 bg-slate-900 z-10">
        <Building2 className="h-8 w-8 text-primary-500" />
        <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Odisha CityOS</span>
      </div>
      <nav className="flex flex-1 flex-col">
        {groups ? (
          <div className="flex flex-col gap-y-6 mt-2">
            {groups.map((group) => {
              const isExpanded = expanded[group.name] !== false;
              return (
                <div key={group.name}>
                  <button 
                    onClick={() => toggleGroup(group.name)}
                    className="flex w-full items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 px-2 hover:text-slate-300 transition-colors"
                  >
                    <span>{group.name}</span>
                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                  {isExpanded && renderNavItems(group.items)}
                </div>
              );
            })}
          </div>
        ) : (
          <ul role="list" className="flex flex-1 flex-col gap-y-7 mt-2">
            <li>{renderNavItems(navigation)}</li>
          </ul>
        )}
      </nav>
    </div>
  );
}
