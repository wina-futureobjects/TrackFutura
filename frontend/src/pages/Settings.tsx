import { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Tabs,
  Tab,
  Divider,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Grid,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Alert,
  Snackbar,
  Card,
  CardContent,
  IconButton,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  Save as SaveIcon,
  Notifications as NotificationsIcon,
  Palette as PaletteIcon,
  Security as SecurityIcon,
  Person as PersonIcon,
  DataUsage as DataUsageIcon,
  Home as HomeIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const a11yProps = (index: number) => {
  return {
    id: `settings-tab-${index}`,
    'aria-controls': `settings-tabpanel-${index}`,
  };
};

const Settings = () => {
  const [value, setValue] = useState(0);
  const [theme, setTheme] = useState('light');
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [dataRetention, setDataRetention] = useState(30);
  const [defaultPlatform, setDefaultPlatform] = useState('instagram');
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('John');
  const [lastName, setLastName] = useState('Doe');
  const [email, setEmail] = useState('john.doe@example.com');

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const handleSaveSettings = () => {
    // In a real application, these settings would be saved to backend/local storage
    setShowSuccess(true);
  };

  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) {
      return;
    }
    
    // In a real application, this would call an API to change the password
    setShowSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleProfileUpdate = () => {
    // In a real application, this would update user profile info
    setShowSuccess(true);
  };

  const handleCloseSnackbar = () => {
    setShowSuccess(false);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box mb={3}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link 
            underline="hover" 
            color="inherit" 
            href="/"
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Home
          </Link>
          <Typography 
            color="text.primary"
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <SettingsIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Settings
          </Typography>
        </Breadcrumbs>
      </Box>

      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Manage your application preferences and account settings
      </Typography>

      <Paper sx={{ mt: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={value} 
            onChange={handleTabChange} 
            aria-label="settings tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab 
              icon={<PersonIcon />} 
              label="Profile" 
              {...a11yProps(0)} 
              iconPosition="start"
            />
            <Tab 
              icon={<PaletteIcon />} 
              label="Appearance" 
              {...a11yProps(1)}
              iconPosition="start" 
            />
            <Tab 
              icon={<NotificationsIcon />} 
              label="Notifications" 
              {...a11yProps(2)}
              iconPosition="start" 
            />
            <Tab 
              icon={<SecurityIcon />} 
              label="Security" 
              {...a11yProps(3)}
              iconPosition="start" 
            />
            <Tab 
              icon={<DataUsageIcon />} 
              label="Data" 
              {...a11yProps(4)}
              iconPosition="start" 
            />
          </Tabs>
        </Box>

        {/* Profile Settings */}
        <TabPanel value={value} index={0}>
          <Grid container spacing={3}>
            <Box sx={{ width: { xs: '100%', md: '50%' }, pr: { md: 2 } }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Personal Information
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  
                  <Grid container spacing={2}>
                    <Box sx={{ width: { xs: '100%', sm: '50%' }, pr: { sm: 1 } }}>
                      <TextField
                        fullWidth
                        label="First Name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        variant="outlined"
                        margin="normal"
                      />
                    </Box>
                    <Box sx={{ width: { xs: '100%', sm: '50%' }, pl: { sm: 1 } }}>
                      <TextField
                        fullWidth
                        label="Last Name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        variant="outlined"
                        margin="normal"
                      />
                    </Box>
                    <Box sx={{ width: '100%' }}>
                      <TextField
                        fullWidth
                        label="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        variant="outlined"
                        margin="normal"
                        type="email"
                      />
                    </Box>
                  </Grid>
                  
                  <Box mt={3} display="flex" justifyContent="flex-end">
                    <Button 
                      variant="contained" 
                      color="primary" 
                      startIcon={<SaveIcon />}
                      onClick={handleProfileUpdate}
                    >
                      Save Changes
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Grid>
        </TabPanel>

        {/* Appearance Settings */}
        <TabPanel value={value} index={1}>
          <Grid container spacing={3}>
            <Box sx={{ width: { xs: '100%', md: '50%' }, pr: { md: 2 } }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Theme Settings
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  
                  <FormControl fullWidth margin="normal">
                    <InputLabel id="theme-select-label">Theme</InputLabel>
                    <Select
                      labelId="theme-select-label"
                      id="theme-select"
                      value={theme}
                      label="Theme"
                      onChange={(e) => setTheme(e.target.value)}
                    >
                      <MenuItem value="light">Light</MenuItem>
                      <MenuItem value="dark">Dark</MenuItem>
                      <MenuItem value="system">System Default</MenuItem>
                    </Select>
                  </FormControl>

                  <Box mt={3} display="flex" justifyContent="flex-end">
                    <Button 
                      variant="contained" 
                      color="primary" 
                      startIcon={<SaveIcon />}
                      onClick={handleSaveSettings}
                    >
                      Save Changes
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Box>
            
            <Box sx={{ width: { xs: '100%', md: '50%' }, pl: { md: 2 } }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Default Platform
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  
                  <FormControl fullWidth margin="normal">
                    <InputLabel id="platform-select-label">Default Platform</InputLabel>
                    <Select
                      labelId="platform-select-label"
                      id="platform-select"
                      value={defaultPlatform}
                      label="Default Platform"
                      onChange={(e) => setDefaultPlatform(e.target.value)}
                    >
                      <MenuItem value="instagram">Instagram</MenuItem>
                      <MenuItem value="facebook">Facebook</MenuItem>
                      <MenuItem value="linkedin">LinkedIn</MenuItem>
                      <MenuItem value="tiktok">TikTok</MenuItem>
                      <MenuItem value="track">Track User</MenuItem>
                    </Select>
                  </FormControl>

                  <Box mt={3} display="flex" justifyContent="flex-end">
                    <Button 
                      variant="contained" 
                      color="primary" 
                      startIcon={<SaveIcon />}
                      onClick={handleSaveSettings}
                    >
                      Save Changes
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Grid>
        </TabPanel>

        {/* Notification Settings */}
        <TabPanel value={value} index={2}>
          <Grid container spacing={3}>
            <Box sx={{ width: { xs: '100%', md: '50%' }, pr: { md: 2 } }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Notification Preferences
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notifications}
                        onChange={(e) => setNotifications(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="In-app Notifications"
                  />
                  
                  <Box mt={2}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={emailNotifications}
                          onChange={(e) => setEmailNotifications(e.target.checked)}
                          color="primary"
                        />
                      }
                      label="Email Notifications"
                    />
                  </Box>

                  <Box mt={3} display="flex" justifyContent="flex-end">
                    <Button 
                      variant="contained" 
                      color="primary" 
                      startIcon={<SaveIcon />}
                      onClick={handleSaveSettings}
                    >
                      Save Changes
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Grid>
        </TabPanel>

        {/* Security Settings */}
        <TabPanel value={value} index={3}>
          <Grid container spacing={3}>
            <Box sx={{ width: { xs: '100%', md: '50%' }, pr: { md: 2 } }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Change Password
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  
                  <TextField
                    fullWidth
                    label="Current Password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    variant="outlined"
                    margin="normal"
                  />
                  
                  <TextField
                    fullWidth
                    label="New Password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    variant="outlined"
                    margin="normal"
                  />
                  
                  <TextField
                    fullWidth
                    label="Confirm New Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    variant="outlined"
                    margin="normal"
                    error={newPassword !== confirmPassword && confirmPassword !== ''}
                    helperText={
                      newPassword !== confirmPassword && confirmPassword !== '' 
                        ? "Passwords don't match" 
                        : ""
                    }
                  />

                  <Box mt={3} display="flex" justifyContent="flex-end">
                    <Button 
                      variant="contained" 
                      color="primary" 
                      startIcon={<SaveIcon />}
                      onClick={handlePasswordChange}
                      disabled={
                        !currentPassword || 
                        !newPassword || 
                        !confirmPassword || 
                        newPassword !== confirmPassword
                      }
                    >
                      Update Password
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Grid>
        </TabPanel>

        {/* Data Settings */}
        <TabPanel value={value} index={4}>
          <Grid container spacing={3}>
            <Box sx={{ width: { xs: '100%', md: '50%' }, pr: { md: 2 } }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Data Management
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  
                  <FormControl fullWidth margin="normal">
                    <InputLabel id="data-retention-label">Data Retention Period</InputLabel>
                    <Select
                      labelId="data-retention-label"
                      id="data-retention"
                      value={dataRetention}
                      label="Data Retention Period"
                      onChange={(e) => setDataRetention(Number(e.target.value))}
                    >
                      <MenuItem value={7}>7 days</MenuItem>
                      <MenuItem value={30}>30 days</MenuItem>
                      <MenuItem value={90}>90 days</MenuItem>
                      <MenuItem value={180}>6 months</MenuItem>
                      <MenuItem value={365}>1 year</MenuItem>
                    </Select>
                  </FormControl>

                  <Box mt={3}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Data older than the selected retention period will be automatically archived.
                    </Alert>
                  </Box>

                  <Box mt={3} display="flex" justifyContent="flex-end">
                    <Button 
                      variant="contained" 
                      color="primary" 
                      startIcon={<SaveIcon />}
                      onClick={handleSaveSettings}
                    >
                      Save Changes
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ width: { xs: '100%', md: '50%' }, pl: { md: 2 } }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Export Data
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  
                  <Typography variant="body2" paragraph>
                    You can export all your data in CSV or JSON format.
                  </Typography>
                  
                  <Box display="flex" gap={2}>
                    <Button variant="outlined" color="primary">
                      Export as CSV
                    </Button>
                    <Button variant="outlined" color="primary">
                      Export as JSON
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Grid>
        </TabPanel>
      </Paper>

      <Snackbar
        open={showSuccess}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success">
          Settings saved successfully!
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Settings; 