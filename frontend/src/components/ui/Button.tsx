import { forwardRef } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';
import { buttonClasses, type ButtonBaseProps } from './buttonClasses';

export interface ButtonProps
  extends ButtonBaseProps, Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  className?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, icon, iconEnd, full, children, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonClasses({ variant, size, full }), className)}
      {...rest}
    >
      {icon && <Icon name={icon} size={14} />}
      {children != null && <span>{children}</span>}
      {iconEnd && <Icon name={iconEnd} size={14} />}
    </button>
  );
});

export interface LinkButtonProps extends ButtonBaseProps, Omit<LinkProps, 'className'> {
  className?: string;
}

export function LinkButton({
  variant,
  size,
  icon,
  iconEnd,
  full,
  children,
  className,
  ...rest
}: LinkButtonProps) {
  return (
    <Link className={cn(buttonClasses({ variant, size, full }), className)} {...rest}>
      {icon && <Icon name={icon} size={14} />}
      {children != null && <span>{children}</span>}
      {iconEnd && <Icon name={iconEnd} size={14} />}
    </Link>
  );
}
