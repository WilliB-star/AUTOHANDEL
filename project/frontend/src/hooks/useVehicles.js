import { useState, useEffect, useCallback } from 'react';
import { API_URL, VEHICLES_URL, UPLOADS_URL } from '../config/api';

export function useVehicles() {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchVehicles = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`${VEHICLES_URL}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            // Add full URLs to images
            const vehiclesWithFullUrls = data.map(vehicle => ({
                ...vehicle,
                images: vehicle.images?.map(image => 
                    image.startsWith('http') ? image : `${UPLOADS_URL}/${image}`
                ) || []
            }));
            
            setVehicles(vehiclesWithFullUrls);
        } catch (err) {
            console.error('Error fetching vehicles:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []); // Empty dependency array as it doesn't depend on any props or state

    useEffect(() => {
        fetchVehicles();
    }, [fetchVehicles]);

    const getVehicle = useCallback(async (id) => {
        try {
            const response = await fetch(`${VEHICLES_URL}/${id}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            // Add full URLs to images if they exist
            if (data && data.images) {
                data.images = data.images.map(image => 
                    image.startsWith('http') ? image : `${UPLOADS_URL}/${image}`
                );
            }
            
            return data;
        } catch (err) {
            console.error('Error fetching vehicle:', err);
            throw err;
        }
    }, []); // Empty dependency array as it doesn't depend on any props or state

    const addVehicle = useCallback(async (vehicleData, images) => {
        try {
            if (!vehicleData.brand || !vehicleData.model) {
                throw new Error('Marke und Modell sind erforderlich');
            }

            const formData = new FormData();

            // Convert numeric values
            const numericFields = ['year', 'price', 'mileage'];
            numericFields.forEach(field => {
                if (vehicleData[field]) {
                    vehicleData[field] = Number(vehicleData[field]);
                }
            });

            // Add vehicle data
            Object.keys(vehicleData).forEach(key => {
                if (key !== 'images' && key !== 'features') {
                    if (vehicleData[key] != null) {
                        formData.append(key, vehicleData[key]);
                    }
                }
            });

            // Add features as JSON string
            if (vehicleData.features && Array.isArray(vehicleData.features)) {
                formData.append('features', JSON.stringify(vehicleData.features));
            }

            // Add images
            if (images && Array.isArray(images)) {
                images.forEach((image) => {
                    if (image instanceof File) {
                        formData.append('images', image);
                    }
                });
            }

            console.log('Sending vehicle data:', {
                ...vehicleData,
                images: images ? `${images.length} images` : 'no images'
            });

            const response = await fetch(VEHICLES_URL, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Fehler beim Erstellen des Fahrzeugs');
            }

            const data = await response.json();
            await fetchVehicles();
            return data;
        } catch (err) {
            console.error('Error adding vehicle:', err);
            throw err;
        }
    }, [fetchVehicles]);

    const updateVehicle = useCallback(async (id, vehicleData) => {
        try {
            const formData = new FormData();

            // Convert numeric values
            const numericFields = ['year', 'price', 'mileage'];
            numericFields.forEach(field => {
                if (vehicleData[field]) {
                    vehicleData[field] = Number(vehicleData[field]);
                }
            });

            // Add vehicle data
            Object.keys(vehicleData).forEach(key => {
                if (key !== 'images' && key !== 'features') {
                    if (vehicleData[key] != null) {
                        formData.append(key, vehicleData[key]);
                    }
                }
            });

            // Add features as JSON string
            if (vehicleData.features && Array.isArray(vehicleData.features)) {
                formData.append('features', JSON.stringify(vehicleData.features));
            }

            // Add images
            if (vehicleData.images && Array.isArray(vehicleData.images)) {
                vehicleData.images.forEach((image) => {
                    if (image instanceof File) {
                        formData.append('images', image);
                    }
                });
            }

            const response = await fetch(`${VEHICLES_URL}/${id}`, {
                method: 'PUT',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Fehler beim Aktualisieren des Fahrzeugs');
            }

            await fetchVehicles();
        } catch (err) {
            console.error('Error updating vehicle:', err);
            throw err;
        }
    }, [fetchVehicles]);

    const deleteVehicle = useCallback(async (id) => {
        try {
            const response = await fetch(`${VEHICLES_URL}/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Fehler beim Löschen des Fahrzeugs');
            }

            await fetchVehicles();
        } catch (err) {
            console.error('Error deleting vehicle:', err);
            throw err;
        }
    }, [fetchVehicles]);

    return {
        vehicles,
        loading,
        error,
        addVehicle,
        updateVehicle,
        deleteVehicle,
        getVehicle,
        refetch: fetchVehicles
    };
}