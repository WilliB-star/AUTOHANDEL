import { useState } from 'react'
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  Button,
  Grid,
  MenuItem,
  Alert,
  Stepper,
  Step,
  StepLabel
} from '@mui/material'
import ImageUpload from '../components/shared/ImageUpload'


const FUEL_TYPES = ['Benzin', 'Diesel', 'Elektro', 'Hybrid', 'Plug-in-Hybrid', 'Gas']
const TRANSMISSION_TYPES = ['Automatik', 'Schaltgetriebe']

function VerkaufenKFormu() {
  const [activeStep, setActiveStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    year: '',
    mileage: '',
    price: '',
    fuelType: '',
    transmission: '',
    power: '',
    description: '',
    contactName: '',
    email: '',
    phone: '',
    images: []
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleImageAdd = (newImages) => {
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...newImages].slice(0, 10) // Limit to 10 images
    }))
  }

  const handleImageDelete = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Speichern im localStorage
    const forms = JSON.parse(localStorage.getItem('customerForms') || '[]')
    const newForm = {
      id: Date.now(),
      date: new Date().toISOString(),
      customerName: formData.contactName,
      email: formData.email,
      phone: formData.phone,
      status: 'neu',
      vehicle: {
        brand: formData.brand,
        model: formData.model,
        year: formData.year,
        mileage: formData.mileage,
        price: formData.price,
        fuelType: formData.fuelType,
        transmission: formData.transmission,
        power: formData.power,
        description: formData.description
      },
      images: formData.images.map(file => URL.createObjectURL(file))
    }
    forms.unshift(newForm)
    localStorage.setItem('customerForms', JSON.stringify(forms))
    
    setSubmitted(true)
    setFormData({
      brand: '',
      model: '',
      year: '',
      mileage: '',
      price: '',
      fuelType: '',
      transmission: '',
      power: '',
      description: '',
      contactName: '',
      email: '',
      phone: '',
      images: []
    })
  }

  const steps = ['Fahrzeugdaten', 'Bilder', 'Kontaktdaten']

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Marke"
                name="brand"
                value={formData.brand}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Modell"
                name="model"
                value={formData.model}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Baujahr"
                name="year"
                type="number"
                value={formData.year}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Kilometerstand"
                name="mileage"
                type="number"
                value={formData.mileage}
                onChange={handleInputChange}
                InputProps={{
                  endAdornment: 'km'
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                select
                label="Kraftstoff"
                name="fuelType"
                value={formData.fuelType}
                onChange={handleInputChange}
              >
                {FUEL_TYPES.map(fuel => (
                  <MenuItem key={fuel} value={fuel}>
                    {fuel}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                select
                label="Getriebe"
                name="transmission"
                value={formData.transmission}
                onChange={handleInputChange}
              >
                {TRANSMISSION_TYPES.map(transmission => (
                  <MenuItem key={transmission} value={transmission}>
                    {transmission}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Leistung"
                name="power"
                placeholder="z.B. 150 PS"
                value={formData.power}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Preiswunsch"
                name="price"
                type="number"
                value={formData.price}
                onChange={handleInputChange}
                InputProps={{
                  endAdornment: '€'
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Beschreibung"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Beschreiben Sie Ihr Fahrzeug (Ausstattung, Zustand, etc.)"
              />
            </Grid>
          </Grid>
        )
      case 1:
        return (
          <Box>
            <ImageUpload
              images={formData.images}
              onImageAdd={handleImageAdd}
              onImageDelete={handleImageDelete}
            />
            {formData.images.length === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Bitte laden Sie mindestens ein Bild Ihres Fahrzeugs hoch
              </Alert>
            )}
            {formData.images.length >= 10 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Sie können maximal 10 Bilder hochladen
              </Alert>
            )}
          </Box>
        )
      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Name"
                name="contactName"
                value={formData.contactName}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                type="email"
                label="E-Mail"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Telefon"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </Grid>
          </Grid>
        )
      default:
        return null
    }
  }

  const canProceed = () => {
    switch (activeStep) {
      case 0:
        return formData.brand && formData.model && formData.year && 
               formData.mileage && formData.fuelType && formData.transmission
      case 1:
        return formData.images.length > 0
      case 2:
        return formData.contactName && formData.email && formData.phone
      default:
        return false
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography 
        variant="h3" 
        component="h1" 
        gutterBottom
        sx={{ 
          fontWeight: 'bold',
          textAlign: 'center',
          mb: 4
        }}
      >
        Fahrzeug verkaufen
      </Typography>

      {submitted ? (
        <Alert severity="success" sx={{ mb: 4 }}>
          Vielen Dank für Ihr Angebot! Wir werden uns schnellstmöglich bei Ihnen melden.
        </Alert>
      ) : (
        <Paper sx={{ p: 4 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <form onSubmit={handleSubmit}>
            {renderStepContent(activeStep)}

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
              <Button
                disabled={activeStep === 0}
                onClick={() => setActiveStep(prev => prev - 1)}
              >
                Zurück
              </Button>
              {activeStep === steps.length - 1 ? (
                <Button
                  variant="contained"
                  type="submit"
                  disabled={!canProceed()}
                >
                  Absenden
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={() => setActiveStep(prev => prev + 1)}
                  disabled={!canProceed()}
                >
                  Weiter
                </Button>
              )}
            </Box>
          </form>
        </Paper>
      )}
    </Container>
  )
}

export default VerkaufenKFormu