import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import io from 'socket.io-client';

const blackRoundIcon = L.divIcon({
    className: 'custom-marker-icon',
    iconSize: [20, 20],
    html: '<div style="width: 20px; height: 20px; background-color: black; border-radius: 50%;"></div>',
});

const PanMapToMarker = ({ position }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(position, map.getZoom());
    }, [position, map]);
    return null;
};

const Map = () => {
    const [startingPoint, setStartingPoint] = useState(null);
    const [endingPoint, setEndingPoint] = useState(null);
    const [routePolyline, setRoutePolyline] = useState([]);
    const [bearing, setBearing] = useState(0);

    useEffect(() => {
        const fetchRoute = async () => {
            try {
                const response = await axios.get('http://172.17.48.79:4000/api/route');
                setStartingPoint(response.data.startingPoint);
                setEndingPoint(response.data.endingPoint);
                setRoutePolyline(response.data.routePolyline);

                const newBearing = calculateBearing(response.data.startingPoint, response.data.endingPoint);
                setBearing(newBearing);
            } catch (error) {
                console.error('Error fetching route:', error);
            }
        };

        fetchRoute();

        const socket = io('http://172.17.48.79:4000');
        socket.on('routeUpdate', (data) => {
            setStartingPoint(data.startingPoint);
            setEndingPoint(data.endingPoint);
            setRoutePolyline(data.routePolyline);
            setBearing(calculateBearing(data.startingPoint, data.endingPoint));
        });

        return () => socket.disconnect();
    }, []);

    const calculateBearing = (start, end) => {
        const startLat = (Math.PI / 180) * start.lat;
        const startLng = (Math.PI / 180) * start.lng;
        const endLat = (Math.PI / 180) * end.lat;
        const endLng = (Math.PI / 180) * end.lng;

        const dLng = endLng - startLng;
        const x = Math.sin(dLng) * Math.cos(endLat);
        const y = Math.cos(startLat) * Math.sin(endLat) - Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);
        return (Math.atan2(x, y) * 180) / Math.PI;
    };

    if (!startingPoint || !endingPoint || routePolyline.length === 0) return <p>Loading...</p>;

    const arrowLength = 0.0002;
    const tip = {
        lat: startingPoint.lat + arrowLength * Math.cos((bearing * Math.PI) / 180),
        lng: startingPoint.lng + arrowLength * Math.sin((bearing * Math.PI) / 180),
    };

    return (
        <MapContainer center={[startingPoint.lat, startingPoint.lng]} zoom={20} style={{ height: '100vh', width: '100%' }}>
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <PanMapToMarker position={[startingPoint.lat, startingPoint.lng]} />

            <Polyline positions={routePolyline.map(point => [point.lat, point.lng])} color="blue" weight={4} />

            {/* <Polyline
                positions={[
                    [startingPoint.lat, startingPoint.lng],
                    [tip.lat, tip.lng],
                ]}
                color="red"
                weight={2}
            /> */}

            <Marker position={[startingPoint.lat, startingPoint.lng]} icon={blackRoundIcon} />
        </MapContainer>
    );
};

export default Map;
