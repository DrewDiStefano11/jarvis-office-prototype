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

    const child = React.isValidElement(children) ? children as React.ReactElement<Record<string, unknown>> : null;

    // Preserve child ID unless wrapper explicit ID is given
    const childId = child?.props.id ? String(child.props.id) : undefined;
    const actualId = id || childId || `field-${generatedId}`;

    const descriptionId = description ? `${actualId}-description` : undefined;
    const errorId = error ? `${actualId}-error` : undefined;

    // Build the wrapper's aria-describedby list
    const wrapperDescribedBy = [descriptionId, errorId].filter(Boolean);

    let ariaDescribedBy: string | undefined = wrapperDescribedBy.join(' ') || undefined;

    if (child && child.props['aria-describedby']) {
        const childDescribedBy = String(child.props['aria-describedby']).split(' ');
        // Combine, deduplicate
        const combined = Array.from(new Set([...childDescribedBy, ...wrapperDescribedBy])).filter(Boolean);
        ariaDescribedBy = combined.join(' ') || undefined;
    }

    const clonedChild = child
        ? React.cloneElement(child, {
            id: actualId,
            'aria-describedby': ariaDescribedBy,
            'aria-invalid': error ? true : child.props['aria-invalid']
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
