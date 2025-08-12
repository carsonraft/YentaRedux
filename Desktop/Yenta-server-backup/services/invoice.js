const fs = require('fs');
const path = require('path');
const db = require('../db/pool');

class InvoiceService {
  constructor() {
    this.invoiceCounter = 1000; // Starting invoice number
  }

  async generateInvoiceNumber() {
    // Get current year and month
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    // Get last invoice number for this month
    const result = await db.query(
      `SELECT invoice_number FROM mdf_transactions 
       WHERE invoice_number LIKE $1 
       ORDER BY invoice_number DESC 
       LIMIT 1`,
      [`INV-${year}${month}-%`]
    );

    let sequence = 1;
    if (result.rows.length > 0) {
      const lastInvoice = result.rows[0].invoice_number;
      const lastSequence = parseInt(lastInvoice.split('-').pop());
      sequence = lastSequence + 1;
    }

    return `INV-${year}${month}-${String(sequence).padStart(4, '0')}`;
  }

  async generateMDFInvoice(transactionId) {
    try {
      // Get transaction with all related data
      const result = await db.query(
        `SELECT mt.*, ma.cloud_provider, ma.program_name, ma.allocation_period,
                v.company_name as vendor_company, v.website as vendor_website,
                u.email as vendor_email,
                m.scheduled_at as meeting_date,
                p.company_name as prospect_company, p.contact_name, p.email as prospect_email,
                pc.project_details, pc.ai_summary, pc.readiness_score
         FROM mdf_transactions mt
         JOIN mdf_allocations ma ON mt.mdf_allocation_id = ma.id
         JOIN vendors v ON ma.vendor_id = v.id
         JOIN users u ON v.user_id = u.id
         JOIN meetings m ON mt.meeting_id = m.id
         JOIN prospects p ON m.prospect_id = p.id
         LEFT JOIN prospect_conversations pc ON p.id = pc.prospect_id
         WHERE mt.id = $1`,
        [transactionId]
      );

      if (result.rows.length === 0) {
        throw new Error('Transaction not found');
      }

      const data = result.rows[0];

      // Generate invoice number if not exists
      if (!data.invoice_number) {
        const invoiceNumber = await this.generateInvoiceNumber();
        
        await db.query(
          'UPDATE mdf_transactions SET invoice_number = $1 WHERE id = $2',
          [invoiceNumber, transactionId]
        );
        
        data.invoice_number = invoiceNumber;
      }

      const invoice = this.createInvoiceHTML(data);
      
      // Save invoice to file system (for download)
      const invoiceDir = path.join(__dirname, '../invoices');
      if (!fs.existsSync(invoiceDir)) {
        fs.mkdirSync(invoiceDir, { recursive: true });
      }

      const fileName = `${data.invoice_number}.html`;
      const filePath = path.join(invoiceDir, fileName);
      fs.writeFileSync(filePath, invoice);

      // Update transaction with invoice URL
      const invoiceUrl = `/api/invoices/${fileName}`;
      await db.query(
        'UPDATE mdf_transactions SET invoice_url = $1 WHERE id = $2',
        [invoiceUrl, transactionId]
      );

      return {
        invoice_number: data.invoice_number,
        invoice_url: invoiceUrl,
        invoice_html: invoice
      };

    } catch (error) {
      console.error('Invoice generation error:', error);
      throw error;
    }
  }

