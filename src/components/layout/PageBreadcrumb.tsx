import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageBreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

const PageBreadcrumb = ({ items, className = '' }: PageBreadcrumbProps) => (
  <nav className={`flex items-center flex-wrap gap-x-1 gap-y-0.5 text-sm text-muted-foreground mb-4 ${className}`} aria-label="Breadcrumb">
    <Link to="/" className="hover:text-primary transition-colors flex items-center shrink-0">
      <Home className="h-3.5 w-3.5" />
    </Link>
    {items.map((item, i) => (
      <span key={i} className="flex items-center gap-1 min-w-0">
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        {item.href ? (
          <Link to={item.href} className="hover:text-primary transition-colors truncate">{item.label}</Link>
        ) : (
          <span className="text-foreground font-medium truncate">{item.label}</span>
        )}
      </span>
    ))}
  </nav>
);

export default PageBreadcrumb;
