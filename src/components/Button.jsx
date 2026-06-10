import { Link } from 'react-router-dom';

const BASE =
  'inline-flex items-center justify-center gap-3 px-7 py-3.5 text-xs uppercase tracking-[0.2em] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background';

const VARIANTS = {
  outline: 'border border-primary/20 text-primary hover:bg-primary hover:text-background',
  solid: 'bg-primary text-background hover:bg-accent hover:text-primary',
  ghost: 'px-0 text-primary hover:text-accent',
};

/** Polymorphic CTA — renders a router Link, an anchor, or a button. */
export default function Button({
  to,
  href,
  variant = 'outline',
  className = '',
  children,
  ...rest
}) {
  const cls = `${BASE} ${VARIANTS[variant] ?? VARIANTS.outline} ${className}`;

  if (to) {
    return (
      <Link to={to} className={cls} {...rest}>
        {children}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={cls} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}
