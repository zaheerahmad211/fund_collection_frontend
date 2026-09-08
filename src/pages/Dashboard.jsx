import React, { useState, useEffect } from 'react';
import {
  Grid, Card, CardContent, Typography, Box, Paper, FormControl,
  InputLabel, Select, MenuItem, CircularProgress, Chip,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, Tooltip, Switch, Avatar, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Alert, Snackbar, Divider, Tabs, Tab,
} from '@mui/material';
import {
  AttachMoney, People, TrendingUp, CalendarToday,
  PersonAdd, Edit, Delete, Refresh, AdminPanelSettings,
  Person, VerifiedUser, Email, Lock, Save, Cancel,
  Dashboard as DashboardIcon, Group, AccountCircle, VpnKey,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
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

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [recentRecords, setRecentRecords] = useState([]);
  
  // User management states
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [openProfileDialog, setOpenProfileDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [tabValue, setTabValue] = useState(0);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Form for user management
  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'user',
    },
  });

  // Form for profile update
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

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    fetchData();
    if (isAdmin) {
      fetchUsers();
    }
  }, [selectedMonth, selectedYear, isAdmin]);

  // Update profile form when user changes
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

  const fetchData = async () => {
    try {
      setLoading(true);
      const [summaryRes, recordsRes] = await Promise.all([
        axios.get(`/api/records/summary?month=${selectedMonth}&year=${selectedYear}`),
        axios.get(`/api/records?month=${selectedMonth}&year=${selectedYear}`),
      ]);
      
      setSummary(summaryRes.data);
      
      let recordsData = [];
      if (Array.isArray(recordsRes.data)) {
        recordsData = recordsRes.data;
      } else if (recordsRes.data && Array.isArray(recordsRes.data.records)) {
        recordsData = recordsRes.data.records;
      } else {
        recordsData = [];
      }
      
      setRecentRecords(recordsData.slice(0, 5));
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const res = await axios.get('/api/auth/users');
      setUsers(res.data.users || res.data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      showSnackbar('Failed to fetch users', 'error');
    } finally {
      setUsersLoading(false);
    }
  };

  // User Management Functions - FIXED: Removed admin key requirement
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
      
      console.log('Creating/Updating user:', { ...data, password: '***' });

      if (editingUser) {
        if (editingUser._id === user.id && data.role !== editingUser.role) {
          setError('Cannot change your own role');
          showSnackbar('Cannot change your own role', 'error');
          return;
        }
        // Remove password if empty
        if (!data.password) {
          delete data.password;
        }
        await axios.put(`/api/auth/users/${editingUser._id}`, data);
        showSnackbar('User updated successfully!', 'success');
      } else {
        // Create new user - No admin key required anymore
        const response = await axios.post('/api/auth/register', data);
        if (response.data.success) {
          showSnackbar('User created successfully!', 'success');
        }
      }
      setTimeout(() => {
        fetchUsers();
        handleCloseUserDialog();
      }, 1000);
    } catch (err) {
      console.error('Error saving user:', err.response?.data);
      const errorMsg = err.response?.data?.message || 'Failed to save user';
      setError(errorMsg);
      showSnackbar(errorMsg, 'error');
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

  // Profile Update Functions
  const handleOpenProfileDialog = () => {
    setOpenProfileDialog(true);
    setError('');
    resetProfile({
      name: user?.name || '',
      email: user?.email || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  const handleCloseProfileDialog = () => {
    setOpenProfileDialog(false);
    setError('');
    resetProfile({
      name: user?.name || '',
      email: user?.email || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  const onSubmitProfile = async (data) => {
    try {
      setError('');
      setUpdatingProfile(true);
      
      const updateData = {
        name: data.name,
        email: data.email,
      };

      // Only include password fields if user wants to change password
      if (data.newPassword && data.newPassword.length >= 6) {
        updateData.password = data.newPassword;
        updateData.currentPassword = data.currentPassword;
      }

      await axios.put('/api/auth/profile', updateData);
      
      showSnackbar('Profile updated successfully!', 'success');
      
      // Refresh user data
      const token = localStorage.getItem('token');
      if (token) {
        await axios.get('/api/auth/me');
        // Reload to update context
        window.location.reload();
      }
      
      handleCloseProfileDialog();
      setUpdatingProfile(false);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to update profile';
      setError(errorMsg);
      showSnackbar(errorMsg, 'error');
      setUpdatingProfile(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}><CircularProgress /></Box>;
  }

  const totalAmount = summary?.totalAmount || 0;
  const recordCount = summary?.count || 0;
  const avgAmount = recordCount > 0 ? totalAmount / recordCount : 0;
  const maxAmount = summary?.maxAmount || 0;

  const monthlyTrendData = [
    { name: 'Week 1', amount: totalAmount * 0.25 },
    { name: 'Week 2', amount: totalAmount * 0.20 },
    { name: 'Week 3', amount: totalAmount * 0.30 },
    { name: 'Week 4', amount: totalAmount * 0.25 },
  ];

  // User stats
  const totalUsers = users.length;
  const totalAdmins = users.filter(u => u.role === 'admin').length;
  const activeUsers = users.filter(u => u.isActive).length;
  const inactiveUsers = users.filter(u => !u.isActive).length;

  return (
    <Box>
      {/* Header with Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Welcome back, {user?.name}! 👋
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {isAdmin && (
            <Button
              variant="contained"
              startIcon={<PersonAdd />}
              onClick={() => handleOpenUserDialog()}
              sx={{ 
                background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                }
              }}
            >
              Add New User
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<AccountCircle />}
            onClick={handleOpenProfileDialog}
            sx={{ borderColor: 'secondary.main', color: 'secondary.main' }}
          >
            Update Profile
          </Button>
        </Box>
      </Box>

      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        Here's what's happening with your fund collection for {selectedMonth} {selectedYear}
      </Typography>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Dashboard" icon={<DashboardIcon />} iconPosition="start" />
          {isAdmin && (
            <Tab label="User Management" icon={<Group />} iconPosition="start" />
          )}
        </Tabs>
      </Paper>

      {tabValue === 0 ? (
        // ============ DASHBOARD TAB ============
        <Box>
          {/* Filters */}
          <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 150 }} size="small">
              <InputLabel>Month</InputLabel>
              <Select 
                value={selectedMonth} 
                label="Month" 
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {months.map((month) => (
                  <MenuItem key={month} value={month}>{month}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 120 }} size="small">
              <InputLabel>Year</InputLabel>
              <Select 
                value={selectedYear} 
                label="Year" 
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                {years.map((year) => (
                  <MenuItem key={year} value={year}>{year}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Chip 
              icon={<CalendarToday />} 
              label={`${recordCount} records`} 
              color="primary" 
              variant="outlined" 
            />
            <Button variant="outlined" startIcon={<Refresh />} onClick={fetchData} size="small">
              Refresh
            </Button>
          </Box>

          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <Typography color="textSecondary" gutterBottom variant="body2">
                        Total Amount
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        PKR {totalAmount.toFixed(2)}
                      </Typography>
                    </div>
                    <Box sx={{ bgcolor: 'primary.light', borderRadius: '50%', p: 1 }}>
                      <AttachMoney sx={{ fontSize: 30, color: 'primary.main' }} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <Typography color="textSecondary" gutterBottom variant="body2">
                        Total Records
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        {recordCount}
                      </Typography>
                    </div>
                    <Box sx={{ bgcolor: 'secondary.light', borderRadius: '50%', p: 1 }}>
                      <People sx={{ fontSize: 30, color: 'secondary.main' }} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <Typography color="textSecondary" gutterBottom variant="body2">
                        Average Amount
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 600, color: '#4CAF50' }}>
                        PKR {avgAmount.toFixed(2)}
                      </Typography>
                    </div>
                    <Box sx={{ bgcolor: '#e8f5e9', borderRadius: '50%', p: 1 }}>
                      <TrendingUp sx={{ fontSize: 30, color: '#4CAF50' }} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Charts */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Monthly Overview</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip formatter={(value) => `PKR ${value.toFixed(2)}`} />
                    <Legend />
                    <Bar dataKey="amount" fill="#1976d2" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Summary Statistics</Typography>
                <Box sx={{ p: 3 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#e3f2fd', borderRadius: 2 }}>
                        <Typography variant="body2" color="textSecondary">Total Amount</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 600, color: 'primary.main' }}>
                          PKR {totalAmount.toFixed(2)}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                        <Typography variant="body2" color="textSecondary">Total Records</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 600 }}>
                          {recordCount}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#e8f5e9', borderRadius: 2 }}>
                        <Typography variant="body2" color="textSecondary">Average Amount</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 600, color: '#4CAF50' }}>
                          PKR {avgAmount.toFixed(2)}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#fff3e0', borderRadius: 2 }}>
                        <Typography variant="body2" color="textSecondary">Highest Amount</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 600, color: '#f44336' }}>
                          PKR {maxAmount.toFixed(2)}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Recent Records Table */}
          {recentRecords.length > 0 && (
            <Paper sx={{ mt: 3, p: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Recent Records</Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid #e0e0e0' }}>#</th>
                      <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid #e0e0e0' }}>Name</th>
                      <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid #e0e0e0' }}>Amount (PKR)</th>
                      <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid #e0e0e0' }}>Month</th>
                      <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid #e0e0e0' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRecords.map((record, index) => (
                      <tr key={record._id}>
                        <td style={{ padding: '12px', borderBottom: '1px solid #e0e0e0' }}>{index + 1}</td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #e0e0e0' }}>{record.name}</td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #e0e0e0' }}>{record.amount.toFixed(2)}</td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #e0e0e0' }}>{record.month}</td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #e0e0e0' }}>{new Date(record.date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Paper>
          )}
        </Box>
      ) : (
        // ============ USER MANAGEMENT TAB ============
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              <AdminPanelSettings sx={{ mr: 1, verticalAlign: 'middle' }} />
              User Management
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" startIcon={<Refresh />} onClick={fetchUsers} size="small">
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<PersonAdd />}
                onClick={() => handleOpenUserDialog()}
                sx={{ 
                  background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                  }
                }}
              >
                Add New User
              </Button>
            </Box>
          </Box>

          {/* User Stats Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <Typography color="textSecondary" gutterBottom>Total Users</Typography>
                      <Typography variant="h5">{totalUsers}</Typography>
                    </div>
                    <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                      <People />
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
                      <Typography variant="h5">{totalAdmins}</Typography>
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
                      <Typography variant="h5">{activeUsers}</Typography>
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
                      <Typography variant="h5">{inactiveUsers}</Typography>
                    </div>
                    <Avatar sx={{ bgcolor: '#ffebee', color: '#f44336' }}>
                      <Person />
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* User Table */}
          <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            {usersLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
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
            )}
          </Paper>
        </Box>
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
          >
            {editingUser ? 'Update User' : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update Profile Dialog */}
      <Dialog open={openProfileDialog} onClose={handleCloseProfileDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AccountCircle sx={{ mr: 1, color: 'primary.main' }} />
            Update Profile
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            
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
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseProfileDialog} startIcon={<Cancel />}>
            Cancel
          </Button>
          <Button 
            onClick={handleProfileSubmit(onSubmitProfile)} 
            variant="contained"
            startIcon={<Save />}
            disabled={updatingProfile}
          >
            {updatingProfile ? 'Updating...' : 'Update Profile'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
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

export default Dashboard;