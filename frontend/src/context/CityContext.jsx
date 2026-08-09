import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';

const CityContext = createContext(null);

export const CityProvider = ({ children }) => {
  const { user } = useAuth();
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch all cities (for dropdowns, especially for Super Admin)
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await api.get('/geography/cities/');
        if (response.data.success) {
          setCities(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch cities", error);
      }
    };
    fetchCities();
  }, []);

  // Determine authorized city scope
  useEffect(() => {
    if (!user) {
      setSelectedCity(null);
      setLoading(false);
      return;
    }

    if (user.role?.name === 'SUPER_ADMIN') {
      // Super admin can select any city. Start with the first one or a default if available.
      if (cities.length > 0 && !selectedCity) {
        setSelectedCity(cities[0]);
      }
      setLoading(false);
    } else {
      // Regular user: their city scope is fixed based on their profile
      const userCity = user.profile?.city_ref;
      if (userCity) {
        setSelectedCity(userCity);
      }
      setLoading(false);
    }
  }, [user, cities]);

  const changeCity = (cityId) => {
    if (user?.role?.name === 'SUPER_ADMIN') {
      const city = cities.find(c => c.id === parseInt(cityId, 10));
      if (city) {
        setSelectedCity(city);
      }
    } else {
      console.warn("Only Super Admins can change their city scope.");
    }
  };

  return (
    <CityContext.Provider value={{ cities, selectedCity, loading, changeCity }}>
      {children}
    </CityContext.Provider>
  );
};

export const useCity = () => useContext(CityContext);
