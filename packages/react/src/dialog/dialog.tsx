import {
  activateDialog,
  connectDialog,
  type DialogApi,
  type DialogEvent,
  type DialogRole,
  type DialogState,
  dialogReducer,
  initialDialogState,
  scheduleDialogNameCheck,
} from '@caioalfonso/kanso-core';
import {
  type ComponentPropsWithRef,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { normalizeProps, type ReactPropTypes } from '../normalize-props';

/**
 * Dialog is the first component that is mostly *effects* rather than props, and
 * the adapter's job is correspondingly narrow: mount a portal, hold three
 * registration counters, and call `activateDialog` once when the content
 * appears. Everything about focus, dismissal, scrolling and inertness lives in
 * core — `docs/03` §3 and CLAUDE.md rule 2.
 */

/** Which optional parts are mounted. Counters, not booleans — see `register`. */
type DialogPartName = 'title' | 'description' | 'ariaLabel';

interface DialogContextValue {
  api: DialogApi<ReactPropTypes>;
  state: DialogState;
  /** Mounted on the client. The portal cannot exist before this is true. */
  mounted: boolean;
  close: () => void;
  register: (part: DialogPartName) => () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  initialFocus?: () => HTMLElement | null;
  finalFocus?: () => HTMLElement | null;
}

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext(part: string): DialogContextValue {
  const context = useContext(DialogContext);
  if (context === null) {
    throw new Error(`[kanso] Dialog.${part} must be rendered inside Dialog.Root.`);
  }
  return context;
}

export interface DialogRootProps {
  /** Controlled value. Present ⇒ the consumer owns whether the dialog is open. */
  open?: boolean;
  /** Uncontrolled initial value. */
  defaultOpen?: boolean;
  /** Fired in both modes, after the reducer has accepted the change. */
  onOpenChange?: (open: boolean) => void;
  /** Modal traps focus and locks scrolling. Non-modal does neither. */
  modal?: boolean;
  /** `alertdialog` for an interruption that needs a response. */
  role?: DialogRole;
  closeOnEscape?: boolean;
  closeOnInteractOutside?: boolean;
  /** Where focus goes on open. Defaults to the first focusable element. */
  initialFocus?: () => HTMLElement | null;
  /** Where focus goes on close. Defaults to whatever had it when the dialog opened. */
  finalFocus?: () => HTMLElement | null;
  /** Base for every derived id. Defaults to React's `useId()`. */
  id?: string;
  children?: ReactNode;
}

/**
 * Renders no element of its own. The trigger stays in the page and the rest is
 * portalled to `<body>`, so there is no position in the tree a wrapper could
 * occupy without being wrong for one of them.
 */
export function DialogRoot({
  open: controlledOpen,
  defaultOpen,
  onOpenChange,
  modal,
  role,
  closeOnEscape,
  closeOnInteractOutside,
  initialFocus,
  finalFocus,
  id: providedId,
  children,
}: DialogRootProps) {
  // React owns id generation. A counter in core would differ between the server
  // render and the client render — see CLAUDE.md rule 3.
  const reactId = useId();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen ?? false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Counted rather than flagged: React 19's strict mode mounts, unmounts and
  // remounts every effect, and two `Dialog.Description` parts in one dialog is
  // a consumer mistake that should not corrupt the count permanently.
  const [parts, setParts] = useState({ title: 0, description: 0, ariaLabel: 0 });

  const register = useCallback((part: DialogPartName) => {
    setParts((current) => ({ ...current, [part]: current[part] + 1 }));
    return () => setParts((current) => ({ ...current, [part]: current[part] - 1 }));
  }, []);

  // The portal cannot be created during the server render — `createPortal` is
  // not supported by `react-dom/server`. `docs/03` §3 decision 2, which also
  // records the consequence: a `defaultOpen` dialog is absent from the HTML and
  // appears after hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  // Derived on every render rather than held in a reducer. Every field except
  // `open` is a prop or a registration, and either one stored in state goes
  // stale the moment it changes.
  const state = initialDialogState({
    id: providedId ?? reactId,
    open,
    modal,
    role,
    closeOnEscape,
    closeOnInteractOutside,
    hasTitle: parts.title > 0,
    hasDescription: parts.description > 0,
    hasAriaLabel: parts.ariaLabel > 0,
  });

  // Controlled-mode mirroring lives here, not in core. See docs/01 §9.
  const send = (event: DialogEvent) => {
    const next = dialogReducer(state, event);
    // Reference equality means the reducer refused it — closing an already
    // closed dialog, which `Escape` and a press outside can both ask for in the
    // same frame. Nothing to report.
    if (next === state) return;
    if (!isControlled) setUncontrolledOpen(next.open);
    onOpenChange?.(next.open);
  };

  const api = connectDialog(state, send, normalizeProps);

  // `send` closes over this render's `state`, and the content's effect runs
  // once per open. Reading the latest through a ref is what keeps a dismissal
  // from dispatching against a state object several renders old.
  const closeRef = useRef<() => void>(() => {});
  closeRef.current = () => send({ type: 'CLOSE' });
  const close = useCallback(() => closeRef.current(), []);

  return (
    <DialogContext.Provider
      value={{ api, state, mounted, close, register, triggerRef, initialFocus, finalFocus }}
    >
      {children}
    </DialogContext.Provider>
  );
}

export interface DialogTriggerProps extends ComponentPropsWithRef<'button'> {
  children?: ReactNode;
}

export function DialogTrigger({ children, ...attributes }: DialogTriggerProps) {
  const { api, triggerRef } = useDialogContext('Trigger');
  return (
    <button ref={triggerRef} {...attributes} {...api.triggerProps}>
      {children}
    </button>
  );
}

export interface DialogPositionerProps extends ComponentPropsWithRef<'div'> {
  children?: ReactNode;
}

/**
 * The portal, and the only part that decides whether anything renders at all.
 *
 * Portalling to `<body>` is what stops an ancestor's `overflow: hidden`,
 * `transform` or `z-index` from clipping or mis-stacking the dialog — the most
 * common reason a modal looks broken in a real application.
 */
export function DialogPositioner({ children, ...attributes }: DialogPositionerProps) {
  const { api, mounted } = useDialogContext('Positioner');
  if (!api.open || !mounted) return null;

  return createPortal(
    <div {...attributes} {...api.positionerProps}>
      {children}
    </div>,
    document.body,
  );
}

export type DialogBackdropProps = ComponentPropsWithRef<'div'>;

/**
 * Paint. It carries no handler: a press on it dismisses because it is outside
 * the content, which is the same path that covers the positioner's own padding.
 * Rendered inside the positioner rather than beside it — a separately portalled
 * backdrop is a sibling of the content, so the focus trap marks it `inert` and
 * it stops receiving presses entirely. `docs/03` §3 decision 11.
 */
export function DialogBackdrop(attributes: DialogBackdropProps) {
  const { api } = useDialogContext('Backdrop');
  return <div {...attributes} {...api.backdropProps} />;
}

export interface DialogContentProps extends ComponentPropsWithRef<'div'> {
  children?: ReactNode;
}

export function DialogContent({ children, ...attributes }: DialogContentProps) {
  const { api, state, close, register, triggerRef, initialFocus, finalFocus } =
    useDialogContext('Content');
  const contentRef = useRef<HTMLDivElement | null>(null);

  const hasAriaLabel = (attributes['aria-label'] ?? '') !== '';
  useLayoutEffect(() => {
    if (!hasAriaLabel) return;
    return register('ariaLabel');
  }, [hasAriaLabel, register]);

  const { modal, closeOnEscape, closeOnInteractOutside } = state;

  // Deliberately armed once per open, not on every change: re-running it would
  // re-trap and re-move focus mid-interaction, which is worse than the staleness
  // it would fix. The content only exists while open, so "once per mount" *is*
  // "once per open" — an `open` dependency would be redundant, not missing —
  // and `close` reads the latest state through a ref, so it cannot go stale.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  useLayoutEffect(() => {
    const content = contentRef.current;
    if (content === null) return;

    return activateDialog({
      content,
      modal,
      closeOnEscape,
      closeOnInteractOutside,
      initialFocus,
      finalFocus,
      getTrigger: () => triggerRef.current,
      onClose: close,
    });
  }, []);

  // Not run inline: the title registers from its own mount hook, so
  // `aria-labelledby` is still a render behind at this point. Core owns the
  // delay — see `scheduleDialogNameCheck`.
  useEffect(() => {
    const content = contentRef.current;
    if (content === null) return;
    return scheduleDialogNameCheck(content);
  }, []);

  return (
    <div ref={contentRef} {...attributes} {...api.contentProps}>
      {children}
    </div>
  );
}

