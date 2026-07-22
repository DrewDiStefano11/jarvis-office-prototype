import React, { useState, useEffect } from 'react';
import { Room } from '../data/floorOne/floorOneTypes';
import { EventBus } from '../game/EventBus';

export const RoomInspector: React.FC = () => {
    const [hoveredRoom, setHoveredRoom] = useState<Room | null>(null);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

    useEffect(() => {
        const onHover = (room: Room) => setHoveredRoom(room);
        const onHoverOut = () => setHoveredRoom(null);
        const onSelect = (room: Room | null) => setSelectedRoom(room);

        EventBus.on('room-hovered', onHover);
        EventBus.on('room-hover-out', onHoverOut);
        EventBus.on('room-selected', onSelect);

        return () => {
            EventBus.removeListener('room-hovered', onHover);
            EventBus.removeListener('room-hover-out', onHoverOut);
            EventBus.removeListener('room-selected', onSelect);
        };
    }, []);

    const handleMoveHere = () => {
        if (selectedRoom) {
            EventBus.emit('react-move-character-to', selectedRoom.id);
        }
    };

    if (selectedRoom) {
        return (
            <div className="room-inspector selected">
                <h3>{selectedRoom.name}</h3>
                <p><strong>ID:</strong> {selectedRoom.id}</p>
                <p><strong>Department:</strong> {selectedRoom.department}</p>
                <p><strong>Category:</strong> {selectedRoom.category}</p>
                <p><strong>Description:</strong> {selectedRoom.description}</p>
                <p><strong>Access:</strong> {selectedRoom.accessClassification || 'Standard'}</p>
                <p><strong>Status:</strong> {selectedRoom.operationalStatusPlaceholder || 'Operational'}</p>
                <p><strong>Capacity:</strong> {selectedRoom.occupancyCapacityPlaceholder || 'Unknown'}</p>

                <div style={{ marginTop: '15px' }}>
                    <button className="map-btn active" onClick={handleMoveHere}>
                        Move Test Character Here
                    </button>
                </div>
            </div>
        );
    }

    if (hoveredRoom) {
        return (
            <div className="room-inspector hover">
                <h3>{hoveredRoom.name}</h3>
                <p><strong>Department:</strong> {hoveredRoom.department}</p>
                <p><strong>Category:</strong> {hoveredRoom.category}</p>
                <p><em>Click to view details</em></p>
            </div>
        );
    }

    return (
        <div className="room-inspector empty">
            <h3>Inspector</h3>
            <p>Hover over rooms (when debug geometry is active, or natively over polygons) to see details.</p>
            <p>Click a room to lock selection and view interaction options.</p>
        </div>
    );
};
