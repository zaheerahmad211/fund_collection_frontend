import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, FormControl, InputLabel,
  Select, MenuItem, IconButton, Alert, CircularProgress,
  Grid, Fab, Tooltip, Tabs, Tab, Card, CardContent, Snackbar,
  Menu, MenuItem as DropdownItem,
} from '@mui/material';
import {
  Add, Edit, Delete, CalendarToday, TrendingUp, Refresh,
  FileDownload, PictureAsPdf, AttachMoney, People,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Validation schema
const recordSchema = yup.object().shape({
  name: yup.string().required('Name is required'),
  amount: yup.number().positive('Amount must be positive').required('Amount is required'),
  month: yup.string().required('Month is required'),
  year: yup.number().required('Year is required'),
  date: yup.string().required('Date is required'),
  description: yup.string(),
});

const Records = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [filters, setFilters] = useState({
    month: new Date().toLocaleString('default', { month: 'long' }),
    year: new Date().getFullYear(),
    search: '',
  });
  const [error, setError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [viewMode, setViewMode] = useState('monthly');
  const [yearlyData, setYearlyData] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [summary, setSummary] = useState(null);
  const [exportAnchorEl, setExportAnchorEl] = useState(null);

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(recordSchema),
    defaultValues: {
      name: '',
      amount: '',
      month: new Date().toLocaleString('default', { month: 'long' }),
      year: new Date().getFullYear(),
      date: new Date().toISOString().split('T')[0],
      description: '',
    },
  });

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    if (viewMode === 'monthly') {
      fetchMonthlyRecords();
    } else {
      fetchYearlyRecords();
    }
  }, [filters, viewMode, selectedYear]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const fetchMonthlyRecords = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {
        month: filters.month,
        year: filters.year,
      };
      if (filters.search) params.search = filters.search;

      const [recordsRes, summaryRes] = await Promise.all([
        axios.get('/api/records', { params }),
        axios.get(`/api/records/summary?month=${filters.month}&year=${filters.year}`),
      ]);
      
      let recordsData = [];
      if (Array.isArray(recordsRes.data)) {
        recordsData = recordsRes.data;
      } else if (recordsRes.data && Array.isArray(recordsRes.data.records)) {
        recordsData = recordsRes.data.records;
      } else {
        recordsData = [];
      }
      
      setRecords(recordsData);
      setSummary(summaryRes.data);
    } catch (err) {
      console.error('Error fetching records:', err);
      const errorMsg = err.response?.data?.message || 'Failed to fetch records';
      setError(errorMsg);
      showSnackbar(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchYearlyRecords = async () => {
    try {
      setLoading(true);
      setError('');
      
      const res = await axios.get(`/api/records/yearly-summary?year=${selectedYear}`);
      setYearlyData(res.data);
      
      const recordsRes = await axios.get(`/api/records?year=${selectedYear}`);
      
      let recordsData = [];
      if (Array.isArray(recordsRes.data)) {
        recordsData = recordsRes.data;
      } else if (recordsRes.data && Array.isArray(recordsRes.data.records)) {
        recordsData = recordsRes.data.records;
      } else {
        recordsData = [];
      }
      
      setRecords(recordsData);
    } catch (err) {
      console.error('Error fetching yearly records:', err);
      const errorMsg = err.response?.data?.message || 'Failed to fetch yearly records';
      setError(errorMsg);
      showSnackbar(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (record = null) => {
    if (record) {
      setEditingRecord(record);
      reset({
        name: record.name,
        amount: record.amount,
        month: record.month,
        year: record.year,
        date: new Date(record.date).toISOString().split('T')[0],
        description: record.description || '',
      });
    } else {
      setEditingRecord(null);
      reset({
        name: '',
        amount: '',
        month: filters.month,
        year: filters.year,
        date: new Date().toISOString().split('T')[0],
        description: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingRecord(null);
    reset();
    setError('');
  };

  const onSubmit = async (data) => {
    try {
      setError('');
      if (editingRecord) {
        const response = await axios.put(`/api/records/${editingRecord._id}`, data);
        if (response.data.success) {
          showSnackbar('Record updated successfully!', 'success');
        }
      } else {
        const response = await axios.post('/api/records', data);
        if (response.data.success) {
          showSnackbar('Record created successfully!', 'success');
        }
      }
      setTimeout(() => {
        if (viewMode === 'monthly') {
          fetchMonthlyRecords();
        } else {
          fetchYearlyRecords();
        }
        handleCloseDialog();
      }, 1000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to save record';
      setError(errorMsg);
      showSnackbar(errorMsg, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        const response = await axios.delete(`/api/records/${id}`);
        if (response.data.success) {
          showSnackbar('Record deleted successfully!', 'success');
          if (viewMode === 'monthly') {
            fetchMonthlyRecords();
          } else {
            fetchYearlyRecords();
          }
        }
      } catch (err) {
        const errorMsg = err.response?.data?.message || 'Failed to delete record';
        showSnackbar(errorMsg, 'error');
      }
    }
  };

  // PDF Export Function - Fixed PKR formatting
  const exportToPDF = () => {
    if (records.length === 0) {
      showSnackbar('No records to export', 'warning');
      return;
    }

    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      
      doc.setFontSize(20);
      doc.setTextColor(25, 118, 210);
      doc.text('Records Report - Fund Collection', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setTextColor(60);
      const title = viewMode === 'monthly' 
        ? `${filters.month} ${filters.year}`
        : `Year ${selectedYear}`;
      doc.text(title, pageWidth / 2, 30, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(80);
      let summaryText = '';
      if (viewMode === 'monthly' && summary) {
        summaryText = `Total Records: ${summary.count} | Total Amount: PKR ${summary.totalAmount?.toFixed(2)}`;
      } else if (viewMode === 'yearly' && yearlyData) {
        summaryText = `Total Records: ${yearlyData.totalRecords} | Total Amount: PKR ${yearlyData.yearlyTotal?.toFixed(2)}`;
      }
      doc.text(summaryText, pageWidth / 2, 37, { align: 'center' });
      
      // Table headers
      const tableHeaders = ['#', 'Name', 'Amount (PKR)', 'Month', 'Year', 'Date', 'Description'];
      const tableRows = records.map((record, index) => [
        index + 1,
        record.name,
        `PKR ${record.amount.toFixed(2)}`,  // Fixed: PKR prefix
        record.month,
        record.year,
        new Date(record.date).toLocaleDateString(),
        record.description || '-'
      ]);

      autoTable(doc, {
        head: [tableHeaders],
        body: tableRows,
        startY: 45,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [25, 118, 210],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        didDrawPage: function (data) {
          doc.setFontSize(8);
          doc.setTextColor(150);
          const footerText = `Generated on ${new Date().toLocaleString()} | Fund Collection System`;
          doc.text(footerText, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
        },
      });

      const fileName = viewMode === 'monthly' 
        ? `records_${filters.month}_${filters.year}.pdf`
        : `records_${selectedYear}.pdf`;
      doc.save(fileName);
      showSnackbar('PDF exported successfully!', 'success');
    } catch (err) {
      console.error('Error exporting PDF:', err);
      showSnackbar('Failed to export PDF: ' + err.message, 'error');
    }
  };

  // CSV Export Function - Fixed PKR formatting
  const exportCSV = () => {
    if (records.length === 0) {
      showSnackbar('No records to export', 'warning');
      return;
    }

    try {
      const headers = ['Name', 'Amount (PKR)', 'Month', 'Year', 'Date', 'Description'];
      const csvData = records.map(r => [
        r.name,
        `PKR ${r.amount.toFixed(2)}`,  // Fixed: PKR prefix
        r.month,
        r.year,
        new Date(r.date).toLocaleDateString(),
        r.description || ''
      ]);
      
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const fileName = viewMode === 'monthly' 
        ? `records_${filters.month}_${filters.year}.csv`
        : `records_${selectedYear}.csv`;
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showSnackbar('CSV exported successfully!', 'success');
    } catch (err) {
      console.error('Error exporting CSV:', err);
      showSnackbar('Failed to export CSV', 'error');
    }
  };

  const handleExportClick = (event) => {
    setExportAnchorEl(event.currentTarget);
  };

  const handleExportClose = () => {
    setExportAnchorEl(null);
  };

  const handleExport = (format) => {
    handleExportClose();
    if (format === 'csv') {
      exportCSV();
    } else if (format === 'pdf') {
      exportToPDF();
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}><CircularProgress /></Box>;
  }

  // Calculate averages
  const totalAmount = summary?.totalAmount || 0;
  const totalRecords = summary?.count || 0;
  const averageAmount = totalRecords > 0 ? totalAmount / totalRecords : 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>Records Management</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<FileDownload />}
            onClick={handleExportClick}
            size="small"
          >
            Export
          </Button>
          <Menu
            anchorEl={exportAnchorEl}
            open={Boolean(exportAnchorEl)}
            onClose={handleExportClose}
          >
            <DropdownItem onClick={() => handleExport('csv')}>
              <FileDownload sx={{ mr: 1, fontSize: 20 }} /> Export as CSV
            </DropdownItem>
            <DropdownItem onClick={() => handleExport('pdf')}>
              <PictureAsPdf sx={{ mr: 1, fontSize: 20, color: '#f44336' }} /> Export as PDF
            </DropdownItem>
          </Menu>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            size="small"
          >
            Add Record
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={viewMode} 
          onChange={(e, newValue) => setViewMode(newValue)} 
          indicatorColor="primary" 
          textColor="primary" 
          variant="fullWidth"
        >
          <Tab value="monthly" label="Monthly View" icon={<CalendarToday />} />
          <Tab value="yearly" label="Yearly View" icon={<TrendingUp />} />
        </Tabs>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {viewMode === 'monthly' ? (
        <>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <Typography color="textSecondary" gutterBottom>Total Records</Typography>
                      <Typography variant="h5">{totalRecords}</Typography>
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
                      <Typography color="textSecondary" gutterBottom>Total Amount</Typography>
                      <Typography variant="h5" sx={{ color: 'primary.main' }}>
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
                      <Typography color="textSecondary" gutterBottom>Average Amount</Typography>
                      <Typography variant="h5" sx={{ color: '#4CAF50' }}>
                        PKR {averageAmount.toFixed(2)}
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

          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Month</InputLabel>
                  <Select value={filters.month} label="Month" onChange={(e) => setFilters({ ...filters, month: e.target.value })}>
                    {months.map((month) => <MenuItem key={month} value={month}>{month}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Year</InputLabel>
                  <Select value={filters.year} label="Year" onChange={(e) => setFilters({ ...filters, year: e.target.value })}>
                    {years.map((year) => <MenuItem key={year} value={year}>{year}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth size="small" label="Search" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Search by name..." />
              </Grid>
            </Grid>
          </Paper>
        </>
      ) : (
        <>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>Yearly Total</Typography>
                  <Typography variant="h5" sx={{ color: 'primary.main' }}>
                    PKR {yearlyData?.yearlyTotal?.toFixed(2) || '0.00'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>Total Records</Typography>
                  <Typography variant="h5">{yearlyData?.totalRecords || 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>Average Amount</Typography>
                  <Typography variant="h5" sx={{ color: '#4CAF50' }}>
                    PKR {yearlyData?.totalRecords > 0 ? (yearlyData.yearlyTotal / yearlyData.totalRecords).toFixed(2) : '0.00'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Year</InputLabel>
                  <Select value={selectedYear} label="Year" onChange={(e) => setSelectedYear(e.target.value)}>
                    {years.map((year) => <MenuItem key={year} value={year}>{year}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button fullWidth variant="outlined" startIcon={<Refresh />} onClick={fetchYearlyRecords}>Refresh Yearly Data</Button>
              </Grid>
            </Grid>
          </Paper>
        </>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#1976d2' }}>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>#</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Name</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Amount (PKR)</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Month</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Year</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Date</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Description</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.length === 0 ? (
              <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}><Typography variant="body1" color="textSecondary">No records found</Typography></TableCell></TableRow>
            ) : (
              records.map((record, index) => (
                <TableRow key={record._id} hover>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{record.name}</TableCell>
                  <TableCell>PKR {record.amount.toFixed(2)}</TableCell>
                  <TableCell>{record.month}</TableCell>
                  <TableCell>{record.year}</TableCell>
                  <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                  <TableCell>{record.description || '-'}</TableCell>
                  <TableCell>
                    <Tooltip title="Edit">
                      <IconButton size="small" color="primary" onClick={() => handleOpenDialog(record)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => handleDelete(record._id)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingRecord ? 'Edit Record' : 'Add New Record'}</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Controller name="name" control={control} render={({ field }) => (
                <TextField {...field} fullWidth label="Name" sx={{ mb: 2 }} error={!!errors.name} helperText={errors.name?.message} />
              )} />
              <Controller name="amount" control={control} render={({ field }) => (
                <TextField {...field} fullWidth label="Amount (PKR)" type="number" sx={{ mb: 2 }} error={!!errors.amount} helperText={errors.amount?.message} />
              )} />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Controller name="month" control={control} render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Month</InputLabel>
                      <Select {...field} label="Month">
                        {months.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                      </Select>
                    </FormControl>
                  )} />
                </Grid>
                <Grid item xs={6}>
                  <Controller name="year" control={control} render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Year</InputLabel>
                      <Select {...field} label="Year">
                        {years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                      </Select>
                    </FormControl>
                  )} />
                </Grid>
              </Grid>
              <Controller name="date" control={control} render={({ field }) => (
                <TextField {...field} fullWidth label="Date" type="date" sx={{ mt: 2, mb: 2 }} InputLabelProps={{ shrink: true }} error={!!errors.date} helperText={errors.date?.message} />
              )} />
              <Controller name="description" control={control} render={({ field }) => (
                <TextField {...field} fullWidth label="Description" multiline rows={2} />
              )} />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">{editingRecord ? 'Update' : 'Create'}</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={() => setSnackbarOpen(false)} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>{snackbarMessage}</Alert>
      </Snackbar>
    </Box>
  );
};

export default Records;