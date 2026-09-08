import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Switch,
  Tooltip,
  Snackbar,
  Tabs,
  Tab,
  Divider,
  Avatar,
  Stack,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  AdminPanelSettings,
  PersonAdd,
  Person,
  Email,
  Lock,
  Save,
  Cancel,
  Refresh,
  VerifiedUser,
  Security,
  Dashboard as DashboardIcon,
  PeopleAlt,
  AccountCircle,
  VpnKey,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

// Validation schema for user
const userSchema = yup.object().shape({
  name: yup.string().required('Name is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters'),
  role: yup.string().oneOf(['admin', 'user']).required('Role is required'),
});

// Validation schema for profile update
const profileSchema = yup.object().shape({
  name: yup.string().required('Name is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  currentPassword: yup.string().min(6, 'Password must be at least 6 characters'),
  newPassword: yup.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('newPassword'), null], 'Passwords must match')
    .when('newPassword', (newPassword, schema) => {
      if (newPassword && newPassword.length > 0) {
        return schema.required('Please confirm your password');
      }
      return schema;
    }),
});

const AdminPanel = () => {
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [tabValue, setTabValue] = useState(0);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'user',
    },
  });

  const { 
    control: profileControl, 
    handleSubmit: handleProfileSubmit, 
    reset: resetProfile,
    formState: { errors: profileErrors } 
  } = useForm({
    resolver: yupResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (user) {
      resetProfile({
        name: user.name || '',
        email: user.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }
  }, [user, resetProfile]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/auth/users');
      setUsers(res.data.users || res.data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      showSnackbar('Failed to fetch users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUserDialog = (user = null) => {
    if (user) {
      setEditingUser(user);
      reset({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
      });
    } else {
      setEditingUser(null);
      reset({
        name: '',
        email: '',
        password: '',
        role: 'user',
      });
    }
    setOpenUserDialog(true);
    setError('');
  };

  const handleCloseUserDialog = () => {
    setOpenUserDialog(false);
    setEditingUser(null);
    reset();
    setError('');
  };

  const onSubmitUser = async (data) => {
    try {
      setError('');
      setUpdatingProfile(true);

      if (editingUser) {
        if (editingUser._id === user.id && data.role !== editingUser.role) {
          setError('Cannot change your own role');
          showSnackbar('Cannot change your own role', 'error');
          setUpdatingProfile(false);
          return;
        }
        if (!data.password) {
          delete data.password;
        }
        await axios.put(`/api/auth/users/${editingUser._id}`, data);
        showSnackbar('User updated successfully!', 'success');
      } else {
        await axios.post('/api/auth/register', data);
        showSnackbar('User created successfully!', 'success');
      }
      setTimeout(() => {
        fetchUsers();
        handleCloseUserDialog();
        setUpdatingProfile(false);
      }, 1000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to save user';
      setError(errorMsg);
      showSnackbar(errorMsg, 'error');
      setUpdatingProfile(false);
    }
  };

  const onSubmitProfile = async (data) => {
    try {
      setError('');
      setUpdatingProfile(true);
      
      const updateData = {
        name: data.name,
        email: data.email,
      };

      if (data.newPassword && data.newPassword.length >= 6) {
        updateData.password = data.newPassword;
        updateData.currentPassword = data.currentPassword;
      }

      await axios.put('/api/auth/profile', updateData);
      
      showSnackbar('Profile updated successfully!', 'success');
      
      const token = localStorage.getItem('token');
      if (token) {
        await axios.get('/api/auth/me');
        window.location.reload();
      }
      
      setUpdatingProfile(false);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to update profile';
      setError(errorMsg);
      showSnackbar(errorMsg, 'error');
      setUpdatingProfile(false);
    }
  };

  const handleToggleActive = async (userId, currentStatus) => {
    try {
      if (userId === user.id) {
        showSnackbar('Cannot deactivate your own account', 'error');
        return;
      }

      const adminCount = users.filter(u => u.role === 'admin' && u.isActive).length;
      const targetUser = users.find(u => u._id === userId);
      if (targetUser?.role === 'admin' && currentStatus && adminCount <= 1) {
        showSnackbar('Cannot deactivate the last admin', 'error');
        return;
      }

      await axios.put(`/api/auth/users/${userId}`, { isActive: !currentStatus });
      showSnackbar(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`, 'success');
      fetchUsers();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to update user status';
      showSnackbar(errorMsg, 'error');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (userId === user.id) {
      showSnackbar('Cannot delete your own account', 'error');
      return;
    }

    const adminCount = users.filter(u => u.role === 'admin').length;
    const targetUser = users.find(u => u._id === userId);
    if (targetUser?.role === 'admin' && adminCount <= 1) {
      showSnackbar('Cannot delete the last admin', 'error');
      return;
    }

    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await axios.delete(`/api/auth/users/${userId}`);
        showSnackbar('User deleted successfully', 'success');
        fetchUsers();
      } catch (err) {
        const errorMsg = err.response?.data?.message || 'Failed to delete user';
        showSnackbar(errorMsg, 'error');
      }
    }
  };

  const getAdminStats = () => {
    const totalUsers = users.length;
    const totalAdmins = users.filter(u => u.role === 'admin').length;
    const activeUsers = users.filter(u => u.isActive).length;
    const inactiveUsers = users.filter(u => !u.isActive).length;
    return { totalUsers, totalAdmins, activeUsers, inactiveUsers };
  };

  const stats = getAdminStats();

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Admin Panel
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchUsers}
            size="small"
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => handleOpenUserDialog()}
            size="small"
            color="primary"
          >
            Create New User
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="User Management" icon={<AdminPanelSettings />} />
          <Tab label="Update Profile" icon={<AccountCircle />} />
        </Tabs>
      </Paper>

      {tabValue === 0 ? (
        <>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <Typography color="textSecondary" gutterBottom>Total Users</Typography>
                      <Typography variant="h5">{stats.totalUsers}</Typography>
                    </div>
                    <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                      <PeopleAlt />
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderLeft: '4px solid #1976d2' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <Typography color="textSecondary" gutterBottom>Admins</Typography>
                      <Typography variant="h5">{stats.totalAdmins}</Typography>
                    </div>
                    <Avatar sx={{ bgcolor: '#e3f2fd', color: '#1976d2' }}>
                      <VerifiedUser />
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderLeft: '4px solid #4CAF50' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <Typography color="textSecondary" gutterBottom>Active Users</Typography>
                      <Typography variant="h5">{stats.activeUsers}</Typography>
                    </div>
                    <Avatar sx={{ bgcolor: '#e8f5e9', color: '#4CAF50' }}>
                      <Person />
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderLeft: '4px solid #f44336' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <Typography color="textSecondary" gutterBottom>Inactive Users</Typography>
                      <Typography variant="h5">{stats.inactiveUsers}</Typography>
                    </div>
                    <Avatar sx={{ bgcolor: '#ffebee', color: '#f44336' }}>
                      <Person />
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e0e0e0' }}>
              <Typography variant="h6">User List</Typography>
              <Button
                variant="contained"
                startIcon={<PersonAdd />}
                onClick={() => handleOpenUserDialog()}
                size="small"
              >
                Add New User
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography variant="body1" color="textSecondary">No users found</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((u) => (
                      <TableRow key={u._id} hover>
                        <TableCell>{u.name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Chip
                            label={u.role}
                            size="small"
                            color={u.role === 'admin' ? 'primary' : 'default'}
                            icon={u.role === 'admin' ? <VerifiedUser /> : <Person />}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={u.isActive}
                            onChange={() => handleToggleActive(u._id, u.isActive)}
                            disabled={u._id === user.id}
                            color="success"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <Tooltip title="Edit User">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleOpenUserDialog(u)}
                                disabled={u._id === user.id && u.role === 'admin'}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete User">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteUser(u._id)}
                                disabled={u._id === user.id}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      ) : (
        <Paper sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56, mr: 2 }}>
              <AccountCircle sx={{ fontSize: 40 }} />
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>Update Profile</Typography>
              <Typography variant="body2" color="textSecondary">
                Update your personal information and password
              </Typography>
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleProfileSubmit(onSubmitProfile)}>
            <Controller
              name="name"
              control={profileControl}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Full Name"
                  sx={{ mb: 2 }}
                  error={!!profileErrors.name}
                  helperText={profileErrors.name?.message}
                  InputProps={{
                    startAdornment: <Person sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
              )}
            />

            <Controller
              name="email"
              control={profileControl}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Email Address"
                  type="email"
                  sx={{ mb: 3 }}
                  error={!!profileErrors.email}
                  helperText={profileErrors.email?.message}
                  InputProps={{
                    startAdornment: <Email sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
              )}
            />

            <Divider sx={{ my: 2 }}>
              <Chip label="Change Password" icon={<VpnKey />} />
            </Divider>

            <Controller
              name="currentPassword"
              control={profileControl}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Current Password"
                  type="password"
                  sx={{ mb: 2 }}
                  error={!!profileErrors.currentPassword}
                  helperText={profileErrors.currentPassword?.message || 'Required to change password'}
                  InputProps={{
                    startAdornment: <Lock sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
              )}
            />

            <Controller
              name="newPassword"
              control={profileControl}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="New Password"
                  type="password"
                  sx={{ mb: 2 }}
                  error={!!profileErrors.newPassword}
                  helperText={profileErrors.newPassword?.message || 'Leave blank to keep current password'}
                  InputProps={{
                    startAdornment: <Lock sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
              )}
            />

            <Controller
              name="confirmPassword"
              control={profileControl}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Confirm New Password"
                  type="password"
                  sx={{ mb: 3 }}
                  error={!!profileErrors.confirmPassword}
                  helperText={profileErrors.confirmPassword?.message}
                  InputProps={{
                    startAdornment: <Lock sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
              )}
            />

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => {
                  resetProfile({
                    name: user?.name || '',
                    email: user?.email || '',
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                  });
                }}
                startIcon={<Cancel />}
              >
                Reset
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<Save />}
                disabled={updatingProfile}
              >
                {updatingProfile ? 'Updating...' : 'Update Profile'}
              </Button>
            </Box>
          </form>
        </Paper>
      )}

      {/* Add/Edit User Dialog */}
      <Dialog open={openUserDialog} onClose={handleCloseUserDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {editingUser ? (
              <>
                <Edit sx={{ mr: 1, color: 'primary.main' }} />
                Edit User
              </>
            ) : (
              <>
                <PersonAdd sx={{ mr: 1, color: 'primary.main' }} />
                Create New User
              </>
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Name"
                  sx={{ mb: 2 }}
                  error={!!errors.name}
                  helperText={errors.name?.message}
                />
              )}
            />

            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Email"
                  type="email"
                  sx={{ mb: 2 }}
                  error={!!errors.email}
                  helperText={errors.email?.message}
                />
              )}
            />

            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label={editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
                  type="password"
                  sx={{ mb: 2 }}
                  error={!!errors.password}
                  helperText={errors.password?.message}
                />
              )}
            />

            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select {...field} label="Role">
                    <MenuItem value="user">User</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                  </Select>
                </FormControl>
              )}
            />

            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
              * Admin can create any user role without a key
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUserDialog} startIcon={<Cancel />}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit(onSubmitUser)} 
            variant="contained"
            startIcon={editingUser ? <Save /> : <PersonAdd />}
            disabled={updatingProfile}
          >
            {editingUser ? 'Update User' : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminPanel;