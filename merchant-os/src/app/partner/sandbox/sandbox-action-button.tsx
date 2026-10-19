'use client';

import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  confirmMessage: string;
};

export function SandboxActionButton({ confirmMessage, onClick, ...props }: Props) {
  return (
    <button
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (!window.confirm(confirmMessage)) event.preventDefault();
      }}
    />
  );
}
