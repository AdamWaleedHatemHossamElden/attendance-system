import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, eyebrow, description, actions }: PageHeaderProps) {
  return (
    <header className="v2-page-header">
      <div>
        {eyebrow ? <p className="v2-page-header__eyebrow">{eyebrow}</p> : null}
        <h1 className="v2-page-header__title">{title}</h1>
        {description ? <p className="v2-page-header__description">{description}</p> : null}
      </div>
      {actions ? <div>{actions}</div> : null}
    </header>
  );
}
