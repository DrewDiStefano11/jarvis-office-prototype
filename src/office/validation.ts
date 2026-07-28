import { LAYER_ORDER } from './layers';
import { OFFICE_SOURCE_HEIGHT, OFFICE_SOURCE_WIDTH } from './constants';
import {
    AccessState,
    OfficeEntity,
    OfficeEntityType,
    OfficeGeometry,
    OfficeOverlayDocument,
    PathNode,
    Point,
    SeatPriority,
} from './types';

export type ValidationResult =
    | Readonly<{ valid: true; value: OfficeOverlayDocument; errors: readonly [] }>
    | Readonly<{ valid: false; errors: readonly string[] }>;

const ENTITY_TYPES: readonly OfficeEntityType[] = [
    'room', 'walk_path', 'wall', 'door', 'desk', 'computer', 'access_light',
    'effect_zone', 'sprite_anchor', 'restricted_zone', 'interaction_zone', 'label_anchor',
];
const ACCESS_STATES: readonly AccessState[] = ['green', 'blue', 'yellow', 'red'];
const SEAT_PRIORITIES: readonly SeatPriority[] = ['yellow', 'red'];
const ID_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const CSS_COLOR_PATTERN = /^(#[0-9a-f]{3,8}|[a-z]+)$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finite(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function validatePoint(point: unknown, path: string, errors: string[], width: number, height: number, allowOut: boolean): point is Point {
    if (!isRecord(point) || !finite(point.x) || !finite(point.y)) {
        errors.push(`${path} must contain finite x and y values.`);
        return false;
    }
    if (!allowOut && (point.x < 0 || point.x > width || point.y < 0 || point.y > height)) {
        errors.push(`${path} is outside the ${width}×${height} source bounds.`);
    }
    return true;
}

function validateGeometry(
    geometry: unknown,
    path: string,
    errors: string[],
    width: number,
    height: number,
    allowOut: boolean,
): geometry is OfficeGeometry {
    if (!isRecord(geometry) || typeof geometry.kind !== 'string') {
        errors.push(`${path} is malformed.`);
        return false;
    }
    if (geometry.kind === 'point') {
        return validatePoint(geometry.point, `${path}.point`, errors, width, height, allowOut);
    }
    if (geometry.kind === 'rectangle') {
        const rect = geometry.rect;
        if (!isRecord(rect) || !finite(rect.x) || !finite(rect.y) || !finite(rect.width) || !finite(rect.height)) {
            errors.push(`${path}.rect must contain finite x, y, width, and height values.`);
            return false;
        }
        if (rect.width <= 0 || rect.height <= 0) errors.push(`${path}.rect must have positive area.`);
        validatePoint({ x: rect.x, y: rect.y }, `${path}.rect origin`, errors, width, height, allowOut);
        validatePoint({ x: rect.x + rect.width, y: rect.y + rect.height }, `${path}.rect extent`, errors, width, height, allowOut);
        return true;
    }
    if (geometry.kind === 'polygon' || geometry.kind === 'polyline') {
        if (!Array.isArray(geometry.points)) {
            errors.push(`${path}.points must be an array.`);
            return false;
        }
        const minimum = geometry.kind === 'polygon' ? 3 : 2;
        if (geometry.points.length < minimum) errors.push(`${path} requires at least ${minimum} points.`);
        geometry.points.forEach((point, index) =>
            validatePoint(point, `${path}.points[${index}]`, errors, width, height, allowOut));
        for (let index = 1; index < geometry.points.length; index += 1) {
            const previous = geometry.points[index - 1];
            const current = geometry.points[index];
            if (isRecord(previous) && isRecord(current) && previous.x === current.x && previous.y === current.y) {
                errors.push(`${path} contains a zero-length segment at index ${index - 1}.`);
            }
        }
        if (geometry.kind === 'polyline' && (!finite(geometry.width) || geometry.width <= 0)) {
            errors.push(`${path}.width must be a positive finite number.`);
        }
        return true;
    }
    errors.push(`${path}.kind is unsupported.`);
    return false;
}

function validateAnimation(entity: Record<string, unknown>, path: string, errors: string[]): void {
    if (!isRecord(entity.sprite)) return;
    const animation = entity.sprite.animation;
    if (!isRecord(animation)) {
        errors.push(`${path}.sprite.animation is required.`);
        return;
    }
    for (const field of ['frameWidth', 'frameHeight', 'frameCount', 'frameDurationMs'] as const) {
        if (!finite(animation[field]) || animation[field] <= 0 || !Number.isInteger(animation[field])) {
            errors.push(`${path}.sprite.animation.${field} must be a positive integer.`);
        }
    }
    if (!Array.isArray(animation.frameSequence) || animation.frameSequence.length === 0 ||
        animation.frameSequence.some(frame => !Number.isInteger(frame) || frame < 0 ||
            (finite(animation.frameCount) && frame >= animation.frameCount))) {
        errors.push(`${path}.sprite.animation.frameSequence contains invalid frames.`);
    }
    for (const field of ['loop', 'pingPong', 'idle'] as const) {
        if (typeof animation[field] !== 'boolean') errors.push(`${path}.sprite.animation.${field} must be boolean.`);
    }
    if (typeof entity.sprite.glow === 'string' && !CSS_COLOR_PATTERN.test(entity.sprite.glow)) {
        errors.push(`${path}.sprite.glow is not a supported color.`);
    }
}