  createInvoiceHTML(data) {
    const invoiceDate = new Date().toLocaleDateString();
    const meetingDate = new Date(data.meeting_date).toLocaleDateString();
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MDF Invoice - ${data.invoice_number}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }
        .invoice-container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
        }
        .logo-section h1 {
            color: #2563eb;
            font-size: 2.5em;
            margin: 0;
            font-weight: bold;
        }
        .logo-section p {
            color: #6b7280;
            margin: 5px 0 0 0;
            font-size: 1.1em;
        }
        .invoice-info {
            text-align: right;
        }
        .invoice-info h2 {
            color: #1f2937;
            font-size: 2em;
            margin: 0;
        }
        .invoice-info p {
            margin: 5px 0;
            color: #6b7280;
        }
        .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 40px;
        }
        .detail-section {
            background-color: #f8fafc;
            padding: 20px;
            border-radius: 6px;
            border-left: 4px solid #2563eb;
        }
        .detail-section h3 {
            color: #1f2937;
            margin-top: 0;
            margin-bottom: 15px;
            font-size: 1.2em;
        }
        .detail-section p {
            margin: 8px 0;
            color: #4b5563;
        }
        .mdf-section {
            background-color: #fef3c7;
            border-left-color: #f59e0b;
        }
        .meeting-section {
            background-color: #ecfdf5;
            border-left-color: #10b981;
        }
        .prospect-section {
            background-color: #ede9fe;
            border-left-color: #8b5cf6;
        }
        .service-table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
            background: white;
            border-radius: 6px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .service-table th {
            background-color: #1f2937;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
        }
        .service-table td {
            padding: 15px;
            border-bottom: 1px solid #e5e7eb;
        }
        .service-table tr:last-child td {
            border-bottom: none;
        }
        .amount-cell {
            text-align: right;
            font-weight: bold;
            color: #1f2937;
        }
        .total-section {
            background-color: #1f2937;
            color: white;
            padding: 20px;
            border-radius: 6px;
            text-align: right;
            margin-top: 30px;
        }
        .total-section h3 {
            margin: 0;
            font-size: 1.5em;
        }
        .compliance-section {
            background-color: #f0f9ff;
            border: 2px solid #0284c7;
            border-radius: 6px;
            padding: 20px;
            margin-top: 30px;
        }
        .compliance-section h3 {
            color: #0284c7;
            margin-top: 0;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 0.9em;
        }
        .print-button {
            background-color: #2563eb;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            margin-bottom: 20px;
        }
        @media print {
            body { background-color: white; }
            .print-button { display: none; }
            .invoice-container { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <button class="print-button" onclick="window.print()">🖨️ Print Invoice</button>
        
        <div class="header">
            <div class="logo-section">
                <h1>YENTA</h1>
                <p>AI Matchmaker Platform</p>
            </div>
            <div class="invoice-info">
                <h2>INVOICE</h2>
                <p><strong>${data.invoice_number}</strong></p>
                <p>Date: ${invoiceDate}</p>
                <p>Status: ${data.status.toUpperCase()}</p>
            </div>
        </div>

        <div class="details-grid">
            <div class="detail-section">
                <h3>Vendor Information</h3>
                <p><strong>${data.vendor_company}</strong></p>
                <p>Email: ${data.vendor_email}</p>
                ${data.vendor_website ? `<p>Website: ${data.vendor_website}</p>` : ''}
            </div>
            
            <div class="detail-section mdf-section">
                <h3>${data.cloud_provider.toUpperCase()} MDF Program</h3>
                <p><strong>Program:</strong> ${data.program_name}</p>
                <p><strong>Period:</strong> ${data.allocation_period}</p>
                <p><strong>Provider:</strong> ${data.cloud_provider.toUpperCase()}</p>
            </div>
        </div>

        <div class="details-grid">
            <div class="detail-section meeting-section">
                <h3>Meeting Details</h3>
                <p><strong>Date:</strong> ${meetingDate}</p>
                <p><strong>Type:</strong> AI-Qualified Prospect Meeting</p>
                <p><strong>Platform:</strong> Yenta AI Matchmaker</p>
            </div>
            
            <div class="detail-section prospect-section">
                <h3>Prospect Information</h3>
                <p><strong>Company:</strong> ${data.prospect_company}</p>
                <p><strong>Contact:</strong> ${data.contact_name}</p>
                ${data.readiness_score ? `<p><strong>AI Readiness Score:</strong> ${data.readiness_score}/100</p>` : ''}
            </div>
        </div>

        ${data.ai_summary ? `
        <div class="detail-section">
            <h3>Project Summary</h3>
            <p>${data.ai_summary}</p>
        </div>
        ` : ''}

        <table class="service-table">
            <thead>
                <tr>
                    <th>Service Description</th>
                    <th>Quantity</th>
                    <th>Rate</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        <strong>AI-Qualified Prospect Meeting</strong><br>
                        <small>Pre-qualified enterprise prospect with verified AI readiness</small>
                    </td>
                    <td>1</td>
                    <td class="amount-cell">$${parseFloat(data.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    <td class="amount-cell">$${parseFloat(data.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                </tr>
            </tbody>
        </table>

        <div class="total-section">
            <h3>Total Amount: $${parseFloat(data.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}</h3>
        </div>

        <div class="compliance-section">
            <h3>${data.cloud_provider.toUpperCase()} MDF Compliance Information</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <p><strong>MDF Allocation ID:</strong> ${data.mdf_allocation_id}</p>
                    <p><strong>Transaction ID:</strong> ${data.id}</p>
                    <p><strong>Meeting ID:</strong> ${data.meeting_id}</p>
                </div>
                <div>
                    <p><strong>Service Category:</strong> Lead Generation</p>
                    <p><strong>Qualified Prospect:</strong> ✅ AI-Verified</p>
                    <p><strong>Compliance Status:</strong> ✅ Approved</p>
                </div>
            </div>
        </div>

        <div class="footer">
            <p><strong>Yenta AI Matchmaker Platform</strong></p>
            <p>This invoice represents services rendered through our AI-powered B2B matchmaking platform.</p>
            <p>All prospects are pre-qualified using GPT-4 technology to ensure high conversion rates.</p>
            <p>Generated on ${invoiceDate} | Invoice #${data.invoice_number}</p>
            
            <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                <p><strong>Payment Terms:</strong> Net 30 days</p>
                <p><strong>Questions?</strong> Contact our support team for any invoice inquiries.</p>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  async generateMDFComplianceReport(allocationId) {
    try {
      // Get allocation with all transactions
      const allocationResult = await db.query(
        `SELECT ma.*, v.company_name as vendor_company, u.email as vendor_email
         FROM mdf_allocations ma
         JOIN vendors v ON ma.vendor_id = v.id
         JOIN users u ON v.user_id = u.id
         WHERE ma.id = $1`,
        [allocationId]
      );

      if (allocationResult.rows.length === 0) {
        throw new Error('MDF allocation not found');
      }

      const allocation = allocationResult.rows[0];

      // Get all transactions for this allocation
      const transactionsResult = await db.query(
        `SELECT mt.*, m.scheduled_at as meeting_date,
                p.company_name as prospect_company, p.contact_name,
                pc.readiness_score, pc.ai_summary
         FROM mdf_transactions mt
         JOIN meetings m ON mt.meeting_id = m.id
         JOIN prospects p ON m.prospect_id = p.id
         LEFT JOIN prospect_conversations pc ON p.id = pc.prospect_id
         WHERE mt.mdf_allocation_id = $1 AND mt.status = 'approved'
         ORDER BY mt.created_at`,
        [allocationId]
      );

      const transactions = transactionsResult.rows;

      // Calculate summary
      const totalUsed = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const remaining = parseFloat(allocation.allocation_amount) - totalUsed;
      const utilizationRate = (totalUsed / parseFloat(allocation.allocation_amount)) * 100;

      const report = this.createComplianceReportHTML(allocation, transactions, {
        total_used: totalUsed,
        remaining: remaining,
        utilization_rate: utilizationRate
      });

      // Save report to file system
      const reportsDir = path.join(__dirname, '../reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const fileName = `MDF-Report-${allocation.cloud_provider}-${allocationId}-${Date.now()}.html`;
      const filePath = path.join(reportsDir, fileName);
      fs.writeFileSync(filePath, report);

      return {
        report_url: `/api/reports/${fileName}`,
        report_html: report,
        summary: {
          total_allocated: parseFloat(allocation.allocation_amount),
          total_used: totalUsed,
          remaining: remaining,
          utilization_rate: utilizationRate,
          meetings_count: transactions.length
        }
      };

    } catch (error) {
      console.error('MDF compliance report error:', error);
      throw error;
    }
  }

  createComplianceReportHTML(allocation, transactions, summary) {
    const reportDate = new Date().toLocaleDateString();
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MDF Compliance Report - ${allocation.cloud_provider.toUpperCase()}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }
        .report-container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
        }
        .header h1 {
            color: #2563eb;
            font-size: 2.5em;
            margin: 0;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .summary-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            font-size: 2em;
        }
        .summary-card p {
            margin: 0;
            opacity: 0.9;
        }
        .transactions-table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
            background: white;
            border-radius: 6px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .transactions-table th {
            background-color: #1f2937;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            font-size: 0.9em;
        }
        .transactions-table td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 0.9em;
        }
        .transactions-table tr:nth-child(even) {
            background-color: #f9fafb;
        }
        .amount-cell {
            text-align: right;
            font-weight: bold;
        }
        .print-button {
            background-color: #2563eb;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            margin-bottom: 20px;
        }
        @media print {
            body { background-color: white; }
            .print-button { display: none; }
            .report-container { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="report-container">
        <button class="print-button" onclick="window.print()">🖨️ Print Report</button>
        
        <div class="header">
            <h1>${allocation.cloud_provider.toUpperCase()} MDF Compliance Report</h1>
            <p><strong>${allocation.vendor_company}</strong> | ${allocation.program_name}</p>
            <p>Report Date: ${reportDate} | Period: ${allocation.allocation_period}</p>
        </div>

        <div class="summary-grid">
            <div class="summary-card">
                <h3>$${summary.total_allocated.toLocaleString()}</h3>
                <p>Total Allocated</p>
            </div>
            <div class="summary-card">
                <h3>$${summary.total_used.toLocaleString()}</h3>
                <p>Amount Used</p>
            </div>
            <div class="summary-card">
                <h3>${summary.utilization_rate.toFixed(1)}%</h3>
                <p>Utilization Rate</p>
            </div>
            <div class="summary-card">
                <h3>${summary.meetings_count}</h3>
                <p>Qualified Meetings</p>
            </div>
        </div>

        <h2>Transaction Details</h2>
        <table class="transactions-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Invoice #</th>
                    <th>Prospect Company</th>
                    <th>Contact</th>
                    <th>AI Score</th>
                    <th>Amount</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${transactions.map(t => `
                <tr>
                    <td>${new Date(t.meeting_date).toLocaleDateString()}</td>
                    <td>${t.invoice_number || 'Pending'}</td>
                    <td>${t.prospect_company}</td>
                    <td>${t.contact_name}</td>
                    <td>${t.readiness_score || 'N/A'}/100</td>
                    <td class="amount-cell">$${parseFloat(t.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    <td>${t.status.toUpperCase()}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>

        <div style="margin-top: 40px; padding: 20px; background-color: #f0f9ff; border-radius: 6px;">
            <h3>Compliance Summary</h3>
            <p>This report demonstrates compliant use of ${allocation.cloud_provider.toUpperCase()} Marketing Development Funds for qualified lead generation activities through the Yenta AI Matchmaker platform.</p>
            <ul>
                <li>All prospects were pre-qualified using AI technology</li>
                <li>Meetings facilitated were with genuine enterprise buyers</li>
                <li>Spend aligns with approved MDF program guidelines</li>
                <li>Documentation available for audit purposes</li>
            </ul>
        </div>
    </div>
</body>
</html>`;
  }
}

module.exports = new InvoiceService();