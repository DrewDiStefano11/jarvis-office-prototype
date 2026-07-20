import React from 'react';
import styles from './ProgressBar.module.css';
import { VisuallyHidden } from './VisuallyHidden';

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
    value: number; // 0 to 100
    max?: number;
    'aria-label'?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
    value,
    max = 100,
    'aria-label': ariaLabel = 'Progress',
    className = '',
    ...props
}) => {
    const clampedValue = Math.min(Math.max(value, 0), max);
    const percentage = (clampedValue / max) * 100;

    return (
        <div
            className={`${styles.progressContainer} ${className}`.trim()}
            role="progressbar"
            aria-valuenow={clampedValue}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-label={ariaLabel}
            {...props}
        >
            <div
                className={styles.progressBar}
                style={{ width: `${percentage}%` }}
            />
            <VisuallyHidden>{clampedValue}% complete</VisuallyHidden>
        </div>
    );
};
