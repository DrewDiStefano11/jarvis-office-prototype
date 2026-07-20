import React, { useEffect, useRef } from 'react';
import styles from './Modal.module.css';
import { IconButton } from './IconButton';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            // Optionally focus dialog or first focusable element
            dialogRef.current?.focus();
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} role="presentation">
            <div
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
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
                <h2 id="modal-title" style={{ marginTop: 0, marginBottom: 'var(--spacing-4)' }}>{title}</h2>
                <div>
                    {children}
                </div>
            </div>
        </div>
    );
};
