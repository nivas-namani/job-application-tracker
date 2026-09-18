import type { ReactNode } from 'react';

type DrawerSectionProps = { title: string; children: ReactNode };

export function DrawerSection({ title, children }: DrawerSectionProps) {
  return <section><h3 className="section-heading">{title}</h3>{children}</section>;
}
