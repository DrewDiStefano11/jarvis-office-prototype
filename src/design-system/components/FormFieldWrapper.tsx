import React, { useId } from 'react';
import styles from './FormFieldWrapper.module.css';

export interface FormFieldWrapperProps {
    id?: string;
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
    const generatedId = useId();
    const actualId = id || `field-${generatedId}`;

    const descriptionId = description ? `${actualId}-description` : undefined;
    const errorId = error ? `${actualId}-error` : undefined;

    let ariaDescribedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

    const child = React.isValidElement(children) ? children as React.ReactElement<any> : null;

    if (child && child.props['aria-describedby']) {
        ariaDescribedBy = ariaDescribedBy ? `${child.props['aria-describedby']} ${ariaDescribedBy}` : child.props['aria-describedby'];
    }

    const clonedChild = child
        ? React.cloneElement(child, {
            id: actualId,
            'aria-describedby': ariaDescribedBy,
            'aria-invalid': !!error
        })
        : children;

    return (
        <div className={styles.wrapper}>
            <label htmlFor={actualId} className={styles.label}>
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
