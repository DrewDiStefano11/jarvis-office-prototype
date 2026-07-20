import React, { useState } from 'react';
import styles from './Tabs.module.css';

export interface TabItem {
    id: string;
    label: string;
    content: React.ReactNode;
}

export interface TabsProps {
    items: TabItem[];
    defaultActiveId?: string;
    'aria-label'?: string;
}

export const Tabs: React.FC<TabsProps> = ({ items, defaultActiveId, 'aria-label': ariaLabel }) => {
    const [activeId, setActiveId] = useState(defaultActiveId || items[0]?.id);

    return (
        <div>
            <div className={styles.tabList} role="tablist" aria-label={ariaLabel}>
                {items.map(item => (
                    <button
                        key={item.id}
                        role="tab"
                        aria-selected={activeId === item.id}
                        aria-controls={`panel-${item.id}`}
                        id={`tab-${item.id}`}
                        className={`${styles.tab} ${activeId === item.id ? styles.active : ''}`}
                        onClick={() => setActiveId(item.id)}
                    >
                        {item.label}
                    </button>
                ))}
            </div>
            {items.map(item => (
                <div
                    key={item.id}
                    id={`panel-${item.id}`}
                    role="tabpanel"
                    tabIndex={0}
                    aria-labelledby={`tab-${item.id}`}
                    hidden={activeId !== item.id}
                    className={styles.tabPanel}
                >
                    {item.content}
                </div>
            ))}
        </div>
    );
};
