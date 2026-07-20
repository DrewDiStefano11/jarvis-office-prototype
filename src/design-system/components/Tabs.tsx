import React, { useState, useId } from 'react';
import styles from './Tabs.module.css';

export interface TabItem {
    id: string;
    label: string;
    content: React.ReactNode;
    disabled?: boolean;
}

export interface TabsProps {
    items: TabItem[];
    defaultActiveId?: string;
    'aria-label'?: string;
}

export const Tabs: React.FC<TabsProps> = ({ items, defaultActiveId, 'aria-label': ariaLabel }) => {
    const instanceId = useId();
    const [activeId, setActiveId] = useState(defaultActiveId || items.find(i => !i.disabled)?.id || items[0]?.id);

    const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
        const focusableItems = items.map((item, idx) => ({ ...item, idx })).filter(i => !i.disabled);
        const currentIndex = focusableItems.findIndex(i => i.idx === index);

        if (currentIndex === -1) return;

        let nextIndex = -1;
        if (e.key === 'ArrowRight') {
            nextIndex = focusableItems[(currentIndex + 1) % focusableItems.length].idx;
        } else if (e.key === 'ArrowLeft') {
            nextIndex = focusableItems[(currentIndex - 1 + focusableItems.length) % focusableItems.length].idx;
        } else if (e.key === 'Home') {
            nextIndex = focusableItems[0].idx;
        } else if (e.key === 'End') {
            nextIndex = focusableItems[focusableItems.length - 1].idx;
        }

        if (nextIndex !== -1) {
            e.preventDefault();
            const nextItem = items[nextIndex];
            setActiveId(nextItem.id);
            document.getElementById(`tab-${instanceId}-${nextItem.id}`)?.focus();
        }
    };

    return (
        <div>
            <div className={styles.tabList} role="tablist" aria-label={ariaLabel}>
                {items.map((item, index) => {
                    const isSelected = activeId === item.id;
                    const tabId = `tab-${instanceId}-${item.id}`;
                    const panelId = `panel-${instanceId}-${item.id}`;
                    return (
                        <button
                            key={item.id}
                            role="tab"
                            aria-selected={isSelected}
                            aria-controls={panelId}
                            aria-disabled={item.disabled}
                            disabled={item.disabled}
                            id={tabId}
                            tabIndex={isSelected ? 0 : -1}
                            className={`${styles.tab} ${isSelected ? styles.active : ''}`}
                            onClick={() => !item.disabled && setActiveId(item.id)}
                            onKeyDown={(e) => handleKeyDown(e, index)}
                        >
                            {item.label}
                        </button>
                    );
                })}
            </div>
            {items.map(item => {
                const isSelected = activeId === item.id;
                const tabId = `tab-${instanceId}-${item.id}`;
                const panelId = `panel-${instanceId}-${item.id}`;
                return (
                    <div
                        key={item.id}
                        id={panelId}
                        role="tabpanel"
                        tabIndex={0}
                        aria-labelledby={tabId}
                        hidden={!isSelected}
                        className={styles.tabPanel}
                        style={{ display: isSelected ? 'block' : 'none' }}
                    >
                        {item.content}
                    </div>
                );
            })}
        </div>
    );
};
