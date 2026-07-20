import React from 'react';
import styles from './Tooltip.module.css';

export interface TooltipProps {
    content: string;
    children: React.ReactElement;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
    return (
        <div className={styles.tooltipContainer}>
            {children}
            <div className={styles.tooltipContent} role="tooltip">
                {content}
            </div>
        </div>
    );
};
