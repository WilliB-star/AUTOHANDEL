import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import VehicleList from './pages/VehicleList';
import VehicleDetail from './pages/VehicleDetail';
import VerkaufenKFormu from './pages/VerkaufenKFormu';
import AdminLogin from './components/AdminLogin'; 
import AdminDashboard from './pages/AdminDashboard';


function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="vehicles" element={<VehicleList />} />
        <Route path="vehicles/:id" element={<VehicleDetail />} />
        <Route path="sell" element={<VerkaufenKFormu />} />
        <Route path="admin/login" element={<AdminLogin />} />
        <Route path = "admin/dashboard" element = {< AdminDashboard />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />  
        
      </Route>
    </Routes>
  )
}

export default App

