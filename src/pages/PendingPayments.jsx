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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  IconButton,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tooltip,
  Stack,
  Snackbar,
  Chip,
  Avatar,
  Divider,
  Switch,
  Tab,
  Tabs,
} from '@mui/material';
import {
  Edit,
  Save,
  Cancel,
  Delete,
  Add,
  Refresh,
  Person,
  PersonAdd,
  CheckCircle,
  HourglassEmpty,
  People,
  Warning,
  Group,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const PendingPayments = () => {
  const { isAdmin } = useAuth();
  const [tabValue, setTabValue] = useState(0);

  // Pending payments state
  const [pendingData, setPendingData] = useState(null);
  const [loadingPending, setLoadingPending] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toLocaleString('default', { month: 'long' })
  );
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Members state
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [newMemberName, setNewMemberName] = useState('');
  const [editMemberName, setEditMemberName] = useState('');
  const [dialogError, setDialogError] = useState('');

  // Snackbar
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  useEffect(() => {
    fetchPendingData();
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchMembers();
  }, []);

  // ==================== FETCH PENDING DATA ====================
  const fetchPendingData = async () => {
    try {
      setLoadingPending(true);
      const res = await axios.get(
        `/api/records/pending`
      );
      setPendingData(res.data);
    } catch (err) {
      console.error('Error fetching pending data:', err);
      showSnackbar(err.response?.data?.message || 'Failed to fetch pending data', 'error');
    } finally {
      setLoadingPending(false);
    }
  };

  // ==================== FETCH MEMBERS ====================
  const fetchMembers = async () => {
    try {
      setLoadingMembers(true);
      const res = await axios.get(`${API_URL}/members`);
      setMembers(res.data.members || []);
    } catch (err) {
      console.error('Error fetching members:', err);
      showSnackbar('Failed to fetch members', 'error');
    } finally {
      setLoadingMembers(false);
    }
  };

  // ==================== ADD MEMBER ====================
  const handleAddMember = async () => {
    if (!newMemberName.trim()) {
      setDialogError('Name is required');
      return;
    }
    try {
      setDialogError('');
      await axios.post(`${API_URL}/members`, { name: newMemberName.trim() });
      showSnackbar('Member added successfully!', 'success');
      setNewMemberName('');
      setOpenAddDialog(false);
      fetchMembers();
      fetchPendingData();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add member';
      setDialogError(msg);
    }
  };

  // ==================== EDIT MEMBER ====================
  const handleOpenEdit = (member) => {
    setEditingMember(member);
    setEditMemberName(member.name);
    setDialogError('');
    setOpenEditDialog(true);
  };

  const handleEditMember = async () => {
    if (!editMemberName.trim()) {
      setDialogError('Name is required');
      return;
    }
    try {
      setDialogError('');
      await axios.put(`${API_URL}/members/${editingMember._id}`, {
        name: editMemberName.trim(),
      });
      showSnackbar('Member updated successfully!', 'success');
      setOpenEditDialog(false);
      fetchMembers();
      fetchPendingData();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update member';
      setDialogError(msg);
    }
  };

  // ==================== TOGGLE MEMBER ACTIVE ====================
  const handleToggleActive = async (member) => {
    try {
      await axios.put(`${API_URL}/members/${member._id}`, {
        isActive: !member.isActive,
      });
      showSnackbar(
        `${member.name} ${!member.isActive ? 'activated' : 'deactivated'} successfully`,
        'success'
      );
      fetchMembers();
      fetchPendingData();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to update member', 'error');
    }
  };

  // ==================== DELETE MEMBER ====================
  const handleDeleteMember = async (member) => {
    if (!window.confirm(`Are you sure you want to delete "${member.name}"?`)) return;
    try {
      await axios.delete(`${API_URL}/members/${member._id}`);
      showSnackbar('Member deleted successfully', 'success');
      fetchMembers();
      fetchPendingData();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to delete member', 'error');
    }
  };

  // ==================== RENDER ====================
  const pendingCount = pendingData?.pendingCount || 0;
  const paidCount = pendingData?.paidCount || 0;
  const totalMembers = pendingData?.totalMembers || 0;
  const pendingPercent = totalMembers > 0 ? Math.round((pendingCount / totalMembers) * 100) : 0;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Pending Payments
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
            Track who hasn't paid for a selected month
          </Typography>
        </Box>
        {isAdmin && (
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => { setNewMemberName(''); setDialogError(''); setOpenAddDialog(true); }}
            sx={{
              background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
              '&:hover': { background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)' },
            }}
          >
            Add Member
          </Button>
        )}
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(e, v) => setTabValue(v)}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Pending View" icon={<HourglassEmpty />} iconPosition="start" />
          <Tab label="Members List" icon={<Group />} iconPosition="start" />
        </Tabs>
      </Paper>

      {tabValue === 0 ? (
        // ============ PENDING VIEW TAB ============
        <Box>
          {/* Filters */}
          <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl sx={{ minWidth: 150 }} size="small">
              <InputLabel>Month</InputLabel>
              <Select value={selectedMonth} label="Month" onChange={(e) => setSelectedMonth(e.target.value)}>
                {months.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 120 }} size="small">
              <InputLabel>Year</InputLabel>
              <Select value={selectedYear} label="Year" onChange={(e) => setSelectedYear(e.target.value)}>
                {years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
              </Select>
            </FormControl>
            <Button variant="outlined" startIcon={<Refresh />} onClick={fetchPendingData} size="small">
              Refresh
            </Button>
          </Box>

          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ borderLeft: '4px solid #f44336' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <Typography color="textSecondary" gutterBottom variant="body2">Pending</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#f44336' }}>
                        {pendingCount}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {pendingPercent}% not paid
                      </Typography>
                    </div>
                    <Avatar sx={{ bgcolor: '#ffebee', color: '#f44336', width: 56, height: 56 }}>
                      <Warning sx={{ fontSize: 32 }} />
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ borderLeft: '4px solid #4CAF50' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <Typography color="textSecondary" gutterBottom variant="body2">Paid</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#4CAF50' }}>
                        {paidCount}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {totalMembers > 0 ? Math.round((paidCount / totalMembers) * 100) : 0}% paid
                      </Typography>
                    </div>
                    <Avatar sx={{ bgcolor: '#e8f5e9', color: '#4CAF50', width: 56, height: 56 }}>
                      <CheckCircle sx={{ fontSize: 32 }} />
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ borderLeft: '4px solid #1976d2' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <Typography color="textSecondary" gutterBottom variant="body2">Total Members</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#1976d2' }}>
                        {totalMembers}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {selectedMonth} {selectedYear}
                      </Typography>
                    </div>
                    <Avatar sx={{ bgcolor: '#e3f2fd', color: '#1976d2', width: 56, height: 56 }}>
                      <People sx={{ fontSize: 32 }} />
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {loadingPending ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : totalMembers === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <People sx={{ fontSize: 64, color: '#bdbdbd', mb: 2 }} />
              <Typography variant="h6" color="textSecondary" gutterBottom>
                No members found
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Add members first so you can track who has pending payments each month.
              </Typography>
              {isAdmin && (
                <Button
                  variant="contained"
                  startIcon={<PersonAdd />}
                  onClick={() => { setNewMemberName(''); setDialogError(''); setOpenAddDialog(true); }}
                >
                  Add First Member
                </Button>
              )}
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {/* Pending Members */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 0, overflow: 'hidden' }}>
                  <Box sx={{ p: 2, bgcolor: '#ffebee', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Warning sx={{ color: '#f44336' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#f44336' }}>
                      Pending — {selectedMonth} {selectedYear}
                    </Typography>
                    <Chip
                      label={pendingCount}
                      size="small"
                      sx={{ bgcolor: '#f44336', color: 'white', fontWeight: 700, ml: 'auto' }}
                    />
                  </Box>
                  <Divider />
                  {pendingData?.pendingMembers?.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                      <CheckCircle sx={{ fontSize: 48, color: '#4CAF50', mb: 1 }} />
                      <Typography variant="body1" color="textSecondary">
                        🎉 Everyone has paid this month!
                      </Typography>
                    </Box>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: '#fff3f3' }}>
                            <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pendingData?.pendingMembers?.map((member, idx) => (
                            <TableRow key={member._id} hover>
                              <TableCell>{idx + 1}</TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Avatar sx={{ width: 28, height: 28, fontSize: 13, bgcolor: '#ef9a9a' }}>
                                    {member.name.charAt(0).toUpperCase()}
                                  </Avatar>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {member.name}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label="Pending"
                                  size="small"
                                  icon={<HourglassEmpty />}
                                  sx={{ bgcolor: '#ffebee', color: '#f44336', fontWeight: 600 }}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Paper>
              </Grid>

              {/* Paid Members */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 0, overflow: 'hidden' }}>
                  <Box sx={{ p: 2, bgcolor: '#e8f5e9', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle sx={{ color: '#4CAF50' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#4CAF50' }}>
                      Paid — {selectedMonth} {selectedYear}
                    </Typography>
                    <Chip
                      label={paidCount}
                      size="small"
                      sx={{ bgcolor: '#4CAF50', color: 'white', fontWeight: 700, ml: 'auto' }}
                    />
                  </Box>
                  <Divider />
                  {pendingData?.paidMembers?.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                      <Warning sx={{ fontSize: 48, color: '#bdbdbd', mb: 1 }} />
                      <Typography variant="body2" color="textSecondary">
                        No payments recorded yet for this month.
                      </Typography>
                    </Box>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: '#f1f8f1' }}>
                            <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pendingData?.paidMembers?.map((member, idx) => (
                            <TableRow key={member._id} hover>
                              <TableCell>{idx + 1}</TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Avatar sx={{ width: 28, height: 28, fontSize: 13, bgcolor: '#a5d6a7' }}>
                                    {member.name.charAt(0).toUpperCase()}
                                  </Avatar>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {member.name}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label="Paid ✓"
                                  size="small"
                                  icon={<CheckCircle />}
                                  sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 600 }}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Paper>
              </Grid>
            </Grid>
          )}
        </Box>
      ) : (
        // ============ MEMBERS LIST TAB ============
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              <Group sx={{ mr: 1, verticalAlign: 'middle' }} />
              Members List
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" startIcon={<Refresh />} onClick={fetchMembers} size="small">
                Refresh
              </Button>
              {isAdmin && (
                <Button
                  variant="contained"
                  startIcon={<PersonAdd />}
                  onClick={() => { setNewMemberName(''); setDialogError(''); setOpenAddDialog(true); }}
                  sx={{
                    background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                    '&:hover': { background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)' },
                  }}
                >
                  Add Member
                </Button>
              )}
            </Box>
          </Box>

          {loadingMembers ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Paper sx={{ width: '100%', overflow: 'hidden' }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Active</TableCell>
                      {isAdmin && <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {members.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isAdmin ? 5 : 4} align="center" sx={{ py: 6 }}>
                          <Person sx={{ fontSize: 64, color: '#bdbdbd', mb: 1 }} />
                          <Typography variant="body1" color="textSecondary" display="block">
                            No members found
                          </Typography>
                          {isAdmin && (
                            <Button
                              variant="contained"
                              startIcon={<PersonAdd />}
                              sx={{ mt: 2 }}
                              onClick={() => { setNewMemberName(''); setDialogError(''); setOpenAddDialog(true); }}
                            >
                              Add First Member
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      members.map((member, idx) => (
                        <TableRow key={member._id} hover>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar sx={{ width: 32, height: 32, bgcolor: member.isActive ? '#1976d2' : '#bdbdbd', fontSize: 14 }}>
                                {member.name.charAt(0).toUpperCase()}
                              </Avatar>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {member.name}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={member.isActive ? 'Active' : 'Inactive'}
                              size="small"
                              color={member.isActive ? 'success' : 'default'}
                            />
                          </TableCell>
                          <TableCell>
                            {isAdmin ? (
                              <Switch
                                checked={member.isActive}
                                onChange={() => handleToggleActive(member)}
                                color="success"
                                size="small"
                              />
                            ) : (
                              <Typography variant="body2" color={member.isActive ? 'success.main' : 'text.disabled'}>
                                {member.isActive ? 'Yes' : 'No'}
                              </Typography>
                            )}
                          </TableCell>
                          {isAdmin && (
                            <TableCell align="center">
                              <Stack direction="row" spacing={1} justifyContent="center">
                                <Tooltip title="Edit">
                                  <IconButton size="small" color="primary" onClick={() => handleOpenEdit(member)}>
                                    <Edit fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <IconButton size="small" color="error" onClick={() => handleDeleteMember(member)}>
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </Box>
      )}

      {/* ==================== ADD MEMBER DIALOG ==================== */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonAdd sx={{ color: 'primary.main' }} />
            Add New Member
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {dialogError && <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>}
            <TextField
              fullWidth
              label="Member Name"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
              placeholder="e.g. Ahmad Ali"
              InputProps={{ startAdornment: <Person sx={{ mr: 1, color: 'action.active' }} /> }}
              helperText="This name will be matched against payment records each month"
              autoFocus
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddDialog(false)} startIcon={<Cancel />}>Cancel</Button>
          <Button onClick={handleAddMember} variant="contained" startIcon={<Add />}>
            Add Member
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== EDIT MEMBER DIALOG ==================== */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Edit sx={{ color: 'primary.main' }} />
            Edit Member
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {dialogError && <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>}
            <TextField
              fullWidth
              label="Member Name"
              value={editMemberName}
              onChange={(e) => setEditMemberName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEditMember()}
              InputProps={{ startAdornment: <Person sx={{ mr: 1, color: 'action.active' }} /> }}
              autoFocus
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)} startIcon={<Cancel />}>Cancel</Button>
          <Button onClick={handleEditMember} variant="contained" startIcon={<Save />}>
            Save Changes
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

export default PendingPayments;
