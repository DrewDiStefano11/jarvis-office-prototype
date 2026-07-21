import React, { useEffect, useRef, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './Modal.module.css';
import { IconButton } from './IconButton';

export interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: React.ReactNode;
    description?: React.ReactNode;
    children: React.ReactNode;
    appRootSelector?: string;
    initialFocusRef?: React.RefObject<HTMLElement>;
}

const TABBABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Global state to manage modal locks
const modalLocks = new Map<HTMLElement, { count: number, originalInert: string | null, originalAriaHidden: string | null }>();

export const Modal: React.FC<ModalProps> = ({
    open,
    onClose,
    title,
    description,
    children,
    appRootSelector = '#root',
    initialFocusRef
}) => {
    const dialogRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    const descriptionId = useId();
    const [mounted, setMounted] = useState(false);

    // Store previous focus to restore when THIS modal instance closes
    const previousFocus = useRef<HTMLElement | null>(null);

    const hasLock = useRef(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Handling open state, locks, and focus entry
    useEffect(() => {
        const root = document.querySelector(appRootSelector) as HTMLElement;

        if (open) {
            previousFocus.current = document.activeElement as HTMLElement;

            if (root && !hasLock.current) {
                let lockData = modalLocks.get(root);
                if (!lockData) {
                    lockData = {
                        count: 0,
                        originalInert: root.getAttribute('inert'),
                        originalAriaHidden: root.getAttribute('aria-hidden')
                    };
                    modalLocks.set(root, lockData);
                    root.setAttribute('inert', '');
                    root.setAttribute('aria-hidden', 'true');
                }
                lockData.count += 1;
                hasLock.current = true;
            }

            // Focus entry delay to ensure render
            requestAnimationFrame(() => {
                if (initialFocusRef?.current) {
                    initialFocusRef.current.focus();
                } else if (dialogRef.current) {
                    const tabbables = Array.from(
                        dialogRef.current.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR)
                    ).filter(el => !el.hasAttribute('disabled') && !el.hasAttribute('hidden') && el.getAttribute('aria-hidden') !== 'true');

                    if (tabbables.length > 0) {
                        tabbables[0].focus();
                    } else {
                        dialogRef.current.focus();
                    }
                }
            });
        }

        // When modal closes (open becomes false), OR when unmounting
        return () => {
            if (open) {
                 const currentRoot = document.querySelector(appRootSelector) as HTMLElement;
                 if (hasLock.current && currentRoot) {
                     const lockData = modalLocks.get(currentRoot);
                     if (lockData) {
                         lockData.count -= 1;
                         if (lockData.count <= 0) {
                             if (lockData.originalInert !== null) {
                                 currentRoot.setAttribute('inert', lockData.originalInert);
                             } else {
                                 currentRoot.removeAttribute('inert');
                             }
                             if (lockData.originalAriaHidden !== null) {
                                 currentRoot.setAttribute('aria-hidden', lockData.originalAriaHidden);
                             } else {
                                 currentRoot.removeAttribute('aria-hidden');
                             }
                             modalLocks.delete(currentRoot);
                         }
                     }
                     hasLock.current = false;
                 }
                 if (previousFocus.current && document.body.contains(previousFocus.current)) {
                    previousFocus.current.focus();
                    previousFocus.current = null;
                }
            }
        };
    }, [open, appRootSelector, initialFocusRef]);

    // Handle keydown trapping (Escape, Tab)
    useEffect(() => {
        if (open) {
            const handleKeyDown = (e: KeyboardEvent) => {
                const currentDialog = dialogRef.current;
                if (e.key === 'Escape') {
                    onClose();
                } else if (e.key === 'Tab' && currentDialog) {
                    const tabbables = Array.from(
                        currentDialog.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR)
                    ).filter(el => !el.hasAttribute('disabled') && !el.hasAttribute('hidden') && el.getAttribute('aria-hidden') !== 'true');

                    if (tabbables.length === 0) {
                        e.preventDefault();
                        currentDialog.focus();
                        return;
                    }

                    const firstTabbable = tabbables[0];
                    const lastTabbable = tabbables[tabbables.length - 1];

                    if (e.shiftKey && document.activeElement === firstTabbable) {
                        e.preventDefault();
                        lastTabbable.focus();
                    } else if (!e.shiftKey && document.activeElement === lastTabbable) {
                        e.preventDefault();
                        firstTabbable.focus();
                    } else if (!currentDialog.contains(document.activeElement)) {
                        e.preventDefault();
                        firstTabbable.focus();
                    }
                }
            };

            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [open, onClose]);

    if (!open || !mounted) return null;

    return createPortal(
        <div className={styles.overlay} role="presentation">
            <div
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={description ? descriptionId : undefined}
                tabIndex={-1}
                ref={dialogRef}
            >
                <div className={styles.closeButton}>
                    <IconButton
                        iconId="close"
                        aria-label="Close modal"
                        variant="ghost"
                        onClick={onClose}
                    />
                </div>
                <h2 id={titleId} style={{ marginTop: 0, marginBottom: 'var(--spacing-4)' }}>{title}</h2>
                {description && <div id={descriptionId} style={{ marginBottom: 'var(--spacing-4)' }}>{description}</div>}
                <div>
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
};
