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
  Menu,
  MenuItem as DropdownItem,
} from '@mui/material';
import {
  Edit,
  Save,
  Cancel,
  Delete,
  Add,
  Refresh,
  FileDownload,
  PictureAsPdf,
  AttachMoney,
  People,
  TrendingUp,
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

const MonthlySheet = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [error, setError] = useState('');
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
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
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [recordsRes, summaryRes] = await Promise.all([
        axios.get(`/api/records?month=${selectedMonth}&year=${selectedYear}`),
        axios.get(`/api/records/summary?month=${selectedMonth}&year=${selectedYear}`),
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
      console.error('Error fetching data:', err);
      const errorMsg = err.response?.data?.message || 'Failed to fetch records';
      setError(errorMsg);
      showSnackbar(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (record) => {
    setEditingId(record._id);
    setEditData({
      name: record.name,
      amount: record.amount,
      month: record.month,
      year: record.year,
      date: new Date(record.date).toISOString().split('T')[0],
      description: record.description || '',
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveRecord = async (id) => {
    try {
      const response = await axios.put(`/api/records/${id}`, editData);
      
      if (response.data.success) {
        showSnackbar('Record updated successfully!', 'success');
        setRecords(records.map(record => record._id === id ? response.data.record : record));
        setEditingId(null);
        setEditData({});
        
        const summaryRes = await axios.get(`/api/records/summary?month=${selectedMonth}&year=${selectedYear}`);
        setSummary(summaryRes.data);
      }
    } catch (err) {
      console.error('Error updating record:', err);
      const errorMsg = err.response?.data?.message || 'Failed to update record';
      showSnackbar(errorMsg, 'error');
    }
  };

  const deleteRecord = async (id) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        const response = await axios.delete(`/api/records/${id}`);
        if (response.data.success) {
          showSnackbar('Record deleted successfully!', 'success');
          setRecords(records.filter(record => record._id !== id));
          const summaryRes = await axios.get(`/api/records/summary?month=${selectedMonth}&year=${selectedYear}`);
          setSummary(summaryRes.data);
        }
      } catch (err) {
        console.error('Error deleting record:', err);
        const errorMsg = err.response?.data?.message || 'Failed to delete record';
        showSnackbar(errorMsg, 'error');
      }
    }
  };

  const handleEditChange = (field, value) => {
    setEditData({ ...editData, [field]: value });
  };

  const onSubmitAdd = async (data) => {
    try {
      const response = await axios.post('/api/records', data);
      if (response.data.success) {
        showSnackbar('Record added successfully!', 'success');
        setOpenAddDialog(false);
        reset();
        fetchData();
      }
    } catch (err) {
      console.error('Error adding record:', err);
      const errorMsg = err.response?.data?.message || 'Failed to add record';
      showSnackbar(errorMsg, 'error');
    }
  };

  // PDF Export Function - Fixed amount formatting
  const exportToPDF = () => {
    if (records.length === 0) {
      showSnackbar('No records to export', 'warning');
      return;
    }

    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(25, 118, 210);
      doc.text('Monthly Sheet - Fund Collection', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setTextColor(60);
      doc.text(`${selectedMonth} ${selectedYear}`, pageWidth / 2, 30, { align: 'center' });
      
      // Summary
      doc.setFontSize(10);
      doc.setTextColor(80);
      const summaryText = `Total Records: ${summary?.count || 0} | Total Amount: PKR ${summary?.totalAmount?.toFixed(2) || '0.00'}`;
      doc.text(summaryText, pageWidth / 2, 37, { align: 'center' });
      
      // Table headers
      const tableHeaders = ['#', 'Name', 'Amount (PKR)', 'Month', 'Year', 'Date', 'Description'];
      const tableRows = records.map((record, index) => [
        index + 1,
        record.name,
        `PKR ${record.amount.toFixed(2)}`,  // Fixed: PKR prefix with space
        record.month,
        record.year,
        new Date(record.date).toLocaleDateString(),
        record.description || '-'
      ]);

      // Add total row
      if (records.length > 0) {
        tableRows.push([
          '',
          'TOTAL',
          `PKR ${summary?.totalAmount?.toFixed(2) || '0.00'}`,  // Fixed: PKR prefix with space
          '',
          '',
          '',
          ''
        ]);
      }

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
          // Footer
          doc.setFontSize(8);
          doc.setTextColor(150);
          const footerText = `Generated on ${new Date().toLocaleString()} | Fund Collection System`;
          doc.text(footerText, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
        },
      });

      doc.save(`monthly_sheet_${selectedMonth}_${selectedYear}.pdf`);
      showSnackbar('PDF exported successfully!', 'success');
    } catch (err) {
      console.error('Error exporting PDF:', err);
      showSnackbar('Failed to export PDF: ' + err.message, 'error');
    }
  };

  // CSV Export Function
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
      const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `monthly_sheet_${selectedMonth}_${selectedYear}.csv`);
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

  const totalAmount = summary?.totalAmount || 0;
  const totalRecords = summary?.count || 0;
  const averageAmount = totalRecords > 0 ? totalAmount / totalRecords : 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>Monthly Sheet</Typography>
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
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpenAddDialog(true)} size="small">Add Record</Button>
        </Box>
      </Box>

      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl sx={{ minWidth: 150 }} size="small">
          <InputLabel>Month</InputLabel>
          <Select value={selectedMonth} label="Month" onChange={(e) => setSelectedMonth(e.target.value)}>
            {months.map((month) => <MenuItem key={month} value={month}>{month}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 120 }} size="small">
          <InputLabel>Year</InputLabel>
          <Select value={selectedYear} label="Year" onChange={(e) => setSelectedYear(e.target.value)}>
            {years.map((year) => <MenuItem key={year} value={year}>{year}</MenuItem>)}
          </Select>
        </FormControl>
        <Button variant="outlined" startIcon={<Refresh />} onClick={fetchData} size="small">Refresh</Button>
      </Box>

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

      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table sx={{ minWidth: 700 }}>
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
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="textSecondary">
                    No records found for {selectedMonth} {selectedYear}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              records.map((record, index) => {
                const isEditing = editingId === record._id;
                return (
                  <TableRow key={record._id} hover>
                    <TableCell>{index + 1}</TableCell>
                    
                    <TableCell>
                      {isEditing ? (
                        <TextField 
                          size="small" 
                          value={editData.name || ''} 
                          onChange={(e) => handleEditChange('name', e.target.value)} 
                          fullWidth 
                          variant="outlined" 
                          sx={{ minWidth: 120 }} 
                        />
                      ) : (
                        record.name
                      )}
                    </TableCell>

                    <TableCell>
                      {isEditing ? (
                        <TextField 
                          size="small" 
                          type="number" 
                          value={editData.amount || ''} 
                          onChange={(e) => handleEditChange('amount', parseFloat(e.target.value))} 
                          fullWidth 
                          variant="outlined" 
                          sx={{ minWidth: 100 }} 
                        />
                      ) : (
                        `PKR ${record.amount.toFixed(2)}`
                      )}
                    </TableCell>

                    <TableCell>
                      {isEditing ? (
                        <FormControl size="small" fullWidth sx={{ minWidth: 120 }}>
                          <Select 
                            value={editData.month || ''} 
                            onChange={(e) => handleEditChange('month', e.target.value)}
                          >
                            {months.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                          </Select>
                        </FormControl>
                      ) : (
                        record.month
                      )}
                    </TableCell>

                    <TableCell>
                      {isEditing ? (
                        <FormControl size="small" fullWidth sx={{ minWidth: 100 }}>
                          <Select 
                            value={editData.year || ''} 
                            onChange={(e) => handleEditChange('year', parseInt(e.target.value))}
                          >
                            {years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                          </Select>
                        </FormControl>
                      ) : (
                        record.year
                      )}
                    </TableCell>

                    <TableCell>
                      {isEditing ? (
                        <TextField 
                          size="small" 
                          type="date" 
                          value={editData.date || ''} 
                          onChange={(e) => handleEditChange('date', e.target.value)} 
                          fullWidth 
                          variant="outlined" 
                          sx={{ minWidth: 140 }} 
                        />
                      ) : (
                        new Date(record.date).toLocaleDateString()
                      )}
                    </TableCell>

                    <TableCell>
                      {isEditing ? (
                        <TextField 
                          size="small" 
                          value={editData.description || ''} 
                          onChange={(e) => handleEditChange('description', e.target.value)} 
                          fullWidth 
                          variant="outlined" 
                          sx={{ minWidth: 120 }} 
                        />
                      ) : (
                        record.description || '-'
                      )}
                    </TableCell>

                    <TableCell>
                      {isEditing ? (
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Save">
                            <IconButton size="small" color="primary" onClick={() => saveRecord(record._id)}>
                              <Save fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Cancel">
                            <IconButton size="small" color="error" onClick={cancelEditing}>
                              <Cancel fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      ) : (
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Edit">
                            <IconButton size="small" color="primary" onClick={() => startEditing(record)}>
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => deleteRecord(record._id)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
            
            {records.length > 0 && (
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell colSpan={2}><Typography fontWeight={600}>Total</Typography></TableCell>
                <TableCell>
                  <Typography fontWeight={600} color="primary.main">
                    PKR {summary?.totalAmount?.toFixed(2) || '0.00'}
                  </Typography>
                </TableCell>
                <TableCell colSpan={5}></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Record</DialogTitle>
        <form onSubmit={handleSubmit(onSubmitAdd)}>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
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
                name="amount" 
                control={control} 
                render={({ field }) => (
                  <TextField 
                    {...field} 
                    fullWidth 
                    label="Amount (PKR)" 
                    type="number" 
                    sx={{ mb: 2 }} 
                    error={!!errors.amount} 
                    helperText={errors.amount?.message} 
                  />
                )} 
              />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Controller 
                    name="month" 
                    control={control} 
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Month</InputLabel>
                        <Select {...field} label="Month">
                          {months.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                        </Select>
                      </FormControl>
                    )} 
                  />
                </Grid>
                <Grid item xs={6}>
                  <Controller 
                    name="year" 
                    control={control} 
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Year</InputLabel>
                        <Select {...field} label="Year">
                          {years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                        </Select>
                      </FormControl>
                    )} 
                  />
                </Grid>
              </Grid>
              <Controller 
                name="date" 
                control={control} 
                render={({ field }) => (
                  <TextField 
                    {...field} 
                    fullWidth 
                    label="Date" 
                    type="date" 
                    sx={{ mt: 2, mb: 2 }} 
                    InputLabelProps={{ shrink: true }} 
                    error={!!errors.date} 
                    helperText={errors.date?.message} 
                  />
                )} 
              />
              <Controller 
                name="description" 
                control={control} 
                render={({ field }) => (
                  <TextField 
                    {...field} 
                    fullWidth 
                    label="Description" 
                    multiline 
                    rows={2} 
                  />
                )} 
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAddDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Add Record</Button>
          </DialogActions>
        </form>
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

export default MonthlySheet;