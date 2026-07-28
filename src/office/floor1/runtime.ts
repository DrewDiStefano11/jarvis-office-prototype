export type Floor1DataSource = 'existing-sample' | 'approved-production';

export function selectFloor1RuntimeSource(productionDocument: unknown): Floor1DataSource {
    if (productionDocument == null) return 'existing-sample';
    if (typeof productionDocument !== 'object') throw new Error('Approved Floor 1 data is invalid.');
    const record = productionDocument as Record<string, unknown>;
    if (record.productionApproved !== true || record.registrationStatus !== 'approved') {
        throw new Error('Normal office mode refuses candidate or provisional Floor 1 data.');
    }
    return 'approved-production';
}

