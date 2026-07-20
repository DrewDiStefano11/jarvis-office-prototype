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
    const previousFocus = useRef<HTMLElement | null>(null);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        const root = document.querySelector(appRootSelector) as HTMLElement;
        let originalInert: string | null = null;
        let originalAriaHidden: string | null = null;

        if (open) {
            previousFocus.current = document.activeElement as HTMLElement;

            if (root && !root.contains(dialogRef.current)) {
                originalInert = root.getAttribute('inert');
                originalAriaHidden = root.getAttribute('aria-hidden');

                root.setAttribute('inert', '');
                root.setAttribute('aria-hidden', 'true');
            }

            // Handle focus entry
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

            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    onClose();
                } else if (e.key === 'Tab' && dialogRef.current) {
                    const tabbables = Array.from(
                        dialogRef.current.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR)
                    ).filter(el => !el.hasAttribute('disabled') && !el.hasAttribute('hidden') && el.getAttribute('aria-hidden') !== 'true');

                    if (tabbables.length === 0) {
                        e.preventDefault();
                        dialogRef.current.focus();
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
                    } else if (!dialogRef.current.contains(document.activeElement)) {
                        e.preventDefault();
                        firstTabbable.focus();
                    }
                }
            };

            document.addEventListener('keydown', handleKeyDown);

            return () => {
                document.removeEventListener('keydown', handleKeyDown);
                if (root && !root.contains(dialogRef.current)) {
                    if (originalInert !== null) {
                        root.setAttribute('inert', originalInert);
                    } else {
                        root.removeAttribute('inert');
                    }

                    if (originalAriaHidden !== null) {
                        root.setAttribute('aria-hidden', originalAriaHidden);
                    } else {
                        root.removeAttribute('aria-hidden');
                    }
                }

                if (previousFocus.current && document.body.contains(previousFocus.current)) {
                    previousFocus.current.focus();
                }
            };
        }
    }, [open, onClose, appRootSelector, initialFocusRef]);

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