function validateEntity(
    value: unknown,
    index: number,
    errors: string[],
    width: number,
    height: number,
): value is OfficeEntity {
    const path = `entities[${index}]`;
    if (!isRecord(value)) {
        errors.push(`${path} must be an object.`);
        return false;
    }
    if (typeof value.id !== 'string' || !ID_PATTERN.test(value.id)) errors.push(`${path}.id is invalid.`);
    if (typeof value.type !== 'string' || !ENTITY_TYPES.includes(value.type as OfficeEntityType)) errors.push(`${path}.type is invalid.`);
    if (typeof value.name !== 'string' || value.name.trim() === '') errors.push(`${path}.name is required.`);
    if (typeof value.sourceLayer !== 'string' || !LAYER_ORDER.includes(value.sourceLayer as never)) errors.push(`${path}.sourceLayer is invalid.`);
    if (typeof value.enabled !== 'boolean') errors.push(`${path}.enabled must be boolean.`);
    if (typeof value.interactive !== 'boolean') errors.push(`${path}.interactive must be boolean.`);
    if (!isRecord(value.metadata)) errors.push(`${path}.metadata must be an object.`);
    if (!finite(value.zIndex) || !Number.isInteger(value.zIndex)) errors.push(`${path}.zIndex must be an integer.`);
    if (value.tags !== undefined && (!Array.isArray(value.tags) || value.tags.some(tag => typeof tag !== 'string'))) {
        errors.push(`${path}.tags must contain strings.`);
    }
    if (value.linkedEntityIds !== undefined && (!Array.isArray(value.linkedEntityIds) ||
        value.linkedEntityIds.some(id => typeof id !== 'string'))) errors.push(`${path}.linkedEntityIds must contain strings.`);
    validateGeometry(value.geometry, `${path}.geometry`, errors, width, height, value.allowOutOfBounds === true);
    if (value.accessState !== undefined && !ACCESS_STATES.includes(value.accessState as AccessState)) errors.push(`${path}.accessState is invalid.`);
    if (value.seatPriority !== undefined && !SEAT_PRIORITIES.includes(value.seatPriority as SeatPriority)) errors.push(`${path}.seatPriority is invalid.`);
    if (isRecord(value.accessPolicy) && !ACCESS_STATES.includes(value.accessPolicy.state as AccessState)) errors.push(`${path}.accessPolicy.state is invalid.`);
    if (isRecord(value.door)) {
        if (!ACCESS_STATES.includes(value.door.currentState as AccessState) ||
            !ACCESS_STATES.includes(value.door.defaultState as AccessState)) errors.push(`${path}.door access state is invalid.`);
        if (!Array.isArray(value.door.linkedRoomIds)) errors.push(`${path}.door.linkedRoomIds must be an array.`);
        if (!['open', 'closed'].includes(String(value.door.visualState))) errors.push(`${path}.door.visualState is invalid.`);
        if (typeof value.door.locked !== 'boolean') errors.push(`${path}.door.locked must be boolean.`);
    }
    if (value.type === 'walk_path') {
        if (!isRecord(value.path)) {
            errors.push(`${path}.path is required for walk paths.`);
        } else {
            for (const field of ['nodeIds', 'linkedIntersectionIds', 'linkedRoomIds', 'linkedDoorIds'] as const) {
                if (!Array.isArray(value.path[field]) || value.path[field].some(id => typeof id !== 'string')) {
                    errors.push(`${path}.path.${field} must contain strings.`);
                }
            }
            if (!['one_way', 'bidirectional'].includes(String(value.path.direction))) errors.push(`${path}.path.direction is invalid.`);
            if (typeof value.path.blocked !== 'boolean') errors.push(`${path}.path.blocked must be boolean.`);
        }
    }
    validateAnimation(value, path, errors);
    return true;
}

function validatePathNodes(value: unknown, errors: string[], width: number, height: number): value is readonly PathNode[] {
    if (!Array.isArray(value)) {
        errors.push('pathNodes must be an array.');
        return false;
    }
    value.forEach((node, index) => {
        if (!isRecord(node) || typeof node.id !== 'string' || !ID_PATTERN.test(node.id)) {
            errors.push(`pathNodes[${index}].id is invalid.`);
            return;
        }
        validatePoint(node.point, `pathNodes[${index}].point`, errors, width, height, false);
        if (!Array.isArray(node.connectedNodeIds) || node.connectedNodeIds.some(id => typeof id !== 'string')) {
            errors.push(`pathNodes[${index}].connectedNodeIds must contain strings.`);
        }
    });
    return true;
}

