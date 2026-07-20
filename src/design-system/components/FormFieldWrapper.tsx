import React from 'react';
import styles from './FormFieldWrapper.module.css';

export interface FormFieldWrapperProps {
    id: string;
    label: string;
    description?: string;
    error?: string;
    children: React.ReactNode;
}

export const FormFieldWrapper: React.FC<FormFieldWrapperProps> = ({
    id,
    label,
    description,
    error,
    children
}) => {
    const descriptionId = description ? `${id}-description` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const ariaDescribedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

    // We clone the child to inject necessary accessibility props
    const clonedChild = React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
            id,
            'aria-describedby': ariaDescribedBy,
            'aria-invalid': !!error
        })
        : children;

    return (
        <div className={styles.wrapper}>
            <label htmlFor={id} className={styles.label}>
                {label}
            </label>
            {description && (
                <p id={descriptionId} className={styles.description}>
                    {description}
                </p>
            )}
            {clonedChild}
            {error && (
                <p id={errorId} className={styles.error} role="alert">
                    {error}
                </p>
            )}
        </div>
    );
};
