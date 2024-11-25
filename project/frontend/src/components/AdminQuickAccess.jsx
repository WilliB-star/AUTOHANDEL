import { Button } from '@mui/material'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import { useNavigate } from 'react-router-dom'

function AdminQuickAccess() {
  const navigate = useNavigate()

  return (
    <Button
      variant="contained"
      color="warning"
      startIcon={<AdminPanelSettingsIcon />}
      onClick={() => navigate('/admin/dashboard')}
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 1000,
        borderRadius: 2,
        padding: '10px 20px',
        boxShadow: 3,
      }}
    >
      Admin Dashboard
    </Button>
  )
}

export default AdminQuickAccess