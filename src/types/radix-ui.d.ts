declare module '@radix-ui/react-label' {
  import * as React from 'react';
  
  const Root: React.ForwardRefExoticComponent<
    React.LabelHTMLAttributes<HTMLLabelElement> & React.RefAttributes<HTMLLabelElement>
  >;
  
  export { Root };
}

declare module '@radix-ui/react-select' {
  import * as React from 'react';
  
  const Root: React.FC<React.PropsWithChildren<{
    defaultValue?: string;
    value?: string;
    onValueChange?: (value: string) => void;
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    dir?: 'ltr' | 'rtl';
    name?: string;
    autoComplete?: string;
    disabled?: boolean;
    required?: boolean;
  }>>;
  
  const Trigger: React.ForwardRefExoticComponent<
    React.ButtonHTMLAttributes<HTMLButtonElement> & React.RefAttributes<HTMLButtonElement>
  >;
  
  const Value: React.FC<React.PropsWithChildren<{
    placeholder?: string;
  }>>;
  
  const Icon: React.FC<React.PropsWithChildren<{
    asChild?: boolean;
  }>>;
  
  const Portal: React.FC<React.PropsWithChildren<{
    container?: HTMLElement;
  }>>;
  
  const Content: React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLDivElement> & {
      position?: 'item-aligned' | 'popper';
      side?: 'top' | 'right' | 'bottom' | 'left';
      sideOffset?: number;
      align?: 'start' | 'center' | 'end';
      alignOffset?: number;
      avoidCollisions?: boolean;
      collisionBoundary?: Element | null | Array<Element | null>;
      collisionPadding?: number | Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>;
      arrowPadding?: number;
      sticky?: 'partial' | 'always';
      hideWhenDetached?: boolean;
    } & React.RefAttributes<HTMLDivElement>
  >;
  
  const Viewport: React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>
  >;
  
  const Item: React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLDivElement> & {
      disabled?: boolean;
      value: string;
      textValue?: string;
    } & React.RefAttributes<HTMLDivElement>
  >;
  
  const ItemText: React.FC<React.PropsWithChildren<{
    asChild?: boolean;
  }>>;
  
  const ItemIndicator: React.FC<React.PropsWithChildren<
    React.HTMLAttributes<HTMLSpanElement>
  >>;
  
  const Group: React.FC<React.PropsWithChildren<
    React.HTMLAttributes<HTMLDivElement>
  >>;
  
  const Label: React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>
  >;
  
  const Separator: React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>
  >;
  
  const ScrollUpButton: React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>
  >;
  
  const ScrollDownButton: React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>
  >;
  
  export {
    Root,
    Trigger,
    Value,
    Icon,
    Portal,
    Content,
    Viewport,
    Item,
    ItemText,
    ItemIndicator,
    Group,
    Label,
    Separator,
    ScrollUpButton,
    ScrollDownButton
  };
} 