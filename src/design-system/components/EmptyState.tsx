import React from 'react';
import styles from './EmptyState.module.css';
import { Icon, IconId } from './Icon';

export interface EmptyStateProps {
    title: string;
    description?: string;
    iconId?: IconId;
    action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, iconId, action }) => {
    return (
        <div className={styles.emptyState}>
            {iconId && (
                <div className={styles.iconWrapper}>
                    <Icon id={iconId} size={48} />
                </div>
            )}
            <h3 className={styles.title}>{title}</h3>
            {description && <p className={styles.description}>{description}</p>}
            {action && <div style={{ marginTop: 'var(--spacing-4)' }}>{action}</div>}
        </div>
    );
};
