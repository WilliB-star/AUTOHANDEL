import { Link } from 'react-router-dom'
import { AppBar, Toolbar, Button, Typography, Box, Container } from '@mui/material'

function Navbar() {
    return (
        <AppBar position="fixed">
            <Container maxWidth="xl">
                <Toolbar disableGutters>
                    <Typography
                        variant="h6"
                        component={Link}
                        to="/"
                        sx={{
                            mr: 2,
                            fontWeight: 700,
                            color: 'white',
                            textDecoration: 'none',
                        }}
                    >
                        KFZ ALKERKER
                    </Typography>

                    <Box sx={{ flexGrow: 1 }} />

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                            component={Link}
                            to="/vehicles"
                            sx={{ color: 'white' }}
                        >
                            Fahrzeuge
                        </Button>
                        <Button
                            component={Link}
                            to="/sell"
                            sx={{ color: 'white' }}
                        >
                            Verkaufen
                        </Button>
                        <Button
                            component={Link}
                            to="/admin/login"
                            sx={{ color: 'white' }}
                        >
                            Admin
                        </Button>
                    </Box>
                </Toolbar>
            </Container>
        </AppBar>
    )
}

export default Navbar