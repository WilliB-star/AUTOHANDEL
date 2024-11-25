import { Container, Typography, Button, Box } from '@mui/material'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import { useNavigate } from 'react-router-dom'

function AdminLogin() {
    const navigate = useNavigate()

    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Box
                sx={{
                    textAlign: 'center',
                    backgroundColor: 'background.paper',
                    borderRadius: 2,
                    p: 4,
                    boxShadow: 3
                }}
            >
                <Typography
                    variant="h4"
                    component="h1"
                    gutterBottom
                    sx={{ fontWeight: 'bold', mb: 4 }}
                >
                    Admin-Bereich
                </Typography>

                <Button
                    variant="contained"
                    size="large"
                    startIcon={<AdminPanelSettingsIcon />}
                    onClick={() => navigate('/admin/dashboard')}
                    sx={{
                        py: 2,
                        px: 4,
                        fontSize: '1.1rem'
                    }}
                >
                    Zum Dashboard
                </Button>
            </Box>
        </Container>
    )
}

export default AdminLogin