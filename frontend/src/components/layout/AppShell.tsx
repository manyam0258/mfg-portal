import { useState, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface AppShellProps {
  title: string;
  actions?: ReactNode;
  children: (searchValue: string) => ReactNode;
}

export function AppShell({ title, actions, children }: AppShellProps) {
  const [search, setSearch] = useState('');

  return (
    <div className="flex min-h-screen bg-app">
      <Sidebar />
      <div className="flex-1 ml-60 flex flex-col min-h-screen">
        <Topbar title={title} actions={actions} searchValue={search} onSearchChange={setSearch} />
        <main className="flex-1 pt-16 p-6 overflow-x-hidden">
          {children(search)}
        </main>
      </div>
    </div>
  );
}