export interface DialogTitleProps extends ComponentPropsWithRef<'h2'> {
  children?: ReactNode;
}

/**
 * Registers itself so that `aria-labelledby` is emitted only once this exists.
 * Pointing the content at an id that was never rendered leaves the dialog with
 * no accessible name at all — worse than the unnamed one it would otherwise be.
 */
export function DialogTitle({ children, ...attributes }: DialogTitleProps) {
  const { api, register } = useDialogContext('Title');
  useLayoutEffect(() => register('title'), [register]);

  return (
    <h2 {...attributes} {...api.titleProps}>
      {children}
    </h2>
  );
}

export interface DialogDescriptionProps extends ComponentPropsWithRef<'p'> {
  children?: ReactNode;
}

export function DialogDescription({ children, ...attributes }: DialogDescriptionProps) {
  const { api, register } = useDialogContext('Description');
  useLayoutEffect(() => register('description'), [register]);

  return (
    <p {...attributes} {...api.descriptionProps}>
      {children}
    </p>
  );
}

export interface DialogCloseProps extends ComponentPropsWithRef<'button'> {
  children?: ReactNode;
}

export function DialogClose({ children, ...attributes }: DialogCloseProps) {
  const { api } = useDialogContext('Close');
  return (
    <button {...attributes} {...api.closeProps}>
      {children}
    </button>
  );
}

/** Namespace form, which is how the docs show it: `<Dialog.Root>`, `<Dialog.Trigger>`… */
export const Dialog = {
  Root: DialogRoot,
  Trigger: DialogTrigger,
  Positioner: DialogPositioner,
  Backdrop: DialogBackdrop,
  Content: DialogContent,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: DialogClose,
};
