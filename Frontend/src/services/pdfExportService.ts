// services/pdfExportService.ts - PDF generation service for financial reports

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ProcessingResult, SpendingCategory } from '../types/budget';
import { IncomeStatementData, RevenueCategory, ExpenseCategory } from '../types/incomeStatement';
import { BalanceSheetData } from '../types/balanceSheet';
import { CATEGORY_DISPLAY, REVENUE_DISPLAY, EXPENSE_DISPLAY } from '../constants/categories';

// Colors for PDF styling
const COLORS = {
    primary: '#4F46E5',      // Indigo
    secondary: '#6366F1',
    success: '#10B981',      // Emerald
    danger: '#EF4444',       // Rose
    text: '#1E293B',         // Slate-800
    textLight: '#64748B',    // Slate-500
    border: '#E2E8F0',       // Slate-200
    background: '#F8FAFC',   // Slate-50
};

// Helper function to strip emojis as jsPDF standard fonts don't support them
const stripEmojis = (str: string) => {
    return str.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F3FB}-\u{1F3FF}\u{1F1E6}-\u{1F1FF}\u{1F400}-\u{1F4FF}\u{1F500}-\u{1F5FF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
};

interface PDFExportOptions {
    includeCharts?: boolean;
    chartRefs?: {
        pieChart?: HTMLElement | null;
        barChart?: HTMLElement | null;
        revenueChart?: HTMLElement | null;
        expenseChart?: HTMLElement | null;
    };
}

/**
 * Generate a professional PDF report for transactions/spending data
 */
