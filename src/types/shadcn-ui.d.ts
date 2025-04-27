declare module '@/components/ui/dropdown-menu' {
  import * as React from 'react';
  
  export const DropdownMenu: React.FC<React.PropsWithChildren<{
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    modal?: boolean;
  }>>;
  
  export const DropdownMenuTrigger: React.ForwardRefExoticComponent<
    React.ButtonHTMLAttributes<HTMLButtonElement> & { 
      asChild?: boolean 
    } & React.RefAttributes<HTMLButtonElement>
  >;
  
  export const DropdownMenuContent: React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLDivElement> & { 
      align?: 'start' | 'center' | 'end';
      sideOffset?: number;
      alignOffset?: number;
      asChild?: boolean;
    } & React.RefAttributes<HTMLDivElement>
  >;
  
  export const DropdownMenuItem: React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLDivElement> & { 
      inset?: boolean;
      asChild?: boolean;
    } & React.RefAttributes<HTMLDivElement>
  >;
  
  export const DropdownMenuCheckboxItem: React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLDivElement> & { 
      checked?: boolean;
      onCheckedChange?: (checked: boolean) => void;
      asChild?: boolean;
    } & React.RefAttributes<HTMLDivElement>
  >;
  
  export const DropdownMenuRadioItem: React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLDivElement> & { 
      value: string;
      asChild?: boolean;
    } & React.RefAttributes<HTMLDivElement>
  >;
  
  export const DropdownMenuLabel: React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLDivElement> & { 
      inset?: boolean;
      asChild?: boolean;
    } & React.RefAttributes<HTMLDivElement>
  >;
  
  export const DropdownMenuSeparator: React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLDivElement> & { 
      asChild?: boolean;
    } & React.RefAttributes<HTMLDivElement>
  >;
  
  export const DropdownMenuShortcut: React.FC<
    React.HTMLAttributes<HTMLSpanElement>
  >;
  
  export const DropdownMenuGroup: React.FC<
    React.HTMLAttributes<HTMLDivElement> & { 
      asChild?: boolean;
    }
  >;
  
  export const DropdownMenuPortal: React.FC<
    React.PropsWithChildren<{ 
      container?: HTMLElement;
    }>
  >;
  
  export const DropdownMenuSub: React.FC<
    React.PropsWithChildren<{
      open?: boolean;
      defaultOpen?: boolean;
      onOpenChange?: (open: boolean) => void;
    }>
  >;
  
  export const DropdownMenuSubContent: React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLDivElement> & { 
      asChild?: boolean;
    } & React.RefAttributes<HTMLDivElement>
  >;
  
  export const DropdownMenuSubTrigger: React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLDivElement> & { 
      inset?: boolean;
      asChild?: boolean;
    } & React.RefAttributes<HTMLDivElement>
  >;
  
  export const DropdownMenuRadioGroup: React.FC<
    React.HTMLAttributes<HTMLDivElement> & { 
      value?: string;
      onValueChange?: (value: string) => void;
      asChild?: boolean;
    }
  >;
} 