export function validateOverlayDocument(input: unknown): ValidationResult {
    const errors: string[] = [];
    if (!isRecord(input)) return { valid: false, errors: ['Overlay document must be an object.'] };
    if (input.schemaVersion !== 1) errors.push(`Unsupported schema version: ${String(input.schemaVersion)}.`);
    const source = input.source;
    if (!isRecord(source) || !finite(source.width) || !finite(source.height) || source.width <= 0 || source.height <= 0) {
        errors.push('source must define positive finite width and height.');
    } else if (source.width !== OFFICE_SOURCE_WIDTH || source.height !== OFFICE_SOURCE_HEIGHT) {
        errors.push(`source must match the canonical ${OFFICE_SOURCE_WIDTH}×${OFFICE_SOURCE_HEIGHT} office image.`);
    }
    if (typeof input.production !== 'boolean') errors.push('production must be boolean.');
    const width = isRecord(source) && finite(source.width) ? source.width : 0;
    const height = isRecord(source) && finite(source.height) ? source.height : 0;
    if (!Array.isArray(input.entities)) errors.push('entities must be an array.');
    else input.entities.forEach((entity, index) => validateEntity(entity, index, errors, width, height));
    validatePathNodes(input.pathNodes, errors, width, height);

    if (Array.isArray(input.entities)) {
        const ids = input.entities.map(entity => isRecord(entity) ? entity.id : undefined).filter((id): id is string => typeof id === 'string');
        const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
        [...new Set(duplicates)].forEach(id => errors.push(`Duplicate entity ID: ${id}.`));
        const idSet = new Set(ids);
        input.entities.forEach((entity, index) => {
            if (!isRecord(entity)) return;
            const references = [
                ...(Array.isArray(entity.linkedEntityIds) ? entity.linkedEntityIds : []),
                ...(typeof entity.parentId === 'string' ? [entity.parentId] : []),
            ];
            references.forEach(reference => {
                if (typeof reference === 'string' && !idSet.has(reference)) errors.push(`entities[${index}] references unknown entity ${reference}.`);
            });
            if (isRecord(entity.door) && Array.isArray(entity.door.linkedRoomIds)) {
                entity.door.linkedRoomIds.forEach(reference => {
                    if (typeof reference === 'string' && !idSet.has(reference)) errors.push(`entities[${index}].door references unknown room ${reference}.`);
                });
            }
            if (isRecord(entity.path)) {
                for (const field of ['linkedRoomIds', 'linkedDoorIds'] as const) {
                    if (!Array.isArray(entity.path[field])) continue;
                    entity.path[field].forEach(reference => {
                        if (typeof reference === 'string' && !idSet.has(reference)) {
                            errors.push(`entities[${index}].path.${field} references unknown entity ${reference}.`);
                        }
                    });
                }
            }
        });
    }
    if (Array.isArray(input.pathNodes)) {
        const nodeIds = input.pathNodes.map(node => isRecord(node) ? node.id : undefined).filter((id): id is string => typeof id === 'string');
        const nodeSet = new Set(nodeIds);
        nodeIds.filter((id, index) => nodeIds.indexOf(id) !== index)
            .forEach(id => errors.push(`Duplicate path node ID: ${id}.`));
        input.pathNodes.forEach((node, index) => {
            if (!isRecord(node) || !Array.isArray(node.connectedNodeIds)) return;
            node.connectedNodeIds.forEach(reference => {
                if (typeof reference === 'string' && !nodeSet.has(reference)) errors.push(`pathNodes[${index}] references unknown node ${reference}.`);
            });
        });
        if (Array.isArray(input.entities)) {
            input.entities.forEach((entity, index) => {
                if (!isRecord(entity) || !isRecord(entity.path)) return;
                for (const field of ['nodeIds', 'linkedIntersectionIds'] as const) {
                    if (!Array.isArray(entity.path[field])) continue;
                    entity.path[field].forEach(reference => {
                        if (typeof reference === 'string' && !nodeSet.has(reference)) {
                            errors.push(`entities[${index}].path.${field} references unknown node ${reference}.`);
                        }
                    });
                }
            });
        }
    }
    if (errors.length > 0) return { valid: false, errors };
    return { valid: true, value: input as unknown as OfficeOverlayDocument, errors: [] };
}

export function assertValidOverlayDocument(input: unknown): OfficeOverlayDocument {
    const result = validateOverlayDocument(input);
    if (!result.valid) throw new Error(`Invalid office overlay:\n${result.errors.join('\n')}`);
    return result.value;
}