export async function generateTransactionReport(
    data: ProcessingResult,
    options: PDFExportOptions = {}
): Promise<void> {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    // Helper function to check page break
    const checkPageBreak = (requiredSpace: number) => {
        if (yPos + requiredSpace > pageHeight - margin) {
            pdf.addPage();
            yPos = margin;
            return true;
        }
        return false;
    };

    // === HEADER ===
    pdf.setFillColor(79, 70, 229); // Indigo-600
    pdf.rect(0, 0, pageWidth, 35, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Financial Report', margin, 18);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const reportDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    pdf.text(`Generated: ${reportDate}`, margin, 28);

    // Date range on the right
    if (data.date_range) {
        pdf.text(
            `Period: ${data.date_range.start} to ${data.date_range.end}`,
            pageWidth - margin,
            28,
            { align: 'right' }
        );
    }

    yPos = 45;

    // === SUMMARY CARDS ===
    pdf.setTextColor(30, 41, 59);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Summary', margin, yPos);
    yPos += 8;

    const totalSpent = Object.values(data.summary).reduce((sum, val) => sum + Math.abs(val), 0);
    const categoryCount = Object.keys(data.summary).filter(k => data.summary[k as SpendingCategory] !== 0).length;

    // Summary boxes
    const boxWidth = (pageWidth - margin * 2 - 10) / 3;
    const boxHeight = 22;

    // Total Spending
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(margin, yPos, boxWidth, boxHeight, 2, 2, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text('Total Spending', margin + 5, yPos + 8);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 41, 59);
    pdf.text(`$${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, margin + 5, yPos + 17);

    // Transactions
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(margin + boxWidth + 5, yPos, boxWidth, boxHeight, 2, 2, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text('Transactions', margin + boxWidth + 10, yPos + 8);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 41, 59);
    pdf.text(data.total_transactions.toString(), margin + boxWidth + 10, yPos + 17);

    // Categories
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(margin + boxWidth * 2 + 10, yPos, boxWidth, boxHeight, 2, 2, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text('Categories', margin + boxWidth * 2 + 15, yPos + 8);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 41, 59);
    pdf.text(categoryCount.toString(), margin + boxWidth * 2 + 15, yPos + 17);

    yPos += boxHeight + 12;

    // === SPENDING BY CATEGORY TABLE ===
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 41, 59);
    pdf.text('Spending by Category', margin, yPos);
    yPos += 8;

    // Table header
    pdf.setFillColor(248, 250, 252);
    pdf.rect(margin, yPos, pageWidth - margin * 2, 8, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(100, 116, 139);
    pdf.text('Category', margin + 3, yPos + 5.5);
    pdf.text('Amount', pageWidth - margin - 35, yPos + 5.5);
    pdf.text('% of Total', pageWidth - margin - 3, yPos + 5.5, { align: 'right' });
    yPos += 10;

    // Table rows
    const sortedCategories = Object.entries(data.summary)
        .filter(([_, amount]) => amount !== 0)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

    pdf.setFont('helvetica', 'normal');
    for (const [category, amount] of sortedCategories) {
        checkPageBreak(8);

        const display = CATEGORY_DISPLAY[category as SpendingCategory];
        const percentage = ((Math.abs(amount) / totalSpent) * 100).toFixed(1);
        const label = stripEmojis(display?.label || category);

        pdf.setTextColor(30, 41, 59);
        pdf.setFontSize(9);
        pdf.text(label, margin + 3, yPos + 5);
        pdf.text(`$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth - margin - 35, yPos + 5);
        pdf.setTextColor(100, 116, 139);
        pdf.text(`${percentage}%`, pageWidth - margin - 3, yPos + 5, { align: 'right' });

        // Divider line
        pdf.setDrawColor(226, 232, 240);
        pdf.line(margin, yPos + 7, pageWidth - margin, yPos + 7);
        yPos += 8;
    }

    yPos += 5;

    // === CHARTS (if requested) ===
    if (options.includeCharts && options.chartRefs) {
        // Wait a small amount of time to ensure charts are fully rendered
        await new Promise(resolve => setTimeout(resolve, 500));
        // Pie Chart
        if (options.chartRefs.pieChart) {
            checkPageBreak(80);
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(30, 41, 59);
            pdf.text('Spending Distribution', margin, yPos);
            yPos += 5;

            try {
                const pieCanvas = await html2canvas(options.chartRefs.pieChart, {
                    scale: 2,
                    backgroundColor: '#ffffff',
                    logging: false,
                });
                const pieImgData = pieCanvas.toDataURL('image/png');
                const imgWidth = pageWidth - margin * 2;
                const imgHeight = (pieCanvas.height / pieCanvas.width) * imgWidth;
                pdf.addImage(pieImgData, 'PNG', margin, yPos, imgWidth, Math.min(imgHeight, 70));
                yPos += Math.min(imgHeight, 70) + 10;
            } catch (err) {
                console.error('Failed to capture pie chart:', err);
            }
        }

        // Bar Chart
        if (options.chartRefs.barChart) {
            checkPageBreak(80);
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(30, 41, 59);
            pdf.text('Monthly Spending Trends', margin, yPos);
            yPos += 5;

            try {
                const barCanvas = await html2canvas(options.chartRefs.barChart, {
                    scale: 2,
                    backgroundColor: '#ffffff',
                    logging: false,
                });
                const barImgData = barCanvas.toDataURL('image/png');
                const imgWidth = pageWidth - margin * 2;
                const imgHeight = (barCanvas.height / barCanvas.width) * imgWidth;
                pdf.addImage(barImgData, 'PNG', margin, yPos, imgWidth, Math.min(imgHeight, 70));
                yPos += Math.min(imgHeight, 70) + 10;
            } catch (err) {
                console.error('Failed to capture bar chart:', err);
            }
        }
    }

    // === DETAILED TRANSACTIONS LIST ===
    checkPageBreak(25);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 41, 59);
    pdf.text('Detailed Transactions', margin, yPos);
    yPos += 8;

    // Table Header
    pdf.setFillColor(241, 245, 249); // Slate-100
    pdf.rect(margin, yPos, pageWidth - margin * 2, 8, 'F');
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(71, 85, 105);
    pdf.text('Date', margin + 3, yPos + 5.5);
    pdf.text('Description', margin + 35, yPos + 5.5);
    pdf.text('Category', pageWidth - margin - 55, yPos + 5.5);
    pdf.text('Amount', pageWidth - margin - 3, yPos + 5.5, { align: 'right' });
    yPos += 10;

    // Table Content
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(30, 41, 59);

    const sortedTransactions = [...data.transactions].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    for (const tx of sortedTransactions) {
        if (checkPageBreak(10)) {
            // Re-draw header on new page
            yPos += 5; // spacing after margin
            pdf.setFillColor(241, 245, 249);
            pdf.rect(margin, yPos, pageWidth - margin * 2, 8, 'F');
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(71, 85, 105);
            pdf.text('Date', margin + 3, yPos + 5.5);
            pdf.text('Description', margin + 35, yPos + 5.5);
            pdf.text('Category', pageWidth - margin - 55, yPos + 5.5);
            pdf.text('Amount', pageWidth - margin - 3, yPos + 5.5, { align: 'right' });
            yPos += 10;
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(30, 41, 59);
        }

        // Truncate description if too long
        let description = tx.description;
        if (description.length > 55) {
            description = description.substring(0, 52) + '...';
        }

        // Format date
        const dateStr = new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

        // Category display
        const categoryDisplay = stripEmojis(CATEGORY_DISPLAY[tx.category]?.label || tx.category);

        pdf.text(dateStr, margin + 3, yPos + 5);
        pdf.text(description, margin + 35, yPos + 5);
        pdf.text(categoryDisplay, pageWidth - margin - 55, yPos + 5);

        // Color amount (Red for negative/expense, Green for positive/income)
        if (tx.amount < 0) {
            pdf.setTextColor(239, 68, 68); // Red
            pdf.text(`-$${Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth - margin - 3, yPos + 5, { align: 'right' });
        } else {
            pdf.setTextColor(22, 163, 74); // Green
            pdf.text(`+$${Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth - margin - 3, yPos + 5, { align: 'right' });
        }

        // Reset color and draw divider
        pdf.setTextColor(30, 41, 59);
        pdf.setDrawColor(241, 245, 249);
        pdf.line(margin, yPos + 8, pageWidth - margin, yPos + 8);

        yPos += 9;
    }

    // === FOOTER ===
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184);
        pdf.text(
            `Page ${i} of ${totalPages}`,
            pageWidth / 2,
            pageHeight - 8,
            { align: 'center' }
        );
        pdf.text(
            'Sovereign CFO - Financial Report',
            margin,
            pageHeight - 8
        );
    }

    // Download the PDF
    const fileName = `financial-report-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
}

/**
 * Generate a PDF report for Income Statement data
 */
/**
 * Generate a PDF report for Income Statement data
 */
export async function generateIncomeStatementReport(
    data: IncomeStatementData,
    options: PDFExportOptions = {}
): Promise<void> {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    // Helper function to check page break
    const checkPageBreak = (requiredSpace: number) => {
        if (yPos + requiredSpace > pageHeight - margin) {
            pdf.addPage();
            yPos = margin;
            return true;
        }
        return false;
    };

    // === HEADER ===
    pdf.setFillColor(147, 51, 234); // Purple-600
    pdf.rect(0, 0, pageWidth, 35, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Income Statement Report', margin, 18);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const reportDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    pdf.text(`Generated: ${reportDate}`, margin, 28);

    // Period on the right
    if (data.period) {
        pdf.text(
            `Period: ${data.period.start} to ${data.period.end}`,
            pageWidth - margin,
            28,
            { align: 'right' }
        );
    }

    yPos = 45;

    // === SUMMARY CARDS ===
    const boxWidth = (pageWidth - margin * 2 - 10) / 3;
    const boxHeight = 22;

    // Total Revenue
    pdf.setFillColor(236, 253, 245); // Emerald-50
    pdf.roundedRect(margin, yPos, boxWidth, boxHeight, 2, 2, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(16, 185, 129);
    pdf.text('Total Revenue', margin + 5, yPos + 8);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`+$${data.revenues.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, margin + 5, yPos + 17);

    // Total Expenses
    pdf.setFillColor(254, 242, 242); // Rose-50
    pdf.roundedRect(margin + boxWidth + 5, yPos, boxWidth, boxHeight, 2, 2, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(239, 68, 68);
    pdf.text('Total Expenses', margin + boxWidth + 10, yPos + 8);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`-$${data.expenses.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, margin + boxWidth + 10, yPos + 17);

    // Net Income
    const isProfit = data.net_income >= 0;
    pdf.setFillColor(isProfit ? 243 : 254, isProfit ? 232 : 242, isProfit ? 255 : 242);
    pdf.roundedRect(margin + boxWidth * 2 + 10, yPos, boxWidth, boxHeight, 2, 2, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(isProfit ? 147 : 239, isProfit ? 51 : 68, isProfit ? 234 : 68);
    pdf.text('Net Income', margin + boxWidth * 2 + 15, yPos + 8);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(
        `${isProfit ? '+' : '-'}$${Math.abs(data.net_income).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        margin + boxWidth * 2 + 15,
        yPos + 17
    );

    yPos += boxHeight + 15;

    // === CHARTS (if requested) ===
    if (options.includeCharts && options.chartRefs) {
        // Wait a small amount of time to ensure charts are fully rendered
        await new Promise(resolve => setTimeout(resolve, 500));

        // Revenue Chart
        if (options.chartRefs.revenueChart) {
            checkPageBreak(80);
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(16, 185, 129); // Emerald
            pdf.text('Revenue Distribution', margin, yPos);
            yPos += 5;

            try {
                const revenueCanvas = await html2canvas(options.chartRefs.revenueChart, {
                    scale: 2,
                    backgroundColor: '#ffffff',
                    logging: false,
                });
                const revenueImgData = revenueCanvas.toDataURL('image/png');
                const imgWidth = (pageWidth - margin * 2 - 10) / 2;
                const imgHeight = (revenueCanvas.height / revenueCanvas.width) * imgWidth;
                pdf.addImage(revenueImgData, 'PNG', margin, yPos, imgWidth, Math.min(imgHeight, 60));

                // If we also have expense chart, put them side by side
                if (options.chartRefs.expenseChart) {
                    const expenseCanvas = await html2canvas(options.chartRefs.expenseChart, {
                        scale: 2,
                        backgroundColor: '#ffffff',
                        logging: false,
                    });
                    const expenseImgData = expenseCanvas.toDataURL('image/png');
                    pdf.setFontSize(14);
                    pdf.setFont('helvetica', 'bold');
                    pdf.setTextColor(239, 68, 68); // Rose
                    pdf.text('Expense Distribution', margin + imgWidth + 10, yPos - 5);
                    pdf.addImage(expenseImgData, 'PNG', margin + imgWidth + 10, yPos, imgWidth, Math.min(imgHeight, 60));
                }

                yPos += Math.min(imgHeight, 60) + 15;
            } catch (err) {
                console.error('Failed to capture income statement charts:', err);
            }
        }
    }

    // === REVENUES BREAKDOWN BY CATEGORY ===
    checkPageBreak(25);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(16, 185, 129);
    pdf.text('Revenue Breakdown', margin, yPos);
    yPos += 8;

    // Table header
    pdf.setFillColor(248, 250, 252);
    pdf.rect(margin, yPos, pageWidth - margin * 2, 8, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(100, 116, 139);
    pdf.text('Category', margin + 3, yPos + 5.5);
    pdf.text('Amount', pageWidth - margin - 3, yPos + 5.5, { align: 'right' });
    yPos += 10;

    const sortedRevenueCats = Object.entries(data.revenues.by_category)
        .filter(([_, amount]) => amount > 0)
        .sort((a, b) => b[1] - a[1]);

    pdf.setFont('helvetica', 'normal');
    for (const [cat, amt] of sortedRevenueCats) {
        checkPageBreak(8);
        const display = REVENUE_DISPLAY[cat as RevenueCategory];
        const label = stripEmojis(display?.label || cat);

        pdf.setTextColor(30, 41, 59);
        pdf.setFontSize(9);
        pdf.text(label, margin + 3, yPos + 5);
        pdf.text(`+$${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth - margin - 3, yPos + 5, { align: 'right' });

        pdf.setDrawColor(226, 232, 240);
        pdf.line(margin, yPos + 7, pageWidth - margin, yPos + 7);
        yPos += 8;
    }

    yPos += 10;

    // === EXPENSES BREAKDOWN BY CATEGORY ===
    checkPageBreak(25);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(239, 68, 68);
    pdf.text('Expense Breakdown', margin, yPos);
    yPos += 8;

    // Table header
    pdf.setFillColor(248, 250, 252);
    pdf.rect(margin, yPos, pageWidth - margin * 2, 8, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(100, 116, 139);
    pdf.text('Category', margin + 3, yPos + 5.5);
    pdf.text('Amount', pageWidth - margin - 3, yPos + 5.5, { align: 'right' });
    yPos += 10;

    const sortedExpenseCats = Object.entries(data.expenses.by_category)
        .filter(([_, amount]) => amount > 0)
        .sort((a, b) => b[1] - a[1]);

    pdf.setFont('helvetica', 'normal');
    for (const [cat, amt] of sortedExpenseCats) {
        checkPageBreak(8);
        const display = EXPENSE_DISPLAY[cat as ExpenseCategory];
        const label = stripEmojis(display?.label || cat);

        pdf.setTextColor(30, 41, 59);
        pdf.setFontSize(9);
        pdf.text(label, margin + 3, yPos + 5);
        pdf.text(`-$${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth - margin - 3, yPos + 5, { align: 'right' });

        pdf.setDrawColor(226, 232, 240);
        pdf.line(margin, yPos + 7, pageWidth - margin, yPos + 7);
        yPos += 8;
    }

    yPos += 10;

    // === DETAILED REVENUES SECTION ===
    checkPageBreak(20);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(16, 185, 129);
    pdf.text('Revenue Transactions', margin, yPos);
    yPos += 8;

    // Revenue items
    if (data.revenues.items && data.revenues.items.length > 0) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        for (const item of data.revenues.items) {
            checkPageBreak(8);
            pdf.setTextColor(30, 41, 59);

            const categoryLabel = stripEmojis(REVENUE_DISPLAY[item.category as RevenueCategory]?.label || item.category);
            const description = stripEmojis(item.description || 'Revenue');

            pdf.text(`${categoryLabel}: ${description}`, margin + 3, yPos + 5);
            pdf.setTextColor(16, 185, 129);
            pdf.text(`+$${Math.abs(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth - margin - 3, yPos + 5, { align: 'right' });
            pdf.setDrawColor(226, 232, 240);
            pdf.line(margin, yPos + 7, pageWidth - margin, yPos + 7);
            yPos += 8;
        }
    }

    yPos += 10;

    // === DETAILED EXPENSES SECTION ===
    checkPageBreak(20);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(239, 68, 68);
    pdf.text('Expense Transactions', margin, yPos);
    yPos += 8;

    // Expense items
    if (data.expenses.items && data.expenses.items.length > 0) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        for (const item of data.expenses.items) {
            checkPageBreak(8);
            pdf.setTextColor(30, 41, 59);

            const categoryLabel = stripEmojis(EXPENSE_DISPLAY[item.category as ExpenseCategory]?.label || item.category);
            const description = stripEmojis(item.description || 'Expense');

            pdf.text(`${categoryLabel}: ${description}`, margin + 3, yPos + 5);
            pdf.setTextColor(239, 68, 68);
            pdf.text(`-$${Math.abs(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth - margin - 3, yPos + 5, { align: 'right' });
            pdf.setDrawColor(226, 232, 240);
            pdf.line(margin, yPos + 7, pageWidth - margin, yPos + 7);
            yPos += 8;
        }
    }

    // === FOOTER ===
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184);
        pdf.text(
            `Page ${i} of ${totalPages}`,
            pageWidth / 2,
            pageHeight - 8,
            { align: 'center' }
        );
        pdf.text(
            'Sovereign CFO - Income Statement Report',
            margin,
            pageHeight - 8
        );
    }

    // Download the PDF
    const fileName = `income-statement-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
}

/**
 * Generate a PDF report for Balance Sheet data
 */
export async function generateBalanceSheetReport(data: BalanceSheetData): Promise<void> {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    // Helper function to check page break
    const checkPageBreak = (requiredSpace: number) => {
        if (yPos + requiredSpace > pageHeight - margin) {
            pdf.addPage();
            yPos = margin;
            return true;
        }
        return false;
    };

    // === HEADER ===
    pdf.setFillColor(6, 182, 212); // Cyan-500
    pdf.rect(0, 0, pageWidth, 35, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Balance Sheet Report', margin, 18);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const reportDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    pdf.text(`Generated: ${reportDate}`, margin, 28);

    if (data.date) {
        pdf.text(`As of: ${data.date}`, pageWidth - margin, 28, { align: 'right' });
    }

    yPos = 45;

    // === SUMMARY CARDS ===
    const boxWidth = (pageWidth - margin * 2 - 10) / 3;
    const boxHeight = 22;

    // Total Assets
    pdf.setFillColor(236, 253, 245);
    pdf.roundedRect(margin, yPos, boxWidth, boxHeight, 2, 2, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(16, 185, 129);
    pdf.text('Total Assets', margin + 5, yPos + 8);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`$${data.assets.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, margin + 5, yPos + 17);

    // Total Liabilities
    pdf.setFillColor(254, 242, 242);
    pdf.roundedRect(margin + boxWidth + 5, yPos, boxWidth, boxHeight, 2, 2, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(239, 68, 68);
    pdf.text('Total Liabilities', margin + boxWidth + 10, yPos + 8);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`$${data.liabilities.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, margin + boxWidth + 10, yPos + 17);

    // Net Equity
    const isPositive = data.equity >= 0;
    pdf.setFillColor(isPositive ? 219 : 254, isPositive ? 234 : 242, isPositive ? 254 : 242);
    pdf.roundedRect(margin + boxWidth * 2 + 10, yPos, boxWidth, boxHeight, 2, 2, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(isPositive ? 6 : 239, isPositive ? 182 : 68, isPositive ? 212 : 68);
    pdf.text('Net Equity', margin + boxWidth * 2 + 15, yPos + 8);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`$${data.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, margin + boxWidth * 2 + 15, yPos + 17);

    yPos += boxHeight + 15;

    // === ASSETS SECTION ===
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(16, 185, 129);
    pdf.text('Assets', margin, yPos);
    yPos += 8;

    if (data.assets.items && data.assets.items.length > 0) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        for (const item of data.assets.items.slice(0, 15)) {
            checkPageBreak(8);
            pdf.setTextColor(30, 41, 59);
            pdf.text(item.name || 'Asset', margin + 3, yPos + 5);
            pdf.setTextColor(16, 185, 129);
            pdf.text(`$${Math.abs(item.value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth - margin - 3, yPos + 5, { align: 'right' });
            pdf.setDrawColor(226, 232, 240);
            pdf.line(margin, yPos + 7, pageWidth - margin, yPos + 7);
            yPos += 8;
        }
    }

    yPos += 10;

    // === LIABILITIES SECTION ===
    checkPageBreak(20);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(239, 68, 68);
    pdf.text('Liabilities', margin, yPos);
    yPos += 8;

    if (data.liabilities.items && data.liabilities.items.length > 0) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        for (const item of data.liabilities.items.slice(0, 15)) {
            checkPageBreak(8);
            pdf.setTextColor(30, 41, 59);
            pdf.text(item.name || 'Liability', margin + 3, yPos + 5);
            pdf.setTextColor(239, 68, 68);
            pdf.text(`$${Math.abs(item.value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth - margin - 3, yPos + 5, { align: 'right' });
            pdf.setDrawColor(226, 232, 240);
            pdf.line(margin, yPos + 7, pageWidth - margin, yPos + 7);
            yPos += 8;
        }
    }

    // === FOOTER ===
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184);
        pdf.text(
            `Page ${i} of ${totalPages}`,
            pageWidth / 2,
            pageHeight - 8,
            { align: 'center' }
        );
        pdf.text(
            'Sovereign CFO - Balance Sheet Report',
            margin,
            pageHeight - 8
        );
    }

    // Download the PDF
    const fileName = `balance-sheet-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
}

