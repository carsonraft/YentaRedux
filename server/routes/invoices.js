const express = require('express');
const path = require('path');
const fs = require('fs');
const invoiceService = require('../services/invoice');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Generate invoice for MDF transaction
router.post('/generate/:transactionId', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    const invoice = await invoiceService.generateMDFInvoice(transactionId);
    
    res.json({
      message: 'Invoice generated successfully',
      ...invoice
    });
  } catch (error) {
    console.error('Generate invoice error:', error);
    res.status(500).json({ error: { message: 'Failed to generate invoice' } });
  }
});

// Generate MDF compliance report
router.post('/mdf-report/:allocationId', authenticateToken, requireRole(['vendor', 'admin']), async (req, res) => {
  try {
    const { allocationId } = req.params;
    
    const report = await invoiceService.generateMDFComplianceReport(allocationId);
    
    res.json({
      message: 'Compliance report generated successfully',
      ...report
    });
  } catch (error) {
    console.error('Generate MDF report error:', error);
    res.status(500).json({ error: { message: 'Failed to generate compliance report' } });
  }
});

// Download invoice file
router.get('/download/:filename', authenticateToken, async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Validate filename to prevent directory traversal
    if (!filename.match(/^[a-zA-Z0-9\-_\.]+$/)) {
      return res.status(400).json({ error: { message: 'Invalid filename' } });
    }
    
    const filePath = path.join(__dirname, '../invoices', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: { message: 'Invoice not found' } });
    }
    
    res.download(filePath, filename);
  } catch (error) {
    console.error('Download invoice error:', error);
    res.status(500).json({ error: { message: 'Failed to download invoice' } });
  }
});

// View invoice in browser
router.get('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Validate filename
    if (!filename.match(/^[a-zA-Z0-9\-_\.]+$/)) {
      return res.status(400).json({ error: { message: 'Invalid filename' } });
    }
    
    const filePath = path.join(__dirname, '../invoices', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('<h1>Invoice Not Found</h1><p>The requested invoice could not be found.</p>');
    }
    
    res.sendFile(filePath);
  } catch (error) {
    console.error('View invoice error:', error);
    res.status(500).send('<h1>Error</h1><p>Failed to load invoice.</p>');
  }
});

// Download compliance report
router.get('/reports/:filename', authenticateToken, async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Validate filename
    if (!filename.match(/^[a-zA-Z0-9\-_\.]+$/)) {
      return res.status(400).json({ error: { message: 'Invalid filename' } });
    }
    
    const filePath = path.join(__dirname, '../reports', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: { message: 'Report not found' } });
    }
    
    res.download(filePath, filename);
  } catch (error) {
    console.error('Download report error:', error);
    res.status(500).json({ error: { message: 'Failed to download report' } });
  }
});

module.exports = router;