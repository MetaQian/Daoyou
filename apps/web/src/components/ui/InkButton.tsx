import Link from '@app/components/router/AppLink';
import { cn } from '@app/lib/cn';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';

/**
 * InkButton 变体定义
 * 2026-10-21：由「[文字]」文字链改为实体按钮形态（描边/实心/幽灵）。
 */
const inkButtonVariants = cva(
  // 基础样式：实体按钮
  'inline-flex items-center justify-center rounded-[2px] px-4 py-1.5 font-sans text-[0.95rem] leading-none tracking-[0.08em] whitespace-nowrap cursor-pointer select-none no-underline transition-all duration-150',
  {
    variants: {
      variant: {
        // 默认：纸面描边按钮
        default:
          'border border-ink/30 bg-paper-2/70 text-ink hover:border-crimson/50 hover:text-crimson active:translate-y-px',
        // 主操作：朱红实心
        primary:
          'border border-crimson bg-crimson text-paper shadow-[0_1px_0_rgba(44,24,16,0.2)] hover:bg-crimson/90 active:translate-y-px active:bg-crimson',
        // 次级：浅描边
        secondary:
          'border border-ink/20 bg-transparent text-ink-secondary hover:border-ink/45 hover:text-ink active:translate-y-px',
        // 虚线描边（弱操作）
        outline:
          'border border-dashed border-ink/30 bg-transparent text-ink hover:border-crimson/50 hover:text-crimson active:translate-y-px',
        // 幽灵：无边框，仅 hover 有底
        ghost:
          'border border-transparent bg-transparent text-ink-secondary/80 hover:bg-ink/5 hover:text-ink',
      },
      disabled: {
        true: 'pointer-events-none opacity-50',
      },
    },
    defaultVariants: {
      variant: 'default',
      disabled: false,
    },
  },
);

export interface InkButtonProps extends VariantProps<typeof inkButtonVariants> {
  children: ReactNode;
  pending?: boolean;
  pendingLabel?: ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

/**
 * 实体按钮组件（描边/实心/幽灵）。
 * 注：根据规范，按钮禁止使用 text-xs，最小建议使用 text-sm。
 */
export function InkButton({
  children,
  pending = false,
  pendingLabel = '处理中……',
  onClick,
  href,
  disabled = false,
  variant = 'default',
  className = '',
  type = 'button',
}: InkButtonProps) {
  const unavailable = Boolean(disabled || pending);
  const content = pending ? (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="h-1.5 w-1.5 animate-pulse rounded-full bg-current"
        aria-hidden="true"
      />
      {pendingLabel}
    </span>
  ) : (
    children
  );
  const combinedClass = cn(
    inkButtonVariants({ variant, disabled: unavailable }),
    className,
  );

  // 如果有 href 且未禁用，渲染为 Link
  if (href && !unavailable) {
    return (
      <Link href={href} className={combinedClass}>
        {content}
      </Link>
    );
  }

  // 否则渲染为 button
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={unavailable}
      aria-busy={pending || undefined}
      className={combinedClass}
    >
      {content}
    </button>
  );
}
