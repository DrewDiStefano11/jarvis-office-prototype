import React from 'react';
import styles from './InlineAlert.module.css';
import { Icon, IconId } from './Icon';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface InlineAlertProps {
    variant?: AlertVariant;
    title?: string;
    message: React.ReactNode;
}

const variantIconMap: Record<AlertVariant, IconId> = {
    info: 'agent', // Using agent as a placeholder for info
    success: 'success',
    warning: 'warning',
    error: 'warning' // Reusing warning for error if no specific error icon
};

export const InlineAlert: React.FC<InlineAlertProps> = ({ variant = 'info', title, message }) => {
    return (
        <div className={`${styles.alert} ${styles[variant]}`} role="alert">
            <Icon id={variantIconMap[variant]} className={styles.icon} />
            <div className={styles.content}>
                {title && <h4 className={styles.title}>{title}</h4>}
                <div className={styles.message}>{message}</div>
            </div>
        </div>
    );
};
